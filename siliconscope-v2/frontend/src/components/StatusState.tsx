import type { ReactNode } from 'react'

type StateTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

interface EmptyStateProps {
  eyebrow?: string
  title: string
  description?: ReactNode
  action?: ReactNode
  tone?: StateTone
}

interface SkeletonStateProps {
  title?: string
  description?: string
  variant?: 'page' | 'list' | 'detail'
}

interface ErrorStateProps {
  title?: string
  description?: ReactNode
  retryLabel?: string
  onRetry?: () => void
}

export function EmptyState({ eyebrow = 'Empty state', title, description, action, tone = 'neutral' }: EmptyStateProps) {
  return (
    <section className={`ss-state ss-state-${tone}`}>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && <div className="ss-state-action">{action}</div>}
    </section>
  )
}

export function ErrorState({ title = '暂时无法加载', description, retryLabel = '重试', onRetry }: ErrorStateProps) {
  return (
    <section className="ss-state ss-state-danger">
      <span>Error</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {onRetry && (
        <div className="ss-state-action">
          <button type="button" onClick={onRetry}>{retryLabel}</button>
        </div>
      )}
    </section>
  )
}

export function SkeletonState({ title = '正在加载', description = 'SiliconScope 正在整理数据。', variant = 'page' }: SkeletonStateProps) {
  const rows = variant === 'detail' ? 5 : variant === 'list' ? 4 : 3

  return (
    <section className={`ss-skeleton-state ss-skeleton-${variant}`} aria-busy="true" aria-live="polite">
      <div className="ss-skeleton-orb" />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="ss-skeleton-lines">
        {Array.from({ length: rows }).map((_, index) => (
          <i key={index} style={{ width: `${92 - index * 11}%` }} />
        ))}
      </div>
    </section>
  )
}
