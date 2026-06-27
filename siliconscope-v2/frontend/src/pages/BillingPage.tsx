import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../api'
import type { BillingPlan } from '../types'

function money(plan: BillingPlan) {
  if (plan.priceMonthlyUsd === null) return 'Custom'
  if (plan.priceMonthlyUsd === 0) return '$0'
  return `$${plan.priceMonthlyUsd}/mo`
}

function limitText(value: number, suffix = '') {
  if (value < 0) return 'Unlimited'
  return `${value.toLocaleString()}${suffix}`
}

export default function BillingPage() {
  const [message, setMessage] = useState('')
  const { data, isLoading, error } = useQuery({
    queryKey: ['billing-status'],
    queryFn: api.billingStatus,
  })

  const checkout = useMutation({
    mutationFn: (planId: string) => api.startCheckout(planId),
    onSuccess: (result) => setMessage(result.reason),
    onError: (err: any) => setMessage(err?.response?.data?.reason || err?.response?.data?.error || 'Checkout is not available yet.'),
  })

  if (isLoading) return <div className="ss-loading">Loading billing workspace...</div>
  if (error || !data) return <div className="ss-empty">订阅配置暂时不可用。</div>

  return (
    <div className="billing-page">
      <section className="billing-hero">
        <div>
          <span className="eyebrow">COMMERCIAL CONTROL</span>
          <h1>订阅与配额</h1>
          <p>
            SiliconScope 现在已有计划目录、权益元数据和 checkout 适配器边界。
            后续接 Stripe/Paddle 时会沿用这里的 plan 与 quota 模型。
          </p>
        </div>
        <div className="billing-current">
          <span>当前计划</span>
          <strong>{data.currentPlan.name}</strong>
          <p>{data.currentPlan.audience}</p>
        </div>
      </section>

      <section className="billing-status-strip">
        <div>
          <span>Payment provider</span>
          <strong>{data.paymentProvider}</strong>
        </div>
        <div>
          <span>Checkout</span>
          <strong>{data.checkoutAvailable ? 'Ready' : 'Adapter pending'}</strong>
        </div>
        <div>
          <span>Current badge</span>
          <strong>{data.currentPlan.badge}</strong>
        </div>
      </section>

      <section className="billing-note">
        <strong>{data.paymentConfigured ? 'Payment credentials detected' : 'Payment credentials not configured'}</strong>
        <p>{data.checkoutReason}</p>
        {message && <em>{message}</em>}
      </section>

      <section className="billing-entitlements">
        {data.entitlementSummary.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="billing-plans">
        {data.plans.map((plan) => {
          const active = plan.id === data.currentPlan.id
          return (
            <article className={`billing-plan ${active ? 'active' : ''} ${plan.recommended ? 'recommended' : ''}`} key={plan.id}>
              <div className="billing-plan-head">
                <span>{plan.badge}</span>
                {plan.recommended && <em>Recommended</em>}
              </div>
              <h2>{plan.name}</h2>
              <strong>{money(plan)}</strong>
              <p>{plan.description}</p>
              <ul>
                {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
              <div className="billing-plan-limits">
                <span>Watchlist {limitText(plan.limits.watchlistItems)}</span>
                <span>AI {limitText(plan.limits.aiSummariesPerMonth, '/mo')}</span>
                <span>Seats {limitText(plan.limits.teamSeats)}</span>
              </div>
              <button
                disabled={active || checkout.isPending || plan.id === 'internal'}
                onClick={() => checkout.mutate(plan.id)}
              >
                {active ? 'Current plan' : plan.priceMonthlyUsd === null ? 'Contact / Configure' : 'Upgrade'}
              </button>
            </article>
          )
        })}
      </section>
    </div>
  )
}
