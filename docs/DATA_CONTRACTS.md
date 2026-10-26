# Data contracts and implementation notes

## Entry point

`public/data/manifest.json` declares layer URLs, types, bounds, sources, candidate/observation URLs, the origin and constraints. All runtime paths are relative to `public/index.html`. Keep this working when the app is deployed under a GitHub repository subpath; root-absolute `/data/...` URLs would change that behavior.

| Record | Location | Meaning |
|---|---|---|
| Layer manifest | `data/manifest.json` | 18 geospatial layer configurations; runtime controls additionally include candidates and observations (the reference copy's `anchors`) |
| Candidates | `data/candidates.geojson` | 16 selected hypotheses, six `EP-*` and ten `JP-*` |
| Origin | `origin` field in `data/manifest.json` | East Portal name and `[longitude, latitude]` (rebuild copy). The reference copy keeps the original `data/anchors.geojson`, holding only the origin |
| Observations | `data/observations.geojson` | Empty collection in the public build; the owner's points stay in git-ignored `private/` (ADR 0001) |
| Formulas | `data/method.json` | Analysis specification, thresholds, scenario and known limitations |
| Summary | `data/model_summary.json` | Original model counts and source coverage |
| Canopy inspector | `data/canopy_grid.json` | Base64-encoded one-byte percentage pixels, dimensions and projected extent |
| Provenance | `*_metadata.json`, `retrieval_manifest.json` | Input descriptions and retained query/download records |

## Coordinate and raster rules

- GeoJSON positions are WGS84 `[longitude, latitude]`.
- Leaflet markers accept `[latitude, longitude]`.
- Image bounds are `[[south, west], [north, east]]` in degrees. Image pixels themselves were rendered in EPSG:3857.
- Modeling distances/slopes used EPSG:26913 with a 60 m analysis grid. Do not apply distances to raw degrees.
- Canopy grid bounds are projected `[west, south, east, north]` in EPSG:3857. Decode `data_base64` into a row-major byte array. Row zero is north. `255` is missing; `0` is valid.
- Contour properties are `elevation_ft` and `index`. The elevation interval is 40 ft, with index lines every 200 ft. Native resolution and contour interval are different concepts.

## Candidate fields to preserve

Illustrative TypeScript contracts for the core fields; these are design guidance, not a complete generated schema or an installed dependency:

```ts
type LonLat = readonly [longitude: number, latitude: number];
type LeafletBounds = readonly [
  southwest: readonly [latitude: number, longitude: number],
  northeast: readonly [latitude: number, longitude: number],
];
type Components = Record<'water' | 'shelter' | 'security' | 'darkness', number>;
type ReconStatus = 'todo' | 'scouted' | 'camera' | 'reject';

interface CandidateProperties {
  id: string;                    // Stable EP-* or JP-* identifier
  name: string;
  pool: 'nearby' | 'wilderness_context';
  rank: number;                  // Combined-score rank WITHIN pool
  score: number;                 // 0–100 index, not probability
  scout_order: number;           // Nearby distance priority; context uses 99
  components: Components;
  within_east_portal_straightline_budget: boolean;
  metrics: {
    water_distance_m: number;    // Exact vector distance to nearest perennial feature
    nearest_access_m: number;    // Exact vector distance to nearest mapped access
    darkness_m: number;          // Alias of nearest_access_m
    canopy_percent: number;     // Bilinear 60 m model estimate
    slope_deg: number;           // Alias of slope_degrees
    roundtrip_lower_bound_miles: number;
    elevation_ft: number;
    nearby_steep_terrain_percent: number;
    [retainedField: string]: unknown;
  };
  rationale: string[];
  cautions: string[];
  route_status: string;
  gmu: string;                   // Current UI alias; original land.gmu is an array
}

interface ReconEntry {
  status?: ReconStatus;
  notes?: string;
  updated?: string;              // ISO timestamp
}
```

Retain other fields rather than throwing them away during parsing: `water`, `land`, `field_checks`, `model_strengths`, `model_limiting_factor`, `score_kind`, `observed_elk_at_candidate`, and the original metrics are useful provenance. Validate known fields at the input boundary. Consider a normalized view model for UI convenience rather than mutating the raw source.

The two-decimal round-trip values and one-decimal component values have already been rounded for display. The original score was calculated before rounding; weighted rounded components can differ slightly from the stored total.

## State separation

| State | Existing behavior | Rebuild concern |
|---|---|---|
| Raw map/candidate data | Loaded from bundled JSON/GeoJSON | Immutable versioned input |
| Enabled layers, opacity, selected candidate, search/scope | In-memory UI state | Decide which state belongs in a shareable URL |
| Scouting status/notes | localStorage key `jpw-scouting-log-2027-v1` | Validate and version the storage schema; plan a migration if retaining existing logs |
| Rendering objects | Leaflet layers, markers, map instance | Own creation/disposal in the adapter |
| Export | Current nearby/all candidate scope plus notes | Search/status filters currently do not narrow export scope; make this explicit or deliberately change it |

The nearby scope contains six points. The All scope contains all 16. Export includes candidate coordinates and metrics but excludes observations, base rasters and trail geometry. GPX exports waypoints, not routes. Browser notes from another origin are not embedded in this ZIP.

## Recalculation and display are separate

The UI loads precomputed scores and images. Switching a layer or preset does not rerun the GIS model. The weights in the cards are fixed. If adding adjustable weights, clearly distinguish recalculating a point's weighted total from rerunning spatial candidate admission/selection and rebuilding raster surfaces.

The two darkness toggles currently share `darkness_distance.png`. A true 0–100 darkness score overlay would require a separate derived asset or a documented numerical transformation, with a matching legend.
