import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'

const metadataKeyLabels: Record<string, string> = {
  actorUserId: '操作者 ID',
  action: '动作',
  count: '数量',
  id: 'ID',
  key: '键',
  limit: '上限',
  mode: '模式',
  planId: '方案',
  provider: '来源',
  reason: '原因',
  resourceId: '资源 ID',
  status: '状态',
  targetId: '目标 ID',
  targetType: '目标类型',
  userId: '用户 ID',
}

function readableKey(key: string) {
  return metadataKeyLabels[key] || `字段 ${key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._-]/g, ' ')}`
}

function formatMetadataValue(value: any): string {
  if (value == null || value === '') return '空'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (Array.isArray(value)) return value.length ? `${value.length} 项` : '空列表'
  if (typeof value === 'object') return `${Object.keys(value).length} 个字段`
  return String(value)
}

function formatMetadata(value: Record<string, any> | null | undefined) {
  if (!value || !Object.keys(value).length) return '-'
  const entries = Object.entries(value).filter(([, item]) => item !== undefined)
  if (!entries.length) return '-'
  const shown = entries
    .slice(0, 5)
    .map(([key, item]) => `${readableKey(key)}：${formatMetadataValue(item)}`)
  if (entries.length > shown.length) shown.push(`另有 ${entries.length - shown.length} 项`)
  return shown.join('；')
}

function formatAuditError(error?: string | null) {
  if (!error) return ''
  if (hasChinese(error)) return error
  const text = error.toLowerCase()
  if (text.includes('not found')) return '未找到对应记录。'
  if (text.includes('unauthorized') || text.includes('forbidden')) return '当前账号无权执行该操作。'
  if (text.includes('invalid')) return '参数不符合要求。'
  if (text.includes('quota')) return '额度或配额不足。'
  if (text.includes('database') || text.includes('sqlite')) return '数据库操作失败，详细错误已记录。'
  return '操作失败，详细错误已记录。'
}

function rawAuditDetail(row: { error?: string | null; metadata?: Record<string, any> | null }) {
  if (row.error) return row.error
  if (!row.metadata || !Object.keys(row.metadata).length) return ''
  return JSON.stringify(row.metadata)
}

function auditDetail(row: { error?: string | null; metadata?: Record<string, any> | null }) {
  return row.error ? formatAuditError(row.error) : formatMetadata(row.metadata)
}

const statusLabel: Record<string, string> = {
  success: '成功',
  failure: '失败',
}

function auditStatusLabel(value?: string | null) {
  return value ? statusLabel[value] || '状态待确认' : '-'
}

function hasChinese(value: string) {
  return /[\u4e00-\u9fff]/.test(value)
}

function actionLabel(value: string) {
  if (!value || hasChinese(value)) return value || '-'
  const labels: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    remove: '移除',
    restore: '恢复',
    hide: '隐藏',
    approve: '通过',
    approved: '通过',
    reject: '拒绝',
    rejected: '拒绝',
    run: '运行',
    rebuild: '重建',
    refresh: '刷新',
    clear: '清理',
    sync: '同步',
    import: '导入',
    export: '导出',
    login: '登录',
    logout: '退出',
    toggle: '切换',
    merge: '合并',
    split: '拆分',
    'search_index.rebuild': '重建搜索索引',
    'site_settings.update': '更新站点配置',
    'ingestion.create': '创建导入任务',
    'ingestion.update': '更新导入任务',
    'ingestion.start': '启动导入任务',
    'ingestion.cancel': '取消导入任务',
    'ingestion.retry': '重试导入任务',
    'scheduler.update': '更新计划任务',
    'scheduler.run_now': '立即运行计划任务',
    'maintenance.run': '运行维护任务',
    'backup.create': '创建备份',
    'backup.prune': '清理旧备份',
    'backup.delete': '删除备份',
    'notification.create': '创建通知',
    'company.create': '创建企业',
    'company.update': '更新企业',
    'company.delete': '删除企业',
    'content_quality.sync': '同步内容质量问题',
    'content_quality.update': '更新内容质量问题',
    'moderation.action': '处理审核对象',
    'paper_ingestion.run': '运行论文导入',
    'paper_dedupe.scan': '扫描重复论文',
    'paper_dedupe.update': '更新重复论文候选',
    'local_pdf.update': '更新本地 PDF 匹配',
    'daily_circuit.sync_seed': '同步每日课程种子',
    'ai_enrichment.run': '运行 AI 辅助标注',
    'snapshot.refresh': '刷新快照',
    'snapshot.clear': '清理快照',
    'snapshot.clear_prefix': '按前缀清理快照',
    'snapshot.clear_all': '清理全部快照',
    'identity.candidate_status': '更新身份候选状态',
    'identity.candidate_apply': '应用身份候选',
    'identity.candidate_reject': '拒绝身份候选',
    'identity.candidate_split_required': '标记身份候选需拆分',
    'identity.candidate_undo': '撤销身份候选处理',
    'identity.upsert_alias': '保存身份别名',
    'identity.delete_alias': '删除身份别名',
    'api_key.update': '更新访问密钥',
    'billing.update_plan': '更新订阅方案',
  }
  return labels[value] || value.replace(/[._-]/g, ' ')
}

function resourceTypeLabel(value: string) {
  if (!value || hasChinese(value)) return value || '-'
  const labels: Record<string, string> = {
    company: '企业',
    companies: '企业',
    paper_comment: '论文评论',
    mentor_review: '研究者评价',
    professor_review: '研究者评价',
    moderation_report: '举报',
    access_request: '访问申请',
    api_key: '访问密钥',
    site_setting: '站点配置',
    snapshot: '快照',
    snapshots: '快照',
    identity_alias: '身份别名',
    ingestion_job: '导入任务',
    maintenance_run: '维护运行',
    scheduler_job: '计划任务',
    maintenance_job: '维护任务',
    search_index: '搜索索引',
    billing_user: '订阅用户',
    user: '用户',
    notification: '通知',
    backup: '数据库备份',
    content_quality_findings: '内容质量问题',
    content_quality_finding: '内容质量问题',
    paper_ingestion_run: '论文导入运行',
    paper_dedupe_candidate: '重复论文候选',
    local_pdf: '本地 PDF',
    daily_circuit: '每日课程',
    paper_ai_annotations: 'AI 辅助标注',
    'identity_candidate.author': '作者身份候选',
    'identity_candidate.institution': '机构身份候选',
    'identity.author': '作者身份别名',
    'identity.institution': '机构身份别名',
  }
  return labels[value] || value.replace(/[._-]/g, ' ')
}

export default function AdminAuditPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [resourceType, setResourceType] = useState('')

  const logs = useQuery({
    queryKey: ['admin-audit-logs', q, status, resourceType],
    queryFn: () => api.adminAuditLogs({
      limit: 80,
      q,
      status,
      resourceType,
    }),
    refetchInterval: 30_000,
  })

  const data = logs.data

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <span>审计轨迹</span>
          <h1>管理员审计日志</h1>
          <p>
            记录后台高风险操作：企业数据维护、审核动作、快照刷新/清理、别名归一、API key 更新。
            这是多人后台、商业化运营和问题追责的基础。
          </p>
        </div>
        <div className="admin-health">
          <strong>{data?.total ?? '-'}</strong>
          <span>条事件</span>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <span>筛选</span>
            <h2>筛选日志</h2>
          </div>
          <button className="chip-button" onClick={() => logs.refetch()}>刷新</button>
        </div>
        <div className="admin-audit-filters">
          <label>
            关键词
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="操作者 / 动作 / 资源" />
          </label>
          <label>
            状态
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">全部</option>
              <option value="success">成功</option>
              <option value="failure">失败</option>
            </select>
          </label>
          <label>
            资源类型
            <select value={resourceType} onChange={(event) => setResourceType(event.target.value)}>
              <option value="">全部</option>
              {data?.resourceTypes.map((item) => (
                <option key={item.resourceType} value={item.resourceType}>{resourceTypeLabel(item.resourceType)} ({item.count})</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="admin-grid">
        <div className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>事件</span>
              <h2>最近操作</h2>
            </div>
            <strong>{logs.isFetching ? '同步中...' : `${data?.rows.length || 0} 条`}</strong>
          </div>
          <div className="admin-audit-table">
            <div className="admin-audit-row admin-audit-head">
              <span>时间</span>
              <span>操作者</span>
              <span>动作</span>
              <span>对象</span>
              <span>状态</span>
              <span>详情</span>
            </div>
            {data?.rows.map((row) => (
              <div className="admin-audit-row" key={row.id}>
                <span>{row.createdAt}</span>
                <span>{row.actorEmail || `用户 ${row.actorUserId ?? '-'}`}</span>
                <strong>{actionLabel(row.action)}</strong>
                <span>{resourceTypeLabel(row.resourceType)}{row.resourceId ? ` / ${row.resourceId}` : ''}</span>
                <em className={`audit-status audit-status-${row.status}`}>{auditStatusLabel(row.status)}</em>
                <small title={rawAuditDetail(row)}>{auditDetail(row)}</small>
              </div>
            ))}
            {!logs.isLoading && !data?.rows.length && (
              <div className="admin-empty">暂无审计日志。后台产生增删改操作后会自动记录。</div>
            )}
          </div>
        </div>

        <aside className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>动作</span>
              <h2>动作分布</h2>
            </div>
          </div>
          <ul className="admin-mini-list">
            {data?.actions.map((item) => (
              <li key={item.action}><span>{actionLabel(item.action)}</span><small>{item.count} 条事件</small></li>
            ))}
            {!data?.actions.length && <li><span>暂无动作</span><small>等待后台操作</small></li>}
          </ul>
        </aside>
      </section>
    </div>
  )
}
