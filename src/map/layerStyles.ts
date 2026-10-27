// How each map layer is drawn: its pane, its path style and its opacity.
// Values are the reference atlas's, ported as they were (reference/public/app.js).
import type { PathOptions } from 'leaflet'

/** Stacking order, bottom to top. */
export const PANES = {
  relief: 210,
  official: 220,
  raster: 300,
  contours: 390,
  water: 410,
  access: 430,
  boundaries: 450,
  contourLabels: 460,
  points: 610,
  candidates: 620,
} as const

export type Pane = keyof typeof PANES

/** Below this zoom only the 200 ft index contours are drawn; the 40 ft lines would be a smear. */
export const MINOR_CONTOUR_MIN_ZOOM = 13

/** Rasters drawn at a fixed opacity. Every other raster is an evidence overlay that follows overlay strength. */
const FIXED_RASTER_OPACITY: Readonly<Record<string, number>> = { hillshade: 0.9, official_topo: 1 }

export function rasterPane(key: string): Pane {
  return key === 'hillshade' ? 'relief' : key === 'official_topo' ? 'official' : 'raster'
}

/** A fixed opacity, or `null` for an evidence overlay that follows overlay strength. */
export function fixedRasterOpacity(key: string): number | null {
  return FIXED_RASTER_OPACITY[key] ?? null
}

export function vectorPane(key: string): Pane {
  if (key === 'contours') return 'contours'
  if (key === 'water') return 'water'
  if (key === 'boundary' || key === 'gmu_boundaries') return 'boundaries'
  return 'access'
}

type Properties = Readonly<Record<string, unknown>> | null | undefined

export function isIndexContour(properties: Properties): boolean {
  const elevation = properties?.['elevation_ft']
  return properties?.['index'] === true || (typeof elevation === 'number' && elevation % 200 === 0)
}

export function pathStyle(key: string, properties: Properties, zoom: number): PathOptions {
  switch (key) {
    case 'boundary':
      return { color: '#375f44', weight: 2.2, opacity: 0.9, fill: false, dashArray: '8 5' }
    case 'gmu_boundaries':
      return { color: '#946b89', weight: 1.4, opacity: 0.85, fill: false, dashArray: '5 4' }
    case 'contours': {
      const index = isIndexContour(properties)
      return {
        color: index ? '#82704d' : '#9a8d70',
        weight: index ? (zoom >= 14 ? 1.05 : 0.85) : 0.5,
        opacity: index ? 0.62 : zoom >= MINOR_CONTOUR_MIN_ZOOM ? 0.37 : 0,
        fill: false,
      }
    }
    case 'ownership':
      return { color: '#849d61', weight: 1, opacity: 0.55, fillColor: '#b1c68a', fillOpacity: 0.17 }
    case 'trails':
      return { color: '#985f34', weight: 2, opacity: 0.94, dashArray: '4 4', fill: false }
    case 'roads':
      return { color: '#686a60', weight: 2.7, opacity: 0.8, fill: false }
    case 'water': {
      const regime = String(properties?.['water_regime'] ?? '').toLowerCase()
      const unmapped = regime === 'unknown' || properties?.['artificial'] === true
      return {
        color: unmapped ? '#8b9694' : '#468ca0',
        weight: 1.5,
        opacity: 0.86,
        fillColor: unmapped ? '#a8b2af' : '#80b8c8',
        fillOpacity: 0.32,
        ...(regime === 'intermittent' || regime === 'ephemeral' ? { dashArray: '3 4' } : {}),
      }
    }
    default:
      return { color: '#7a7160', weight: 1.2, fillOpacity: 0.25 }
  }
}

/** The glyph and class of a point feature's marker: trailheads are parking, campgrounds a tent, springs water. */
export function pointMarker(key: string): { className: string; glyph: string } {
  if (key === 'campgrounds') return { className: 'point-marker campground', glyph: '△' }
  if (key === 'water') return { className: 'point-marker water', glyph: '≈' }
  return { className: 'point-marker trailhead', glyph: 'P' }
}
