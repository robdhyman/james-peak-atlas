// Zod schemas for the bundled data files (docs/DATA_CONTRACTS.md). The
// TypeScript types are derived from them. Objects are loose, so fields the
// atlas doesn't use yet pass through untouched.
import * as z from 'zod'

// Zod 4's number already rejects NaN and ±Infinity.
const finite = z.number()
const score = finite.min(0).max(100)

/** A GeoJSON position, `[longitude, latitude]`. Order is checked by the loader. */
export const LonLat = z.tuple([finite, finite])

/** Leaflet-order image bounds, `[[south, west], [north, east]]`. Order is checked by the loader. */
export const LeafletBounds = z.tuple([z.tuple([finite, finite]), z.tuple([finite, finite])])

/** A `#rrggbb` colour; legend ramps are drawn from these, so nothing else gets through. */
const HexColor = z.string().regex(/^#[0-9a-f]{6}$/i, 'expected a #rrggbb colour')

/** A raster's colour ramp: either stops by value, or a min–max range with a comma-separated gradient. */
const RasterLegend = z.union([
  z.array(z.looseObject({ value: finite, color: HexColor })).min(2),
  z.looseObject({
    min: finite,
    max: finite,
    gradient: z.string().regex(/^#[0-9a-f]{6}(,#[0-9a-f]{6})+$/i, 'expected comma-separated #rrggbb colours'),
  }),
])

const RasterLayer = z.looseObject({
  type: z.literal('raster'),
  url: z.string(),
  bounds: LeafletBounds,
  label: z.string(),
  description: z.string().optional(),
  legend: RasterLegend.optional(),
})

const GeoJsonLayer = z.looseObject({
  type: z.literal('geojson'),
  url: z.string(),
  label: z.string(),
  description: z.string().optional(),
})

export const Manifest = z.looseObject({
  title: z.string(),
  bounds: LeafletBounds,
  scenario: z.string(),
  origin: z.looseObject({ name: z.string(), coordinates: LonLat }),
  layers: z.record(z.string(), z.discriminatedUnion('type', [RasterLayer, GeoJsonLayer])),
  candidates: z.string(),
  observations: z.string(),
  canopy_grid: z.string(),
  method: z.string(),
  constraints: z.looseObject({ roundtrip_miles: finite.positive() }),
})

const Component = z.looseObject({ weight: finite.min(0).max(1) })

export const Method = z.looseObject({
  components: z.looseObject({ water: Component, shelter: Component, darkness: Component, security: Component }),
  selection: z.looseObject({
    min_candidate_canopy_percent: finite,
    max_candidate_slope_degrees: finite,
    min_distance_to_perennial_water_m: finite,
    max_distance_to_perennial_water_m: finite,
    min_distance_to_mapped_access_m: finite,
  }),
})

export const COMPONENTS = ['water', 'shelter', 'darkness', 'security'] as const
export type ComponentKey = (typeof COMPONENTS)[number]

export const POOLS = ['nearby', 'wilderness_context'] as const
export type Pool = (typeof POOLS)[number]

const CandidateProperties = z.looseObject({
  id: z.string().regex(/^(EP|JP)-\d{2}$/, 'expected an EP-NN or JP-NN ID'),
  name: z.string(),
  pool: z.enum(POOLS),
  rank: z.int().positive(),
  score,
  scout_order: z.int().positive(),
  within_east_portal_straightline_budget: z.boolean(),
  components: z.looseObject({ water: score, shelter: score, darkness: score, security: score }),
  metrics: z.looseObject({
    water_distance_m: finite,
    darkness_m: finite,
    canopy_percent: finite,
    slope_deg: finite,
    roundtrip_lower_bound_miles: finite.nonnegative(),
  }),
})

const PointFeature = <P extends z.ZodType>(properties: P) =>
  z.looseObject({
    type: z.literal('Feature'),
    geometry: z.looseObject({ type: z.literal('Point'), coordinates: LonLat }),
    properties,
  })

export const Candidates = z.looseObject({
  type: z.literal('FeatureCollection'),
  features: z.array(PointFeature(CandidateProperties)),
})

export const Observations = z.looseObject({
  type: z.literal('FeatureCollection'),
  features: z.array(PointFeature(z.looseObject({}))),
})

/** Any GeoJSON layer from the manifest. Geometry is left to Leaflet. */
export const FeatureCollection = z.looseObject({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.looseObject({
      type: z.literal('Feature'),
      geometry: z.looseObject({ type: z.string() }).nullable(),
      properties: z.looseObject({}).nullable(),
    }),
  ),
})

export const CanopyGrid = z.looseObject({
  width: z.int().positive(),
  height: z.int().positive(),
  crs: z.literal('EPSG:3857'),
  /** Projected `[west, south, east, north]` in EPSG:3857 metres. */
  bounds: z.tuple([finite, finite, finite, finite]),
  nodata: z.literal(255),
  year: z.int(),
  data_base64: z.string(),
})

/** Recursively read-only, so the loaded atlas can't be edited by accident. */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends Uint8Array
    ? Readonly<T>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T

export type Manifest = DeepReadonly<z.output<typeof Manifest>>
export type Method = DeepReadonly<z.output<typeof Method>>
export type Candidate = DeepReadonly<z.output<typeof Candidates>['features'][number]>
export type Observation = DeepReadonly<z.output<typeof Observations>['features'][number]>
export type FeatureCollection = DeepReadonly<z.output<typeof FeatureCollection>>
export type LeafletBounds = DeepReadonly<z.output<typeof LeafletBounds>>
export type LonLat = DeepReadonly<z.output<typeof LonLat>>
export type ManifestLayer = Manifest['layers'][string]
export type RasterLegend = DeepReadonly<z.output<typeof RasterLegend>>
