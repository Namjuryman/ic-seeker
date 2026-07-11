import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { PaperLink } from '../components/PaperLink'
import { paperRankLabel } from '../utils/displayLabels'
import { friendlyError } from '../utils/errorMessages'
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
type GeoHeatPoint = { x: number; y: number; value: number; countryCode: string }

const regionalZooms = [
  { key: 'europe', title: '欧洲放大', subtitle: '英国、荷比卢、德法瑞意、北欧与东欧重点机构', viewBox: '48.8 9.2 20.8 16.2', codes: ['UK', 'NL', 'BE', 'DE', 'FR', 'CH', 'IT', 'DK', 'SE', 'FI', 'ES', 'PT', 'PL', 'CZ', 'HU', 'RU'] },
  { key: 'east-asia', title: '东亚放大', subtitle: '中国大陆、港澳台、韩国与日本的城市级产出', viewBox: '83.8 16.4 18.9 15.8', codes: ['CN', 'HK', 'MO', 'TW', 'KR', 'JP'] },
  { key: 'southeast-asia', title: '东南亚放大', subtitle: '新加坡、马来西亚、泰国、越南、印尼和菲律宾', viewBox: '82.8 28.4 12.2 15.2', codes: ['SG', 'MY', 'TH', 'VN', 'ID', 'PH'] },
  { key: 'eastern-europe', title: '东欧放大', subtitle: '俄罗斯、波兰、捷克、匈牙利、罗马尼亚、乌克兰及邻近地区', viewBox: '58.2 10.2 17.8 12.5', codes: ['RU', 'PL', 'CZ', 'HU', 'RO', 'UA', 'BG', 'SK', 'SI', 'HR', 'EE', 'LV', 'LT'] },
]

const regionalZoomLabelOffsets: Record<string, Record<string, { dx: number; dy: number }>> = {
  'east-asia': {
    CN: { dx: -1.3, dy: .8 },
    HK: { dx: -.5, dy: .9 },
    MO: { dx: -.8, dy: 1.3 },
    TW: { dx: .9, dy: 1.2 },
    KR: { dx: .9, dy: .35 },
    JP: { dx: 1.1, dy: .35 },
  },
}

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

function buildGeoHeatPoints(countries: GeoCountry[], mode: GeoMode, selectedYear: number | 'all') {
  const bins = new Map<string, GeoHeatPoint>()
  const addHeatPoint = (countryCode: string, x: number, y: number, weight: number, precision = 4) => {
    const key = `${countryCode}:${Math.round(x * precision) / precision}:${Math.round(y * precision) / precision}`
    const current = bins.get(key)
    if (current) current.value += weight
    else bins.set(key, { x, y, value: weight, countryCode })
  }
  for (const country of countries) {
    for (const city of country.cityHeatPoints || []) {
      const year = selectedYear === 'all' ? null : city.byYear?.find((row) => Number(row.year) === selectedYear)
      const value = mode === 'institutions'
        ? Number(selectedYear === 'all' ? city.institutions : year?.institutions || 0)
        : Number(selectedYear === 'all' ? city.papers : year?.papers || 0)
      if (value <= 0) continue
      const projected = projectWorldPoint(Number(city.lon), Number(city.lat))
      const weight = mode === 'institutions' ? Math.pow(value, .78) : Math.pow(value, .72)
      addHeatPoint(country.code, projected.x, projected.y, weight)
    }
  }
  return [...bins.values()]
}

function heatMaxFor(points: GeoHeatPoint[], percentile = .96) {
  const weights = points.map((point) => point.value).sort((a, b) => a - b)
  return Math.max(1, weights[Math.floor(weights.length * percentile)] || weights[weights.length - 1] || 1)
}

function parseViewBox(viewBox: string) {
  const [x, y, width, height] = viewBox.split(/\s+/).map(Number)
  return { x, y, width, height }
}

function pointsInView(points: GeoHeatPoint[], viewBox: string, pad = 1.8) {
  const box = parseViewBox(viewBox)
  return points.filter(({ x, y }) => x >= box.x - pad && x <= box.x + box.width + pad && y >= box.y - pad && y <= box.y + box.height + pad)
}

function heatPointsByCountry(points: GeoHeatPoint[]) {
  const grouped = new Map<string, GeoHeatPoint[]>()
  for (const point of points) {
    const rows = grouped.get(point.countryCode) || []
    rows.push(point)
    grouped.set(point.countryCode, rows)
  }
  return grouped
}

function fallbackClipRadius(countryCode: string) {
  if (countryCode === 'MO') return .14
  if (countryCode === 'HK' || countryCode === 'SG') return .22
  return .48
}

function MiniBars({ rows, label = '论文', onRowClick }: { rows: Array<{ key?: string; year?: number; count?: number; papers?: number; score?: number }>; label?: string; onRowClick?: (key: string) => void }) {
  const normalized = rows.map((row) => ({
    key: String(row.key ?? row.year ?? '-'),
    count: Number(row.count ?? row.papers ?? row.score ?? 0),
  })).slice(-10)
  const max = Math.max(1, ...normalized.map((row) => row.count))
  if (!normalized.length) return <p className="text-xs text-ink-muted">暂无数据。</p>
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
  if (other > 0) rows.push({ code: 'Other', name: '其他', count: Math.round(other), country: countries[0] })
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
  const heatPoints = useMemo(() => buildGeoHeatPoints(countries, mode, selectedYear), [countries, mode, selectedYear])
  const heatMax = useMemo(() => heatMaxFor(heatPoints), [heatPoints])
  const heatByCountry = useMemo(() => heatPointsByCountry(heatPoints), [heatPoints])
  const featureByCode = new Map((worldMap?.features || []).map((feature) => [feature.code, feature]))
  const countryByFeature = new Map(countries.map((country) => [countryFeatureCode(country.code), country]))
  const renderedFeatureCodes = new Set<string>()
  const labelled = new Set(countries.filter((country) => !geoDenseRegionCodes.has(country.code)).slice(0, 6).map((country) => country.code))
  if (selectedCode) labelled.add(selectedCode)
  const regionalGroups = [
    { title: '东亚', codes: ['CN', 'HK', 'MO', 'TW', 'KR', 'JP', 'SG'] },
    { title: '欧洲', codes: ['UK', 'NL', 'BE', 'DE', 'FR', 'CH', 'IT', 'DK', 'SE', 'FI', 'ES', 'PT', 'PL', 'CZ', 'HU', 'RU'] },
    { title: '东南亚', codes: ['SG', 'MY', 'TH', 'VN', 'ID', 'PH'] },
    { title: '东欧', codes: ['RU', 'PL', 'CZ', 'HU', 'RO', 'UA', 'BG', 'SK', 'SI', 'HR', 'EE', 'LV', 'LT'] },
  ].map((group) => ({ ...group, countries: group.codes.map((code) => countries.find((country) => country.code === code)).filter(Boolean) as GeoCountry[] }))
    .filter((group) => group.countries.length)

  return (
    <>
      <div className="geo-map-canvas" aria-label="全球 IC 研究活动地图">
        <div className="geo-map-stage">
          <svg viewBox="0 0 110 66" role="img" className="geo-map-bg">
          <defs>
            <linearGradient id="geoOcean" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f9fbff" />
              <stop offset="100%" stopColor="#eef4fb" />
            </linearGradient>
            <radialGradient id="geoWorldCityHeat">
              <stop offset="0%" stopColor="#dc2626" stopOpacity=".96" />
              <stop offset="34%" stopColor="#f97316" stopOpacity=".76" />
              <stop offset="62%" stopColor="#facc15" stopOpacity=".38" />
              <stop offset="82%" stopColor="#22c55e" stopOpacity=".2" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </radialGradient>
            {countries.map((country) => {
              const feature = featureByCode.get(countryFeatureCode(country.code))
              const anchor = geoCountryAnchor(country)
              return (
                <clipPath key={`geo-world-clip-${country.code}`} id={`geoWorldClip-${country.code}`} clipPathUnits="userSpaceOnUse">
                  {feature
                    ? <path d={feature.path} />
                    : <circle cx={anchor.x.toFixed(2)} cy={anchor.y.toFixed(2)} r={fallbackClipRadius(country.code)} />}
                </clipPath>
              )
            })}
          </defs>
          <rect x=".75" y=".75" width="108.5" height="64.5" rx="5.5" fill="url(#geoOcean)" />
          <g className="geo-world-layer">
            {(worldMap?.features || []).map((feature) => {
              const country = countryByFeature.get(feature.code)
              const selected = country?.code === selectedCode
              const densityValue = country ? yearDensityMetric(country, mode, selectedYear) : 0
              if (country) renderedFeatureCodes.add(feature.code)
              return (
                <path
                  key={feature.code + feature.name}
                  className={`geo-world-country ${country ? 'has-data' : ''} ${selected ? 'active' : ''}`}
                  style={{
                    '--geo-density': country ? '.12' : '0',
                  } as React.CSSProperties}
                  d={feature.path}
                  onClick={() => country && onSelect(country)}
                >
                  <title>{country ? `${country.name}: ${Math.round(densityValue)} 已定位产出` : feature.name}</title>
                </path>
              )
            })}
          </g>
          <g className="geo-region-heat-layer" aria-hidden="true">
            {countries.map((country) => {
              const points = heatByCountry.get(country.code)
              if (!points?.length) return null
              return (
                <g key={`geo-world-heat-${country.code}`} clipPath={`url(#geoWorldClip-${country.code})`}>
                  {points.map(({ x, y, value }, index) => {
                    const intensity = Math.min(1, Math.pow(Math.max(0, value / heatMax), .88))
                    return (
                      <circle
                        key={`geo-world-spot-${country.code}-${x.toFixed(2)}-${y.toFixed(2)}-${index}`}
                        className="geo-region-heat-spot"
                        cx={x.toFixed(2)}
                        cy={y.toFixed(2)}
                        r={(.12 + intensity * .42).toFixed(2)}
                        fill="url(#geoWorldCityHeat)"
                        opacity={(.16 + intensity * .7).toFixed(3)}
                      />
                    )
                  })}
                </g>
              )
            })}
          </g>
          <g className="geo-region-border-layer" aria-hidden="true">
            {(worldMap?.features || []).map((feature) => (
              <path key={`geo-world-border-${feature.code}-${feature.name}`} d={feature.path} />
            ))}
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
          <div className="geo-heat-legend" aria-label="IC 研究产出密度图例">
            <span>{mode === 'institutions' ? '城市机构密度' : '城市研究产出密度'}</span>
            <i />
            <em>低</em>
            <strong>高</strong>
          </div>
        </div>
      </div>
      <div className="geo-map-quickbar" aria-label="重点区域快捷选择">
        {regionalGroups.map((group) => (
          <section key={group.title} className="geo-inset-card">
            <div className="geo-inset-head"><strong>{group.title}</strong><span>{group.countries.length} 个地区</span></div>
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
    </>
  )
}

function RegionalZoomMaps({ countries, selectedCode, selectedYear, mode, worldMap, onSelect }: { countries: GeoCountry[]; selectedCode?: string; selectedYear: number | 'all'; mode: GeoMode; worldMap: PreparedWorldMap | null; onSelect: (country: GeoCountry) => void }) {
  const heatPoints = useMemo(() => buildGeoHeatPoints(countries, mode, selectedYear), [countries, mode, selectedYear])
  const featureByCode = new Map((worldMap?.features || []).map((feature) => [feature.code, feature]))
  const countryByFeature = new Map(countries.map((country) => [countryFeatureCode(country.code), country]))
  const countryByCode = new Map(countries.map((country) => [country.code, country]))

  return (
    <section className="geo-region-zooms" aria-label="重点区域放大地图">
      {regionalZooms.map((zoom) => {
        const zoomCountries = zoom.codes.map((code) => countryByCode.get(code)).filter(Boolean) as GeoCountry[]
        const visibleHeatPoints = pointsInView(heatPoints, zoom.viewBox)
        const visibleHeatByCountry = heatPointsByCountry(visibleHeatPoints)
        const heatMax = heatMaxFor(visibleHeatPoints, .96)
        const labelOffsets = regionalZoomLabelOffsets[zoom.key] || {}
        return (
          <article key={zoom.key} className="geo-region-zoom">
            <div className="geo-region-zoom-head">
              <div>
                <strong>{zoom.title}</strong>
                <span>{zoom.subtitle}</span>
              </div>
              <em>{zoomCountries.length} 个地区</em>
            </div>
            <svg viewBox={zoom.viewBox} role="img" className="geo-region-zoom-map">
              <defs>
                <radialGradient id={`geoRegionHeat-${zoom.key}`}>
                  <stop offset="0%" stopColor="#dc2626" stopOpacity=".96" />
                  <stop offset="34%" stopColor="#f97316" stopOpacity=".76" />
                  <stop offset="62%" stopColor="#facc15" stopOpacity=".38" />
                  <stop offset="82%" stopColor="#22c55e" stopOpacity=".2" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </radialGradient>
                {countries.map((country) => {
                  const feature = featureByCode.get(countryFeatureCode(country.code))
                  const anchor = geoCountryAnchor(country)
                  return (
                    <clipPath key={`${zoom.key}-clip-${country.code}`} id={`geoRegionClip-${zoom.key}-${country.code}`} clipPathUnits="userSpaceOnUse">
                      {feature
                        ? <path d={feature.path} />
                        : <circle cx={anchor.x.toFixed(2)} cy={anchor.y.toFixed(2)} r={fallbackClipRadius(country.code)} />}
                    </clipPath>
                  )
                })}
              </defs>
              <rect x="0" y="0" width="110" height="66" fill="#f8fbff" />
              <g className="geo-world-layer">
                {(worldMap?.features || []).map((feature) => {
                  const country = countryByFeature.get(feature.code)
                  const selected = country?.code === selectedCode
                  return (
                    <path
                      key={`${zoom.key}-${feature.code}-${feature.name}`}
                      className={`geo-world-country ${country ? 'has-data' : ''} ${selected ? 'active' : ''}`}
                      style={{ '--geo-density': country ? '.12' : '0' } as React.CSSProperties}
                      d={feature.path}
                      onClick={() => country && onSelect(country)}
                    />
                  )
                })}
              </g>
              <g className="geo-region-heat-layer" aria-hidden="true">
                {countries.map((country) => {
                  const points = visibleHeatByCountry.get(country.code)
                  if (!points?.length) return null
                  return (
                    <g key={`${zoom.key}-heat-${country.code}`} clipPath={`url(#geoRegionClip-${zoom.key}-${country.code})`}>
                      {points.map(({ x, y, value }, index) => {
                        const intensity = Math.min(1, Math.pow(Math.max(0, value / heatMax), .88))
                        return (
                          <circle
                            key={`${zoom.key}-spot-${country.code}-${x.toFixed(2)}-${y.toFixed(2)}-${index}`}
                            className="geo-region-heat-spot"
                            cx={x.toFixed(2)}
                            cy={y.toFixed(2)}
                            r={(.12 + intensity * .38).toFixed(2)}
                            fill={`url(#geoRegionHeat-${zoom.key})`}
                            opacity={(.2 + intensity * .58).toFixed(3)}
                          />
                        )
                      })}
                    </g>
                  )
                })}
              </g>
              <g className="geo-region-border-layer" aria-hidden="true">
                {(worldMap?.features || []).map((feature) => (
                  <path key={`${zoom.key}-border-${feature.code}-${feature.name}`} d={feature.path} />
                ))}
              </g>
              <g className="geo-country-layer">
                {zoomCountries.map((country) => {
                  const projected = geoCountryAnchor(country)
                  const offset = labelOffsets[country.code] || { dx: 0, dy: -1.05 }
                  return (
                    <g key={`${zoom.key}-${country.code}`} className={`geo-label ${country.code === selectedCode ? 'active' : ''}`} onClick={() => onSelect(country)}>
                      <text x={(projected.x + offset.dx).toFixed(2)} y={(projected.y + offset.dy).toFixed(2)} textAnchor="middle">{country.code}</text>
                    </g>
                  )
                })}
              </g>
            </svg>
          </article>
        )
      })}
    </section>
  )
}

function CountryDetail({ country, mode }: { country: GeoCountry | null; mode: GeoMode }) {
  const navigate = useNavigate()
  if (!country) return <div className="empty">点击国家或地区，查看论文产出、机构线索和年度变化。</div>
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
          <span>论文</span>
          <strong
            className="cursor-pointer hover:text-brand-600"
            onClick={() => navigate(searchPath({ country: country.code }))}
          >
            {country.papers ?? 0}
          </strong>
        </div>
        <div className="metric"><span>产出信号</span><strong>{country.score ?? 0}</strong></div>
        <div className="metric"><span>机构</span><strong>{country.institutionCount ?? 0}</strong></div>
        <div className="metric"><span>城市坐标</span><strong>{country.cityMappedInstitutions ?? 0}</strong></div>
        <div className="metric">
          <span>主要方向</span>
          <strong
            className="cursor-pointer hover:text-brand-600"
            onClick={() => country.topField && navigate(searchPath({ field: country.topField }))}
          >
            {country.topField || '-'}
          </strong>
        </div>
        <div className="metric"><span>S+ / S / A</span><strong>{country.ranks?.sPlus ?? 0} / {country.ranks?.s ?? 0} / {country.ranks?.a ?? 0}</strong></div>
      </div>
      <MiniBars rows={country.byYear || []} label={mode === 'institutions' ? '论文' : '产出信号'} />
      <section className="geo-detail-columns">
        <div>
          <h4>代表机构</h4>
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
                  <small>{row.city || '仅国家级'} · {row.confidence ?? 0}% 坐标可信</small>
                </div>
                <em>{row.count ?? 0} 篇</em>
              </div>
            )) : <p className="text-xs text-ink-muted">暂无已匹配机构。</p>}
          </div>
        </div>
        <div>
          <h4>方向分布</h4>
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
            <PaperLink id={p.id} title={p.title ?? '未命名论文'} />
          </div>
          <div className="flex gap-1 mt-1 text-xs flex-wrap">
            <span className="px-1 py-0.5 rounded bg-surface-soft text-ink-secondary">{p.venue ?? '-'}</span>
            <span className="px-1 py-0.5 rounded bg-surface-soft text-ink-secondary">{p.year ?? '-'}</span>
            <span className="px-1 py-0.5 rounded bg-brand-50 text-brand-700">{paperRankLabel(p.rank)}</span>
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
      setError(friendlyError(err, '加载地理数据失败'))
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
          <p className="profile-kicker">地域情报</p>
          <h2>{mode === 'topic' && data.field ? data.field : 'IC 产出密度'}</h2>
          <p>{mapped} 篇已定位论文 / {data.skippedWithoutCountry} 篇未定位 · {countries.length} 个国家或地区</p>
          <p>{data.institutionSummary.mappedInstitutions} / {data.institutionSummary.distinctCanonicalInstitutions} 个机构已定位 · {data.institutionSummary.cityMappedInstitutions} 个具备城市坐标</p>
          <div className="ss-chip-row">
            <span>城市坐标优先</span>
            <span>边界内裁剪</span>
            <span>非学校排名</span>
          </div>
        </div>
        <div className="geo-controls">
          <button className={`profile-filter ${mode === 'overall' ? 'active' : ''}`} onClick={() => setMode('overall')}>综合产出</button>
          <button className={`profile-filter ${mode === 'institutions' ? 'active' : ''}`} onClick={() => setMode('institutions')}>机构密度</button>
          <button className={`profile-filter ${mode === 'topic' ? 'active' : ''}`} onClick={() => setMode('topic')}>单方向产出</button>
          <select value={field} onChange={(e) => { setField(e.target.value); setMode('topic') }}>
            <option value="">选择方向</option>
            {data.fields.map((item) => <option key={item} value={item}>{item === 'Power Management' ? 'PMIC / Power Management' : item}</option>)}
          </select>
        </div>
      </section>

      <section className="geo-year-control">
        <div>
          <strong>{selectedYear === 'all' ? '全部年份' : selectedYear}</strong>
          <span>逐年查看已核验城市密度和机构论文信号。</span>
        </div>
        <button className={selectedYear === 'all' ? 'active' : ''} onClick={() => setSelectedYear('all')}>全部</button>
        <input
          type="range"
          min={years[0] || 2000}
          max={years[years.length - 1] || 2026}
          value={selectedYear === 'all' ? years[years.length - 1] || 2026 : selectedYear}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
        />
        <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value === 'all' ? 'all' : Number(event.target.value))}>
          <option value="all">全部年份</option>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </section>

      <div className="mb-4 rounded-lg border border-line bg-surface-panel px-3 py-2 text-xs text-ink-muted">
        热力图只使用已归一化且有可信坐标的机构；未经核验的 affiliation 片段不会进入城市热力，避免把学生、历史单位或模糊地址直接当成现任机构画像。
      </div>

      <div className="geo-grid">
        <section className="geo-map-panel">
          <h3>全球 IC 活动地图</h3>
          <p className="hint">绿色到红色表示城市级 IC 产出或机构密度，底图只作为国家边界参照。</p>
          <p className="hint">热力已按国家/地区边界裁剪，并在当前视野内归一化，便于观察东亚、欧洲等高密度区域。</p>
          <p className="hint">点击国家或地区可查看代表机构、方向分布和年度趋势。</p>
          <GeoMap countries={countries} selectedCode={selectedCountry?.code} selectedYear={selectedYear} mode={mode} worldMap={worldMap} onSelect={setSelected} />
          <RegionalZoomMaps countries={countries} selectedCode={selectedCountry?.code} selectedYear={selectedYear} mode={mode} worldMap={worldMap} onSelect={setSelected} />
        </section>
        <aside className="geo-side"><CountryDetail country={selectedCountry} mode={mode} /></aside>
      </div>

      <section className="geo-lower">
        <div className="geo-card"><h3>区域产出变化</h3><MiniBars rows={regionMomentum} label="产出信号" /></div>
        <div className="geo-card"><h3>国家/地区占比</h3><SharePie countries={countries} mode={mode} selected={selectedCountry?.code} onSelect={setSelected} /></div>
        <div className="geo-card"><h3>代表论文</h3><PaperList papers={data.topPapers || []} /></div>
      </section>

      <section className="geo-card mt-4">
        <h3>高产国家/地区</h3>
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
              <em>{country.papers ?? 0} 篇 / 产出信号 {country.score ?? 0}</em>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
