import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { IngestionJob } from '../types'

const providerOptions = ['ieee', 'openalex', 'crossref', 'csv', 'pdf', 'manual'] as const
const statusOptions = ['queued', 'running', 'succeeded', 'failed', 'review_required', 'cancelled'] as const

function formatTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function statusClass(status: string) {
  if (status === 'succeeded') return 'ok'
  if (status === 'failed') return 'bad'
  if (status === 'running' || status === 'queued') return 'run'
  if (status === 'review_required') return 'warn'
  return 'idle'
}

function scopeText(job: IngestionJob) {
  const scope = job.scope || {}
  const venues = Array.isArray(scope.venues) ? scope.venues.join(', ') : String(scope.venues || '')
  const years = scope.yearFrom && scope.yearTo ? `${scope.yearFrom}-${scope.yearTo}` : ''
  return [years, venues, String(scope.query || '')].filter(Boolean).join(' / ') || 'No scope set'
}

export default function JournalIngestionPage() {
  const queryClient = useQueryClient()
  const [provider, setProvider] = useState('openalex')
  const [mode, setMode] = useState('metadata_sync')
  const [yearFrom, setYearFrom] = useState('2025')
  const [yearTo, setYearTo] = useState('2026')
  const [venues, setVenues] = useState('ISSCC,JSSC,CICC,VLSI,ASSCC,ESSCIRC')
  const [query, setQuery] = useState('integrated circuit OR solid-state circuit')
  const [notes, setNotes] = useState('Registered from admin ingestion console. Worker execution is not connected yet.')

  const jobs = useQuery({
    queryKey: ['ingestion-jobs'],
    queryFn: () => api.ingestionJobs({ limit: 80 }),
    refetchInterval: 30_000,
  })

  const createJob = useMutation({
    mutationFn: () => api.createIngestionJob({
      provider,
      mode,
      scope: {
        yearFrom: Number(yearFrom),
        yearTo: Number(yearTo),
        venues: venues.split(',').map((item) => item.trim()).filter(Boolean),
        query,
      },
      notes,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['job-operations'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
    },
  })

  const updateJob = useMutation({
    mutationFn: ({ job, status }: { job: IngestionJob; status: string }) => api.updateIngestionJob(job.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['job-operations'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
    },
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

  return (
    <div className="ingestion-page">
      <section className="ingestion-hero">
        <div>
          <span>INGESTION CONTROL</span>
          <h1>Metadata ingestion jobs</h1>
          <p>
            Register weekly IEEE/OpenAlex/Crossref/CSV/PDF import work as backend jobs. Heavy crawling is still disabled in the browser;
            this page creates auditable job records for the future worker queue.
          </p>
        </div>
        <div className="ingestion-hero-card">
          <strong>{stats.total}</strong>
          <span>{stats.active} active / {stats.failed} failed / {stats.review} review</span>
        </div>
      </section>

      <section className="ingestion-grid">
        <form className="ingestion-form" onSubmit={(event) => { event.preventDefault(); createJob.mutate() }}>
          <div className="ingestion-section-head">
            <span>NEW JOB</span>
            <h2>Create an ingestion plan</h2>
          </div>
          <label>
            Provider
            <select value={provider} onChange={(event) => setProvider(event.target.value)}>
              {providerOptions.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Mode
            <input value={mode} onChange={(event) => setMode(event.target.value)} />
          </label>
          <div className="ingestion-form-pair">
            <label>
              Year from
              <input value={yearFrom} onChange={(event) => setYearFrom(event.target.value)} />
            </label>
            <label>
              Year to
              <input value={yearTo} onChange={(event) => setYearTo(event.target.value)} />
            </label>
          </div>
          <label>
            Venues
            <textarea value={venues} onChange={(event) => setVenues(event.target.value)} rows={3} />
          </label>
          <label>
            Query
            <textarea value={query} onChange={(event) => setQuery(event.target.value)} rows={3} />
          </label>
          <label>
            Notes
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </label>
          <button disabled={createJob.isPending}>{createJob.isPending ? 'Creating...' : 'Create queued job'}</button>
          {createJob.error && <p className="maintenance-error">{(createJob.error as any)?.response?.data?.error || 'Create failed'}</p>}
        </form>

        <section className="ingestion-policy">
          <div className="ingestion-section-head">
            <span>SAFE MODE</span>
            <h2>Current execution policy</h2>
          </div>
          <ul>
            <li>Browser-triggered long crawls remain disabled.</li>
            <li>Every import run should first create a restore point.</li>
            <li>Borderline papers should go to review instead of direct insert.</li>
            <li>Future workers can update this table with fetched/inserted/skipped/review counts.</li>
          </ul>
        </section>
      </section>

      <section className="ingestion-board">
        <div className="ingestion-section-head ingestion-board-head">
          <div>
            <span>JOB HISTORY</span>
            <h2>Registered ingestion jobs</h2>
          </div>
          <strong>{jobs.data?.rows.length || 0} loaded</strong>
        </div>
        <div className="ingestion-table">
          <div className="ingestion-row ingestion-row-head">
            <span>Job</span>
            <span>Status</span>
            <span>Scope</span>
            <span>Counts</span>
            <span>Updated</span>
            <span>Action</span>
          </div>
          {(jobs.data?.rows || []).map((job) => (
            <div className="ingestion-row" key={job.id}>
              <div>
                <strong>{job.provider}</strong>
                <small>#{job.id} / {job.mode}</small>
              </div>
              <span className={`maintenance-status ${statusClass(job.status)}`}>{job.status}</span>
              <p>{scopeText(job)}</p>
              <small>
                {job.counts.inserted} inserted / {job.counts.updated} updated / {job.counts.review} review
              </small>
              <small>{formatTime(job.updatedAt)}</small>
              <select
                value={job.status}
                onChange={(event) => updateJob.mutate({ job, status: event.target.value })}
                disabled={updateJob.isPending}
              >
                {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          ))}
          {!jobs.data?.rows.length && <p className="learning-muted">No ingestion job has been registered yet.</p>}
        </div>
      </section>
    </div>
  )
}
