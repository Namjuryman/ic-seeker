import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import type { PaperComment, PaperRow } from '../types'

const COMMENTS_PAGE_SIZE = 20

const REPORT_REASONS = [
  'off-topic',
  'personal attack',
  'spam',
  'misleading',
  'copyright concern',
  'other',
]

function splitAuthors(authors: string) {
  return String(authors || '').split(';').map((author) => author.trim()).filter(Boolean)
}

function cleanText(value: string | undefined) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function citationText(paper: PaperRow, format: 'ieee' | 'apa' | 'bibtex') {
  const authors = splitAuthors(paper.authors)
  const authorText = authors.length ? authors.slice(0, 6).join(', ') + (authors.length > 6 ? ', et al.' : '') : 'Unknown Author'
  const title = cleanText(paper.title)
  if (format === 'apa') return `${authorText} (${paper.year}). ${title}. ${paper.venue}. ${paper.doi ? `https://doi.org/${paper.doi}` : ''}`.trim()
  if (format === 'bibtex') {
    const key = `${authors[0]?.split(' ').pop() || 'paper'}${paper.year}`.replace(/[^A-Za-z0-9]/g, '')
    return `@article{${key},\n  title={${title}},\n  author={${authors.join(' and ')}},\n  journal={${paper.venue}},\n  year={${paper.year}},\n  doi={${paper.doi || ''}}\n}`
  }
  return `${authorText}, "${title}," ${paper.venue}, ${paper.year}${paper.doi ? `, doi: ${paper.doi}` : ''}.`
}

export default function PaperDetailPage() {
  const { id } = useParams()
  const paperId = Number(id)
  const [paper, setPaper] = useState<(PaperRow & { note?: string }) | null>(null)
  const [comments, setComments] = useState<PaperComment[]>([])
  const [commentOffset, setCommentOffset] = useState(0)
  const [hasMoreComments, setHasMoreComments] = useState(false)
  const [note, setNote] = useState('')
  const [tagText, setTagText] = useState('')
  const [readingStatus, setReadingStatus] = useState('unread')
  const [commentBody, setCommentBody] = useState('')
  const [commentType, setCommentType] = useState('Technical Note')
  const [message, setMessage] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [reportedIds, setReportedIds] = useState<Set<number>>(new Set())
  const [activeReportId, setActiveReportId] = useState<number | null>(null)

  const authors = useMemo(() => splitAuthors(paper?.authors || ''), [paper?.authors])

  async function loadComments(nextOffset = 0, append = false) {
    setLoadingComments(true)
    try {
      const rows = await api.paperComments(paperId, { limit: COMMENTS_PAGE_SIZE, offset: nextOffset })
      setComments((prev) => append ? [...prev, ...rows] : rows)
      setCommentOffset(nextOffset)
      setHasMoreComments(rows.length === COMMENTS_PAGE_SIZE)
    } finally {
      setLoadingComments(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(paperId)) return
    async function load() {
      const data = await api.paper(paperId)
      setPaper(data)
      setNote(data.note || '')
      setReadingStatus(data.readingStatus || 'unread')
      setTagText((data.tags || []).map((tag) => tag.name).join(', '))
      await loadComments(0, false)
    }
    load().catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId])

  async function saveState(nextFavorite = paper?.favorite) {
    if (!paper) return
    const updated = await api.updatePaperState(paper.id, {
      favorite: nextFavorite,
      readingStatus,
      note,
      tags: tagText.split(',').map((tag) => tag.trim()).filter(Boolean),
    })
    setPaper(updated)
    setMessage('已保存')
    setTimeout(() => setMessage(''), 1600)
  }

  async function copyCitation(format: 'ieee' | 'apa' | 'bibtex') {
    if (!paper) return
    await navigator.clipboard.writeText(citationText(paper, format))
    setMessage(`已复制 ${format.toUpperCase()}`)
    setTimeout(() => setMessage(''), 1600)
  }

  async function addComment() {
    if (!paper || !commentBody.trim()) return
    await api.addPaperComment(paper.id, { commentType, body: commentBody })
    setCommentBody('')
    await loadComments(0, false)
    setMessage('评论已提交，敏感内容会进入审核')
    setTimeout(() => setMessage(''), 1800)
  }

  async function reportComment(commentId: number, reason: string) {
    try {
      await api.reportContent('paper_comment', commentId, reason)
      setReportedIds((prev) => new Set(prev).add(commentId))
      setActiveReportId(null)
      setMessage('已举报')
      setTimeout(() => setMessage(''), 1600)
    } catch (err: any) {
      setMessage(err?.response?.data?.error || err?.message || '举报失败')
      setTimeout(() => setMessage(''), 1800)
    }
  }

  if (!paper) {
    return <div className="ss-skeleton-page"><p>Loading paper...</p></div>
  }

  return (
    <div className="ss-paper-detail-page">
      <Link to="/" className="ss-back-button">返回搜索</Link>

      <section className="ss-paper-detail-hero">
        <div>
          <div className="ss-paper-meta">
            <span className="rank">{paper.rank || '-'}</span>
            <span>{paper.venue || '-'}</span>
            <span>{paper.field || 'General IC'}</span>
            <span>{paper.year}</span>
            <span>score {Number(paper.score || 0).toFixed(1)}</span>
            <span>{paper.citationCount || 0} citations</span>
          </div>
          <h1>{cleanText(paper.title)}</h1>
          <p>{authors.slice(0, 14).join('; ')}{authors.length > 14 ? ' ...' : ''}</p>
        </div>
        <div className="ss-paper-detail-actions">
          <button onClick={() => saveState(!paper.favorite)}>{paper.favorite ? '已收藏' : '收藏'}</button>
          <button onClick={() => copyCitation('ieee')}>IEEE</button>
          <button onClick={() => copyCitation('apa')}>APA</button>
          <button onClick={() => copyCitation('bibtex')}>BibTeX</button>
        </div>
        {message && <div className="ss-toast inline">{message}</div>}
      </section>

      <div className="ss-paper-detail-grid">
        <main className="ss-profile-main">
          <section className="ss-panel">
            <div className="ss-panel-head compact">
              <h2>摘要</h2>
            </div>
            <p className="ss-detail-abstract">{cleanText(paper.abstract) || '暂无摘要。'}</p>
          </section>

          <section className="ss-panel">
            <div className="ss-panel-head compact">
              <h2>论文讨论</h2>
              <span>{comments.length} comments</span>
            </div>
            <div className="ss-comment-list">
              {loadingComments && comments.length === 0 ? (
                <div className="ss-skeleton-page"><p>评论加载中...</p></div>
              ) : comments.length === 0 ? (
                <p>暂无评论。适合记录技术问题、复现笔记和相关工作补充。</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="ss-comment-item">
                    <div className="ss-comment-header">
                      <strong>{comment.displayName || comment.nickname || 'User'}</strong>
                      <span>{comment.comment_type || comment.commentType || 'Comment'}</span>
                    </div>
                    <p>{comment.body}</p>
                    <div className="ss-comment-actions">
                      {activeReportId === comment.id ? (
                        <div className="ss-report-reasons">
                          {REPORT_REASONS.map((reason) => (
                            <button
                              key={reason}
                              className="ss-report-reason"
                              onClick={() => reportComment(comment.id, reason)}
                              disabled={reportedIds.has(comment.id)}
                            >
                              {reason}
                            </button>
                          ))}
                          <button className="ss-report-cancel" onClick={() => setActiveReportId(null)}>取消</button>
                        </div>
                      ) : (
                        <button
                          className="ss-comment-report"
                          onClick={() => setActiveReportId(comment.id)}
                          disabled={reportedIds.has(comment.id)}
                        >
                          {reportedIds.has(comment.id) ? '已举报' : 'Report'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            {hasMoreComments && !loadingComments && (
              <button className="ss-comment-submit subtle" onClick={() => loadComments(commentOffset + COMMENTS_PAGE_SIZE, true)}>
                加载更多评论
              </button>
            )}
            {loadingComments && comments.length > 0 && <p className="ss-comment-loading">加载中...</p>}
            <div className="ss-comment-editor">
              <p className="ss-comment-hint">
                Discuss the paper, methods, circuits, experiments, and reproducibility. Do not attack authors personally.
              </p>
              <select value={commentType} onChange={(event) => setCommentType(event.target.value)}>
                <option>Question</option>
                <option>Technical Note</option>
                <option>Reproduction Note</option>
                <option>Related Work</option>
                <option>Correction</option>
                <option>Reading Summary</option>
              </select>
              <textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder="评论论文内容，不攻击作者个人；不要上传或分享 PDF。" />
              <button className="ss-comment-submit" onClick={addComment} disabled={!commentBody.trim()}>提交评论</button>
            </div>
          </section>
        </main>

        <aside className="ss-profile-side">
          <section className="ss-panel">
            <div className="ss-panel-head compact"><h2>Metadata</h2></div>
            <dl className="ss-detail-facts">
              <dt>DOI</dt><dd>{paper.doi || '-'}</dd>
              <dt>机构</dt><dd>{paper.affiliations || '-'}</dd>
              <dt>采集来源</dt><dd>{paper.collectionMethod || '-'}</dd>
              <dt>PDF 状态</dt><dd>{paper.downloadStatus || '-'}</dd>
              <dt>验证状态</dt><dd>{paper.verificationStatus || '-'}</dd>
            </dl>
            <div className="ss-detail-buttons">
              {paper.doi && <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">打开 DOI</a>}
              {paper.pdfLink && <a href={paper.pdfLink} target="_blank" rel="noreferrer">打开 PDF</a>}
              {paper.sourceUrl && <a href={paper.sourceUrl} target="_blank" rel="noreferrer">来源</a>}
            </div>
          </section>

          <section className="ss-panel ss-reading-box">
            <div className="ss-panel-head compact"><h2>阅读与笔记</h2></div>
            <label>
              <span>状态</span>
              <select value={readingStatus} onChange={(event) => setReadingStatus(event.target.value)}>
                <option value="unread">未读</option>
                <option value="reading">在读</option>
                <option value="read">已读</option>
                <option value="important">重点</option>
                <option value="skip">跳过</option>
              </select>
            </label>
            <label><span>标签</span><input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="PMIC, must-read" /></label>
            <label><span>私人笔记</span><textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <button className="ss-apply-filter" onClick={() => saveState()}>保存阅读状态</button>
          </section>
        </aside>
      </div>
    </div>
  )
}
