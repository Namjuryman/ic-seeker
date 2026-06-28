import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../api'

const exportKinds = [
  { id: 'topic-report', label: 'Topic report', hint: 'Use a research field such as Power Management or RF/mmWave.' },
  { id: 'institution-compare', label: 'Institution compare', hint: 'Comma-separated institution names.' },
  { id: 'author-compare', label: 'Author compare', hint: 'Comma-separated author names.' },
  { id: 'mentor-compare', label: 'Mentor compare', hint: 'Comma-separated mentor names.' },
  { id: 'company-compare', label: 'Company compare', hint: 'Comma-separated company IDs from the company profile URL.' },
]

const formats = [
  { id: 'markdown', label: 'Markdown' },
  { id: 'csv', label: 'CSV' },
  { id: 'json', label: 'JSON' },
]

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function ExportCenterPage() {
  const [kind, setKind] = useState('topic-report')
  const [format, setFormat] = useState('markdown')
  const [topicField, setTopicField] = useState('Power Management')
  const [targets, setTargets] = useState('Tsinghua University, University of Macau')
  const billing = useQuery({ queryKey: ['billing-status'], queryFn: api.billingStatus })
  const settings = useQuery({ queryKey: ['public-site-settings'], queryFn: api.publicSiteSettings })

  const mutation = useMutation({
    mutationFn: async () => {
      const params: Record<string, string> = { format }
      if (kind === 'topic-report') params.field = topicField
      else if (kind === 'company-compare') params.ids = targets
      else params.names = targets
      return api.exportFile(kind, params)
    },
    onSuccess: ({ blob, filename }) => downloadBlob(blob, filename),
  })

  const selected = exportKinds.find((item) => item.id === kind) || exportKinds[0]
  const quota = billing.data?.usage.items.find((item) => item.metric === 'exportsPerMonth')
  const exportsEnabled = settings.data?.export_center_enabled === true

  return (
    <div className="platform-page">
      <section className="platform-hero">
        <div>
          <span>Export Center</span>
          <h1>导出中心</h1>
          <p>
            导出结构化 metadata、报告摘要和对比结果。导出不包含 publisher PDF，不绕过 DOI / 官方来源访问边界。
          </p>
        </div>
        <div className="platform-score">
          <strong>{quota ? `${quota.remaining ?? '∞'}` : '-'}</strong>
          <span>本月剩余导出</span>
        </div>
      </section>

      <section className="platform-grid">
        <div className="platform-panel">
          <div className="platform-panel-head">
            <span>Quota</span>
            <h2>商业化边界</h2>
          </div>
          <dl className="platform-infra">
            <div><dt>Export center flag</dt><dd>{exportsEnabled ? 'enabled' : 'quota preview'}</dd></div>
            <div><dt>Current plan</dt><dd>{billing.data?.currentPlan.name || '-'}</dd></div>
            <div><dt>Used this month</dt><dd>{quota ? `${quota.used} / ${quota.limit < 0 ? '∞' : quota.limit}` : '-'}</dd></div>
            <div><dt>Enforced</dt><dd>{quota?.enforced ? 'yes' : 'preview'}</dd></div>
          </dl>
          <p className="learning-muted">
            During private beta the endpoint is available as a quota-aware preview. Later, the site setting can hard-gate
            advanced exports behind paid plans once checkout is connected.
          </p>
        </div>

        <div className="platform-panel platform-wide">
          <div className="platform-panel-head">
            <span>Builder</span>
            <h2>生成导出文件</h2>
          </div>
          <div className="billing-admin-filters">
            <label>
              Export type
              <select value={kind} onChange={(event) => setKind(event.target.value)}>
                {exportKinds.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label>
              Format
              <select value={format} onChange={(event) => setFormat(event.target.value)}>
                {formats.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
          </div>

          <div className="billing-admin-filters">
            {kind === 'topic-report' ? (
              <label>
                Topic field
                <input value={topicField} onChange={(event) => setTopicField(event.target.value)} />
              </label>
            ) : (
              <label>
                Targets
                <input value={targets} onChange={(event) => setTargets(event.target.value)} />
              </label>
            )}
          </div>

          <p className="learning-muted">{selected.hint}</p>
          <div className="scheduler-actions">
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? '导出中...' : '下载导出文件'}
            </button>
          </div>
          {mutation.error && (
            <div className="scheduler-result scheduler-result-failure">
              {(mutation.error as any)?.response?.data?.error || 'Export failed'}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
