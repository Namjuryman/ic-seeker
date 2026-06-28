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

function usagePercent(used: number, limit: number) {
  if (limit < 0) return 8
  if (limit === 0) return used > 0 ? 100 : 0
  return Math.min(100, Math.round((used / limit) * 100))
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
  if (error || !data) return <div className="ss-empty">订阅与配额暂时不可用。</div>

  return (
    <div className="billing-page">
      <section className="billing-hero">
        <div>
          <span className="eyebrow">COMMERCIAL BOUNDARY</span>
          <h1>订阅与配额</h1>
          <p>
            SiliconScope 的核心工作区保持免费：学术搜索、学习路线、阅读队列、关注列表和基础对比都不应该被锁死。
            未来收费只放在效率层，例如 AI 结构化报告、高级导出、团队空间、私有/实验室工作区和受控 API。
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
          <span>支付提供商</span>
          <strong>{data.paymentProvider}</strong>
        </div>
        <div>
          <span>Checkout</span>
          <strong>{data.checkoutAvailable ? 'Ready' : '待接入'}</strong>
        </div>
        <div>
          <span>收费边界</span>
          <strong>AI / Export / Team</strong>
        </div>
      </section>

      <section className="billing-note">
        <strong>{data.paymentConfigured ? '已检测到支付配置' : '尚未配置真实支付凭证'}</strong>
        <p>{data.checkoutReason} 在支付服务和正式商业条款接入前，升级按钮只作为产品占位，不会向用户收费。</p>
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

      <section className="billing-usage">
        <div className="billing-section-head">
          <div>
            <span className="eyebrow">USAGE LEDGER</span>
            <h2>本月用量与配额</h2>
          </div>
          <p>{new Date(data.usage.periodStart).toLocaleDateString()} - {new Date(data.usage.periodEnd).toLocaleDateString()}</p>
        </div>
        <div className="billing-usage-grid">
          {data.usage.items.map((item) => (
            <article key={item.metric}>
              <div>
                <strong>{item.label}</strong>
                <span>{item.enforced ? 'enforced' : 'tracked'}</span>
              </div>
              <div className="billing-meter" aria-label={`${item.label} usage`}>
                <i style={{ width: `${usagePercent(item.used, item.limit)}%` }} />
              </div>
              <p>
                {item.used.toLocaleString()} / {limitText(item.limit)}
                {item.remaining !== null && <em>{item.remaining.toLocaleString()} left</em>}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="billing-plans">
        {data.plans.map((plan) => {
          const active = plan.id === data.currentPlan.id
          const payable = data.checkoutAvailable && plan.priceMonthlyUsd !== null && plan.priceMonthlyUsd > 0
          return (
            <article className={`billing-plan ${active ? 'active' : ''} ${plan.recommended ? 'recommended' : ''}`} key={plan.id}>
              <div className="billing-plan-head">
                <span>{plan.badge}</span>
                {plan.recommended && <em>Recommended</em>}
              </div>
              <h2>{plan.name}</h2>
              <strong>{money(plan)}</strong>
              <p>{plan.description}</p>
              <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <div className="billing-plan-limits">
                <span>Watchlist {limitText(plan.limits.watchlistItems)}</span>
                <span>AI reports {limitText(plan.limits.aiSummariesPerMonth, '/mo')}</span>
                <span>Seats {limitText(plan.limits.teamSeats)}</span>
              </div>
              <button
                disabled={active || checkout.isPending || plan.id === 'internal' || !payable}
                onClick={() => checkout.mutate(plan.id)}
              >
                {active ? 'Current plan' : payable ? 'Upgrade' : 'Contact / Not connected'}
              </button>
            </article>
          )
        })}
      </section>

      <section className="billing-note">
        <strong>商业策略</strong>
        <p>
          搜索、学习路线、基础 compare 和阅读管理不收费；收费项集中在 AI 生成报告、批量导出、团队协作、私有部署、实验室空间和受控 API。
          也不要把出版商 PDF、隐藏数据或导师/学校/公司的绝对排名包装成付费商品。
        </p>
      </section>
    </div>
  )
}
