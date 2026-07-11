import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { AutocompleteInput } from '../components/AutocompleteInput'
import type { MentorCompareResult } from '../types'
import { friendlyError } from '../utils/errorMessages'
import { mentorPath } from '../utils/routes'

interface AuthorListItem {
  name: string
  papers: number
  authorScore: number
  sPlus: number
  s: number
  a: number
  citations: number
}

const reviewDimensionLabels: Record<string, string> = {
  overall: '综合',
  researchFit: '方向匹配',
  mentoringStyle: '指导方式',
  workload: '工作强度',
  communication: '沟通',
}

export default function MentorComparePage() {
  const [names, setNames] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<MentorCompareResult | null>(null)
  const [authors, setAuthors] = useState<AuthorListItem[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState('')

  useEffect(() => {
    setSuggestionsLoading(true)
    api.professors({ limit: 300, minPapers: 2 })
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setAuthors(list as AuthorListItem[])
        setSuggestionsError('')
      })
      .catch((err) => {
        setSuggestionsError(friendlyError(err, '加载学者列表失败'))
      })
      .finally(() => setSuggestionsLoading(false))
  }, [])

  const autocompleteOptions = useMemo(() => {
    return authors.map((a) => ({
      label: a.name,
      value: a.name,
      subtitle: `${a.papers} 篇 · 元数据信号 ${a.authorScore} · S+ ${a.sPlus}`,
    }))
  }, [authors])

  const canAdd = names.length < 4 && names[names.length - 1]?.trim()
  const canCompare = names.filter((n) => n.trim()).length >= 2

  function addField() {
    if (canAdd) setNames([...names, ''])
  }

  function updateName(index: number, value: string) {
    const next = [...names]
    next[index] = value
    setNames(next)
  }

  function removeName(index: number) {
    const next = names.filter((_, i) => i !== index)
    if (next.length === 0) next.push('')
    setNames(next)
  }

  async function handleCompare() {
    const validNames = names.map((n) => n.trim()).filter(Boolean)
    if (validNames.length < 2) {
      setError('至少需要输入 2 位研究者。')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.compareMentors(validNames)
      setResult(data)
    } catch (err: any) {
      setError(friendlyError(err, '研究者对比失败'))
    } finally {
      setLoading(false)
    }
  }

  const activeNames = useMemo(() => names.map((n) => n.trim()).filter(Boolean), [names])

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">研究者体验</p>
          <h1 className="text-2xl font-bold text-ink-text mt-0.5">研究者/课题组体验线索对比</h1>
          <p className="text-sm text-ink-muted mt-1">
            基于已审核匿名评价横向对比 2–4 位研究者。数据维度包括指导方式、方向匹配、沟通和组内体验。
          </p>
        </div>
      </section>

      <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
        <p className="text-sm text-amber-800 leading-relaxed">
          <strong>注意：</strong>此处对比仅基于匿名评价和样本阈值，不是论文维度对比，也不是研究者排名。如需查看学术产出，请去「研究者档案」页面。
        </p>
      </section>

      {error && (
        <div className="rounded-xl border p-3 text-sm bg-red-50 text-red-700 border-red-100">
          {error}
        </div>
      )}

      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div className="space-y-3">
          {names.map((name, index) => (
            <div key={index} className="flex gap-2">
              <AutocompleteInput
                value={name}
                onChange={(val) => updateName(index, val)}
                onSelect={(val) => updateName(index, val)}
                options={autocompleteOptions}
                loading={suggestionsLoading}
                placeholder={`研究者姓名 ${index + 1}`}
              />
              {names.length > 1 && (
                <button
                  onClick={() => removeName(index)}
                  className="px-3 py-2 rounded-lg bg-surface-elevated border border-line text-sm text-ink-secondary hover:bg-surface-soft transition-colors"
                >
                  移除
                </button>
              )}
            </div>
          ))}
          {suggestionsError && (
            <p className="text-sm text-red-600">{suggestionsError}</p>
          )}
          {!suggestionsLoading && !suggestionsError && autocompleteOptions.length === 0 && (
            <p className="text-sm text-ink-muted">未加载到学者数据，您可以继续手动输入。</p>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={addField}
            disabled={!canAdd}
            className="px-3 py-2 rounded-lg bg-surface-elevated border border-line text-sm text-ink-secondary disabled:opacity-50 hover:bg-surface-soft transition-colors"
          >
            添加研究者
          </button>
          <button
            onClick={handleCompare}
            disabled={!canCompare || loading}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-brand-700 transition-colors"
          >
            {loading ? '对比中...' : '开始对比'}
          </button>
        </div>
      </section>

      {result && result.mentors.length > 0 && (
        <section className="space-y-5">
          {/* Review Count & Visibility */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm overflow-x-auto">
            <h2 className="font-semibold text-ink-text mb-4">评价可见性</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line-strong text-left text-xs text-ink-subtle uppercase tracking-wide">
                  <th className="py-2 pr-4 font-medium">研究者</th>
                  <th className="py-2 pr-4 font-medium">已公开评价</th>
                  <th className="py-2 pr-4 font-medium">展示等级</th>
                  <th className="py-2 pr-4 font-medium">档案</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {result.mentors.map((m) => (
                  <tr key={m.name}>
                    <td className="py-2 pr-4 font-medium text-ink-text">
                      <Link to={mentorPath(m.name)} className="hover:text-brand-600 transition-colors">
                        {m.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-ink-secondary">{m.approvedCount}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs ${
                        m.visibilityLevel === 'insufficient' ? 'bg-red-50 text-red-700 border-red-100' :
                        m.visibilityLevel === 'aggregate' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        m.visibilityLevel === 'summary' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-green-50 text-green-700 border-green-100'
                      }`}>
                        {m.visibilityLevel === 'insufficient' ? '样本不足' : m.visibilityLevel === 'aggregate' ? '仅聚合' : m.visibilityLevel === 'summary' ? '摘要' : '可展示'}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <Link to={m.publicationProfileLink} className="text-xs text-brand-600 hover:underline">
                        查看档案
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Aggregate Scores */}
          {result.mentors.some((m) => m.aggregate) && (
            <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm overflow-x-auto">
              <h2 className="font-semibold text-ink-text mb-4">匿名评价聚合</h2>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-line-strong text-left text-xs text-ink-subtle uppercase tracking-wide">
                    <th className="py-2 pr-4 font-medium">维度</th>
                    {result.mentors.map((m) => (
                      <th key={m.name} className="py-2 pr-4 font-medium">{m.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {['overall', 'researchFit', 'mentoringStyle', 'workload', 'communication'].map((dim) => (
                    <tr key={dim}>
                      <td className="py-2 pr-4 text-ink-subtle">
                        {reviewDimensionLabels[dim] || dim}
                      </td>
                      {result.mentors.map((m) => {
                        const val = m.aggregate?.[dim as keyof typeof m.aggregate] as number | null
                        return (
                          <td key={m.name} className="py-2 pr-4 text-ink-secondary">
                            {val !== null && val !== undefined ? val.toFixed(1) : '-'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summaries */}
          {result.mentors.some((m) => m.summary) && (
            <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-ink-text mb-4">评价摘要</h2>
              <div className="space-y-4">
                {result.mentors.filter((m) => m.summary).map((m) => (
                  <div key={m.name} className="border-l-4 border-brand-300 pl-4">
                    <p className="text-sm font-medium text-ink-text mb-1">{m.name}</p>
                    <p className="text-sm text-ink-secondary leading-relaxed">{m.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviewed Comments */}
          {result.mentors.some((m) => m.curatedComments.length > 0) && (
            <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-ink-text mb-4">已审核匿名评论</h2>
              <div className="space-y-4">
                {result.mentors.filter((m) => m.curatedComments.length > 0).map((m) => (
                  <div key={m.name}>
                    <p className="text-sm font-medium text-ink-text mb-2">{m.name}</p>
                    <div className="space-y-2">
                      {m.curatedComments.map((comment, idx) => (
                        <div key={idx} className="bg-surface-elevated border border-line rounded-lg p-3">
                          <p className="text-xs text-ink-subtle mb-1">{comment.publicAlias}</p>
                          <p className="text-sm text-ink-secondary leading-relaxed">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insufficient Data Notice */}
          {result.mentors.some((m) => m.visibilityLevel === 'insufficient') && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-red-800">
                部分研究者通过审核的评价少于 3 条。为保护隐私，系统不会展示聚合评价；可进入个人档案查看论文维度信息。
              </p>
            </div>
          )}
        </section>
      )}

      {activeNames.length === 0 && !result && (
        <div className="bg-surface-panel border border-line rounded-xl p-8 shadow-sm text-center">
          <p className="text-ink-muted text-sm">输入 2–4 位研究者后开始对比。</p>
        </div>
      )}

      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <p className="text-xs text-ink-subtle leading-relaxed">
          {result?.caveat || '研究者/课题组体验线索对比基于通过审核的匿名评价，并受样本阈值保护。它用于了解课题组体验和匹配度，不用于排名、人身攻击或未经核实的指控。'}
        </p>
      </section>
    </div>
  )
}
