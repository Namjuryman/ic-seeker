import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { NotificationItem } from '../types'

const severityLabels: Record<NotificationItem['severity'], string> = {
  info: '提示',
  success: '完成',
  warning: '提醒',
  critical: '重要',
}

const kindLabels: Record<string, string> = {
  system: '系统',
  import: '导入',
  export: '导出',
  moderation: '审核',
  billing: '订阅',
  watchlist: '关注',
  weekly: '周报',
  access: '访问',
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
          <em>{kindLabels[item.kind] || item.kind}</em>
          <small>{formatDate(item.createdAt)}</small>
        </div>
        <h3>{item.title}</h3>
        {item.body && <p>{item.body}</p>}
        <div className="notification-actions">
          {item.href && (
            <Link to={item.href} onClick={onRead}>
              {item.actionLabel || '查看'}
            </Link>
          )}
          {!item.readAt && <button onClick={onRead}>标为已读</button>}
          <button className="subtle" onClick={onDelete}>删除</button>
        </div>
      </div>
      {!item.readAt && <div className="notification-dot" aria-label="未读" />}
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
          <span>通知中心</span>
          <h1>通知中心</h1>
          <p>集中接收系统公告、审核结果、导入任务、周报摘要和订阅提醒。重要状态会在这里留痕，方便之后回看。</p>
        </div>
        <div className="notifications-unread">
          <strong>{data?.unread ?? 0}</strong>
          <span>未读</span>
          <button disabled={!data?.unread || markAll.isPending} onClick={() => markAll.mutate()}>
            全部标为已读
          </button>
        </div>
      </section>

      {notifications.isLoading && <div className="learning-muted">正在加载通知...</div>}

      {!notifications.isLoading && rows.length === 0 && (
        <div className="notifications-empty">
          <h2>暂无通知</h2>
          <p>周报同步、审核、导出或订阅状态有更新时，会在这里显示。</p>
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
