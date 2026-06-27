import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { NotificationItem } from '../types'

const severityLabels: Record<NotificationItem['severity'], string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  critical: 'Critical',
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function NotificationCard({
  item,
  onRead,
  onDelete,
}: {
  item: NotificationItem;
  onRead: () => void;
  onDelete: () => void;
}) {
  return (
    <article className={`notification-card notification-${item.severity} ${item.readAt ? 'is-read' : ''}`}>
      <div className="notification-card-main">
        <div className="notification-meta">
          <span>{severityLabels[item.severity]}</span>
          <em>{item.kind}</em>
          <small>{formatDate(item.createdAt)}</small>
        </div>
        <h3>{item.title}</h3>
        {item.body && <p>{item.body}</p>}
        <div className="notification-actions">
          {item.href && (
            <Link to={item.href} onClick={onRead}>
              {item.actionLabel || 'Open'}
            </Link>
          )}
          {!item.readAt && <button onClick={onRead}>Mark read</button>}
          <button className="subtle" onClick={onDelete}>Delete</button>
        </div>
      </div>
      {!item.readAt && <div className="notification-dot" aria-label="Unread" />}
    </article>
  )
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications({ limit: 80 }),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['notification-count'] })
  }

  const markRead = useMutation({
    mutationFn: (id: number) => api.markNotificationRead(id),
    onSuccess: invalidate,
  })

  const markAll = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteNotification(id),
    onSuccess: invalidate,
  })

  const data = notifications.data
  const rows = data?.rows || []

  return (
    <div className="notifications-page">
      <section className="notifications-hero">
        <div>
          <span>Notification Center</span>
          <h1>通知中心</h1>
          <p>集中接收系统公告、审核结果、导入任务、周报摘要和未来订阅提醒。这个模块会成为商业版用户运营和后台任务回执的基础。</p>
        </div>
        <div className="notifications-unread">
          <strong>{data?.unread ?? 0}</strong>
          <span>unread</span>
          <button disabled={!data?.unread || markAll.isPending} onClick={() => markAll.mutate()}>
            Mark all read
          </button>
        </div>
      </section>

      {notifications.isLoading && <div className="learning-muted">Loading notifications...</div>}

      {!notifications.isLoading && rows.length === 0 && (
        <div className="notifications-empty">
          <h2>No notifications</h2>
          <p>When weekly sync, moderation, exports, or subscription features are enabled, messages will appear here.</p>
        </div>
      )}

      <section className="notification-list">
        {rows.map((item) => (
          <NotificationCard
            key={item.id}
            item={item}
            onRead={() => markRead.mutate(item.id)}
            onDelete={() => remove.mutate(item.id)}
          />
        ))}
      </section>
    </div>
  )
}
