import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { SiteSettingRow } from '../types'

const groupOrder = ['Access', 'Commercial', 'Research', 'Community', 'Operations']

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
        {mutation.isPending ? 'Saving...' : enabled ? 'Enabled' : 'Disabled'}
      </button>
    )
  }

  return (
    <div className="billing-admin-actions">
      <input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={row.isSensitive || mutation.isPending} />
      <button disabled={row.isSensitive || mutation.isPending || draft === String(row.value ?? '')} onClick={() => mutation.mutate(draft)}>
        {mutation.isPending ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}

function SettingCard({ row }: { row: SiteSettingRow }) {
  return (
    <article className="scheduler-card">
      <div className="scheduler-card-main">
        <div>
          <span>{row.isPublic ? 'public visible' : 'admin only'}</span>
          <h3>{row.label}</h3>
          <p>{row.description}</p>
        </div>
        <strong>{row.valueType}</strong>
      </div>
      <div className="scheduler-card-stats">
        <div><span>Key</span><strong>{row.key}</strong></div>
        <div><span>Current</span><strong>{String(row.value)}</strong></div>
        <div><span>Updated</span><strong>{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '-'}</strong></div>
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
    return <div className="learning-muted">Loading site settings...</div>
  }

  if (!settings.data) {
    return <div className="learning-muted">Site settings are not available.</div>
  }

  const summary = settings.data.summary

  return (
    <div className="scheduler-page">
      <section className="scheduler-hero">
        <div>
          <span>Commercial control plane</span>
          <h1>Site settings</h1>
          <p>
            Central feature flags for private beta, launch readiness, monetization, community surfaces, and operations.
            Public users only see the safe public subset; admin-only flags stay in this independent console.
          </p>
        </div>
        <div className={`scheduler-live ${summary.maintenanceMode ? '' : 'is-enabled'}`}>
          <strong>{summary.inviteOnlyMode ? 'Private beta' : 'Public'}</strong>
          <span>{summary.maintenanceMode ? 'maintenance on' : 'operational'}</span>
        </div>
      </section>

      <section className="scheduler-summary">
        <div><span>Total settings</span><strong>{summary.total}</strong></div>
        <div><span>Public subset</span><strong>{summary.public}</strong></div>
        <div><span>Enabled flags</span><strong>{summary.enabledFlags}</strong></div>
        <div><span>Disabled flags</span><strong>{summary.disabledFlags}</strong></div>
        <div><span>Checkout</span><strong>{summary.checkoutEnabled ? 'on' : 'off'}</strong></div>
      </section>

      {grouped.map((group) => (
        <section className="admin-panel" key={group.group}>
          <div className="admin-panel-head">
            <span>{group.rows.length} settings</span>
            <h2>{group.group}</h2>
          </div>
          <div className="scheduler-grid">
            {group.rows.map((row) => <SettingCard key={row.key} row={row} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
