import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { PaperLink } from '../components/PaperLink'
import { searchPath } from '../utils/routes'
import type { GeoResult, GeoCountry, PaperRow } from '../types'
import {
  countryFeatureCode,
  geoCountryAnchor,
  geoDenseRegionCodes,
  geoLabelOffsets,
  prepareWorldMap,
  projectWorldPoint,
  type PreparedWorldMap,
} from '../utils/geoUtils'

type GeoMode = 'overall' | 'institutions' | 'topic'

function metric(country: GeoCountry, mode: GeoMode) {
  if (mode === 'institutions') return Number(country.institutionCount || country.topInstitutions?.length || 0)
  if (mode === 'topic') return Number(country.score || 0)
  return Number(country.recentScore || country.score || 0)
}

function densityMetric(country: GeoCountry, mode: GeoMode) {
  if (mode === 'institutions') return Number(country.institutionCount || country.topInstitutions?.length || 0)
  return Number(country.papers || metric(country, mode) || 0)
}

function yearMetric(country: GeoCountry, mode: GeoMode, selectedYear: number | 'all') {
  if (selectedYear === 'all') return metric(country, mode)
  const row = country.byYear?.find((item) => Number(item.year) === selectedYear)
  if (!row) return 0
  return mode === 'institutions' ? Number(country.topInstitutions?.filter((inst) => inst.byYear?.some((year) => year.year === selectedYear && year.papers > 0)).length || 0) : Number(row.score || row.papers || 0)
}

function yearDensityMetric(country: GeoCountry, mode: GeoMode, selectedYear: number | 'all') {
  if (selectedYear === 'all') return densityMetric(country, mode)
  const row = country.byYear?.find((item) => Number(item.year) === selectedYear)
  if (!row) return 0
  return mode === 'institutions' ? yearMetric(country, mode, selectedYear) : Number(row.papers || row.score || 0)
}

function institutionMetric(institution: GeoCountry['topInstitutions'][number], selectedYear: number | 'all') {
  if (selectedYear === 'all') return Number(institution.count || 0)
  return Number(institution.byYear?.find((row) => Number(row.year) === selectedYear)?.papers || 0)
}

function MiniBars({ rows, label = 'papers', onRowClick }: { rows: Array<{ key?: string; year?: number; count?: number; papers?: number; score?: number }>; label?: string; onRowClick?: (key: string) => void }) {
  const normalized = rows.map((row) => ({
    key: String(row.key ?? row.year ?? '-'),
    count: Number(row.count ?? row.papers ?? row.score ?? 0),
  })).slice(-10)
  const max = Math.max(1, ...normalized.map((row) => row.count))
  if (!normalized.length) return <p className="text-xs text-ink-muted">No data yet.</p>
  return (
    <div className="mini-bars">
      {normalized.map((row) => (
        <div
          key={row.key}
          className={`mini-bar-row ${onRowClick ? 'cursor-pointer hover:bg-surface-elevated' : ''}`}
          onClick={() => onRowClick?.(row.key)}
        >
          <span>{row.key}</span>
          <div><i style={{ width: `${Math.max(3, row.count / max * 100)}%` }} /></div>
          <strong>{Math.round(row.count)}</strong>
        </div>
      ))}
      <em>{label}</em>
    </div>
  )
}

function SharePie({ countries, mode, selected, onSelect }: { countries: GeoCountry[]; mode: GeoMode; selected?: string; onSelect: (country: GeoCountry) => void }) {
  const rows = countries.slice(0, 7).map((country) => ({
    code: country.code,
    name: country.name,
    count: Math.round(metric(country, mode)),
    country,
  }))
  const other = countries.slice(7).reduce((sum, country) => sum + metric(country, mode), 0)
  if (other > 0) rows.push({ code: 'Other', name: 'Other', count: Math.round(other), country: countries[0] })
  const total = Math.max(1, rows.reduce((sum, row) => sum + row.count, 0))
  let cursor = 0
  const colors = ['#3654c8', '#1f9d73', '#6f7fb8', '#d18b2c', '#40a0c4', '#825ec9', '#cb5b7b', '#aab6c8']
  const gradient = rows.map((row, index) => {
    const start = cursor / total * 100
    cursor += row.count
    const end = cursor / total * 100
    return `${colors[index % colors.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`
  }).join(', ')

  return (
    <div className="geo-share">
      <div className="geo-pie" style={{ background: `conic-gradient(${gradient})` }} />
      <div className="geo-pie-legend">
        {rows.map((row, index) => (
          row.code === 'Other' ? (
            <div key={row.code} className="geo-pie-row muted">
              <i style={{ background: colors[index % colors.length] }} /><span>{row.name}</span><strong>{Math.round(row.count / total * 100)}%</strong>
            </div>
          ) : (
            <button key={row.code} className={`geo-pie-row ${selected === row.code ? 'active' : ''}`} onClick={() => onSelect(row.country)}>
              <i style={{ background: colors[index % colors.length] }} /><span>{row.name}</span><strong>{Math.round(row.count / total * 100)}%</strong>
            </button>
          )
        ))}
      </div>
    </div>
  )
}

function GeoMap({ countries, selectedCode, selectedYear, mode, worldMap, onSelect }: { countries: GeoCountry[]; selectedCode?: string; selectedYear: number | 'all'; mode: GeoMode; worldMap: PreparedWorldMap | null; onSelect: (country: GeoCountry) => void }) {
  const densityMax = Math.max(1, ...countries.map((country) => yearDensityMetric(country, mode, selectedYear)))
  const institutionMax = Math.max(1, ...countries.flatMap((country) => country.topInstitutions || []).map((institution) => institutionMetric(institution, selectedYear)))
  const countryByFeature = new Map(countries.map((country) => [countryFeatureCode(country.code), country]))
  const renderedFeatureCodes = new Set<string>()
  const labelled = new Set(countries.filter((country) => !geoDenseRegionCodes.has(country.code)).slice(0, 6).map((country) => country.code))
  if (selectedCode) labelled.add(selectedCode)
  const regionalGroups = [
    { title: 'East Asia', codes: ['CN', 'HK', 'MO', 'TW', 'KR', 'JP', 'SG'] },
    { title: 'Europe', codes: ['UK', 'NL', 'BE', 'DE', 'FR', 'CH', 'IT'] },
  ].map((group) => ({ ...group, countries: group.codes.map((code) => countries.find((country) => country.code === code)).filter(Boolean) as GeoCountry[] }))
    .filter((group) => group.countries.length)

  return (
    <div className="geo-map-canvas" aria-label="Regional intelligence map">
      <svg viewBox="0 0 110 66" role="img" className="geo-map-bg">
        <defs>
          <linearGradient id="geoOcean" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f9fbff" />
            <stop offset="100%" stopColor="#eef4fb" />
          </linearGradient>
          <filter id="geoHeatSoft" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation=".68" />
          </filter>
        </defs>
        <rect x=".75" y=".75" width="108.5" height="64.5" rx="5.5" fill="url(#geoOcean)" />
        <g className="geo-world-layer">
          {(worldMap?.features || []).map((feature) => {
            const country = countryByFeature.get(feature.code)
            const selected = country?.code === selectedCode
            const densityValue = country ? yearDensityMetric(country, mode, selectedYear) : 0
            const density = country ? Math.max(.08, Math.min(1, Math.log1p(densityValue) / Math.log1p(densityMax))) : 0
            if (country) renderedFeatureCodes.add(feature.code)
            return (
              <path
                key={feature.code + feature.name}
                className={`geo-world-country ${country ? 'has-data' : ''} ${selected ? 'active' : ''}`}
                style={{
                  '--geo-density': density.toFixed(3),
                } as React.CSSProperties}
                d={feature.path}
                onClick={() => country && onSelect(country)}
              >
                <title>{country ? `${country.name}: ${Math.round(densityValue)} mapped outputs` : feature.name}</title>
              </path>
            )
          })}
        </g>
        <g className="geo-heat-layer" filter="url(#geoHeatSoft)">
          {countries.flatMap((country) => (country.topInstitutions || [])
            .filter((institution) => Number.isFinite(institution.lat) && Number.isFinite(institution.lon))
            .map((institution) => {
              const value = institutionMetric(institution, selectedYear)
              if (value <= 0) return null
              const projected = projectWorldPoint(Number(institution.lon), Number(institution.lat))
              const scale = Math.sqrt(value / institutionMax)
              const radius = Math.max(1.55, Math.min(7.4, 1.85 + scale * 5.55))
              const alpha = Math.max(.18, Math.min(.78, .2 + scale * .6))
              const active = country.code === selectedCode
              return (
                <g
                  key={`${country.code}-${institution.name}-${selectedYear}`}
                  className={`geo-heat-source ${active ? 'active' : ''}`}
                  style={{ '--geo-heat-alpha': alpha.toFixed(3) } as React.CSSProperties}
                  onClick={() => onSelect(country)}
                >
                  <circle className="geo-heat-cool" cx={projected.x.toFixed(2)} cy={projected.y.toFixed(2)} r={(radius * 1.64).toFixed(2)} />
                  <circle className="geo-heat-warm" cx={projected.x.toFixed(2)} cy={projected.y.toFixed(2)} r={(radius * .98).toFixed(2)} />
                  <circle className="geo-heat-hot" cx={projected.x.toFixed(2)} cy={projected.y.toFixed(2)} r={(radius * .46).toFixed(2)} />
                  <title>{institution.name} - {institution.city || country.name}: {value} papers{selectedYear === 'all' ? '' : ` in ${selectedYear}`}</title>
                </g>
              )
            }))}
        </g>
        <g className="geo-country-layer">
          {countries.map((country) => {
            const featureCode = countryFeatureCode(country.code)
            const isPathBacked = renderedFeatureCodes.has(featureCode)
            const projected = geoCountryAnchor(country)
            const offset = geoLabelOffsets[country.code] || { dx: 0, dy: -1.8 }
            const shouldLabel = labelled.has(country.code) || (!isPathBacked && country.code === selectedCode)
            if (!shouldLabel) return null
            return (
              <g key={country.code} className={`geo-label ${country.code === selectedCode ? 'active' : ''} ${isPathBacked ? '' : 'marker-label'}`} onClick={() => onSelect(country)}>
                {isPathBacked ? null : <circle className="geo-marker-dot" cx={projected.x.toFixed(2)} cy={projected.y.toFixed(2)} r=".75" />}
                <text x={(projected.x + offset.dx).toFixed(2)} y={(projected.y + offset.dy).toFixed(2)} textAnchor="middle">{country.code}</text>
              </g>
            )
          })}
        </g>
      </svg>
      <div className="geo-inset-tray" aria-label="Dense region selectors">
        {regionalGroups.map((group) => (
          <section key={group.title} className="geo-inset-card">
            <div className="geo-inset-head"><strong>{group.title}</strong><span>{group.countries.length} regions</span></div>
            <div className="geo-inset-grid">
              {group.countries.map((country) => (
                <button key={country.code} className={`geo-region-button ${country.code === selectedCode ? 'active' : ''}`} onClick={() => onSelect(country)}>
                  <span>{country.code}</span><em>{country.institutionCount || country.papers || 0}</em>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="geo-heat-legend" aria-label="IC research output density legend">
        <span>{mode === 'institutions' ? 'Institution heat' : 'Output heat'}</span>
        <i />
        <em>low</em>
        <strong>high</strong>
      </div>
    </div>
  )
}

function CountryDetail({ country, mode }: { country: GeoCountry | null; mode: GeoMode }) {
  const navigate = useNavigate()
  if (!country) return <div className="empty">Hover or click a country to inspect strength, institutions, and yearly trend.</div>
  return (
    <section className="geo-country-detail">
      <div className="geo-detail-head">
        <div>
          <p className="profile-kicker">{country.region}</p>
          <h3
            className="cursor-pointer hover:text-brand-600"
            onClick={() => navigate(searchPath({ country: country.code }))}
          >
            {country.name}
          </h3>
        </div>
        <strong
          className="cursor-pointer hover:text-brand-600"
          onClick={() => navigate(searchPath({ country: country.code }))}
        >
          {country.code}
        </strong>
      </div>
      <div className="profile-grid geo-metrics">
        <div className="metric">
          <span>Papers</span>
          <strong
            className="cursor-pointer hover:text-brand-600"
            onClick={() => navigate(searchPath({ country: country.code }))}
          >
            {country.papers ?? 0}
          </strong>
        </div>
        <div className="metric"><span>Score</span><strong>{country.score ?? 0}</strong></div>
        <div className="metric"><span>Institutions</span><strong>{country.institutionCount ?? 0}</strong></div>
        <div className="metric"><span>City mapped</span><strong>{country.cityMappedInstitutions ?? 0}</strong></div>
        <div className="metric">
          <span>Top field</span>
          <strong
            className="cursor-pointer hover:text-brand-600"
            onClick={() => country.topField && navigate(searchPath({ field: country.topField }))}
          >
            {country.topField || '-'}
          </strong>
        </div>
        <div className="metric"><span>S+ / S / A</span><strong>{country.ranks?.sPlus ?? 0} / {country.ranks?.s ?? 0} / {country.ranks?.a ?? 0}</strong></div>
      </div>
      <MiniBars rows={country.byYear || []} label={mode === 'institutions' ? 'papers' : 'strength'} />
      <section className="geo-detail-columns">
        <div>
          <h4>Top institutions</h4>
          <div className="geo-institution-list">
            {country.topInstitutions?.length ? country.topInstitutions.slice(0, 30).map((row, index) => (
              <div className="geo-institution-row" key={row.name}>
                <span>{index + 1}</span>
                <div>
                  <strong
                    className="cursor-pointer hover:text-brand-600"
                    onClick={() => navigate(`/institutions/${encodeURIComponent(row.name)}`)}
                  >
                    {row.name}
                  </strong>
                  <small>{row.city || 'country only'} · {row.confidence ?? 0}% mapped</small>
                </div>
                <em>{row.count ?? 0} papers</em>
              </div>
            )) : <p className="text-xs text-ink-muted">No matched institutions yet.</p>}
          </div>
        </div>
        <div>
          <h4>Domains</h4>
          <MiniBars
            rows={country.byField || []}
            onRowClick={(field) => navigate(searchPath({ field, country: country.code }))}
          />
        </div>
      </section>
    </section>
  )
}

function PaperList({ papers }: { papers: PaperRow[] }) {
  return (
    <div className="space-y-2">
      {papers.slice(0, 6).map((p) => (
        <div key={p.id} className="border-b border-line-subtle last:border-0 pb-2 last:pb-0">
          <div className="text-xs text-ink-text font-medium">
            <PaperLink id={p.id} title={p.title ?? 'Untitled'} />
          </div>
          <div className="flex gap-1 mt-1 text-xs flex-wrap">
            <span className="px-1 py-0.5 rounded bg-surface-soft text-ink-secondary">{p.venue ?? '-'}</span>
            <span className="px-1 py-0.5 rounded bg-surface-soft text-ink-secondary">{p.year ?? '-'}</span>
            <span className="px-1 py-0.5 rounded bg-brand-50 text-brand-700">{p.rank ?? '-'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function GeoPage() {
  const [data, setData] = useState<GeoResult | null>(null)
  const [selected, setSelected] = useState<GeoCountry | null>(null)
  const [mode, setMode] = useState<GeoMode>('overall')
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all')
  const [field, setField] = useState('')
  const [worldMap, setWorldMap] = useState<PreparedWorldMap | null>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/data/world-countries-110m.geojson')
      .then((res) => res.json())
      .then((json) => setWorldMap(prepareWorldMap(json)))
      .catch(() => setWorldMap(null))
  }, [])

  useEffect(() => {
    setError('')
    const params = mode === 'topic' && field ? { field } : undefined
    api.geo(params).then((next) => {
      setData(next)
      setSelected((prev) => next.countries.find((country) => country.code === prev?.code) || next.countries[0] || null)
    }).catch((err) => {
      setError(err instanceof Error ? err.message : '加载地理数据失败')
    })
  }, [mode, field])

  const countries = data?.countries || []
  const years = useMemo(() => {
    const set = new Set<number>()
    for (const country of countries) for (const row of country.byYear || []) if (Number.isFinite(Number(row.year))) set.add(Number(row.year))
    return [...set].sort((a, b) => a - b)
  }, [countries])
  const selectedCountry = selected || countries[0] || null
  const mapped = countries.reduce((sum, country) => sum + country.papers, 0)
  const regionMomentum = useMemo(() => {
    const totals = new Map<string, number>()
    for (const row of data?.regionTrends || []) totals.set(row.region, (totals.get(row.region) || 0) + Number(row.score || row.papers || 0))
    return [...totals.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 8)
  }, [data])

  if (error) return <div className="ss-empty-state">{error}</div>
  if (!data) return <div className="text-ink-muted">加载中...</div>

  return (
    <div className="geo-page">
      <section className="geo-hero">
        <div>
          <p className="profile-kicker">Regional intelligence</p>
          <h2>{mode === 'topic' && data.field ? data.field : 'Academic strength'}</h2>
          <p>{mapped} mapped papers / {data.skippedWithoutCountry} unmapped papers · {countries.length} countries/regions</p>
          <p>{data.institutionSummary.mappedInstitutions} / {data.institutionSummary.distinctCanonicalInstitutions} institutions mapped · {data.institutionSummary.cityMappedInstitutions} city-level</p>
        </div>
        <div className="geo-controls">
          <button className={`profile-filter ${mode === 'overall' ? 'active' : ''}`} onClick={() => setMode('overall')}>Academic strength</button>
          <button className={`profile-filter ${mode === 'institutions' ? 'active' : ''}`} onClick={() => setMode('institutions')}>Institution view</button>
          <button className={`profile-filter ${mode === 'topic' ? 'active' : ''}`} onClick={() => setMode('topic')}>Single-topic strength</button>
          <select value={field} onChange={(e) => { setField(e.target.value); setMode('topic') }}>
            <option value="">Topic</option>
            {data.fields.map((item) => <option key={item} value={item}>{item === 'Power Management' ? 'PMIC / Power Management' : item}</option>)}
          </select>
        </div>
      </section>

      <section className="geo-year-control">
        <div>
          <strong>{selectedYear === 'all' ? 'All years' : selectedYear}</strong>
          <span>Yearly heat map updates country color and institution point size.</span>
        </div>
        <button className={selectedYear === 'all' ? 'active' : ''} onClick={() => setSelectedYear('all')}>All</button>
        <input
          type="range"
          min={years[0] || 2000}
          max={years[years.length - 1] || 2026}
          value={selectedYear === 'all' ? years[years.length - 1] || 2026 : selectedYear}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
        />
        <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value === 'all' ? 'all' : Number(event.target.value))}>
          <option value="all">All years</option>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </section>

      <div className="mb-4 rounded-lg border border-line bg-surface-panel px-3 py-2 text-xs text-ink-muted">
        Institution mapping is based on normalized affiliation strings plus a local country/city gazetteer. Unmapped rows stay visible in the quality counters instead of being guessed.
      </div>

      <div className="geo-grid">
        <section className="geo-map-panel">
          <h3>Global IC activity map</h3>
          <p className="hint">Darker regions mean denser mapped IC research output. Hover/click a country to inspect strength, institutions, and yearly trend.</p>
          <p className="hint">Green to red encodes relative density/strength. Dots are institution-level locations from the cleaned master table.</p>
          <p className="hint">Country filtering is based on affiliation text and institution normalization. Treat it as a directional signal.</p>
          <GeoMap countries={countries} selectedCode={selectedCountry?.code} selectedYear={selectedYear} mode={mode} worldMap={worldMap} onSelect={setSelected} />
        </section>
        <aside className="geo-side"><CountryDetail country={selectedCountry} mode={mode} /></aside>
      </div>

      <section className="geo-lower">
        <div className="geo-card"><h3>Regional strength change</h3><MiniBars rows={regionMomentum} label="strength" /></div>
        <div className="geo-card"><h3>Country share</h3><SharePie countries={countries} mode={mode} selected={selectedCountry?.code} onSelect={setSelected} /></div>
        <div className="geo-card"><h3>Representative papers</h3><PaperList papers={data.topPapers || []} /></div>
      </section>

      <section className="geo-card mt-4">
        <h3>Top countries</h3>
        <div className="geo-country-list">
          {countries.slice(0, 14).map((country, index) => (
            <button key={country.code} className={`geo-country-row ${country.code === selectedCountry?.code ? 'active' : ''}`} onClick={() => setSelected(country)}>
              <span>{index + 1}</span>
              <strong
                className="cursor-pointer hover:text-brand-600"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(searchPath({ country: country.code }))
                }}
              >
                {country.name}
              </strong>
              <em>{country.papers ?? 0} papers / {country.score ?? 0}</em>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
