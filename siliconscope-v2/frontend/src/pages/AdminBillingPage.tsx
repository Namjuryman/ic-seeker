import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { BillingPlan, BillingUserRow } from '../types'

function formatLimit(value: number) {
  if (value < 0) return 'Unlimited'
  return value.toLocaleString()
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
        {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
      </select>
      <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="reason / beta note" />
      <button disabled={mutation.isPending || planId === user.subscriptionPlan} onClick={() => mutation.mutate()}>
        {mutation.isPending ? 'Saving...' : 'Update'}
      </button>
      {mutation.error && <small>{(mutation.error as any)?.response?.data?.error || 'Update failed'}</small>}
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

  if (overview.isLoading || users.isLoading) return <div className="ss-loading">Loading billing operations...</div>
  if (overview.error || users.error || !overview.data || !users.data) return <div className="ss-empty">Billing operations unavailable.</div>

  return (
    <div className="billing-admin-page">
      <section className="billing-admin-hero">
        <div>
          <span className="eyebrow">ADMIN BILLING</span>
          <h1>订阅运营后台</h1>
          <p>管理 beta 用户计划、检查用量账本，并为未来 Stripe/Paddle webhook 留出运营入口。</p>
        </div>
        <div className="billing-admin-provider">
          <span>{overview.data.paymentProvider}</span>
          <strong>{overview.data.paymentConfigured ? 'Provider ready' : 'Checkout pending'}</strong>
          <p>{overview.data.rollout.entitlementEnforcement}</p>
        </div>
      </section>

      <section className="billing-admin-stats">
        <div><span>Users</span><strong>{overview.data.totals.users.toLocaleString()}</strong></div>
        <div><span>Subscriptions</span><strong>{overview.data.totals.subscriptions.toLocaleString()}</strong></div>
        <div><span>Usage events</span><strong>{overview.data.totals.usageEvents.toLocaleString()}</strong></div>
        <div><span>Billing events</span><strong>{overview.data.totals.billingEvents.toLocaleString()}</strong></div>
      </section>

      <section className="billing-admin-filters">
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search user email or nickname" />
        <select value={plan} onChange={(event) => setPlan(event.target.value)}>
          <option value="">All plans</option>
          {overview.data.plans.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </section>

      <section className="billing-admin-table">
        <div className="billing-admin-row billing-admin-head">
          <span>User</span>
          <span>Plan</span>
          <span>Quota usage</span>
          <span>Manual plan change</span>
        </div>
        {users.data.rows.map((user) => (
          <div className="billing-admin-row" key={user.id}>
            <div>
              <strong>{user.email}</strong>
              <small>#{user.id} · {user.roleHint} · {new Date(user.createdAt).toLocaleDateString()}</small>
            </div>
            <div>
              <strong>{user.planName}</strong>
              <small>{user.subscriptionPlan}</small>
            </div>
            <div className="billing-admin-usage">
              {primaryUsage(user).map((item) => (
                <p key={item.metric}>
                  <span>{item.label}</span>
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
