import { sqlite } from "../db/connection.js";

function mapRow(row: any) {
  return {
    id: row.id,
    paperId: row.paper_id,
    filePath: row.file_path,
    fileHash: row.file_hash,
    fileSize: Number(row.file_size || 0),
    titleGuess: row.title_guess,
    doiGuess: row.doi_guess,
    matchStatus: row.match_status,
    matchConfidence: Number(row.match_confidence || 0),
    pageCount: row.page_count,
    ocrStatus: row.ocr_status,
    extractedTextHash: row.extracted_text_hash,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const localPdfService = {
  list(options: { status?: string; limit?: number; offset?: number } = {}) {
    const limit = Math.max(1, Math.min(200, Number(options.limit || 50)));
    const offset = Math.max(0, Number(options.offset || 0));
    const status = String(options.status || "all");
    const where = status === "all" ? "" : "WHERE match_status = @status";
    const rows = sqlite.prepare(`SELECT * FROM local_pdf_items ${where} ORDER BY match_confidence DESC, updated_at DESC LIMIT @limit OFFSET @offset`).all({ status, limit, offset }).map(mapRow);
    const total = sqlite.prepare(`SELECT COUNT(*) AS n FROM local_pdf_items ${where}`).get({ status }) as { n: number };
    const summary = sqlite.prepare(`SELECT match_status AS status, COUNT(*) AS count FROM local_pdf_items GROUP BY match_status`).all();
    return {
      rows,
      total: total?.n || 0,
      limit,
      offset,
      summary,
      policy: {
        localOnly: true,
        uploadedPdfStorage: false,
        note: "SiliconScope 只保存本地文件路径和元数据匹配结果；不会上传、再分发或导出受版权保护的 PDF。",
      },
    };
  },

  update(id: string, body: Record<string, unknown>) {
    const allowedStatus = new Set(["matched", "candidate", "unmatched", "ignored"]);
    const matchStatus = body.matchStatus ? String(body.matchStatus) : null;
    if (matchStatus && !allowedStatus.has(matchStatus)) throw new Error("PDF 匹配状态无效。");
    const paperId = body.paperId === null || body.paperId === undefined || body.paperId === "" ? null : Number(body.paperId);
    if (paperId !== null && !Number.isFinite(paperId)) throw new Error("论文 ID 无效。");
    sqlite.prepare(`
      UPDATE local_pdf_items
      SET paper_id = COALESCE(@paperId, paper_id),
          match_status = COALESCE(@matchStatus, match_status),
          match_confidence = COALESCE(@matchConfidence, match_confidence),
          ocr_status = COALESCE(@ocrStatus, ocr_status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({
      id,
      paperId,
      matchStatus,
      matchConfidence: body.matchConfidence === undefined ? null : Number(body.matchConfidence),
      ocrStatus: body.ocrStatus ? String(body.ocrStatus) : null,
    });
    const row = sqlite.prepare("SELECT * FROM local_pdf_items WHERE id = ?").get(id) as any;
    if (!row) throw new Error("本地 PDF 条目不存在。");
    return mapRow(row);
  },
};
