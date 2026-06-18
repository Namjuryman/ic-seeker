function splitList(value) {
  return String(value || '').split(';').map(item => item.trim()).filter(Boolean);
}

export function createDiscussionService({ openDb }) {
  function listComments(paperId) {
    const db = openDb();
    try {
      const rows = db.prepare(`
        SELECT c.id, c.paper_id, c.user_id, c.comment_type, c.body, c.moderation_status, c.created_at,
               u.nickname, u.verification_status
        FROM paper_comments c
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.paper_id = ? AND c.moderation_status IN ('approved', 'pending')
        ORDER BY c.created_at DESC
      `).all(Number(paperId));
      return rows.map(row => ({
        ...row,
        verified: row.verification_status === 'verified',
        displayName: row.nickname || 'Anonymous'
      }));
    } finally {
      db.close();
    }
  }

  function addComment(paperId, body) {
    const db = openDb();
    try {
      const result = db.prepare(`
        INSERT INTO paper_comments (paper_id, user_id, comment_type, body, moderation_status)
        VALUES (?, ?, ?, ?, 'approved')
      `).run(Number(paperId), Number(body.userId || 0), String(body.commentType || 'Technical Note'), String(body.body || ''));
      return { id: Number(result.lastInsertRowid), paperId: Number(paperId), commentType: body.commentType, body: body.body };
    } finally {
      db.close();
    }
  }

  return { listComments, addComment };
}
