import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { BillingPlan, BillingUserRow } from '../types'
import { providerLabel } from '../utils/displayLabels'
import { friendlyError } from '../utils/errorMessages'

const planLabel: Record<BillingPlan['id'], string> = {
  free: '免费预览',
  pro: '个人专业版',
  lab: '实验室版',
  enterprise: '机构版',
  internal: '内部计划',
}

const usageLabel: Record<string, string> = {
  savedSearches: '保存搜索',
  watchlistItems: '关注项',
  readingQueueItems: '阅读队列',
  aiSummariesPerMonth: 'AI 摘要',
  exportsPerMonth: '导出次数',
  alerts: '提醒',
  apiRequestsPerMonth: 'API 请求',
  privatePdfStorageGb: '私有 PDF 空间',
}

const rolloutLabel: Record<string, string> = {
  'partial-watchlist-reading-queue': '部分启用：关注列表与阅读队列已计入配额',
}

function formatLimit(value: number) {
  if (value < 0) return '不限'
  return value.toLocaleString()
}

function displayPlanName(plan: Pick<BillingPlan, 'id' | 'name'>) {
  return planLabel[plan.id] || plan.name
}

function primaryUsage(user: BillingUserRow) {
  return user.usage.items.filter((item) => item.enforced).slice(0, 3)
}

function PlanSelect({ user, plans }: { user: BillingUserRow; plans: BillingPlan[] }) {
  const queryClient = useQueryClient()
  const [planId, setPlanId] = useState(user.subscriptionPlan)
  const [reason, setReason] = useState('')
  const mutation = useMutation({
    mutationFn: () => api.updateUserPlan(user.id, { planId, reason }),
    onSuccess: () => {
      setReason('')
      queryClient.invalidateQueries({ queryKey: ['admin-billing-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-billing'] })
    },
  })

  return (
    <div className="billing-admin-actions">
      <select value={planId} onChange={(event) => setPlanId(event.target.value as BillingPlan['id'])}>
        {plans.map((plan) => <option key={plan.id} value={plan.id}>{displayPlanName(plan)}</option>)}
      </select>
      <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="调整原因 / 运营备注" />
      <button disabled={mutation.isPending || planId === user.subscriptionPlan} onClick={() => mutation.mutate()}>
        {mutation.isPending ? '保存中...' : '更新'}
      </button>
      {mutation.error && <small>{friendlyError(mutation.error, '更新失败')}</small>}
    </div>
  )
}

export default function AdminBillingPage() {
  const [q, setQ] = useState('')
  const [plan, setPlan] = useState('')
  const overview = useQuery({ queryKey: ['admin-billing'], queryFn: api.adminBilling })
  const users = useQuery({
    queryKey: ['admin-billing-users', q, plan],
    queryFn: () => api.adminBillingUsers({ q, plan, limit: 50 }),
  })

  if (overview.isLoading || users.isLoading) return <div className="ss-loading">正在加载订阅运营数据...</div>
  if (overview.error || users.error || !overview.data || !users.data) return <div className="ss-empty">暂时无法读取订阅运营数据。</div>

  return (
    <div className="billing-admin-page">
      <section className="billing-admin-hero">
        <div>
          <span className="eyebrow">订阅运营</span>
          <h1>订阅运营后台</h1>
          <p>管理受控访问用户计划、检查用量账本，并为支付与账务校验保留运营入口。</p>
        </div>
        <div className="billing-admin-provider">
          <span>支付适配：{providerLabel(overview.data.paymentProvider)}</span>
          <strong>{overview.data.paymentConfigured ? '已配置' : '尚未开放付费'}</strong>
          <p>{rolloutLabel[overview.data.rollout.entitlementEnforcement] || overview.data.rollout.entitlementEnforcement}</p>
        </div>
      </section>

      <section className="billing-admin-stats">
        <div><span>用户</span><strong>{overview.data.totals.users.toLocaleString()}</strong></div>
        <div><span>订阅记录</span><strong>{overview.data.totals.subscriptions.toLocaleString()}</strong></div>
        <div><span>用量事件</span><strong>{overview.data.totals.usageEvents.toLocaleString()}</strong></div>
        <div><span>账务事件</span><strong>{overview.data.totals.billingEvents.toLocaleString()}</strong></div>
      </section>

      <section className="billing-admin-filters">
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="搜索用户邮箱或昵称" />
        <select value={plan} onChange={(event) => setPlan(event.target.value)}>
          <option value="">全部计划</option>
          {overview.data.plans.map((item) => <option key={item.id} value={item.id}>{displayPlanName(item)}</option>)}
        </select>
      </section>

      <section className="billing-admin-table">
        <div className="billing-admin-row billing-admin-head">
          <span>用户</span>
          <span>计划</span>
          <span>配额用量</span>
          <span>手动调整计划</span>
        </div>
        {users.data.rows.map((user) => (
          <div className="billing-admin-row" key={user.id}>
            <div>
              <strong>{user.email}</strong>
              <small>用户 {user.id} · {user.roleHint} · {new Date(user.createdAt).toLocaleDateString()}</small>
            </div>
            <div>
              <strong>{planLabel[user.subscriptionPlan] || user.planName}</strong>
              <small>{user.subscriptionPlan}</small>
            </div>
            <div className="billing-admin-usage">
              {primaryUsage(user).map((item) => (
                <p key={item.metric}>
                  <span>{usageLabel[item.metric] || item.label}</span>
                  <strong>{item.used.toLocaleString()} / {formatLimit(item.limit)}</strong>
                </p>
              ))}
            </div>
            <PlanSelect user={user} plans={overview.data.plans} />
          </div>
        ))}
      </section>
    </div>
  )
}
