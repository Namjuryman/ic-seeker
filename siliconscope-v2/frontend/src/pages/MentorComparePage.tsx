import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { MentorCompareResult } from '../types'
import { mentorPath } from '../utils/routes'

export default function MentorComparePage() {
  const [names, setNames] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<MentorCompareResult | null>(null)

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
      setError('At least 2 mentor names are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.compareMentors(validNames)
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to compare mentors')
    } finally {
      setLoading(false)
    }
  }

  const activeNames = useMemo(() => names.map((n) => n.trim()).filter(Boolean), [names])

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Intelligence</p>
          <h1 className="text-2xl font-bold text-ink-text mt-0.5">Compare Mentors</h1>
          <p className="text-sm text-ink-muted mt-1">
            Enter 2–4 mentor names to compare verified anonymous reviews with threshold protection.
          </p>
        </div>
      </section>

      <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
        <p className="text-sm text-amber-800 leading-relaxed">
          <strong>Privacy & Threshold Protection:</strong> Mentor comparison uses only approved reviews. 
          Less than 3 reviews = insufficient data; 3–4 = aggregate scores only; 5–9 = aggregate + summary; 10+ = aggregate + summary + curated comments. 
          No ranking, no personal attacks, no identity exposure.
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
              <input
                type="text"
                value={name}
                onChange={(e) => updateName(index, e.target.value)}
                placeholder={`Mentor name ${index + 1}`}
                className="flex-1 px-3 py-2 rounded-lg border border-line bg-surface-elevated text-sm text-ink-text focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300"
              />
              {names.length > 1 && (
                <button
                  onClick={() => removeName(index)}
                  className="px-3 py-2 rounded-lg bg-surface-elevated border border-line text-sm text-ink-secondary hover:bg-surface-soft transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={addField}
            disabled={!canAdd}
            className="px-3 py-2 rounded-lg bg-surface-elevated border border-line text-sm text-ink-secondary disabled:opacity-50 hover:bg-surface-soft transition-colors"
          >
            Add Mentor
          </button>
          <button
            onClick={handleCompare}
            disabled={!canCompare || loading}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-brand-700 transition-colors"
          >
            {loading ? 'Comparing...' : 'Compare'}
          </button>
        </div>
      </section>

      {result && result.mentors.length > 0 && (
        <section className="space-y-5">
          {/* Review Count & Visibility */}
          <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm overflow-x-auto">
            <h2 className="font-semibold text-ink-text mb-4">Review Availability</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line-strong text-left text-xs text-ink-subtle uppercase tracking-wide">
                  <th className="py-2 pr-4 font-medium">Mentor</th>
                  <th className="py-2 pr-4 font-medium">Approved Reviews</th>
                  <th className="py-2 pr-4 font-medium">Visibility Level</th>
                  <th className="py-2 pr-4 font-medium">Profile</th>
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
                        {m.visibilityLevel}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <Link to={m.publicationProfileLink} className="text-xs text-brand-600 hover:underline">
                        View Profile
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
              <h2 className="font-semibold text-ink-text mb-4">Aggregate Scores</h2>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-line-strong text-left text-xs text-ink-subtle uppercase tracking-wide">
                    <th className="py-2 pr-4 font-medium">Dimension</th>
                    {result.mentors.map((m) => (
                      <th key={m.name} className="py-2 pr-4 font-medium">{m.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {['overall', 'researchFit', 'mentoringStyle', 'workload', 'communication'].map((dim) => (
                    <tr key={dim}>
                      <td className="py-2 pr-4 text-ink-subtle capitalize">{dim.replace(/([A-Z])/g, ' $1').trim()}</td>
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
              <h2 className="font-semibold text-ink-text mb-4">Review Summaries</h2>
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

          {/* Curated Comments */}
          {result.mentors.some((m) => m.curatedComments.length > 0) && (
            <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-ink-text mb-4">Curated Comments</h2>
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
                Some mentors have fewer than 3 approved reviews. Their data is hidden for privacy protection. 
                Please check their individual profile pages for publication-based information.
              </p>
            </div>
          )}
        </section>
      )}

      {activeNames.length === 0 && !result && (
        <div className="bg-surface-panel border border-line rounded-xl p-8 shadow-sm text-center">
          <p className="text-ink-muted text-sm">Enter 2–4 mentor names to begin a comparison.</p>
        </div>
      )}

      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <p className="text-xs text-ink-subtle leading-relaxed">
          {result?.caveat || 'Mentor comparison is verified anonymous and threshold-protected. It is intended for group experience and fit matching, not ranking or personal attacks.'}
        </p>
      </section>
    </div>
  )
}
