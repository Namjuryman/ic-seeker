import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { EmptyState, ErrorState, SkeletonState } from '../components/StatusState'
import { useI18n } from '../i18n'
import { aiModelLabel, collectionMethodLabel, downloadStatusLabel, paperRankLabel, providerLabel, verificationStatusLabel } from '../utils/displayLabels'
import { friendlyError } from '../utils/errorMessages'
import type { PaperAiSummary, PaperComment, PaperRow } from '../types'

const COMMENTS_PAGE_SIZE = 20

const REPORT_REASONS = [
  'off-topic',
  'personal attack',
  'spam',
  'misleading',
  'copyright concern',
  'other',
]

const reportReasonLabels: Record<string, string> = {
  'off-topic': '偏离主题',
  'personal attack': '人身攻击',
  spam: '垃圾信息',
  misleading: '误导信息',
  'copyright concern': '版权问题',
  other: '其他',
}

const READING_STATUS_VALUES = [
  'unread',
  'reading',
  'read',
  'important',
  'skip',
  'review_later',
  'use_for_literature_review',
  'use_for_application',
  'use_for_project',
]

function splitAuthors(authors: string) {
  return String(authors || '').split(';').map((author) => author.trim()).filter(Boolean)
}

function cleanText(value: string | undefined) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function commentTypeLabel(value: string | undefined, language: 'zh' | 'en') {
  if (!value) return language === 'zh' ? '评论' : 'Comment'
  const labels: Record<string, { zh: string; en: string }> = {
    comment: { zh: '评论', en: 'Comment' },
    question: { zh: '问题', en: 'Question' },
    correction: { zh: '纠错', en: 'Correction' },
    note: { zh: '笔记', en: 'Note' },
    review: { zh: '评价', en: 'Review' },
  }
  return labels[value]?.[language] || value.replace(/[_-]/g, ' ')
}

function citationText(paper: PaperRow, format: 'ieee' | 'apa' | 'bibtex', unknownAuthor = '作者待补全') {
  const authors = splitAuthors(paper.authors)
  const authorText = authors.length ? authors.slice(0, 6).join(', ') + (authors.length > 6 ? ', et al.' : '') : unknownAuthor
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
  const { language, t } = useI18n()
  const [paper, setPaper] = useState<(PaperRow & { note?: string }) | null>(null)
  const [loadError, setLoadError] = useState('')
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
  const [aiSummary, setAiSummary] = useState<PaperAiSummary | null>(null)
  const [translating, setTranslating] = useState(false)

  const queryClient = useQueryClient()
  const authors = useMemo(() => splitAuthors(paper?.authors || ''), [paper?.authors])
  const readingOptions = useMemo(() => READING_STATUS_VALUES.map((value) => ({
    value,
    label: t(`paper.reading.${value}` as any),
  })), [t])

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
    let alive = true
    async function load() {
      setLoadError('')
      try {
        const data = await api.paper(paperId)
        if (!alive) return
        setPaper(data)
        setNote(data.note || '')
        setReadingStatus(data.readingStatus || 'unread')
        setTagText((data.tags || []).map((tag) => tag.name).join(', '))
        await loadComments(0, false)
      } catch (err: any) {
        if (alive) setLoadError(friendlyError(err, t('paper.detailLoadFailed'), language))
      }
    }
    load()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, paperId, t])

  async function saveState(nextFavorite = paper?.favorite) {
    if (!paper) return
    const updated = await api.updatePaperState(paper.id, {
      favorite: nextFavorite,
      readingStatus,
      note,
      tags: tagText.split(',').map((tag) => tag.trim()).filter(Boolean),
    })
    setPaper(updated)
    setMessage(t('common.saved'))
    setTimeout(() => setMessage(''), 1600)
  }

  async function translateAbstract(refresh = false) {
    if (!paper) return
    setTranslating(true)
    try {
      const result = await api.paperAiSummary(paper.id, { refresh })
      setAiSummary(result)
      setMessage(result.cacheHit ? t('paper.translateCached') : t('paper.translateFresh'))
    } catch (err: any) {
      setMessage(friendlyError(err, t('paper.translateError'), language))
    } finally {
      setTranslating(false)
      setTimeout(() => setMessage(''), 1800)
    }
  }

  const updateReadingQueue = useMutation({
    mutationFn: (status: string) => api.updateReadingQueue(paperId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-queue'] })
      setMessage(t('paper.queueUpdated'))
      setTimeout(() => setMessage(''), 1600)
    },
  })

  async function copyCitation(format: 'ieee' | 'apa' | 'bibtex') {
    if (!paper) return
    await navigator.clipboard.writeText(citationText(paper, format, language === 'en' ? 'Unknown author' : '作者待补全'))
    setMessage(t('paper.copiedCitation', { format: format.toUpperCase() }))
    setTimeout(() => setMessage(''), 1600)
  }

  async function addComment() {
    if (!paper || !commentBody.trim()) return
    await api.addPaperComment(paper.id, { commentType, body: commentBody })
    setCommentBody('')
    await loadComments(0, false)
    setMessage(t('paper.commentSubmitted'))
    setTimeout(() => setMessage(''), 1800)
  }

  async function reportComment(commentId: number, reason: string) {
    try {
      await api.reportContent('paper_comment', commentId, reason)
      setReportedIds((prev) => new Set(prev).add(commentId))
      setActiveReportId(null)
      setMessage(t('paper.reportSubmitted'))
      setTimeout(() => setMessage(''), 1600)
    } catch (err: any) {
      setMessage(friendlyError(err, t('paper.reportFailed'), language))
      setTimeout(() => setMessage(''), 1800)
    }
  }

  if (loadError) {
    return <ErrorState title={t('paper.detailLoadFailed')} description={loadError} onRetry={() => window.location.reload()} />
  }

  if (!paper) {
    return <SkeletonState variant="detail" title={t('paper.detailLoading')} description={t('paper.detailLoadingDesc')} />
  }

  const translatedSummary = language === 'zh' ? aiSummary?.summaryZh : aiSummary?.summaryEn

  return (
    <div className="ss-paper-detail-page">
      <Link to="/" className="ss-back-button">{t('common.backToSearch')}</Link>

      <section className="ss-paper-detail-hero">
        <div>
          <div className="ss-paper-meta">
            <span className="rank">{paperRankLabel(paper.rank, language)}</span>
            <span>{paper.venue || '-'}</span>
            <span>{paper.field || 'General IC'}</span>
            <span>{paper.year}</span>
            <span>{language === 'zh' ? '排序信号' : 'sorting signal'} {Number(paper.score || 0).toFixed(1)}</span>
            <span>{paper.citationCount || 0} {language === 'zh' ? '引用' : 'citations'}</span>
          </div>
          <h1>{cleanText(paper.title)}</h1>
          <p>{authors.slice(0, 14).join('; ')}{authors.length > 14 ? ' ...' : ''}</p>
          <p className="text-xs text-ink-subtle mt-2">
            {language === 'zh'
              ? '排序信号由会议/期刊权重、引用和年份启发式计算，只用于检索排序，不代表论文最终学术价值。'
              : 'The sorting signal is a heuristic from venue weight, citations, and recency, not a final academic judgment.'}
          </p>
        </div>
        <div className="ss-paper-detail-actions">
          <button onClick={() => saveState(!paper.favorite)}>{paper.favorite ? t('common.favorited') : t('common.favorite')}</button>
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
              <h2>{t('paper.abstract')}</h2>
              <button className="ss-subtle-button" type="button" onClick={() => translateAbstract(false)} disabled={translating}>
                {translating ? t('common.loading') : t('paper.translate')}
              </button>
            </div>
            <p className="ss-detail-abstract">{cleanText(paper.abstract) || t('common.noAbstract')}</p>
            {translatedSummary && (
              <div className="ss-ai-summary">
                <strong>{t('paper.translation')}</strong>
                <p>{translatedSummary}</p>
                <small>{aiSummary?.cacheHit ? t('paper.translateCached') : `${providerLabel(aiSummary?.provider || 'AI', language)} · ${aiModelLabel(aiSummary?.model, language)}`}</small>
              </div>
            )}
          </section>

          <section className="ss-panel">
            <div className="ss-panel-head compact">
              <h2>{t('paper.discussion')}</h2>
              <span>{comments.length} {t('common.comments')}</span>
            </div>
            <div className="ss-comment-list">
              {loadingComments && comments.length === 0 ? (
                <SkeletonState variant="list" title={t('paper.commentsLoading')} description={t('paper.commentsPublicOnly')} />
              ) : comments.length === 0 ? (
                <EmptyState title={t('common.noComments')} description={t('paper.commentsEmptyHint')} />
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="ss-comment-item">
                    <div className="ss-comment-header">
                      <strong>{comment.displayName || comment.nickname || (language === 'zh' ? '用户' : 'User')}</strong>
                      <span>{commentTypeLabel(comment.comment_type || comment.commentType, language)}</span>
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
                              {language === 'zh' ? reportReasonLabels[reason] || reason : reason}
                            </button>
                          ))}
                          <button className="ss-report-cancel" onClick={() => setActiveReportId(null)}>{t('common.cancel')}</button>
                        </div>
                      ) : (
                        <button
                          className="ss-comment-report"
                          onClick={() => setActiveReportId(comment.id)}
                          disabled={reportedIds.has(comment.id)}
                        >
                          {reportedIds.has(comment.id) ? t('common.reported') : t('common.report')}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            {hasMoreComments && !loadingComments && (
              <button className="ss-comment-submit subtle" onClick={() => loadComments(commentOffset + COMMENTS_PAGE_SIZE, true)}>
                {t('paper.loadMoreComments')}
              </button>
            )}
            {loadingComments && comments.length > 0 && <p className="ss-comment-loading">{t('common.loading')}</p>}
            <div className="ss-comment-editor">
              <p className="ss-comment-hint">{t('paper.commentHint')}</p>
              <select value={commentType} onChange={(event) => setCommentType(event.target.value)}>
                <option value="Question">{language === 'zh' ? '问题' : 'Question'}</option>
                <option value="Technical Note">{language === 'zh' ? '技术笔记' : 'Technical Note'}</option>
                <option value="Reproduction Note">{language === 'zh' ? '复现记录' : 'Reproduction Note'}</option>
                <option value="Related Work">{language === 'zh' ? '相关工作' : 'Related Work'}</option>
                <option value="Correction">{language === 'zh' ? '纠错' : 'Correction'}</option>
                <option value="Reading Summary">{language === 'zh' ? '阅读摘要' : 'Reading Summary'}</option>
              </select>
              <textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder={t('paper.commentPlaceholder')} />
              <button className="ss-comment-submit" onClick={addComment} disabled={!commentBody.trim()}>{t('common.submit')}</button>
            </div>
          </section>
        </main>

        <aside className="ss-profile-side">
          <section className="ss-panel">
            <div className="ss-panel-head compact"><h2>{language === 'zh' ? '论文信息' : t('paper.metadata')}</h2></div>
            <dl className="ss-detail-facts">
              <dt>DOI</dt><dd>{paper.doi || '-'}</dd>
              <dt>{t('paper.institution')}</dt><dd>{paper.affiliations || '-'}</dd>
              <dt>{t('paper.collectionSource')}</dt><dd>{collectionMethodLabel(paper.collectionMethod, language)}</dd>
              <dt>{t('paper.pdfStatus')}</dt><dd>{downloadStatusLabel(paper.downloadStatus, language)}</dd>
              <dt>{t('paper.verificationStatus')}</dt><dd>{verificationStatusLabel(paper.verificationStatus, language)}</dd>
            </dl>
            <div className="ss-detail-buttons">
              {paper.doi && <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">{t('common.openDoi')}</a>}
              {paper.pdfLink && <a href={paper.pdfLink} target="_blank" rel="noreferrer">{t('common.openPdf')}</a>}
              {paper.sourceUrl && <a href={paper.sourceUrl} target="_blank" rel="noreferrer">{t('common.source')}</a>}
            </div>
          </section>

          <section className="ss-panel ss-reading-box">
            <div className="ss-panel-head compact"><h2>{t('paper.readingNotes')}</h2></div>
            <label>
              <span>{t('paper.status')}</span>
              <select value={readingStatus} onChange={(event) => setReadingStatus(event.target.value)}>
                {readingOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label><span>{t('paper.tags')}</span><input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="PMIC, must-read" /></label>
            <label><span>{t('paper.privateNote')}</span><textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <button className="ss-apply-filter" onClick={() => saveState()}>{t('paper.saveReading')}</button>
          </section>

          <section className="ss-panel">
            <div className="ss-panel-head compact"><h2>{t('paper.readingQueue')}</h2></div>
            <div className="space-y-2 text-sm">
              <p className="text-ink-muted text-xs">{t('paper.quickQueueHint')}</p>
              <div className="flex flex-wrap gap-1">
                {readingOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`text-xs px-2 py-1 rounded border ${readingStatus === opt.value ? 'bg-brand-50 border-brand-200 text-brand-700' : 'border-line hover:bg-surface-elevated'}`}
                    onClick={() => {
                      setReadingStatus(opt.value)
                      updateReadingQueue.mutate(opt.value)
                    }}
                    disabled={updateReadingQueue.isPending}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
