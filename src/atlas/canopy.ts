// The canopy inspector's sampler: which display-grid pixel lies under a
// point on the map, and what it holds. Pure, so it's tested at known pixels.
import type { CanopyGrid } from './data.ts'

export interface LatLng {
  readonly lat: number
  readonly lng: number
}

/** A pixel's reading: a cover percentage (0 is open ground) or NoData. */
export type CanopySample = { readonly kind: 'cover'; readonly percent: number } | { readonly kind: 'nodata' }

/** The sphere radius EPSG:3857 projects onto, in metres. */
const EARTH_RADIUS = 6378137

/** Projects a point to EPSG:3857 metres, as Leaflet's default CRS does. */
export function projectWebMercator({ lat, lng }: LatLng): { x: number; y: number } {
  const radians = Math.PI / 180
  return {
    x: EARTH_RADIUS * lng * radians,
    y: EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (lat * radians) / 2)),
  }
}

/**
 * Samples the grid at a point. Pixels are row-major with row zero at the
 * north edge; each covers a half-open cell, so a point on the east or south
 * edge of the grid lies outside it. Returns null outside the grid.
 */
export function sampleCanopy(grid: CanopyGrid, point: LatLng): CanopySample | null {
  const { width, height, bounds, nodata, pixels } = grid
  const [west, south, east, north] = bounds
  const { x, y } = projectWebMercator(point)
  const column = Math.floor(((x - west) / (east - west)) * width)
  const row = Math.floor(((north - y) / (north - south)) * height)
  if (!(column >= 0 && column < width && row >= 0 && row < height)) return null
  const value = pixels[row * width + column]!
  return value === nodata ? { kind: 'nodata' } : { kind: 'cover', percent: value }
}
