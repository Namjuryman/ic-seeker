import type { GeoCountry } from '../types'

export interface WorldFeature {
  code: string
  name: string
  path: string
}

export interface PreparedWorldMap {
  features: WorldFeature[]
}

export function featureCode(feature: any) {
  const props = feature?.properties || {}
  if (props.ADM0_A3 === 'TWN' || props.ISO_A3 === 'TWN') return 'TW'
  return [props.ISO_A2, props.WB_A2, props.POSTAL, props.ADM0_A3].find((code) => code && code !== '-99') || ''
}

export function countryFeatureCode(code: string) {
  if (code === 'UK') return 'GB'
  if (code === 'TW') return 'TW'
  if (code === 'FR') return 'FRA'
  return code
}

export const geoLabelOffsets: Record<string, { dx: number; dy: number }> = {
  US: { dx: -3, dy: 4 }, CA: { dx: -2, dy: -2 }, CN: { dx: -4, dy: 2 }, KR: { dx: 3, dy: -1 },
  JP: { dx: 4, dy: 1 }, TW: { dx: 3, dy: 4 }, HK: { dx: -4, dy: 4 }, MO: { dx: -5, dy: 6 },
  SG: { dx: 1, dy: 4 }, IN: { dx: -4, dy: 2 }, UK: { dx: -4, dy: -3 }, NL: { dx: -3, dy: -5 },
  BE: { dx: -4, dy: 0 }, DE: { dx: 3, dy: -4 }, FR: { dx: -5, dy: 2 }, CH: { dx: 3, dy: 3 },
  IT: { dx: 2, dy: 4 }, AU: { dx: 2, dy: 3 }
}

const geoLabelAnchors: Record<string, { lon: number; lat: number }> = {
  US: { lon: -98.5, lat: 38.5 }, CA: { lon: -105, lat: 57 }, CN: { lon: 104, lat: 34 },
  HK: { lon: 114.17, lat: 22.32 }, MO: { lon: 113.55, lat: 22.17 }, TW: { lon: 121.0, lat: 23.8 },
  KR: { lon: 127.8, lat: 36.3 }, JP: { lon: 138.2, lat: 37.3 }, SG: { lon: 103.82, lat: 1.35 },
  IN: { lon: 78.9, lat: 22.6 }, AU: { lon: 134, lat: -25 }, UK: { lon: -2.4, lat: 54 },
  NL: { lon: 5.3, lat: 52.2 }, BE: { lon: 4.6, lat: 50.8 }, CH: { lon: 8.2, lat: 46.9 },
  DE: { lon: 10.4, lat: 51.1 }, FR: { lon: 2.4, lat: 46.8 }, IT: { lon: 12.3, lat: 42.9 }
}

export const geoDenseRegionCodes = new Set(['HK', 'MO', 'TW', 'KR', 'JP', 'SG', 'UK', 'NL', 'BE', 'CH', 'DE', 'FR', 'IT'])

export const geoHotspotProfiles: Record<string, Array<{ lon: number; lat: number; weight: number }>> = {
  US: [
    { lon: -122.2, lat: 37.4, weight: .28 }, { lon: -118.2, lat: 34.0, weight: .12 },
    { lon: -97.7, lat: 30.3, weight: .15 }, { lon: -71.1, lat: 42.4, weight: .22 },
    { lon: -84.4, lat: 33.8, weight: .08 }
  ],
  CN: [
    { lon: 116.4, lat: 39.9, weight: .24 }, { lon: 121.5, lat: 31.2, weight: .22 },
    { lon: 120.2, lat: 30.3, weight: .12 }, { lon: 113.3, lat: 23.1, weight: .16 },
    { lon: 118.8, lat: 32.1, weight: .10 }
  ],
  TW: [{ lon: 121.0, lat: 24.8, weight: .55 }, { lon: 120.7, lat: 24.1, weight: .22 }, { lon: 121.5, lat: 25.0, weight: .18 }],
  HK: [{ lon: 114.2, lat: 22.3, weight: 1 }], MO: [{ lon: 113.5, lat: 22.2, weight: 1 }],
  KR: [{ lon: 127.0, lat: 37.5, weight: .45 }, { lon: 127.4, lat: 36.4, weight: .34 }, { lon: 129.1, lat: 35.2, weight: .14 }],
  JP: [{ lon: 139.7, lat: 35.7, weight: .42 }, { lon: 135.5, lat: 34.7, weight: .22 }, { lon: 140.9, lat: 38.3, weight: .18 }],
  SG: [{ lon: 103.8, lat: 1.35, weight: 1 }],
  IN: [{ lon: 77.6, lat: 12.9, weight: .34 }, { lon: 77.2, lat: 28.6, weight: .22 }, { lon: 72.9, lat: 19.1, weight: .16 }, { lon: 88.4, lat: 22.6, weight: .14 }],
  CA: [{ lon: -79.4, lat: 43.7, weight: .42 }, { lon: -123.1, lat: 49.3, weight: .24 }, { lon: -73.6, lat: 45.5, weight: .18 }],
  UK: [{ lon: -0.1, lat: 51.5, weight: .38 }, { lon: .1, lat: 52.2, weight: .32 }, { lon: -1.3, lat: 51.8, weight: .18 }],
  DE: [{ lon: 11.6, lat: 48.1, weight: .28 }, { lon: 8.7, lat: 49.0, weight: .18 }, { lon: 13.4, lat: 52.5, weight: .14 }, { lon: 6.1, lat: 50.8, weight: .16 }],
  NL: [{ lon: 4.4, lat: 52.0, weight: .38 }, { lon: 5.5, lat: 51.4, weight: .36 }, { lon: 6.9, lat: 52.2, weight: .16 }],
  BE: [{ lon: 4.7, lat: 50.9, weight: .68 }, { lon: 4.4, lat: 50.8, weight: .2 }],
  CH: [{ lon: 8.5, lat: 47.4, weight: .45 }, { lon: 6.6, lat: 46.5, weight: .36 }],
  FR: [{ lon: 2.3, lat: 48.9, weight: .26 }, { lon: 5.7, lat: 45.2, weight: .46 }],
  IT: [{ lon: 9.2, lat: 45.5, weight: .46 }, { lon: 11.3, lat: 44.5, weight: .22 }, { lon: 12.5, lat: 41.9, weight: .14 }],
  AU: [{ lon: 151.2, lat: -33.9, weight: .34 }, { lon: 144.9, lat: -37.8, weight: .26 }, { lon: 115.9, lat: -31.9, weight: .16 }]
}

export function projectWorldPoint(lon: number, lat: number) {
  const clampedLat = Math.max(-58, Math.min(83, Number(lat || 0)))
  return {
    x: ((Number(lon || 0) + 180) / 360) * 110,
    y: ((83 - clampedLat) / 141) * 62 + 2,
  }
}

export function geoCountryAnchor(country: GeoCountry) {
  const anchor = geoLabelAnchors[country.code]
  if (anchor) return projectWorldPoint(anchor.lon, anchor.lat)
  return projectWorldPoint(country.x / 100 * 360 - 180, 83 - (country.y / 100) * 141)
}

function ringPath(ring: number[][]) {
  return ring.map((point, index) => {
    const projected = projectWorldPoint(point[0], point[1])
    return `${index ? 'L' : 'M'}${projected.x.toFixed(2)} ${projected.y.toFixed(2)}`
  }).join(' ') + ' Z'
}

function geometryPath(geometry: any) {
  if (!geometry) return ''
  if (geometry.type === 'Polygon') return geometry.coordinates.map(ringPath).join(' ')
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flatMap((poly: number[][][]) => poly.map(ringPath)).join(' ')
  return ''
}

export function prepareWorldMap(geojson: any): PreparedWorldMap {
  const features = (geojson?.features || [])
    .filter((feature: any) => featureCode(feature) !== 'AQ')
    .map((feature: any) => ({
      code: featureCode(feature),
      name: feature.properties?.NAME || feature.properties?.ADMIN || featureCode(feature),
      path: geometryPath(feature.geometry),
    }))
    .filter((feature: WorldFeature) => feature.code && feature.path)
  return { features }
}

export function geoHotspots(country: GeoCountry, max: number, metric: number) {
  const scale = Math.sqrt(Math.max(.04, Number(metric || 0) / Math.max(1, max)))
  const profile = geoHotspotProfiles[country.code] || [{
    lon: country.x / 100 * 360 - 180,
    lat: 83 - (country.y / 100) * 141,
    weight: 1,
  }]
  return profile.map((spot, index) => {
    const projected = projectWorldPoint(spot.lon, spot.lat)
    const height = Math.max(.9, Math.min(8.2, scale * (2.3 + spot.weight * 8.8)))
    const radius = Math.max(.55, Math.min(2.25, scale * (1 + spot.weight * 2.4)))
    return { ...spot, index, x: projected.x, y: projected.y, height, radius, alpha: Math.max(.34, Math.min(.92, scale * (.42 + spot.weight))) }
  })
}
