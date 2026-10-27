# 03: Data to map

**What to build:** The core path through the app, end to end. The real manifest and candidates load and are validated. The map draws the wilderness boundary, one raster layer and the 16 candidate markers. Clicking a marker opens a basic detail card for that candidate. If the essential data is missing or invalid, a full-screen error names the file and the problem.

**Blocked by:** 02 (Deployed skeleton)

**Status:** ready-for-agent

- [x] The data module loads the manifest, candidates, observations and method through an injected fetch function. It returns either a validated, read-only atlas or a typed error naming the file, the record and the problem. Types are derived from Zod 4 schemas, and fields it doesn't recognise are kept.
- [x] Validation enforces every assertion from the reference package's data check, as Vitest tests with fixed expected values: 16 unique candidates, six in the Nearby pool, scores consistent with the weights within the rounding tolerance, `[lon, lat]` order, raster bounds order, component and index ranges, canopy values 0–100 or 255 for NoData, 40-ft contours, and the scout order EP-04, EP-05, EP-03, EP-01, EP-06, EP-02.
- [x] Validation fails with a specific message if a candidate's pool, nearby budget flag and minimum round trip disagree.
- [x] Malformed fixtures each produce a specific error: swapped coordinates, a duplicate ID, an out-of-range component, a manifest URL from the site root, and a missing candidates file.
- [x] The map adapter creates the Leaflet map once, removes it on unmount, and takes commands through a narrow interface (layers, candidates, selection, fit to an extent) with event callbacks. It isn't re-created when React re-renders.
- [x] The boundary, one raster overlay (with Leaflet-order bounds) and the candidate markers render over the correct geography.
- [x] Clicking a marker opens a detail card showing the candidate's ID, name, scouting index as "N / 100" and its pool.
- [x] Playwright: the map renders and selecting a candidate opens its card. With the manifest or candidates request blocked, the fatal error screen appears and names the file.

## Comments

**Built and verified locally.** The full CI sequence passes: data check, type check, 31 Vitest tests, build, and 8 Playwright tests (the 2 smoke tests plus 6 new ones).

- **Data module** (`src/atlas/`). `loadAtlas(source)` takes a `DataSource` (an injected fetch and the base URL every manifest URL resolves against) and returns `{ ok: true, value }` or `{ ok: false, error: { file, record?, problem } }`. The atlas is deep-frozen and typed `DeepReadonly`. The schemas are Zod 4 `looseObject`s, so fields the atlas doesn't use yet pass through unchanged.
- **Snapshot facts versus contracts.** The validator enforces contracts that hold for any data release: ranges, `[lon, lat]` order, bounds order, unique IDs, weighted scores, nearby agreement, scout order following the minimum round trip, and selection thresholds. The counts that belong to this snapshot (16 candidates, six Nearby, the scout order EP-04 … EP-02, canopy year 2025, 642 × 833 pixels) are fixed expectations in the tests, as the reference check's own message intends ("update expected fixtures deliberately").
- **Thresholds come from the data.** The score weights and the canopy, slope, water and access limits come from `method.json`. The six-mile budget comes from `manifest.constraints`. The weights must sum to 1, and a test pins them at .35/.25/.25/.15.
- **Method is essential; observations are not.** Candidates can't be validated without the method's weights, so a method failure counts as "candidates can't validate" and shows the fatal screen. That reading stays within user story 57. An unreadable observations file is a warning: the atlas loads with no observations and the map shows a notice.
- **Loaders ahead of 04/05.** `loadGeoJsonLayer` (with the 40 ft contour check) and `loadCanopyGrid` (decoded bytes, 0–100 or 255) exist because this ticket's validation list covers contours and canopy. Ticket 04 adds per-layer state on top of them, and ticket 05 samples the decoded pixels.
- **Map adapter** (`src/map/mapAdapter.ts`). `setLayers` / `setCandidates` / `select` / `fitTo` / `destroy`, plus an `onCandidateClick` callback. `MapView` creates it in a mount-only effect and forwards the callback through `useEffectEvent`, so a new handler never re-creates the map. Playwright tags the live `.leaflet-container` before selecting and checks the tag survives. StrictMode's mount, unmount and remount in dev leaves one map, 16 markers and no console errors.
- **Keyboard activation.** Leaflet gives keyboard markers `role="button"` and a tab stop but doesn't activate a `divIcon` from the keyboard. The adapter handles Enter and Space, and each marker's accessible name is its full ID, name and index.
- **Watch (06):** at the wilderness-wide fit, JP-01, JP-09, JP-10 and EP-01–03 are partly covered by neighbouring markers, as in the reference. They're still reachable by keyboard (a test opens JP-01 that way), and the list in 06 gives full access.
- **Leaflet CSS is unlayered**, so it beats Tailwind's layered utilities. The container's background and font are overridden by an unlayered `.leaflet-container.atlas-map` rule.
- **Bundle** is 483 kB of JS (145 kB gzipped). Zod and Leaflet account for most of it. There's no size budget yet.
