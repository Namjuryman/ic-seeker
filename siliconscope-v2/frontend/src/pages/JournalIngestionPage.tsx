import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { IngestionJob, IngestionJobEvent, IngestionJobStatus } from '../types'

const providerOptions = ['openalex', 'crossref', 'ieee', 'semantic-scholar', 'dblp', 'csv', 'scholar-csv', 'aminer', 'pdf', 'manual'] as const
const statusOptions: IngestionJobStatus[] = ['queued', 'running', 'succeeded', 'failed', 'review_required', 'cancelled']

function formatTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function scopeText(scope: Record<string, unknown>) {
  const parts = [
    scope.yearFrom && scope.yearTo ? `${scope.yearFrom}-${scope.yearTo}` : null,
    Array.isArray(scope.venues) ? scope.venues.join(', ') : null,
    scope.query ? String(scope.query) : null,
    scope.retryOf ? `retry of #${scope.retryOf}` : null,
  ].filter(Boolean)
  return parts.join(' / ') || 'manual scope'
}

function statusClass(status: string) {
  if (status === 'running' || status === 'queued') return 'running'
  if (status === 'failed') return 'error'
  if (status === 'review_required') return 'warning'
  return 'ok'
}

function eventLabel(event: IngestionJobEvent) {
  return event.eventType.replace(/_/g, ' ')
}

function IngestionCreateForm({ onCreated }: { onCreated: (job: IngestionJob) => void }) {
  const [provider, setProvider] = useState<(typeof providerOptions)[number]>('openalex')
  const [mode, setMode] = useState('metadata_sync')
  const [yearFrom, setYearFrom] = useState(2025)
  const [yearTo, setYearTo] = useState(2026)
  const [venues, setVenues] = useState('ISSCC,JSSC,CICC,VLSI,ASSCC,ESSCIRC')
  const [query, setQuery] = useState('integrated circuit OR solid-state circuit')
  const [limit, setLimit] = useState(5)
  const [dryRun, setDryRun] = useState(false)
  const [refreshTopics, setRefreshTopics] = useState(false)
  const [includeLowRelevance, setIncludeLowRelevance] = useState(false)
  const [notes, setNotes] = useState('Weekly metadata import candidate. PDF download remains publisher/manual only.')

  const mutation = useMutation({
    mutationFn: () => api.createIngestionJob({
      provider,
      mode,
      notes,
      scope: {
        yearFrom,
        yearTo,
        venues: venues.split(',').map((item) => item.trim()).filter(Boolean),
        query: query.trim(),
        limit,
        dryRun,
        refreshTopics,
        includeLowRelevance,
      },
    }),
    onSuccess: onCreated,
  })

  return (
    <section className="ingestion-form">
      <div className="ingestion-section-head">
        <span>Register job</span>
        <h2>New ingestion boundary</h2>
      </div>
      <label>
        Provider
        <select value={provider} onChange={(event) => setProvider(event.target.value as typeof provider)}>
          {providerOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <label>
        Mode
        <input value={mode} onChange={(event) => setMode(event.target.value)} />
      </label>
      <div className="ingestion-form-pair">
        <label>
          Year from
          <input type="number" value={yearFrom} onChange={(event) => setYearFrom(Number(event.target.value))} />
        </label>
        <label>
          Year to
          <input type="number" value={yearTo} onChange={(event) => setYearTo(Number(event.target.value))} />
        </label>
      </div>
      <label>
        Venues
        <input value={venues} onChange={(event) => setVenues(event.target.value)} />
      </label>
      <label>
        Query
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <label>
        Limit
        <input type="number" min={1} max={500} value={limit} onChange={(event) => setLimit(Number(event.target.value))} />
      </label>
      <div className="ingestion-checks">
        <label>
          <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
          Dry run only
        </label>
        <label>
          <input type="checkbox" checked={refreshTopics} onChange={(event) => setRefreshTopics(event.target.checked)} />
          Refresh topic taxonomy
        </label>
        <label>
          <input type="checkbox" checked={includeLowRelevance} onChange={(event) => setIncludeLowRelevance(event.target.checked)} />
          Include low-relevance rows
        </label>
      </div>
      <label>
        Notes
        <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? 'Registering...' : 'Create ingestion job'}
      </button>
      {mutation.error && <p className="ingestion-error">Create failed: {(mutation.error as any)?.response?.data?.error || String(mutation.error)}</p>}
    </section>
  )
}

function IngestionEventPanel({ selectedJob }: { selectedJob: IngestionJob | null }) {
  const events = useQuery({
    queryKey: ['ingestion-job-events', selectedJob?.id],
    queryFn: () => api.ingestionJobEvents(selectedJob!.id),
    enabled: Boolean(selectedJob),
    refetchInterval: selectedJob?.status === 'running' || selectedJob?.status === 'queued' ? 10_000 : false,
  })

  if (!selectedJob) {
    return (
      <aside className="ingestion-events">
        <div className="ingestion-section-head">
          <span>Timeline</span>
          <h2>Select a job</h2>
        </div>
        <p className="learning-muted">Click a job row to inspect status changes, retries, review notes, and future worker progress.</p>
      </aside>
    )
  }

  return (
    <aside className="ingestion-events">
      <div className="ingestion-section-head">
        <span>Timeline</span>
        <h2>Job #{selectedJob.id}</h2>
      </div>
      <p className="learning-muted">{scopeText(selectedJob.scope)}</p>
      <div className="ingestion-event-list">
        {events.data?.rows.map((event) => (
          <article className={`ingestion-event ingestion-event-${statusClass(event.eventType)}`} key={event.id}>
            <strong>{eventLabel(event)}</strong>
            <small>{formatTime(event.createdAt)}</small>
            {event.message && <p>{event.message}</p>}
          </article>
        ))}
        {events.isLoading && <p className="learning-muted">Loading events...</p>}
        {!events.isLoading && !events.data?.rows.length && <p className="learning-muted">No events recorded yet.</p>}
      </div>
    </aside>
  )
}

function JobActions({ job, onSelected }: { job: IngestionJob; onSelected: (job: IngestionJob) => void }) {
  const queryClient = useQueryClient()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] })
    queryClient.invalidateQueries({ queryKey: ['ingestion-job-events', job.id] })
    queryClient.invalidateQueries({ queryKey: ['job-operations'] })
    queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
  }
  const start = useMutation({ mutationFn: () => api.startIngestionJob(job.id), onSuccess: (updated) => { onSelected(updated); invalidate() } })
  const cancel = useMutation({ mutationFn: () => api.cancelIngestionJob(job.id), onSuccess: (updated) => { onSelected(updated); invalidate() } })
  const retry = useMutation({ mutationFn: () => api.retryIngestionJob(job.id), onSuccess: (updated) => { onSelected(updated); invalidate() } })
  const status = useMutation({
    mutationFn: (next: IngestionJobStatus) => api.updateIngestionJob(job.id, { status: next }),
    onSuccess: (updated) => { onSelected(updated); invalidate() },
  })

  const busy = start.isPending || cancel.isPending || retry.isPending || status.isPending

  return (
    <div className="ingestion-actions" onClick={(event) => event.stopPropagation()}>
      <button disabled={busy || (job.status !== 'queued' && job.status !== 'review_required')} onClick={() => start.mutate()}>Start</button>
      <button className="subtle" disabled={busy || job.status === 'succeeded' || job.status === 'cancelled'} onClick={() => cancel.mutate()}>Cancel</button>
      <button className="subtle" disabled={busy || job.status === 'running'} onClick={() => retry.mutate()}>Retry</button>
      <select value={job.status} disabled={busy} onChange={(event) => status.mutate(event.target.value as IngestionJobStatus)}>
        {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  )
}

function IngestionJobRow({
  job,
  selected,
  onSelect,
}: {
  job: IngestionJob
  selected: boolean
  onSelect: (job: IngestionJob) => void
}) {
  const totalTouched = job.counts.inserted + job.counts.updated + job.counts.review
  return (
    <article className={`ingestion-row ${selected ? 'is-selected' : ''}`} onClick={() => onSelect(job)}>
      <div>
        <strong>#{job.id} {job.provider}</strong>
        <small>{job.mode}</small>
      </div>
      <span className={`pill pill-${statusClass(job.status)}`}>{job.status}</span>
      <div>
        <p>{scopeText(job.scope)}</p>
        <small>{job.notes || 'No notes'}</small>
      </div>
      <div>
        <strong>{totalTouched.toLocaleString()}</strong>
        <small>{job.counts.inserted} inserted / {job.counts.updated} updated / {job.counts.review} review</small>
      </div>
      <div>
        <strong>{formatTime(job.updatedAt)}</strong>
        <small>created {formatTime(job.createdAt)}</small>
      </div>
      <JobActions job={job} onSelected={onSelect} />
    </article>
  )
}

export default function JournalIngestionPage() {
  const queryClient = useQueryClient()
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const jobs = useQuery({
    queryKey: ['ingestion-jobs'],
    queryFn: () => api.ingestionJobs({ limit: 80 }),
    refetchInterval: 30_000,
  })

  const stats = useMemo(() => {
    const rows = jobs.data?.rows || []
    return {
      total: jobs.data?.total || 0,
      active: rows.filter((job) => job.status === 'queued' || job.status === 'running').length,
      failed: rows.filter((job) => job.status === 'failed').length,
      review: rows.filter((job) => job.status === 'review_required').length,
    }
  }, [jobs.data])

  const selectedJob = useMemo(() => {
    const rows = jobs.data?.rows || []
    return rows.find((job) => job.id === selectedJobId) || rows[0] || null
  }, [jobs.data, selectedJobId])

  function handleCreated(job: IngestionJob) {
    setSelectedJobId(job.id)
    queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] })
    queryClient.invalidateQueries({ queryKey: ['job-operations'] })
    queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
  }

  return (
    <div className="ingestion-page">
      <section className="ingestion-hero">
        <div>
          <span>Ingestion control plane</span>
          <h1>Weekly import jobs</h1>
          <p>
            Register and run IEEE, OpenAlex, Crossref, CSV, and local metadata imports as auditable jobs.
            Each run records source scope, counts, errors, and review status so weekly database updates stay traceable.
          </p>
        </div>
        <div className="ingestion-hero-card">
          <strong>{stats.total.toLocaleString()}</strong>
          <span>{stats.active} active / {stats.failed} failed / {stats.review} review</span>
        </div>
      </section>

      <section className="ingestion-grid">
        <IngestionCreateForm onCreated={handleCreated} />
        <div className="ingestion-policy">
          <div className="ingestion-section-head">
            <span>Import policy</span>
            <h2>Safe metadata first</h2>
          </div>
          <ul>
            <li>Metadata imports should be repeatable by provider, venue, year, DOI, and source revision.</li>
            <li>PDF collection remains local/private or publisher redirected; public demo should expose DOI and abstracts only.</li>
            <li>Large imports must run after a backup and should refresh snapshots after alias and venue review.</li>
            <li>Failed or risky rows should move into review_required instead of silently changing leaderboards.</li>
          </ul>
        </div>
      </section>

      <section className="ingestion-workbench">
        <div className="ingestion-board">
          <div className="ingestion-board-head">
            <div>
              <span>Jobs</span>
              <h2>{stats.total.toLocaleString()} registered jobs</h2>
            </div>
            <strong>{jobs.isFetching ? 'refreshing' : 'sqlite'}</strong>
          </div>
          <div className="ingestion-table">
            {jobs.data?.rows.map((job) => (
              <IngestionJobRow
                key={job.id}
                job={job}
                selected={selectedJob?.id === job.id}
                onSelect={(next) => setSelectedJobId(next.id)}
              />
            ))}
            {jobs.isLoading && <p className="learning-muted">Loading ingestion jobs...</p>}
            {!jobs.isLoading && !jobs.data?.rows.length && <p className="learning-muted">No ingestion job yet. Register the first import boundary above.</p>}
          </div>
        </div>
        <IngestionEventPanel selectedJob={selectedJob} />
      </section>
    </div>
  )
}
