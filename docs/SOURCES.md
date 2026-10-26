# Source register

This register records the provenance preserved in the October 2026 app snapshot. Links identify inputs; they do not validate the ecological scoring weights. The raw national datasets, original PDFs and preprocessing TIFFs are not bundled.

## Primary sources

| ID | Source | Snapshot / role |
|---|---|---|
| S1 | [USFS wilderness boundary, trails, roads and recreation](https://data.fs.usda.gov/geodata/edw/datasets.php) | Inventory retrieved October 2026; individual road vintages vary. Road geometry is not a legal-access or vehicle-condition determination. |
| S2 | [Official USGS US Topo quadrangles](https://www.usgs.gov/programs/national-geospatial-program/us-topo-maps-america) | Six 2022 quadrangles. All six explicitly use 40-foot contour intervals. Local georeferenced mosaic; no remote tiles. |
| S3 | [USGS 3D Elevation Program](https://www.usgs.gov/3d-elevation-program) | Retrieved October 2026; mixed source vintages. Elevation sampled at 10 m; supports hillshade, derived contours and slope proxies. |
| S4 | [USFS NLCD percent tree canopy](https://data.fs.usda.gov/geodata/rastergateway/treecanopycover/) | Mapped year 2025 · release v2025-6 · published 2026. Continuous 0–100% canopy estimates at about 30 m. Zero is valid; missing pixels are not treated as zero. |
| S5 | [USGS National Hydrography Dataset](https://www.usgs.gov/national-hydrography/national-hydrography-dataset) | Legacy NHD High Resolution; retired October 2023. Perennial is a historical classification, not measured water availability in 2027. |
| S6 | [USGS PAD-US fee ownership](https://www.usgs.gov/programs/gap-analysis-project/science/pad-us-data-overview) | Current service snapshot retrieved October 2026. Candidate filter uses mapped USFS fee land within the wilderness; inventory boundaries do not grant access. |
| S7 | [CPW game management units](https://cpw.state.co.us/maps) | Retrieved October 2026. 2027 season, hunt code and closure rules require the applicable regulations. |
| S8 | Your CalTopo and observations | Observations October 2025. Three supplied coordinates retained exactly; 2027 elk occupancy accepted as the planning assumption. |

## Official 2022 US Topo quadrangles (S2)

Each source PDF collar was checked during the original build and explicitly stated **CONTOUR INTERVAL 40 FEET**. The locally served display asset is `usgs_topo_40ft.webp`. The metadata may also name intermediate PNG/PDF/TXT files that are not runtime dependencies and are not included.

| Quadrangle | Publication date | Source PDF |
|---|---|---|
| US Topo 7.5-minute map for Berthoud Pass, CO | 2022-03-23 | [CO_Berthoud_Pass_20220323_TM_geo.pdf](https://prd-tnm.s3.amazonaws.com/StagedProducts/Maps/USTopo/PDF/CO/CO_Berthoud_Pass_20220323_TM_geo.pdf) |
| US Topo 7.5-minute map for Central City, CO | 2022-03-23 | [CO_Central_City_20220323_TM_geo.pdf](https://prd-tnm.s3.amazonaws.com/StagedProducts/Maps/USTopo/PDF/CO/CO_Central_City_20220323_TM_geo.pdf) |
| US Topo 7.5-minute map for East Portal, CO | 2022-03-24 | [CO_East_Portal_20220324_TM_geo.pdf](https://prd-tnm.s3.amazonaws.com/StagedProducts/Maps/USTopo/PDF/CO/CO_East_Portal_20220324_TM_geo.pdf) |
| US Topo 7.5-minute map for Empire, CO | 2022-03-24 | [CO_Empire_20220324_TM_geo.pdf](https://prd-tnm.s3.amazonaws.com/StagedProducts/Maps/USTopo/PDF/CO/CO_Empire_20220324_TM_geo.pdf) |
| US Topo 7.5-minute map for Fraser, CO | 2022-03-24 | [CO_Fraser_20220324_TM_geo.pdf](https://prd-tnm.s3.amazonaws.com/StagedProducts/Maps/USTopo/PDF/CO/CO_Fraser_20220324_TM_geo.pdf) |
| US Topo 7.5-minute map for Nederland, CO | 2022-03-24 | [CO_Nederland_20220324_TM_geo.pdf](https://prd-tnm.s3.amazonaws.com/StagedProducts/Maps/USTopo/PDF/CO/CO_Nederland_20220324_TM_geo.pdf) |

The original PDFs were rendered at 144 dpi, georeferenced using their embedded PDF control points, transformed from NAD83/UTM coordinates to Web Mercator, and clipped to quadrangles and the study buffer. Retained control-point fit residuals are under 0.22 m; that is a transformation-fit diagnostic, **not the absolute geographic accuracy of the map**. The mosaic covers all mapped wilderness; a small buffer strip south of 39.75°N is transparent. It includes original printed labels, trails, water and imagery.

## Canopy (S4)

- Dataset: **USFS NLCD Percent Tree Canopy CONUS v2025-6**.
- Mapped year: **2025**; published **2026-04-01**; retrieved **2026-10-26**.
- [Exact source ZIP](https://data.fs.usda.gov/geodata/rastergateway/treecanopycover/docs/v2025-6/nlcd_tcc_conus_2025_v2025-6_wgs84.zip).
- Source member: `nlcd_tcc_conus_wgs84_v2025-6_20250101_20251231.tif`.
- Native reported resolution: 30 m. Valid values 0–100; source NoData 254/255 is normalized to 255.
- Original retrieval used byte ranges into a tiled GeoTIFF held in the national ZIP. The retained model/display subset covers all wilderness cells.
- `canopy_metadata.json` describes the missing raw TIFF subset and retained PNG/grid. `canopy_grid.json` is the portable numeric inspection asset.

## Elevation (S3)

- [Original export endpoint](https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage).
- USGS 3DEP elevation sampled at 10 m; mixed source vintages/resolutions.
- Local slope: gradient after a one-cell Gaussian smoothing step.
- Derived vector contours: 40-foot interval, index every 200 feet, geometry simplified at approximately 8 m.
- Retained runtime: hillshade image and contour GeoJSON. Raw DEM and slope TIFFs are absent.

## Retained access and hydrography query endpoints (S1, S5)

The original retrieval manifest recorded a query extent covering the wilderness plus its 3 km buffer, the returned object IDs and fetched counts. Those counts establish that all IDs returned by each service query were collected; they do not prove completeness of the real-world inventory. Some service layers legitimately returned zero applicable features.

| Layer key | Service endpoint | Returned IDs | Retrieved features | Clipped features |
|---|---|---:|---:|---:|
| `usfs_recreation` | [ArcGIS layer](https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RecInfraRecreationSites_02/MapServer/0) | 14 | 14 | 10 |
| `usfs_roads` | [ArcGIS layer](https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RoadBasic_01/MapServer/0) | 109 | 109 | 47 |
| `usfs_trails` | [ArcGIS layer](https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublish_01/MapServer/0) | 92 | 92 | 47 |
| `tnm_transport_29` | [ArcGIS layer](https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/29) | 29 | 29 | 0 |
| `tnm_transport_31` | [ArcGIS layer](https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/31) | 0 | 0 | 0 |
| `tnm_transport_30` | [ArcGIS layer](https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/30) | 84 | 84 | 41 |
| `tnm_transport_34` | [ArcGIS layer](https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/34) | 0 | 0 | 0 |
| `tnm_transport_33` | [ArcGIS layer](https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/33) | 17 | 17 | 0 |
| `tnm_transport_36` | [ArcGIS layer](https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/36) | 0 | 0 | 0 |
| `tnm_transport_35` | [ArcGIS layer](https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/35) | 64 | 64 | 13 |
| `tnm_transport_37` | [ArcGIS layer](https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/37) | 283 | 283 | 70 |
| `tnm_transport_32` | [ArcGIS layer](https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/32) | 2626 | 2626 | 964 |
| `nhd_points` | [ArcGIS layer](https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/0) | 14 | 14 | 3 |
| `nhd_waterbodies` | [ArcGIS layer](https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/12) | 227 | 227 | 149 |
| `nhd_flowlines` | [ArcGIS layer](https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6) | 2178 | 2178 | 1223 |

## Ownership and GMUs (S6, S7)

The runtime retains the normalized ownership polygons and four intersecting GMU polygons (28, 29, 38 and 39), with source labels/IDs on features. It does not retain a full replayable ownership/GMU acquisition manifest or an exact pinned statewide release. Use the USGS PAD-US and CPW discovery links above when reacquiring those inputs; record the newly selected dataset version and endpoint. Do not claim the October 2026 service snapshot is an immutable statewide release.

## Observations (S8)

Three coordinates were supplied directly by the user and preserved without moving them to convenient trails or water features. Observations were dated October 2025. The observations themselves are withheld from this public repository (ADR 0001). East Portal was confirmed as the parking origin. These are user reports, not independently verified survey records. The 2027 occupancy assumption is separate from those historical observations.

## Runtime feature inventory

| File | Features |
|---|---:|
| `anchors.geojson` (reference copy; origin only) | 1 |
| `observations.geojson` (rebuild copy; withheld) | 0 |
| `boundary.geojson` | 1 |
| `campgrounds.geojson` | 2 |
| `candidates.geojson` | 16 |
| `contours_40ft.geojson` | 1002 |
| `gmu_boundaries.geojson` | 4 |
| `ownership.geojson` | 12 |
| `roads.geojson` | 1065 |
| `trailheads.geojson` | 7 |
| `trails.geojson` | 117 |
| `water.geojson` | 1374 |

## Software and rebuild guidance

- **S9:** [Matt Pocock skills reviewed snapshot](https://github.com/mattpocock/skills/tree/5beb35b040e3de97e54fa9e386d7e42d15c295c2). Exact skill links are in REBUILD_HANDOFF.md. This source supports workflow recommendations only.
- **S10:** [Leaflet 1.9.4](https://github.com/Leaflet/Leaflet/tree/v1.9.4). Its BSD 2-Clause license is retained under `public/vendor/`.

## Attribution and provenance limits

The bundled `method.json` and Python reference implementation define the custom heuristic model. No source above endorses its weights, thresholds, candidate rankings, travel feasibility or hunting outcomes. References to files absent from this export are historical processing metadata, not missing app runtime requirements. Dataset-specific attribution and terms remain separate from any application-code license.
