import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { providerLabel } from '../utils/displayLabels'
import { friendlyError } from '../utils/errorMessages'
import type { BillingPlan } from '../types'

function money(plan: BillingPlan) {
  if (plan.priceMonthlyUsd === null) return '定制'
  if (plan.priceMonthlyUsd === 0) return '$0'
  return `$${plan.priceMonthlyUsd}/月`
}

function limitText(value: number, suffix = '') {
  if (value < 0) return '不限'
  return `${value.toLocaleString()}${suffix}`
}

function usagePercent(used: number, limit: number) {
  if (limit < 0) return 8
  if (limit === 0) return used > 0 ? 100 : 0
  return Math.min(100, Math.round((used / limit) * 100))
}

const planPresentation: Record<string, Partial<Pick<BillingPlan, 'name' | 'audience' | 'badge' | 'description' | 'features'>>> = {
  free: {
    name: '免费预览',
    audience: '个人学习、论文检索和方向探索',
    badge: '预览',
    description: '适合试用 SiliconScope 的公开论文检索、DOI/来源跳转和基础个人工作流。',
    features: ['论文元数据检索', '方向与机构探索', 'DOI/来源跳转', '有限关注列表'],
  },
  pro: {
    name: '研究 Pro',
    audience: '学生、IC 工程师和独立研究者',
    badge: '个人',
    description: '提高阅读管理、提醒、导出和 AI 论文辅助的个人使用额度。',
    features: ['不限量论文检索', '更大的关注列表和阅读队列', '每周方向提醒', '导出中心', 'AI 阅读额度'],
  },
  lab: {
    name: '实验室',
    audience: '课题组和小型 IC 团队',
    badge: '团队',
    description: '面向实验室的共享工作区，用于团队收藏、导入和内部评估。',
    features: ['团队关注列表', '共享阅读队列', '研究者/机构线索跟踪', '人工审核导入', '优先刷新快照'],
  },
  enterprise: {
    name: '企业 / 私有化',
    audience: '公司、研究院和付费私有部署',
    badge: '定制',
    description: '支持私有数据、API 集成、安全评审和导入任务的定制部署。',
    features: ['私有化部署', '定制采集/API 策略', '服务保障和备份', '对象存储集成', 'SSO/OAuth 规划'],
  },
  internal: {
    name: '内部管理',
    audience: '站点所有者和本地运维',
    badge: '管理员',
    description: '用于本地开发、后台维护和私有数据库校订的内部模式。',
    features: ['管理后台', '私有 MVP 工作流', '数据导入操作', '运行时和审计工具'],
  },
}

const entitlementPresentation: Record<string, { label: string; detail: string }> = {
  Watchlist: { label: '关注列表', detail: '公司、论文、搜索、研究者线索和方向监控。' },
  'Reading queue': { label: '阅读队列', detail: '个人阅读流程，也可用于团队协作场景。' },
  'AI reading': { label: 'AI 阅读', detail: '用于论文摘要、翻译和结构化阅读辅助。' },
  Exports: { label: '导出', detail: 'CSV、BibTeX 和报告素材导出。' },
  Alerts: { label: '提醒', detail: '保存搜索、方向摘要和期刊更新监控。' },
  'Private PDFs': { label: '私有 PDF', detail: '用于私有部署中的本地或对象存储索引。' },
}

const usageMetricLabels: Record<string, string> = {
  savedSearches: '保存搜索',
  watchlistItems: '关注项',
  readingQueueItems: '阅读队列',
  aiSummariesPerMonth: 'AI 摘要',
  exportsPerMonth: '导出',
  alerts: '提醒',
  apiRequestsPerMonth: 'API 请求',
}

function presentPlan(plan: BillingPlan): BillingPlan {
  return { ...plan, ...planPresentation[plan.id] }
}

function limitValueText(value: string) {
  return value.replace('Unlimited', '不限').replace('/month', '/月')
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
    onError: (err) => setMessage(friendlyError(err, '支付入口暂时不可用。')),
  })

  if (isLoading) return <div className="ss-loading">正在加载订阅与配额...</div>
  if (error || !data) return <div className="ss-empty">订阅与配额暂时不可用。</div>
  const currentPlan = presentPlan(data.currentPlan)

  return (
    <div className="billing-page">
      <section className="billing-hero">
        <div>
          <span className="eyebrow">商业边界</span>
          <h1>订阅与配额</h1>
          <p>
            SiliconScope 的核心工作区保持免费：学术搜索、学习路线、阅读队列、关注列表和基础对比都不应该被锁死。
            收费只放在效率层，例如 AI 结构化报告、高级导出、团队空间、私有/实验室工作区和受控 API。
          </p>
        </div>
        <div className="billing-current">
          <span>当前计划</span>
          <strong>{currentPlan.name}</strong>
          <p>{currentPlan.audience}</p>
        </div>
      </section>

      <section className="billing-status-strip">
        <div>
          <span>支付提供商</span>
          <strong>{providerLabel(data.paymentProvider)}</strong>
        </div>
        <div>
          <span>支付入口</span>
          <strong>{data.checkoutAvailable ? '可用' : '准备中'}</strong>
        </div>
        <div>
          <span>收费边界</span>
          <strong>AI 报告 / 导出 / 团队</strong>
        </div>
      </section>

      <section className="billing-note">
        <strong>{data.paymentConfigured ? '已检测到支付配置' : '支付服务未启用'}</strong>
        <p>{data.paymentConfigured ? '支付服务已配置。' : '支付服务当前未启用或缺少配置。'} 在支付服务和商业条款确认前，升级按钮只用于表达开通意向，不会向用户收费。</p>
        {message && <em>{message}</em>}
      </section>

      <section className="billing-entitlements">
        {data.entitlementSummary.map((item) => (
          <article key={item.label}>
            <span>{entitlementPresentation[item.label]?.label || item.label}</span>
            <strong>{limitValueText(item.value)}</strong>
            <p>{entitlementPresentation[item.label]?.detail || item.detail}</p>
          </article>
        ))}
      </section>

      <section className="billing-usage">
        <div className="billing-section-head">
          <div>
            <span className="eyebrow">用量记录</span>
            <h2>本月用量与配额</h2>
          </div>
          <p>{new Date(data.usage.periodStart).toLocaleDateString()} - {new Date(data.usage.periodEnd).toLocaleDateString()}</p>
        </div>
        <div className="billing-usage-grid">
          {data.usage.items.map((item) => (
            <article key={item.metric}>
              <div>
                <strong>{usageMetricLabels[item.metric] || item.label}</strong>
                <span>{item.enforced ? '限额生效' : '仅记录'}</span>
              </div>
              <div className="billing-meter" aria-label={`${usageMetricLabels[item.metric] || item.label} 用量`}>
                <i style={{ width: `${usagePercent(item.used, item.limit)}%` }} />
              </div>
              <p>
                {item.used.toLocaleString()} / {limitText(item.limit)}
                {item.remaining !== null && <em>剩余 {item.remaining.toLocaleString()}</em>}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="billing-plans">
        {data.plans.map((rawPlan) => {
          const plan = presentPlan(rawPlan)
          const active = plan.id === data.currentPlan.id
          const payable = data.checkoutAvailable && plan.priceMonthlyUsd !== null && plan.priceMonthlyUsd > 0
          return (
            <article className={`billing-plan ${active ? 'active' : ''} ${plan.recommended ? 'recommended' : ''}`} key={plan.id}>
              <div className="billing-plan-head">
                <span>{plan.badge}</span>
                {plan.recommended && <em>推荐</em>}
              </div>
              <h2>{plan.name}</h2>
              <strong>{money(plan)}</strong>
              <p>{plan.description}</p>
              <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <div className="billing-plan-limits">
                <span>关注项 {limitText(plan.limits.watchlistItems)}</span>
                <span>AI 报告 {limitText(plan.limits.aiSummariesPerMonth, '/月')}</span>
                <span>席位 {limitText(plan.limits.teamSeats)}</span>
              </div>
              <button
                disabled={active || checkout.isPending || plan.id === 'internal' || !payable}
                onClick={() => checkout.mutate(plan.id)}
              >
                {active ? '当前计划' : payable ? '升级' : '联系开通'}
              </button>
            </article>
          )
        })}
      </section>

      <section className="billing-note">
        <strong>商业策略</strong>
        <p>
          搜索、学习路线、基础对比和阅读管理不收费；收费项集中在 AI 生成报告、批量导出、团队协作、私有部署、实验室空间和受控 API。
          也不要把出版商 PDF、隐藏数据或研究者/机构/公司的单一高低裁决包装成付费商品。
        </p>
      </section>
    </div>
  )
}
