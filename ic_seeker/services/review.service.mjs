export function createReviewService({ openDb }) {
  function listReviews(professorId) {
    const db = openDb();
    try {
      const rows = db.prepare(`
        SELECT id, professor_id, public_alias, is_verified_review, relationship_type,
               structured_scores_json, strengths_text, cautions_text, fit_text,
               moderation_status, created_at
        FROM mentor_reviews
        WHERE professor_id = ? AND moderation_status IN ('approved', 'pending')
        ORDER BY created_at DESC
      `).all(String(professorId));
      return rows.map(row => ({
        ...row,
        scores: row.structured_scores_json ? JSON.parse(row.structured_scores_json) : {}
      }));
    } finally {
      db.close();
    }
  }

  function reviewStats(professorId) {
    const db = openDb();
    try {
      const rows = db.prepare(`
        SELECT COUNT(*) as total, SUM(is_verified_review) as verified
        FROM mentor_reviews
        WHERE professor_id = ? AND moderation_status IN ('approved', 'pending')
      `).get(String(professorId));
      return { total: rows.total || 0, verified: rows.verified || 0 };
    } finally {
      db.close();
    }
  }

  function addReview(professorId, body) {
    const db = openDb();
    try {
      const result = db.prepare(`
        INSERT INTO mentor_reviews (professor_id, user_id, public_alias, is_verified_review,
          relationship_type, structured_scores_json, strengths_text, cautions_text, fit_text, moderation_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(
        String(professorId),
        Number(body.userId || 0),
        String(body.publicAlias || 'Verified Reviewer'),
        body.isVerifiedReview ? 1 : 0,
        String(body.relationshipType || ''),
        JSON.stringify(body.scores || {}),
        String(body.strengthsText || ''),
        String(body.cautionsText || ''),
        String(body.fitText || '')
      );
      return { id: Number(result.lastInsertRowid) };
    } finally {
      db.close();
    }
  }

  return { listReviews, reviewStats, addReview };
}
