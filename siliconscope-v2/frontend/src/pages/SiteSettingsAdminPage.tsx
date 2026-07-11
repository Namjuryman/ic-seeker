import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { SiteSettingRow } from '../types'

const groupOrder: SiteSettingRow['groupName'][] = ['Access', 'Commercial', 'Research', 'Community', 'Operations']

const groupLabel: Record<SiteSettingRow['groupName'], string> = {
  Access: '访问控制',
  Commercial: '商业化',
  Research: '研究功能',
  Community: '社区互动',
  Operations: '运维',
}

const valueTypeLabel: Record<SiteSettingRow['valueType'], string> = {
  boolean: '开关',
  string: '文本',
  number: '数值',
}

const settingCopy: Record<string, { label: string; description: string }> = {
  public_registration_enabled: {
    label: '开放注册',
    description: '允许访客无需邀请创建账号。受控开放阶段建议保持关闭。',
  },
  invite_only_mode: {
    label: '邀请制访问',
    description: '即使公开页面可访问，产品主体仍按受控邀请制处理。',
  },
  maintenance_mode: {
    label: '维护模式',
    description: '在数据导入、备份或迁移期间，对公共站点展示维护提示。',
  },
  data_readiness_banner: {
    label: '数据边界提示',
    description: '公共页面展示的简短提示，用于说明元数据覆盖、来源限制和校验状态。',
  },
  ai_reports_enabled: {
    label: 'AI 报告入口',
    description: '在模型预算、引用来源和人工校审边界准备好后，再开放报告入口。',
  },
  export_center_enabled: {
    label: '高级导出',
    description: '在配额控制和版权边界确认后，开放 CSV、BibTeX 和组合导出。',
  },
  checkout_enabled: {
    label: '付费入口',
    description: '仅在支付适配和回调校验完成后，对外开放真实付费流程。',
  },
  team_workspace_enabled: {
    label: '团队工作区',
    description: '开放实验室席位、共享阅读队列和工作区权限。',
  },
  paper_discussion_enabled: {
    label: '论文讨论',
    description: '允许论文评论；展示仍受后台审核控制。',
  },
  mentor_reviews_enabled: {
    label: '研究者评价',
    description: '允许提交研究者/课题组评价，并只展示通过审核、满足样本阈值的摘要。',
  },
  company_intelligence_enabled: {
    label: '企业情报',
    description: '展示企业数据库、对比和相关论文线索。',
  },
  topic_reports_enabled: {
    label: '主题报告',
    description: '开放基于规则和索引的主题报告；AI 综合内容需另行确认。',
  },
  weekly_ingestion_enabled: {
    label: '周期数据更新',
    description: '用于控制计划任务的数据更新入口；实际执行仍由后台服务处理。',
  },
  admin_access_policy: {
    label: '后台访问策略',
    description: '生产环境后台访问控制的内部提醒。',
  },
}

function formatSettingValue(value: SiteSettingRow['value']) {
  if (typeof value === 'boolean') return value ? '开启' : '关闭'
  return String(value)
}

function SettingValueControl({ row }: { row: SiteSettingRow }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(String(row.value ?? ''))
  const mutation = useMutation({
    mutationFn: (value: boolean | string | number) => api.updateSiteSetting(row.key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
    },
  })

  if (row.valueType === 'boolean') {
    const enabled = row.value === true
    return (
      <button
        className={`subtle ${enabled ? 'scheduler-card-enabled' : ''}`}
        disabled={mutation.isPending || row.isSensitive}
        onClick={() => mutation.mutate(!enabled)}
      >
        {mutation.isPending ? '保存中...' : enabled ? '已开启' : '已关闭'}
      </button>
    )
  }

  return (
    <div className="billing-admin-actions">
      <input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={row.isSensitive || mutation.isPending} />
      <button disabled={row.isSensitive || mutation.isPending || draft === String(row.value ?? '')} onClick={() => mutation.mutate(draft)}>
        {mutation.isPending ? '保存中...' : '保存'}
      </button>
    </div>
  )
}

function SettingCard({ row }: { row: SiteSettingRow }) {
  const copy = settingCopy[row.key] || { label: row.label, description: row.description }

  return (
    <article className="scheduler-card">
      <div className="scheduler-card-main">
        <div>
          <span>{row.isPublic ? '公共可见配置' : '仅后台配置'}</span>
          <h3>{copy.label}</h3>
          <p>{copy.description}</p>
        </div>
        <strong>{valueTypeLabel[row.valueType]}</strong>
      </div>
      <div className="scheduler-card-stats">
        <div><span>配置键</span><strong>{row.key}</strong></div>
        <div><span>当前值</span><strong>{formatSettingValue(row.value)}</strong></div>
        <div><span>更新时间</span><strong>{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '-'}</strong></div>
      </div>
      <div className="scheduler-actions">
        <SettingValueControl row={row} />
      </div>
    </article>
  )
}

export default function SiteSettingsAdminPage() {
  const settings = useQuery({
    queryKey: ['site-settings'],
    queryFn: api.siteSettings,
  })

  const grouped = useMemo(() => {
    const rows = settings.data?.rows || []
    return groupOrder.map((group) => ({
      group,
      rows: rows.filter((row) => row.groupName === group),
    })).filter((group) => group.rows.length)
  }, [settings.data?.rows])

  if (settings.isLoading) {
    return <div className="learning-muted">正在加载站点配置...</div>
  }

  if (!settings.data) {
    return <div className="learning-muted">暂时无法读取站点配置。</div>
  }

  const summary = settings.data.summary

  return (
    <div className="scheduler-page">
      <section className="scheduler-hero">
        <div>
          <span>站点配置中心</span>
          <h1>功能开关与发布边界</h1>
          <p>
            用这里统一管理访问方式、商业化入口、社区互动和运维状态。公共用户只会读取安全的公开配置；
            仅后台配置保留在独立管理控制台内。
          </p>
        </div>
        <div className={`scheduler-live ${summary.maintenanceMode ? '' : 'is-enabled'}`}>
          <strong>{summary.inviteOnlyMode ? '邀请制' : '公开访问'}</strong>
          <span>{summary.maintenanceMode ? '维护中' : '运行中'}</span>
        </div>
      </section>

      <section className="scheduler-summary">
        <div><span>配置总数</span><strong>{summary.total}</strong></div>
        <div><span>公开配置</span><strong>{summary.public}</strong></div>
        <div><span>已开启</span><strong>{summary.enabledFlags}</strong></div>
        <div><span>已关闭</span><strong>{summary.disabledFlags}</strong></div>
        <div><span>付费入口</span><strong>{summary.checkoutEnabled ? '开启' : '关闭'}</strong></div>
      </section>

      {grouped.map((group) => (
        <section className="admin-panel" key={group.group}>
          <div className="admin-panel-head">
            <span>{group.rows.length} 项配置</span>
            <h2>{groupLabel[group.group]}</h2>
          </div>
          <div className="scheduler-grid">
            {group.rows.map((row) => <SettingCard key={row.key} row={row} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
