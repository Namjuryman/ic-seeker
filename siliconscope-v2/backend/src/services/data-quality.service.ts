import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db as metadataDb, sqlite } from "../db/connection.js";

function normalizeKey(value: unknown) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeInstitution(value: string) {
  return normalizeKey(value)
    .replace(/\bdepartment of\b/g, " ")
    .replace(/\bschool of\b/g, " ")
    .replace(/\bfaculty of\b/g, " ")
    .replace(/\blaboratory\b/g, " ")
    .replace(/\blab\b/g, " ")
    .replace(/\buniv\b/g, "university")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePerson(value: string) {
  return normalizeKey(value.replace(/,/g, " "));
}

function splitList(value: string) {
  return String(value || "").split(";").map((item) => item.trim()).filter(Boolean);
}

function addSample<T>(entry: { count: number; samples: T[] }, sample: T, limit = 6) {
  entry.count += 1;
  if (entry.samples.length < limit) entry.samples.push(sample);
}

type FindingInput = {
  type: string;
  severity: "low" | "medium" | "high";
  targetType: string;
  targetId: string;
  title: string;
  summary: string;
  evidence: unknown;
};

function findingFingerprint(input: FindingInput) {
  return createHash("sha256")
    .update([input.type, input.targetType, input.targetId, input.title].join("|"))
    .digest("hex");
}

function parseEvidence(value: unknown) {
  try {
    return JSON.parse(String(value || "{}"));
  } catch {
    return {};
  }
}

function makeFinding(input: FindingInput) {
  return {
    ...input,
    fingerprint: findingFingerprint(input),
    evidenceJson: JSON.stringify(input.evidence ?? {}),
  };
}

function pushFinding(items: FindingInput[], input: FindingInput) {
  items.push(input);
}

export const dataQualityService = {
  listFindings(options: { status?: string; type?: string; severity?: string; limit?: number; offset?: number } = {}) {
    const limit = Math.min(Math.max(Number(options.limit || 50), 1), 200);
    const offset = Math.max(Number(options.offset || 0), 0);
    const where: string[] = [];
    const params: Record<string, string | number> = { limit, offset };

    if (options.status && options.status !== "all") {
      where.push("status = @status");
      params.status = options.status;
    }
    if (options.type && options.type !== "all") {
      where.push("finding_type = @type");
      params.type = options.type;
    }
    if (options.severity && options.severity !== "all") {
      where.push("severity = @severity");
      params.severity = options.severity;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total = sqlite.prepare(`SELECT COUNT(*) AS total FROM content_quality_findings ${whereSql}`).get(params) as { total: number };
    const rows = sqlite.prepare(`
      SELECT
        id,
        fingerprint,
        finding_type AS findingType,
        severity,
        status,
        target_type AS targetType,
        target_id AS targetId,
        title,
        summary,
        evidence_json AS evidenceJson,
        source,
        first_seen_at AS firstSeenAt,
        last_seen_at AS lastSeenAt,
        resolved_at AS resolvedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM content_quality_findings
      ${whereSql}
      ORDER BY
        CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        last_seen_at DESC,
        id DESC
      LIMIT @limit OFFSET @offset
    `).all(params).map((row: any) => ({ ...row, evidence: parseEvidence(row.evidenceJson) }));

    const summary = sqlite.prepare(`
      SELECT status, severity, COUNT(*) AS count
      FROM content_quality_findings
      GROUP BY status, severity
      ORDER BY status, severity
    `).all();

    const types = sqlite.prepare(`
      SELECT finding_type AS type, COUNT(*) AS count
      FROM content_quality_findings
      GROUP BY finding_type
      ORDER BY count DESC
    `).all();

    return { rows, total: total?.total ?? 0, limit, offset, summary, types };
  },

  updateFinding(id: number, input: { status: string }) {
    const nextStatus = String(input.status || "").trim();
    if (!["open", "ignored", "resolved"].includes(nextStatus)) {
      throw new Error("数据质量问题状态必须是 open、ignored 或 resolved。");
    }
    const resolvedAt = nextStatus === "resolved" ? new Date().toISOString() : null;
    sqlite.prepare(`
      UPDATE content_quality_findings
      SET status = @status,
          resolved_at = @resolvedAt,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({ id, status: nextStatus, resolvedAt });
    return sqlite.prepare("SELECT * FROM content_quality_findings WHERE id = ?").get(id);
  },

  syncFindings(options: { scanLimit?: number; sampleLimit?: number } = {}) {
    const report = dataQualityService.getReport(options);
    const findings: FindingInput[] = [];

    for (const row of report.duplicateDoi) {
      pushFinding(findings, {
        type: "duplicate_doi",
        severity: "high",
        targetType: "doi",
        targetId: row.key,
        title: `重复 DOI：${row.key}`,
        summary: `${row.count} 篇论文使用同一个 DOI。`,
        evidence: row,
      });
    }

    for (const row of report.duplicateTitleYear) {
      pushFinding(findings, {
        type: "duplicate_title_year",
        severity: "medium",
        targetType: "paper_group",
        targetId: row.key,
        title: "标题/年份重复候选",
        summary: `${row.count} 篇论文拥有相同的归一化标题和年份。`,
        evidence: row,
      });
    }

    for (const row of report.unknownVenues) {
      pushFinding(findings, {
        type: "unknown_venue",
        severity: "medium",
        targetType: "venue",
        targetId: String(row.venue || "empty"),
        title: `会议/期刊映射较弱：${row.venue || "(空)"}`,
        summary: `${row.count} 篇论文的会议/期刊元数据为空、仍是未核验标记，或排序信号为 0。`,
        evidence: row,
      });
    }

    for (const row of report.lowConfidenceTopics) {
      pushFinding(findings, {
        type: "low_confidence_topic",
        severity: "medium",
        targetType: "topic",
        targetId: String(row.field || "empty"),
        title: `低置信方向分组：${row.field || "(空)"}`,
        summary: `${row.count} 篇论文在该方向下的关键词证据较弱。`,
        evidence: row,
      });
    }

    for (const row of report.venuePublicationMismatches || []) {
      pushFinding(findings, {
        type: "venue_publication_mismatch",
        severity: "high",
        targetType: "paper",
        targetId: String(row.id),
        title: `会议/期刊错配：${row.venue} vs ${row.publicationTitle}`,
        summary: "归一化会议/期刊标签与来源 publication title 不一致。",
        evidence: row,
      });
    }

    for (const row of report.aiReviewQueue || []) {
      pushFinding(findings, {
        type: "ai_annotation_review",
        severity: Number(row.confidence || 0) < 0.35 ? "high" : "medium",
        targetType: "paper",
        targetId: String(row.paperId),
        title: `AI 标注待复核：${row.title}`,
        summary: `置信度 ${Math.round(Number(row.confidence || 0) * 100)}%，主方向 ${row.primaryDomain || "-"}。`,
        evidence: row,
      });
    }


    for (const row of report.lowMetadataConfidence || []) {
      pushFinding(findings, {
        type: "low_metadata_confidence",
        severity: Number(row.metadataConfidence || 0) < 40 ? "high" : "medium",
        targetType: "paper",
        targetId: String(row.id),
        title: `低元数据置信度：${row.title}`,
        summary: `元数据置信度 ${row.metadataConfidence}/100；标记：${(row.flags || []).join(", ") || "无"}。`,
        evidence: row,
      });
    }

    for (const row of report.institutionVariants) {
      pushFinding(findings, {
        type: "institution_alias_candidate",
        severity: "medium",
        targetType: "institution",
        targetId: row.key,
        title: `机构别名候选：${row.key}`,
        summary: `${row.count} 次抽样出现中包含 ${row.variants.length} 个写法变体。`,
        evidence: row,
      });
    }

    for (const row of report.ambiguousAuthors) {
      pushFinding(findings, {
        type: "ambiguous_author_name",
        severity: "medium",
        targetType: "author",
        targetId: row.key,
        title: `作者姓名歧义：${row.key}`,
        summary: `${row.count} 篇论文覆盖 ${row.variants.length} 个姓名写法和 ${row.venues.length} 个会议/期刊。`,
        evidence: row,
      });
    }

    if (report.missingAffiliations > 0) {
      pushFinding(findings, {
        type: "missing_affiliations",
        severity: "low",
        targetType: "database",
        targetId: "papers.affiliations",
        title: "论文缺少 affiliation 元数据",
        summary: `${report.missingAffiliations} 篇已扫描论文没有 affiliation 字符串。`,
        evidence: { count: report.missingAffiliations, scannedRows: report.scannedRows },
      });
    }

    const stmt = sqlite.prepare(`
      INSERT INTO content_quality_findings (
        fingerprint,
        finding_type,
        severity,
        status,
        target_type,
        target_id,
        title,
        summary,
        evidence_json,
        source,
        first_seen_at,
        last_seen_at,
        created_at,
        updated_at
      ) VALUES (
        @fingerprint,
        @type,
        @severity,
        'open',
        @targetType,
        @targetId,
        @title,
        @summary,
        @evidenceJson,
        'data-quality',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT(fingerprint) DO UPDATE SET
        finding_type = excluded.finding_type,
        severity = excluded.severity,
        target_type = excluded.target_type,
        target_id = excluded.target_id,
        title = excluded.title,
        summary = excluded.summary,
        evidence_json = excluded.evidence_json,
        status = CASE
          WHEN content_quality_findings.status = 'resolved' THEN 'open'
          ELSE content_quality_findings.status
        END,
        last_seen_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `);

    const transaction = sqlite.transaction((items: FindingInput[]) => {
      for (const input of items) stmt.run(makeFinding(input));
    });
    transaction(findings);

    const openCount = sqlite.prepare("SELECT COUNT(*) AS total FROM content_quality_findings WHERE status = 'open'").get() as { total: number };
    return {
      generatedAt: report.generatedAt,
      total: findings.length,
      open: openCount?.total ?? 0,
      summary: dataQualityService.listFindings({ status: "all", limit: 1 }).summary,
    };
  },

  getReport(options: { scanLimit?: number; sampleLimit?: number } = {}) {
    const scanLimit = Math.min(Math.max(Number(options.scanLimit || 12000), 1000), 50000);
    const sampleLimit = Math.min(Math.max(Number(options.sampleLimit || 50), 10), 200);
    const total = metadataDb.get<{ total: number }>(sql`SELECT COUNT(*) AS total FROM papers`)?.total ?? 0;

    const duplicateDoi = metadataDb.all(sql`
      SELECT LOWER(TRIM(doi)) AS key, COUNT(*) AS count,
             GROUP_CONCAT(id || ':' || SUBSTR(title, 1, 90), ' || ') AS samples
      FROM papers
      WHERE doi IS NOT NULL AND TRIM(doi) != ''
      GROUP BY LOWER(TRIM(doi))
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT ${sampleLimit}
    `) as Array<{ key: string; count: number; samples: string }>;

    const duplicateTitleYear = metadataDb.all(sql`
      SELECT LOWER(TRIM(title)) || '|' || year AS key, COUNT(*) AS count,
             GROUP_CONCAT(id || ':' || SUBSTR(venue, 1, 40), ' || ') AS samples
      FROM papers
      WHERE title IS NOT NULL AND TRIM(title) != '' AND year IS NOT NULL
      GROUP BY LOWER(TRIM(title)), year
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT ${sampleLimit}
    `) as Array<{ key: string; count: number; samples: string }>;

    const unknownVenues = metadataDb.all(sql`
      SELECT venue, venue_rank AS rank, COUNT(*) AS count, ROUND(AVG(quality_score), 1) AS avgScore
      FROM papers
      WHERE COALESCE(venue, '') = '' OR COALESCE(venue_rank, '') IN ('', 'User', 'Unknown') OR quality_score <= 0
      GROUP BY venue, venue_rank
      ORDER BY COUNT(*) DESC
      LIMIT ${sampleLimit}
    `) as Array<{ venue: string; rank: string; count: number; avgScore: number }>;

    const lowConfidenceTopics = metadataDb.all(sql`
      SELECT domain AS field, COUNT(*) AS count,
             ROUND(AVG(domain_hits), 2) AS avgHits,
             GROUP_CONCAT(id || ':' || SUBSTR(title, 1, 90), ' || ') AS samples
      FROM papers
      WHERE COALESCE(domain, '') = '' OR domain = 'General IC' OR domain_hits <= 1
      GROUP BY domain
      ORDER BY COUNT(*) DESC
      LIMIT ${sampleLimit}
    `) as Array<{ field: string; count: number; avgHits: number; samples: string }>;

    const venuePublicationMismatches = metadataDb.all(sql`
      SELECT id, title, year, venue, publication_title AS publicationTitle, domain, domain_hits AS domainHits
      FROM papers
      WHERE COALESCE(publication_title, '') != ''
        AND (
          (venue = 'JSSC' AND LOWER(publication_title) NOT LIKE '%solid-state circuits%')
          OR (venue = 'ISSCC' AND LOWER(publication_title) NOT LIKE '%solid-state circuits%')
          OR (venue = 'CICC' AND LOWER(publication_title) NOT LIKE '%custom integrated circuits%')
          OR (venue = 'VLSI' AND LOWER(publication_title) NOT LIKE '%vlsi%' AND LOWER(publication_title) NOT LIKE '%very large scale integration%')
          OR (venue = 'TCAD' AND LOWER(publication_title) NOT LIKE '%computer-aided design%' AND LOWER(publication_title) NOT LIKE '%tcad%')
          OR (venue = 'IEDM' AND LOWER(publication_title) NOT LIKE '%electron devices%')
        )
      ORDER BY year DESC, id DESC
      LIMIT ${sampleLimit}
    `) as Array<{ id: number; title: string; year: number; venue: string; publicationTitle: string; domain: string; domainHits: number }>;

    const aiReviewQueue = metadataDb.all(sql`
      SELECT
        a.id AS annotationId,
        a.paper_id AS paperId,
        p.title,
        p.year,
        p.venue,
        p.publication_title AS publicationTitle,
        a.provider,
        a.model,
        a.primary_domain AS primaryDomain,
        a.confidence,
        a.needs_review AS needsReview,
        a.topics_json AS topicsJson,
        a.summary_zh AS summary,
        a.updated_at AS updatedAt
      FROM paper_ai_annotations a
      JOIN papers p ON p.id = a.paper_id
      WHERE a.id = (
        SELECT latest.id
        FROM paper_ai_annotations latest
        WHERE latest.paper_id = a.paper_id
        ORDER BY latest.updated_at DESC, latest.id DESC
        LIMIT 1
      )
        AND (
          a.needs_review = 1
          OR a.confidence < 0.55
          OR a.topics_json IS NULL
          OR a.topics_json = '[]'
        )
      ORDER BY a.needs_review DESC, a.confidence ASC, a.updated_at DESC
      LIMIT ${sampleLimit}
    `) as Array<{
      annotationId: number;
      paperId: number;
      title: string;
      year: number;
      venue: string;
      publicationTitle: string;
      provider: string;
      model: string;
      primaryDomain: string;
      confidence: number;
      needsReview: number;
      topicsJson: string;
      summary: string;
      updatedAt: string;
    }>;


    const lowMetadataConfidence = metadataDb.all(sql`
      SELECT
        id,
        title,
        year,
        venue,
        doi,
        metadata_confidence AS metadataConfidence,
        confidence_flags_json AS flagsJson,
        confidence_reasons_json AS reasonsJson,
        last_metadata_audit_at AS lastMetadataAuditAt
      FROM papers
      WHERE metadata_confidence > 0 AND metadata_confidence < 60
      ORDER BY metadata_confidence ASC, year DESC, id DESC
      LIMIT ${sampleLimit}
    `).map((row: any) => ({
      ...row,
      flags: parseEvidence(row.flagsJson || "[]"),
      reasons: parseEvidence(row.reasonsJson || "[]"),
    })) as Array<{ id: number; title: string; year: number; venue: string; doi: string; metadataConfidence: number; flags: string[]; reasons: string[]; lastMetadataAuditAt: string }>;

    const rows = metadataDb.all<{ id: number; title: string; authors: string; affiliations: string; venue: string; year: number }>(sql`
      SELECT id, title, authors, affiliations, venue, year FROM papers ORDER BY year DESC LIMIT ${scanLimit}
    `);

    const instMap = new Map<string, { count: number; raw: Set<string>; samples: Array<{ id: number; title: string; raw: string }> }>();
    const authorMap = new Map<string, { count: number; raw: Set<string>; venues: Set<string>; samples: Array<{ id: number; title: string; name: string; venue: string; year: number }> }>();
    let missingAffiliations = 0;

    for (const row of rows) {
      const affiliations = splitList(row.affiliations);
      if (!affiliations.length) missingAffiliations += 1;
      for (const raw of affiliations) {
        const key = normalizeInstitution(raw);
        if (!key) continue;
        if (!instMap.has(key)) instMap.set(key, { count: 0, raw: new Set(), samples: [] });
        const entry = instMap.get(key)!;
        entry.count += 1;
        entry.raw.add(raw);
        if (entry.samples.length < 6) entry.samples.push({ id: row.id, title: row.title, raw });
      }

      for (const name of splitList(row.authors)) {
        const key = normalizePerson(name);
        if (!key) continue;
        if (!authorMap.has(key)) authorMap.set(key, { count: 0, raw: new Set(), venues: new Set(), samples: [] });
        const entry = authorMap.get(key)!;
        entry.count += 1;
        entry.raw.add(name);
        entry.venues.add(row.venue);
        if (entry.samples.length < 6) entry.samples.push({ id: row.id, title: row.title, name, venue: row.venue, year: row.year });
      }
    }

    const institutionVariants = [...instMap.entries()]
      .filter(([, value]) => value.count >= 3 && value.raw.size > 1)
      .map(([key, value]) => ({ key, count: value.count, variants: [...value.raw].slice(0, 12), samples: value.samples }))
      .sort((a, b) => b.count - a.count)
      .slice(0, sampleLimit);

    const ambiguousAuthors = [...authorMap.entries()]
      .filter(([, value]) => value.count >= 8 && (value.raw.size > 1 || value.venues.size >= 4))
      .map(([key, value]) => ({ key, count: value.count, variants: [...value.raw].slice(0, 12), venues: [...value.venues].slice(0, 12), samples: value.samples }))
      .sort((a, b) => b.count - a.count)
      .slice(0, sampleLimit);

    return {
      generatedAt: new Date().toISOString(),
      totalPapers: total,
      scannedRows: rows.length,
      sampleLimit,
      duplicateDoi,
      duplicateTitleYear,
      unknownVenues,
      lowConfidenceTopics,
      venuePublicationMismatches,
      aiReviewQueue,
      lowMetadataConfidence,
      institutionVariants,
      ambiguousAuthors,
      missingAffiliations,
      recommendations: [
        "优先复核重复 DOI 分组；这是置信度最高的重复候选。",
        "把宽口径期刊过滤规则沉淀到 data/venue_filters/journal_extensions.json，并记录相关性证据。",
        "在把地域地图和机构画像当成重要情报入口前，先完成机构归一化。",
        "不要只按姓名自动合并作者；应结合 ID、机构、合作者、方向和人工 override。",
        "宽口径期刊中接近相关性阈值的论文应进入复核队列。",
        "在使用会议等级、排序信号和机构画像前，先复核会议名与出版物标题的错配。",
        "使用 AI 辅助复核队列发现非 IC 泄漏、缺失方向关联和低置信标签。",
        "把 metadata_confidence 当作导入质量门槛：低置信论文应先进入后台复核，再进入报告或对比页面。"
      ]
    };
  }
};
