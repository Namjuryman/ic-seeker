import { sqlite } from "../db/connection.js";
import { appSqlite } from "../db/app-db.js";
import { readingQueueService } from "./reading-queue.service.js";
import { toPaperRow } from "./paper-row.js";

function parseJsonArray(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function stringifyList(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.map(String).map((item) => item.trim()).filter(Boolean));
  if (typeof value === "string") return JSON.stringify(value.split(/\n|;/).map((item) => item.trim()).filter(Boolean));
  return "[]";
}

type ReadingWorkflow = {
  userId: number;
  paperId: number;
  readingGoal: string;
  literatureReviewNote: string;
  projectNote: string;
  applicationNote: string;
  summaryText: string;
  keyContributions: string[];
  limitations: string[];
  nextReviewAt: string | null;
  exportedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function mapWorkflow(row: any): ReadingWorkflow {
  return {
    userId: Number(row.user_id ?? row.userId ?? 0),
    paperId: Number(row.paper_id ?? row.paperId),
    readingGoal: row.reading_goal ?? row.readingGoal ?? "",
    literatureReviewNote: row.literature_review_note ?? row.literatureReviewNote ?? "",
    projectNote: row.project_note ?? row.projectNote ?? "",
    applicationNote: row.application_note ?? row.applicationNote ?? "",
    summaryText: row.summary_text ?? row.summaryText ?? "",
    keyContributions: parseJsonArray(row.key_contributions_json ?? row.keyContributionsJson),
    limitations: parseJsonArray(row.limitations_json ?? row.limitationsJson),
    nextReviewAt: row.next_review_at ?? row.nextReviewAt ?? null,
    exportedAt: row.exported_at ?? row.exportedAt ?? null,
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  };
}

function paper(paperId: number) {
  const row = sqlite.prepare("SELECT * FROM papers WHERE id = ?").get(paperId) as any;
  return row ? toPaperRow(row as any) : null;
}

export const readingWorkflowService = {
  get(userId: number, paperId: number) {
    const row = appSqlite.prepare("SELECT * FROM reading_workflow_items WHERE user_id = ? AND paper_id = ?").get(userId, paperId) as any;
    const status = readingQueueService.getPaperStatus(userId, paperId);
    return {
      paper: paper(paperId),
      status,
      workflow: row ? mapWorkflow(row) : {
        userId,
        paperId,
        readingGoal: "",
        literatureReviewNote: "",
        projectNote: "",
        applicationNote: "",
        summaryText: "",
        keyContributions: [],
        limitations: [] as string[],
        nextReviewAt: null,
        exportedAt: null,
        createdAt: null,
        updatedAt: null,
      },
      suggestedTemplate: {
        summary: "Problem -> method -> claimed contribution -> evidence/spec -> limitation -> how it changes my project/application plan.",
        contributionPrompts: ["What is technically new?", "Which metric improved and under what condition?", "What baseline is used?"],
        limitationPrompts: ["Which measurement condition is missing?", "What may not generalize?", "What source/provenance should I verify?"],
      },
    };
  },

  update(userId: number, paperId: number, body: Record<string, unknown>) {
    const exists = paper(paperId);
    if (!exists) throw new Error("Paper not found");
    appSqlite.prepare(`
      INSERT INTO reading_workflow_items (
        user_id, paper_id, reading_goal, literature_review_note, project_note, application_note,
        summary_text, key_contributions_json, limitations_json, next_review_at, created_at, updated_at
      ) VALUES (
        @userId, @paperId, @readingGoal, @literatureReviewNote, @projectNote, @applicationNote,
        @summaryText, @keyContributionsJson, @limitationsJson, @nextReviewAt, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT(user_id, paper_id) DO UPDATE SET
        reading_goal = excluded.reading_goal,
        literature_review_note = excluded.literature_review_note,
        project_note = excluded.project_note,
        application_note = excluded.application_note,
        summary_text = excluded.summary_text,
        key_contributions_json = excluded.key_contributions_json,
        limitations_json = excluded.limitations_json,
        next_review_at = excluded.next_review_at,
        updated_at = CURRENT_TIMESTAMP
    `).run({
      userId,
      paperId,
      readingGoal: String(body.readingGoal ?? body.reading_goal ?? ""),
      literatureReviewNote: String(body.literatureReviewNote ?? body.literature_review_note ?? ""),
      projectNote: String(body.projectNote ?? body.project_note ?? ""),
      applicationNote: String(body.applicationNote ?? body.application_note ?? ""),
      summaryText: String(body.summaryText ?? body.summary_text ?? ""),
      keyContributionsJson: stringifyList(body.keyContributions ?? body.key_contributions),
      limitationsJson: stringifyList(body.limitations),
      nextReviewAt: body.nextReviewAt ? String(body.nextReviewAt) : null,
    });
    return this.get(userId, paperId);
  },

  reviewDue(userId: number, options: { limit?: number } = {}) {
    const limit = Math.max(1, Math.min(100, Number(options.limit || 30)));
    const rows = (appSqlite.prepare(`
      SELECT * FROM reading_workflow_items
      WHERE user_id = ? AND next_review_at IS NOT NULL AND next_review_at <= CURRENT_TIMESTAMP
      ORDER BY next_review_at ASC
      LIMIT ?
    `).all(userId, limit) as any[]).map(mapWorkflow);
    return rows.map((workflow: ReadingWorkflow) => ({ workflow, paper: paper(workflow.paperId) })).filter((item: { workflow: ReadingWorkflow; paper: ReturnType<typeof paper> }) => item.paper);
  },

  exportLiteratureMaterial(userId: number, options: { format?: "markdown" | "json"; useCase?: string } = {}) {
    const queue = readingQueueService.getReadingQueue(userId).flatMap((group) => group.papers);
    const ids = queue.map((item: any) => Number(item.paper.id)).filter(Number.isFinite);
    if (!ids.length) {
      return { format: options.format || "markdown", content: options.format === "json" ? "[]" : "# Reading Queue Literature Material\n\nNo queued papers yet." };
    }
    const placeholders = ids.map(() => "?").join(",");
    const workflows = (appSqlite.prepare(`SELECT * FROM reading_workflow_items WHERE user_id = ? AND paper_id IN (${placeholders})`).all(userId, ...ids) as any[]).map(mapWorkflow);
    const byId = new Map(workflows.map((item: ReadingWorkflow) => [item.paperId, item]));
    const rows = queue.map((item: any) => {
      const wf = byId.get(Number(item.paper.id));
      return {
        paper: item.paper,
        readingState: item.readingState || item.readingStatus || item.status,
        important: Boolean(item.important),
        useCases: item.useCases || [],
        summary: wf?.summaryText || "",
        contributions: wf?.keyContributions || [],
        limitations: wf?.limitations || [],
        notes: {
          literatureReview: wf?.literatureReviewNote || "",
          project: wf?.projectNote || "",
          application: wf?.applicationNote || "",
        },
      };
    }).filter((row: any) => !options.useCase || row.useCases.includes(options.useCase));

    if (options.format === "json") return { format: "json", content: JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2) };
    const content = [
      "# Reading Queue Literature Material",
      "",
      `Generated at: ${new Date().toISOString()}`,
      "",
      "> Metadata/citation/notes export only. Verify papers and source links manually; copyrighted PDFs are not exported.",
      "",
      ...rows.flatMap((row: any, idx: number) => [
        `## ${idx + 1}. ${row.paper.title}`,
        "",
        `- Venue/year: ${row.paper.venue || "-"} ${row.paper.year || ""}`,
        `- DOI: ${row.paper.doi || "-"}`,
        `- State: ${row.readingState}`,
        `- Use cases: ${row.useCases.join(", ") || "-"}`,
        `- Summary: ${row.summary || "TODO"}`,
        `- Contributions: ${row.contributions.join("; ") || "TODO"}`,
        `- Limitations: ${row.limitations.join("; ") || "TODO"}`,
        `- Literature note: ${row.notes.literatureReview || "TODO"}`,
        "",
      ]),
    ].join("\n");
    return { format: "markdown", content };
  },
};
