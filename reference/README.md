# James Peak Scouting Atlas (reference copy)

> **This is the original vanilla-JavaScript atlas, kept as a comparison baseline for the React rebuild.** It moved from the package root into `reference/`; its documentation now lives in the repository's [`docs/`](../docs/) folder. For public release the owner's personal observations, the CalTopo map link, the preview image, the checksum file and one observation-specific note in `app.js` were removed (see [ADR 0001](../docs/adr/0001-withhold-observations-from-public-build.md)). Its `public/data/anchors.geojson` holds only the East Portal origin, so the **Your locations** control does nothing. Run the commands below from this `reference/` folder.

A portable reference web app for investigating elk scouting locations in Colorado's James Peak Wilderness. It combines locally bundled terrain, canopy, water and access evidence with an inspectable candidate-ranking model.

**This ZIP contains the complete working vanilla JavaScript app, its map assets and a design-engineering handoff.** The proposed React + TypeScript + Tailwind rebuild is work for the next project phase; no framework conversion has been performed here. “TypeScript” is the assumed intended language from the original request's “Actionscript.”

Export date: **October 26, 2026**. Runtime baseline commit: `d0eb3130f3487c766ba9997431d59bbfe42caf28`. The runtime files under `public/` are copied from that published baseline. Packaging scripts and this documentation were added for the local handoff. The original hosted app has not been changed.

## Run locally

Unzip, open a terminal in `james-peak-scouting-atlas`, and choose either option.

**Node.js 20 or newer:**

```sh
npm start
```

Open **http://127.0.0.1:4173**. No `npm install`, API key, account, GIS software or build step is required. If the port is occupied, use `npm start -- 4174`. Press Ctrl+C to stop.

**Python 3 alternative:**

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory public
```

On Windows, `py -m http.server 4173 --bind 127.0.0.1 --directory public` is an equivalent option. Opening `index.html` directly through `file://` can prevent browsers from loading the GeoJSON files; use HTTP.

The app serves all essential scripts, styles, images and map data locally. Source links open external websites when clicked. It does not contain a service worker or a certified offline-navigation workflow. Browser log storage is specific to the origin: `localhost`, `127.0.0.1` and different ports have different localStorage.

## What is included

| Path | Purpose |
|---|---|
| `public/index.html`, `app.js`, `styles.css` | Current interface and behavior |
| `public/canopy-probe.js` | Numeric inspection of the bundled canopy grid |
| `public/vendor/` | Leaflet 1.9.4, CSS, images and BSD 2-Clause license |
| `public/data/` | All map display data, candidates, the origin and provenance (observations withheld) |
| `scripts/serve.mjs` | Dependency-free local server, bound to loopback |
| `scripts/check.mjs` | Asset and data-contract checks |
| `scripts/build.mjs` | Copies deployable static files to `dist/` |
| `../docs/SOURCES.md` | Source register, exact retained service URLs and six topo PDF links |
| `../docs/REBUILD_HANDOFF.md` | React/TypeScript/Tailwind exercise, workflow and acceptance criteria |
| `../docs/DATA_CONTRACTS.md` | Coordinate conventions, data shapes and state boundaries |
| `../docs/PUBLIC_RELEASE.md` | GitHub/live-demo publication decisions |
| `../docs/reference/` | Original GIS scoring and assembly code for inspection |
| `../THIRD_PARTY_NOTICES.md` | Code and dataset attribution boundaries |

The ZIP excludes deployment credentials, Git history, the hosted Site's account configuration, dependency directories and the original national-scale source archives.

## Map behavior

- Independent controls for trails, roads, developed campgrounds, trailheads, wilderness, ownership and GMUs.
- Official **2022 USGS US Topo with 40-foot contours**, plus a separate layer of derived 40-foot contour lines. The official raster retains its printed trails, water and imagery when those separate overlays are switched off. [S2–S3]
- **2025 continuous canopy cover**, 0–100%, with numeric inspection. This is an overhead-cover estimate, not a land-cover class recoded as a percentage. [S4]
- Mapped water classes and a low-water suitability overlay. Historical perennial classification is evidence to investigate, not a 2027 streamflow forecast. [S5]
- Darkness expressed as distance from mapped trails, roads and developed campgrounds.
- Six East Portal alternatives, ten wider-wilderness comparison points, and the three user-supplied observation anchors. [S8]
- Candidate evidence cards, browser-local scouting status and notes, and GeoJSON/GPX/CSV export of the currently selected candidate scope. The export does not include the complete basemap or turn-by-turn routes.

The default nearby list starts with **EP-04** because it has the shortest minimum travel distance among the six alternatives. Its score rank is separate from that practical ordering.

## Scenario and geographic scope

The planning year is **2027**. The user directs the app to assume elk occupancy; the model does not estimate occupancy. Low water is a planning scenario, not a forecast of drought, discharge or lake drawdown.

Analysis covers the official USFS wilderness polygon with a **3 km surrounding buffer** for contextual features. Candidate admission is restricted to the wilderness and mapped USFS fee ownership. [S1, S6] GMU boundaries are contextual; all 16 selected points in this snapshot fall in GMU 38. [S7]

The access origin is Moffat Tunnel / East Portal at `39.9017, -105.6453`. The stated limits are six miles round trip, 4,000 feet cumulative ascent, and an AWD Mazda 3 without a high-clearance approach. Only the necessary straight-line distance screen is calculated. Ascent, actual walking routes, road conditions and recovery logistics are **not** computed.

## How the model is calculated

The authoritative retained specification is [`public/data/method.json`](public/data/method.json). The original implementation is [`docs/reference/build_model.py`](../docs/reference/build_model.py). The weights and thresholds below are **unvalidated planning heuristics chosen for this scenario**; they are not coefficients derived from elk telemetry, harvest outcomes or a published ecological model. The sources support the inputs, not a claimed predictive validity for these formulas.

### 1. Prepare comparable spatial inputs

The modeling grid is **60 m**, projected in **NAD83 / UTM zone 13N, EPSG:26913**. Terrain begins with a USGS 3DEP elevation sample at 10 m. Slope is calculated from a DEM smoothed with a one-cell Gaussian, then resampled for modeling. The service mosaic can contain different source vintages and resolutions; “sampled at 10 m” does not mean every source observation has native 10 m accuracy. [S3]

Canopy and slope are bilinearly resampled to the analysis grid. Canopy values outside 0–100 are invalid. The numeric hover inspector uses the separate approximately 30 m display grid, with nearest-neighbor reprojection. Therefore a candidate's averaged canopy value can differ from the hovered source-pixel value. **Zero is a valid canopy percentage; 255 means NoData.** [S4]

Trails, roads and developed campgrounds are rasterized with an all-touched rule. Euclidean distance transforms estimate distances from these features. These are geometric separation measures, not walking times, motorized reach or observed visitor counts. [S1]

For water scoring, retain natural stream/river features, non-ice lake/pond polygons and spring/seep points. Exclude artificial paths, connectors, canals/ditches, pipelines, ice masses, marsh polygons and gate points. Seasonal combines intermittent and ephemeral classes. Unknown water remains unknown. The visible water layer includes additional context that is not admitted as independent water evidence. [S5]

### 2. Calculate four component scores

Define `clip(x) = min(1, max(0, x))`. Distances are meters, slopes are degrees and canopy is percent. Missing evidence is not promoted into certainty.

| Component | Calculation | Weight |
|---|---|---:|
| Water `W` | `max(100*clip(1-d_perennial/600), 55*clip(1-d_unknown/400), 25*clip(1-d_seasonal/250))` | 35% |
| Shelter `S` | `100*clip((canopy_percent-10)/60)` | 25% |
| Darkness `D` | `100*clip((min(d_trail,d_road,d_camp)-100)/900)` | 25% |
| Security `T` | `100*min(clip(f/0.35), clip((0.85-f)/0.30))*clip((35-local_slope)/20)` | 15% |

For security, `f` is the fraction of valid slope cells with slope at least **25° within a 200 m disk**. Intermediate amounts of surrounding steep terrain receive a higher protection score; very extensive steep terrain and a steep candidate cell are discounted. This does not identify real pinch points, count ingress/egress routes or establish where elk can escape.

The combined index is:

```text
scouting_index = 0.35*W + 0.25*S + 0.25*D + 0.15*T
```

This is a relative 0–100 index. **72/100 is not a 72% probability** of seeing or harvesting an elk. A weighted sum can compensate for a weak component; inspect the four component bars before interpreting the total.

### 3. Admit candidate cells

A cell must satisfy all of these conditions:

1. Inside the wilderness and mapped USFS fee ownership; outside mapped lake polygons.
2. Finite canopy and slope, canopy **≥30%**, local slope **≤30°**.
3. **≥200 m** from mapped access.
4. **30–450 m** from mapped perennial water.
5. **≥250 m** from the supplied observation anchors.
6. Water score **≥25** and security score **≥20**.

The pipeline then rechecks perennial-water distance and minimum mapped-access distance against exact vector geometry. Selected candidate neighborhoods must be separated by **≥400 m**. Boundary/ownership and selected-point geometry were also checked during the original build. These are inventory tests; they do not grant legal access.

### 4. Select two pools and order them

Eligible cells are sorted by combined score. First, reserve up to **six** spatially separated candidates within **three geodesic miles** of East Portal. Then select up to **ten** remaining high-scoring wilderness cells, excluding 400 m neighborhoods around the first pool. This creates the `EP-*` and `JP-*` IDs; ranks are within each pool.

The snapshot contains **19,244 wilderness grid cells**, **1,255 qualifying cells** and **628 qualifying nearby cells**. Six nearby and ten context points were selected. These are counts of model cells and selected hypotheses, not elk or independent habitat observations. See [`model_summary.json`](public/data/model_summary.json).

The default nearby order uses minimum travel distance:

| Order | Candidate | Minimum round trip from East Portal |
|---:|---|---:|
| 1 | EP-04 | 2.21 mi |
| 2 | EP-05 | 3.97 mi |
| 3 | EP-03 | 4.51 mi |
| 4 | EP-01 | 4.81 mi |
| 5 | EP-06 | 5.28 mi |
| 6 | EP-02 | 5.43 mi |

These values equal twice the geodesic point-to-origin distance. Passing this screen does not establish a six-mile hike. The current “All wilderness” list orders by **within-pool rank**, interleaving the pools; it is not a global score ranking. Making the sort choices more explicit is a useful rebuild improvement.

### 5. Render evidence without changing its units

Model images are warped to **EPSG:3857** with Leaflet latitude/longitude bounds. Darkness imagery shows **0–2,000 m**, saturated beyond 2,000 m. Both the “Darkness” and “Darkness component” toggles currently refer to that same distance image; the candidate card's darkness score is the separately normalized 0–100 value.

Candidate water/access figures use exact vector distances. Component scores and individual trail/road/camp distances use raster estimates. Expect roughly cell-scale differences and score rounding; do not try to reproduce every component by substituting the displayed exact distance into a raster-derived formula.

## What remains uncertain

- Actual 2027 flow, lake levels, undergrowth, blowdown and current animal use.
- Informal trails, dispersed camps, comprehensive railroad disturbance and actual hunting/recreation pressure.
- True terrain pinch points, approach/escape corridors, walking routes, cumulative ascent and recovery access.
- Road closures, seasonal conditions, vehicle clearance and hunt-code legality.
- Food availability, forest species composition, private-boundary preference and vehicle-versus-hiking arrival times are not modeled in this version.
- Weights, thresholds and selected rankings have not been validated against outcomes or subjected to a sensitivity study.

## Verify and build

```sh
npm run check
npm run build
```

The checks verify runtime references, the snapshot's 16 unique candidates, six-member nearby pool, weighted-score consistency with rounding, coordinate order, canopy decoding and 40-foot contour increments. They do not establish ecological validity or legal/physical access.

`npm run build` copies `public/` into a fresh `dist/` directory for a static host. It does not recompute GIS outputs. All runtime URLs are relative, which supports hosting beneath a repository path. This package does not create a GitHub repository or configure a deployment account.

Original browser QA covered layer loading, candidate cards, 390 px responsive layout and log persistence. The GPX export action fired, but automated download-event capture timed out in that browser, so actual downloaded-file validation remains an acceptance item for the rebuild. Do not present it as a fully verified end-to-end test.

## Reproducibility boundary

**Running and rebuilding the interface is fully supported by the bundled files. Recomputing the original GIS model from raw inputs is not turnkey.**

The historical Python scripts depend on raw DEM, slope and canopy TIFFs; normalized hydrography and ownership inputs; observation reconciliation files; GIS dependencies; and the original acquisition/preprocessing workspace. Workspace maintenance removed those intermediate inputs. The published display bundle and original scripts survived in the Site source repository.

The original national archives and six source PDFs are not needed to run the web app and are not included. Exact URLs retained by the original pipeline are recorded in [SOURCES.md](../docs/SOURCES.md). A full recomputation requires reacquiring these inputs, checking their vintages, restoring the preprocessing steps and changing the scripts' historical paths. Do not recreate analytical TIFFs from rendered PNG colors and claim they are the original measurements.

## Rebuild as a design-engineering exercise

Start with [`docs/REBUILD_HANDOFF.md`](../docs/REBUILD_HANDOFF.md). It maps the exercise to Matt Pocock's reviewed workflow skills, defines useful vertical slices and distinguishes data integrity from interface implementation. [S9]

Keep the original runtime as a comparison baseline. The portfolio evidence should show your architectural and interaction decisions, meaningful commits, verified behavior, performance measurements, tradeoffs and attribution. Merely moving the same interface into React is a smaller claim.

**This public copy omits the exact observation coordinates and the CalTopo reference** (ADR 0001); see [`docs/PUBLIC_RELEASE.md`](../docs/PUBLIC_RELEASE.md). The current private hosted Site's authentication is not part of this static bundle.

## Source citations

| ID | Source | Used for |
|---|---|---|
| S1 | [USFS Enterprise Data Warehouse](https://data.fs.usda.gov/geodata/edw/datasets.php), [James Peak Wilderness](https://www.fs.usda.gov/r02/arp/recreation/james-peak-wilderness), and [USGS TNM transportation service](https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer) | Wilderness, access lines, developed camps and trailheads; October 2026 retrieval, mixed underlying vintages |
| S2 | [USGS US Topo](https://www.usgs.gov/programs/national-geospatial-program/us-topo-maps-america) | Six 2022 quadrangles, each explicitly stating a 40-foot contour interval; exact PDF links in SOURCES.md |
| S3 | [USGS 3DEP](https://www.usgs.gov/3d-elevation-program) and [elevation service](https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer) | DEM, slope, hillshade and derived contours |
| S4 | [USFS tree canopy products](https://data.fs.usda.gov/geodata/rastergateway/treecanopycover/) | NLCD CONUS 2025 percent canopy, v2025-6, published April 2026; exact archive URL retained |
| S5 | [USGS National Hydrography Dataset](https://www.usgs.gov/national-hydrography/national-hydrography-dataset) and [NHD service](https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer) | Legacy hydrography classes; NHD maintenance retired October 2023 |
| S6 | [USGS PAD-US overview](https://www.usgs.gov/programs/gap-analysis-project/science/pad-us-data-overview) | Fee ownership screening; a service snapshot, not cadastral certification |
| S7 | [Colorado Parks and Wildlife maps](https://cpw.state.co.us/maps) | GMU context |
| S8 | User's CalTopo map and directly supplied coordinates/observations | Three October 2025 observation anchors; user confirmed East Portal parking |
| S9 | [Matt Pocock skills, reviewed commit](https://github.com/mattpocock/skills/tree/5beb35b040e3de97e54fa9e386d7e42d15c295c2) | Engineering workflow guidance for the future rebuild; not a source for habitat scoring |
| S10 | [Leaflet 1.9.4](https://github.com/Leaflet/Leaflet/tree/v1.9.4) | Current map rendering library; bundled license retained |

Source documentation, query manifests and metadata describe the retrieved snapshot. See [SOURCES.md](../docs/SOURCES.md) for direct download/service links and limitations in retained provenance. Dataset-specific terms remain separate from any application-code license you later choose.
