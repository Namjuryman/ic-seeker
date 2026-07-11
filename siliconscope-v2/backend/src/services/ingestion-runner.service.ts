import { runImport, type PaperImportSummary } from "../scripts/import-papers-multisource.js";
import type { ImportOptions, PaperImportSource } from "../scripts/paper-import/types.js";
import { ingestionJobService, type IngestionJob, type IngestionProvider } from "./ingestion-job.service.js";

const paperSources = new Set<PaperImportSource>([
  "openalex",
  "crossref",
  "ieee",
  "semantic-scholar",
  "dblp",
  "csv",
  "scholar-csv",
  "aminer",
]);

const defaultQueries = [
  "integrated circuit",
  "solid-state circuit",
  "analog mixed signal",
  "RF mmWave integrated circuit",
  "power management IC",
  "ADC DAC PLL SRAM",
];

let activeJobId: number | null = null;

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function boolValue(value: unknown): boolean {
  return value === true || value === "1" || value === 1 || String(value || "").toLowerCase() === "true";
}

function numberValue(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSources(provider: IngestionProvider, scope: Record<string, unknown>): PaperImportSource[] {
  const fromScope = asStringArray(scope.sources).filter((source): source is PaperImportSource => paperSources.has(source as PaperImportSource));
  if (fromScope.length) return fromScope;
  if (paperSources.has(provider as PaperImportSource)) return [provider as PaperImportSource];
  return [];
}

function optionsFromJob(job: IngestionJob): ImportOptions {
  const scope = job.scope || {};
  const sources = normalizeSources(job.provider, scope);
  if (!sources.length) {
    throw new Error(`采集来源 ${job.provider} 无法映射到可用的元数据导入源。可用来源：openalex、crossref、ieee、csv、scholar-csv、aminer、semantic-scholar、dblp。`);
  }

  const query = String(scope.query || "").trim();
  const queries = asStringArray(scope.queries);
  if (query) queries.unshift(query);

  return {
    sources,
    queries: queries.length ? [...new Set(queries)] : defaultQueries,
    venues: asStringArray(scope.venues),
    yearFrom: numberValue(scope.yearFrom ?? scope.year_from, 2000),
    yearTo: numberValue(scope.yearTo ?? scope.year_to, new Date().getFullYear()),
    limit: Math.min(Math.max(numberValue(scope.limit, 50), 1), 500),
    dryRun: boolValue(scope.dryRun ?? scope.dry_run),
    refreshTopics: boolValue(scope.refreshTopics ?? scope.refresh_topics),
    includeLowRelevance: boolValue(scope.includeLowRelevance ?? scope.include_low_relevance),
    csvPath: String(scope.csvPath || scope.csv || ""),
    scholarCsvPath: String(scope.scholarCsvPath || scope.scholar_csv || ""),
    aminerJsonPath: String(scope.aminerJsonPath || scope.aminer_json || ""),
  };
}

function countsFromSummary(summary: PaperImportSummary) {
  return {
    fetched: summary.raw,
    inserted: summary.upsert.inserted,
    updated: summary.upsert.updated,
    skipped: summary.filtered + summary.upsert.skipped,
    review: summary.lowConfidence + summary.upsert.errors.length,
  };
}

function compactSummary(summary: PaperImportSummary) {
  return {
    sources: summary.sources.map((source) => ({
      source: source.source,
      fetched: source.fetched,
      warnings: source.warnings,
    })),
    raw: summary.raw,
    merged: summary.merged,
    kept: summary.kept,
    filtered: summary.filtered,
    lowConfidence: summary.lowConfidence,
    upsert: summary.upsert,
    refreshedTopics: summary.refreshedTopics,
    sample: summary.sample.slice(0, 10),
  };
}

async function execute(jobId: number, actorUserId: number | null) {
  try {
    const job = ingestionJobService.get(jobId);
    if (!job) throw new Error(`未知采集任务：${jobId}`);
    const options = optionsFromJob(job);
    ingestionJobService.recordEvent({
      jobId,
      eventType: "progress",
      message: `正在运行 ${options.sources.join(", ")} 采集，年份范围 ${options.yearFrom}-${options.yearTo}。`,
      payload: {
        sources: options.sources,
        queries: options.queries,
        venues: options.venues,
        limit: options.limit,
        dryRun: options.dryRun,
      },
      createdByUserId: actorUserId,
    });

    const summary = await runImport(options);
    const latest = ingestionJobService.get(jobId);
    if (latest?.status === "cancelled") {
      ingestionJobService.recordEvent({
        jobId,
        eventType: "note",
        message: "任务取消后采集才结束，因此未写入最终成功状态。",
        payload: compactSummary(summary),
        createdByUserId: actorUserId,
      });
      return;
    }

    ingestionJobService.updateStatus(jobId, {
      status: summary.upsert.errors.length ? "review_required" : "succeeded",
      counts: countsFromSummary(summary),
      notes: summary.upsert.errors.length
        ? `采集完成，但有 ${summary.upsert.errors.length} 条写入错误，需要复核。`
        : `采集完成：抓取 ${summary.raw} 条，新增 ${summary.upsert.inserted} 条，更新 ${summary.upsert.updated} 条。`,
      error: summary.upsert.errors.length ? summary.upsert.errors.slice(0, 5).join("; ") : null,
      actorUserId,
    });
    ingestionJobService.recordEvent({
      jobId,
      eventType: "progress",
      message: "来源与写入摘要。",
      payload: compactSummary(summary),
      createdByUserId: actorUserId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const latest = ingestionJobService.get(jobId);
    if (latest?.status !== "cancelled") {
      ingestionJobService.updateStatus(jobId, {
        status: "failed",
        error: message,
        notes: "采集执行失败，请检查来源凭据、网络和任务范围。",
        actorUserId,
      });
    }
  } finally {
    if (activeJobId === jobId) activeJobId = null;
  }
}

export const ingestionRunnerService = {
  start(id: number, actorUserId?: number | null) {
    const existingRunning = ingestionJobService.runningJob(id);
    const job = ingestionJobService.get(id);
    if (!job) throw new Error(`未知采集任务：${id}`);
    if (job.status === "running") return job;
    if ((activeJobId && activeJobId !== id) || existingRunning) {
      ingestionJobService.recordEvent({
        jobId: id,
        eventType: "note",
        message: `已有采集任务正在运行${existingRunning ? `（#${existingRunning.id}）` : ""}；当前任务继续排队。`,
        payload: { activeJobId, runningJobId: existingRunning?.id || null },
        createdByUserId: actorUserId ?? null,
      });
      return job;
    }
    const running = ingestionJobService.start(id, actorUserId ?? null);
    activeJobId = id;
    void execute(id, actorUserId ?? null);
    return running;
  },

  get activeJobId() {
    return activeJobId;
  },

  optionsFromJob,
};
