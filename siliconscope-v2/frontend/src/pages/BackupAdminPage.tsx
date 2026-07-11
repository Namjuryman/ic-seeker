import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'

function bytes(value: number) {
  if (value > 1024 * 1024 * 1024) return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`
  if (value > 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`
  if (value > 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${value} B`
}

function deploymentModeLabel(value?: string | null) {
  const labels: Record<string, string> = {
    local: '本地运行',
    development: '开发环境',
    production: '生产环境',
    demo: '演示环境',
  }
  return labels[String(value || '').toLowerCase()] || value || '未标注'
}

export default function BackupAdminPage() {
  const queryClient = useQueryClient()
  const [label, setLabel] = useState('manual')
  const [keep, setKeep] = useState(10)
  const backups = useQuery({ queryKey: ['admin-backups'], queryFn: api.backups })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-backups'] })

  const create = useMutation({
    mutationFn: () => api.createBackup(label),
    onSuccess: refresh,
  })

  const prune = useMutation({
    mutationFn: () => api.pruneBackups(keep),
    onSuccess: refresh,
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteBackup(id),
    onSuccess: refresh,
  })

  if (backups.isLoading) return <div className="ss-loading">正在加载备份操作...</div>
  if (!backups.data) return <div className="ss-loading">备份服务暂不可用。</div>

  return (
    <div className="backup-admin-page">
      <section className="backup-hero">
        <div>
          <span>生产运维</span>
          <h1>数据库备份与恢复点</h1>
          <p>为当前数据库提供手动恢复点，并保留跨存储备份、恢复校验和迁移审计入口。</p>
        </div>
        <div className="backup-hero-card">
          <span>备份目录</span>
          <strong>{backups.data.backupDir}</strong>
          <em>{backups.data.total} 个备份 · {bytes(backups.data.totalBytes)}</em>
        </div>
      </section>

      <section className="backup-actions">
        <article>
          <span>创建恢复点</span>
          <h2>在线数据库备份</h2>
          <p>在服务运行时创建一致性的数据库副本，用作导入、清洗和发布前的人工恢复点。</p>
          <div className="backup-action-row">
            <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="备份标签" />
            <button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? '创建中...' : '创建备份'}
            </button>
          </div>
        </article>
        <article>
          <span>保留策略</span>
          <h2>清理旧备份</h2>
          <p>删除旧恢复点，只保留最近 N 个。生产环境建议先确认已完成异地备份。</p>
          <div className="backup-action-row">
            <input type="number" min={1} max={100} value={keep} onChange={(event) => setKeep(Number(event.target.value))} />
            <button onClick={() => prune.mutate()} disabled={prune.isPending}>
              {prune.isPending ? '清理中...' : '执行清理'}
            </button>
          </div>
        </article>
      </section>

      <section className="backup-restore-note">
        <strong>恢复策略</strong>
        <p>恢复暂时保持人工确认：先停止 API，保留当前库快照，再用目标恢复点替换运行数据库并重启服务。不要在服务运行时直接覆盖生产库。</p>
      </section>

      <section className="backup-table">
        <div className="backup-row backup-head">
          <span>恢复点</span>
          <span>大小</span>
          <span>来源</span>
          <span>操作</span>
        </div>
        {backups.data.rows.map((row) => (
          <div className="backup-row" key={row.id}>
            <div>
              <strong>{row.label}</strong>
              <small>{row.id}</small>
              <small>{new Date(row.createdAt).toLocaleString()}</small>
            </div>
            <div>
              <strong>{bytes(row.dbBytes)}</strong>
              <small>{bytes(row.manifestBytes)} 清单</small>
            </div>
            <div>
              <strong>{deploymentModeLabel(row.source.deploymentMode)}</strong>
              <small>{row.source.databasePath}</small>
            </div>
            <div className="backup-row-actions">
              <button onClick={() => navigator.clipboard?.writeText(row.dbPath)}>复制路径</button>
              <button className="danger" onClick={() => remove.mutate(row.id)} disabled={remove.isPending}>删除</button>
            </div>
          </div>
        ))}
        {!backups.data.rows.length && (
          <div className="backup-empty">
            <strong>还没有备份</strong>
            <p>公网部署前至少创建一个备份，并把 `backups/` 同步到服务器外的位置。</p>
          </div>
        )}
      </section>
    </div>
  )
}
