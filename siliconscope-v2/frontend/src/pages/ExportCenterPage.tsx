import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { friendlyError } from '../utils/errorMessages'

const exportKinds = [
  { id: 'topic-report', label: '方向报告', hint: '输入研究方向，例如 Power Management、RF/mmWave 或 Low Power Design；报告用于整理线索，不是方向排名。' },
  { id: 'institution-compare', label: '机构画像对比', hint: '输入多个机构名称，用英文逗号分隔；机构结果依赖名称归一化和可用论文元数据。' },
  { id: 'author-compare', label: '作者画像对比', hint: '输入多个作者姓名，用英文逗号分隔；同名作者和机构变动仍需人工核验。' },
  { id: 'mentor-compare', label: '研究者线索对比', hint: '输入多个研究者姓名，用英文逗号分隔；结果仍需结合机构官网和人工核验。' },
  { id: 'company-compare', label: '企业画像对比', hint: '输入企业资料页 URL 中的企业 ID，用英文逗号分隔；结果不构成投资或求职结论。' },
]

const formats = [
  { id: 'markdown', label: 'Markdown' },
  { id: 'csv', label: 'CSV' },
  { id: 'json', label: 'JSON' },
]

const planNames: Record<string, string> = {
  free: '免费预览',
  pro: '研究 Pro',
  lab: '实验室',
  enterprise: '企业 / 私有化',
  internal: '内部管理',
}

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
  const quotaLimit = quota ? (quota.limit < 0 ? '不限' : quota.limit.toLocaleString()) : '-'
  const quotaRemaining = quota ? (quota.remaining ?? '不限') : '-'

  return (
    <div className="platform-page">
      <section className="platform-hero">
        <div>
          <span>导出中心</span>
          <h1>导出中心</h1>
          <p>
            导出结构化论文信息、报告摘要和对比结果。导出不包含出版商 PDF，也不会绕过 DOI 或官方来源访问边界；报告里的分数和对比只保留为元数据线索。
          </p>
        </div>
        <div className="platform-score">
          <strong>{quotaRemaining}</strong>
          <span>本月剩余导出</span>
        </div>
      </section>

      <section className="platform-grid">
        <div className="platform-panel">
          <div className="platform-panel-head">
            <span>额度</span>
            <h2>导出边界</h2>
          </div>
          <dl className="platform-infra">
            <div><dt>导出入口</dt><dd>{exportsEnabled ? '已开放' : '额度预览'}</dd></div>
            <div><dt>当前计划</dt><dd>{planNames[billing.data?.currentPlan.id || ''] || billing.data?.currentPlan.name || '-'}</dd></div>
            <div><dt>本月用量</dt><dd>{quota ? `${quota.used.toLocaleString()} / ${quotaLimit}` : '-'}</dd></div>
            <div><dt>限制状态</dt><dd>{quota?.enforced ? '额度已生效' : '仅记录用量'}</dd></div>
          </dl>
          <p className="learning-muted">
            导出用量会用于判断哪些格式最有价值。对外分享前，导出内容应只包含允许分享的结构化信息和来源链接。
          </p>
        </div>

        <div className="platform-panel platform-wide">
          <div className="platform-panel-head">
            <span>生成器</span>
            <h2>生成导出文件</h2>
          </div>
          <div className="billing-admin-filters">
            <label>
              导出类型
              <select value={kind} onChange={(event) => setKind(event.target.value)}>
                {exportKinds.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label>
              文件格式
              <select value={format} onChange={(event) => setFormat(event.target.value)}>
                {formats.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
          </div>

          <div className="billing-admin-filters">
            {kind === 'topic-report' ? (
              <label>
                研究方向
                <input value={topicField} onChange={(event) => setTopicField(event.target.value)} />
              </label>
            ) : (
              <label>
                对象列表
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
              {friendlyError(mutation.error, '导出失败')}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
