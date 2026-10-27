// The data module: loads the bundled files through an injected fetch and
// returns either a validated, read-only atlas or a typed error naming the
// file, the record and the problem. Raw records are parsed, never edited.
import type * as z from 'zod'
import * as schema from './schemas.ts'
import type { Candidate, FeatureCollection, LeafletBounds, LonLat, Manifest, Method, Observation } from './schemas.ts'

export type FetchFn = (url: string) => Promise<Response>

/** Where data comes from: a fetch, and the base every manifest URL is relative to. */
export interface DataSource {
  readonly fetch: FetchFn
  readonly base: string | URL
}

export interface DataError {
  /** The file as the manifest names it, e.g. `data/candidates.geojson`. */
  readonly file: string
  /** The record inside it, e.g. `feature 11 (EP-01)` or `layers.hillshade.bounds`. */
  readonly record?: string
  readonly problem: string
}

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: DataError }

export interface Atlas {
  readonly manifest: Manifest
  readonly method: Method
  readonly candidates: readonly Candidate[]
  readonly observations: readonly Observation[]
  /** Problems that didn't stop the atlas loading, e.g. an unreadable observations file. */
  readonly warnings: readonly DataError[]
}

export interface CanopyGrid {
  readonly width: number
  readonly height: number
  /** Projected `[west, south, east, north]` in EPSG:3857 metres. */
  readonly bounds: readonly [number, number, number, number]
  readonly nodata: 255
  readonly year: number
  /** Row-major percentages, row zero at the north edge; 255 is NoData. */
  readonly pixels: Uint8Array
}

/** The manifest's own location, relative to the site base. */
export const MANIFEST_URL = 'data/manifest.json'

/**
 * Stored scores were computed before the components were rounded to one
 * decimal, so the weighted sum of the rounded components can drift slightly.
 * This is the reference package's tolerance.
 */
export const SCORE_ROUNDING_TOLERANCE = 0.12

/** The contour layer's elevation interval. */
export const CONTOUR_INTERVAL_FT = 40

export function formatDataError({ file, record, problem }: DataError): string {
  return record ? `${file} ${record}: ${problem}` : `${file}: ${problem}`
}

export function resolveUrl(source: DataSource, url: string): string {
  return new URL(url, source.base).href
}

/**
 * Loads the manifest, then the candidates, method and observations. Any
 * problem with the manifest, candidates or method is an error. Candidates
 * can't be validated without the method's weights and thresholds. A problem
 * with observations is only a warning, and the atlas carries none.
 */
export async function loadAtlas(source: DataSource): Promise<Result<Atlas>> {
  const manifest = await loadManifest(source)
  if (!manifest.ok) return manifest

  const [candidates, method, observations] = await Promise.all([
    loadFile(source, manifest.value.candidates, schema.Candidates),
    loadMethod(source, manifest.value.method),
    loadObservations(source, manifest.value.observations),
  ])
  if (!candidates.ok) return candidates
  if (!method.ok) return method

  const problem = checkCandidates(manifest.value, method.value, candidates.value.features)
  if (problem) return fail(manifest.value.candidates, problem.record, problem.problem)

  return ok(
    deepFreeze({
      manifest: manifest.value,
      method: method.value,
      candidates: candidates.value.features,
      observations: observations.ok ? observations.value : [],
      warnings: observations.ok ? [] : [observations.error],
    }),
  )
}

/** Loads one GeoJSON layer named in the manifest. Contours must sit on the 40 ft interval. */
export async function loadGeoJsonLayer(
  source: DataSource,
  manifest: Manifest,
  key: string,
): Promise<Result<FeatureCollection>> {
  const layer = manifest.layers[key]
  if (layer?.type !== 'geojson') return fail(MANIFEST_URL, `layers.${key}`, 'no GeoJSON layer with this key')

  const result = await loadFile(source, layer.url, schema.FeatureCollection)
  if (!result.ok) return result
  if (key === 'contours') {
    for (const [index, feature] of result.value.features.entries()) {
      const elevation = feature.properties?.['elevation_ft']
      if (typeof elevation !== 'number' || elevation % CONTOUR_INTERVAL_FT !== 0) {
        return fail(
          layer.url,
          `feature ${index + 1}`,
          `elevation ${JSON.stringify(elevation)} ft is not on the ${CONTOUR_INTERVAL_FT} ft contour interval`,
        )
      }
    }
  }
  return ok(deepFreeze(result.value))
}

/** Loads and decodes the canopy inspector's grid. */
export async function loadCanopyGrid(source: DataSource, manifest: Manifest): Promise<Result<CanopyGrid>> {
  const file = manifest.canopy_grid
  const result = await loadFile(source, file, schema.CanopyGrid)
  if (!result.ok) return result
  const { width, height, bounds, nodata, year, data_base64 } = result.value

  const [west, south, east, north] = bounds
  if (!(west < east && south < north)) return fail(file, 'bounds', 'bounds are out of order; expected [west, south, east, north]')

  let pixels: Uint8Array
  try {
    pixels = Uint8Array.from(atob(data_base64), (char) => char.charCodeAt(0))
  } catch {
    return fail(file, 'data_base64', 'not valid base64')
  }
  if (pixels.length !== width * height) {
    return fail(file, 'data_base64', `decodes to ${pixels.length} pixels; expected ${width} × ${height} = ${width * height}`)
  }
  const bad = pixels.findIndex((value) => value > 100 && value !== nodata)
  if (bad !== -1) {
    const row = Math.floor(bad / width)
    return fail(
      file,
      `pixel ${bad} (row ${row}, column ${bad - row * width})`,
      `value ${pixels[bad]} is not a percentage 0–100 or 255 for NoData`,
    )
  }
  return ok(deepFreeze({ width, height, bounds, nodata, year, pixels }))
}

async function loadManifest(source: DataSource): Promise<Result<Manifest>> {
  const result = await loadFile(source, MANIFEST_URL, schema.Manifest)
  if (!result.ok) return result
  const manifest = result.value

  const urls: [record: string, url: string][] = [
    ['candidates', manifest.candidates],
    ['observations', manifest.observations],
    ['canopy_grid', manifest.canopy_grid],
    ['method', manifest.method],
    ...Object.entries(manifest.layers).map(([key, layer]): [string, string] => [`layers.${key}.url`, layer.url]),
  ]
  for (const [record, url] of urls) {
    const problem = checkRelativeUrl(url)
    if (problem) return fail(MANIFEST_URL, record, problem)
  }

  const bounds: [record: string, bounds: LeafletBounds][] = [
    ['bounds', manifest.bounds],
    ...Object.entries(manifest.layers).flatMap(([key, layer]): [string, LeafletBounds][] =>
      layer.type === 'raster' ? [[`layers.${key}.bounds`, layer.bounds]] : [],
    ),
  ]
  for (const [record, value] of bounds) {
    const problem = checkLeafletBounds(value)
    if (problem) return fail(MANIFEST_URL, record, problem)
  }

  const origin = checkLonLat(manifest.origin.coordinates)
  if (origin) return fail(MANIFEST_URL, 'origin', origin)

  for (const [index, { name, url }] of manifest.sources.entries()) {
    if (url !== undefined && !isExternalUrl(url)) {
      return fail(MANIFEST_URL, `sources[${index}] (${name})`, `${url} is not an absolute http(s) link`)
    }
  }

  return result
}

async function loadMethod(source: DataSource, file: string): Promise<Result<Method>> {
  const result = await loadFile(source, file, schema.Method)
  if (!result.ok) return result
  const total = schema.COMPONENTS.reduce((sum, key) => sum + result.value.components[key].weight, 0)
  if (Math.abs(total - 1) > 1e-9) return fail(file, 'components', `weights sum to ${round(total, 4)}; expected 1`)
  return result
}

async function loadObservations(source: DataSource, file: string): Promise<Result<readonly Observation[]>> {
  const result = await loadFile(source, file, schema.Observations)
  if (!result.ok) return result
  for (const [index, feature] of result.value.features.entries()) {
    const problem = checkLonLat(feature.geometry.coordinates)
    if (problem) return fail(file, `feature ${index + 1}`, problem)
  }
  return ok(result.value.features)
}

interface RecordProblem {
  readonly record: string
  readonly problem: string
}

function checkCandidates(manifest: Manifest, method: Method, candidates: readonly Candidate[]): RecordProblem | null {
  const recordOf = (candidate: Candidate) => `feature ${candidates.indexOf(candidate) + 1} (${candidate.properties.id})`

  for (const candidate of candidates) {
    const problem = checkCandidate(manifest, method, candidate)
    if (problem) return { record: recordOf(candidate), problem }
  }

  const seen = new Map<string, Candidate>()
  for (const candidate of candidates) {
    const first = seen.get(candidate.properties.id)
    if (first) return { record: recordOf(candidate), problem: `duplicate ID; ${recordOf(first)} already uses it` }
    seen.set(candidate.properties.id, candidate)
  }

  // Scout order visits Nearby candidates shortest minimum round trip first.
  const nearby = candidates
    .filter((candidate) => candidate.properties.pool === 'nearby')
    .toSorted((a, b) => a.properties.scout_order - b.properties.scout_order)
  for (const [index, candidate] of nearby.entries()) {
    const { scout_order, metrics } = candidate.properties
    if (scout_order !== index + 1) {
      return { record: recordOf(candidate), problem: `scout order ${scout_order} breaks the sequence 1–${nearby.length}` }
    }
    const previous = nearby[index - 1]?.properties
    if (previous && metrics.roundtrip_lower_bound_miles < previous.metrics.roundtrip_lower_bound_miles) {
      return {
        record: recordOf(candidate),
        problem: `scout order ${scout_order} has a shorter minimum round trip (${metrics.roundtrip_lower_bound_miles} mi) than scout order ${previous.scout_order} (${previous.metrics.roundtrip_lower_bound_miles} mi)`,
      }
    }
  }
  return null
}

function checkCandidate(manifest: Manifest, method: Method, { geometry, properties }: Candidate): string | null {
  const coordinates = checkLonLat(geometry.coordinates) ?? checkInside(geometry.coordinates, manifest.bounds)
  if (coordinates) return coordinates

  const weighted = schema.COMPONENTS.reduce(
    (sum, key) => sum + method.components[key].weight * properties.components[key],
    0,
  )
  if (Math.abs(weighted - properties.score) > SCORE_ROUNDING_TOLERANCE) {
    return `scouting index ${properties.score} doesn't match its weighted components (${round(weighted, 2)}) within ±${SCORE_ROUNDING_TOLERANCE}`
  }

  // "Nearby" is written down three ways; they must agree.
  const budget = manifest.constraints.roundtrip_miles
  const roundTrip = properties.metrics.roundtrip_lower_bound_miles
  const definitions = [
    properties.pool === 'nearby',
    properties.within_east_portal_straightline_budget,
    roundTrip <= budget,
  ]
  if (definitions.some((nearby) => nearby !== definitions[0])) {
    return `nearby definitions disagree: pool is ${properties.pool}, within_east_portal_straightline_budget is ${properties.within_east_portal_straightline_budget}, and the minimum round trip of ${roundTrip} mi is ${roundTrip <= budget ? 'within' : 'over'} the ${budget} mi budget`
  }

  const { selection } = method
  const { canopy_percent, slope_deg, water_distance_m, darkness_m } = properties.metrics
  if (canopy_percent < selection.min_candidate_canopy_percent || canopy_percent > 100) {
    return `canopy ${canopy_percent}% is outside the selection range ${selection.min_candidate_canopy_percent}–100%`
  }
  if (slope_deg > selection.max_candidate_slope_degrees) {
    return `slope ${slope_deg}° is over the ${selection.max_candidate_slope_degrees}° selection maximum`
  }
  if (water_distance_m < selection.min_distance_to_perennial_water_m || water_distance_m > selection.max_distance_to_perennial_water_m) {
    return `water distance ${water_distance_m} m is outside the selection range ${selection.min_distance_to_perennial_water_m}–${selection.max_distance_to_perennial_water_m} m`
  }
  if (darkness_m < selection.min_distance_to_mapped_access_m) {
    return `distance from access ${darkness_m} m is under the ${selection.min_distance_to_mapped_access_m} m selection minimum`
  }
  return null
}

function checkLonLat([lon, lat]: LonLat): string | null {
  const valid = (lon: number, lat: number) => Math.abs(lon) <= 180 && Math.abs(lat) <= 90
  if (valid(lon, lat)) return null
  return valid(lat, lon) ? 'coordinates look like [lat, lon]; expected [lon, lat]' : 'coordinates are out of range'
}

function checkInside([lon, lat]: LonLat, [[south, west], [north, east]]: LeafletBounds): string | null {
  const inside = (lon: number, lat: number) => lon >= west && lon <= east && lat >= south && lat <= north
  if (inside(lon, lat)) return null
  return inside(lat, lon) ? 'coordinates look like [lat, lon]; expected [lon, lat]' : 'coordinates lie outside the atlas bounds'
}

function checkLeafletBounds([[south, west], [north, east]]: LeafletBounds): string | null {
  if (Math.abs(south) > 90 || Math.abs(north) > 90) {
    return 'bounds look like [lon, lat] pairs; expected [[south, west], [north, east]]'
  }
  if (!(south < north && west < east)) return 'bounds are out of order; expected [[south, west], [north, east]]'
  return null
}

function checkRelativeUrl(url: string): string | null {
  if (url === '') return 'URL is empty'
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return `"${url}" is an absolute URL; data must be served from the site itself`
  if (url.startsWith('/')) return `"${url}" starts from the site root; it must be relative to the site base`
  if (url.split(/[/\\]/).includes('..')) return `"${url}" leaves the site base`
  return null
}

/** Source citations point off-site, the opposite of data URLs. */
function isExternalUrl(url: string): boolean {
  return URL.canParse(url) && /^https?:$/.test(new URL(url).protocol)
}

async function loadFile<S extends z.ZodType>(
  source: DataSource,
  file: string,
  fileSchema: S,
): Promise<Result<z.output<S>>> {
  let response: Response
  try {
    response = await source.fetch(resolveUrl(source, file))
  } catch (error) {
    return fail(file, undefined, `request failed${error instanceof Error && error.message ? ` (${error.message})` : ''}`)
  }
  if (!response.ok) {
    return fail(file, undefined, response.status === 404 ? 'file not found (HTTP 404)' : `request failed (HTTP ${response.status})`)
  }

  let raw: unknown
  try {
    raw = await response.json()
  } catch {
    return fail(file, undefined, 'not valid JSON')
  }

  const parsed = fileSchema.safeParse(raw)
  if (parsed.success) return ok(parsed.data)
  const [issue] = parsed.error.issues
  return issue ? fail(file, ...describeIssue(raw, issue)) : fail(file, undefined, 'failed validation')
}

/** Names a feature by its position and ID; any other record by its path. */
function describeIssue(raw: unknown, issue: z.core.$ZodIssue): [record: string | undefined, problem: string] {
  const [head, index, ...rest] = issue.path
  if (head === 'features' && typeof index === 'number') {
    const id = (raw as { features: { properties?: { id?: unknown } }[] }).features[index]?.properties?.id
    const record = `feature ${index + 1}${typeof id === 'string' ? ` (${id})` : ''}`
    return [record, rest.length ? `${rest.join('.')}: ${issue.message}` : issue.message]
  }
  return [issue.path.length ? issue.path.join('.') : undefined, issue.message]
}

function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

function fail(file: string, record: string | undefined, problem: string): { ok: false; error: DataError } {
  return { ok: false, error: record === undefined ? { file, problem } : { file, record, problem } }
}

function round(value: number, places: number): number {
  return Number(value.toFixed(places))
}

function deepFreeze<T>(value: T): schema.DeepReadonly<T> {
  // Typed arrays can't be frozen; the read-only type covers them.
  if (value && typeof value === 'object' && !ArrayBuffer.isView(value) && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value as schema.DeepReadonly<T>
}
