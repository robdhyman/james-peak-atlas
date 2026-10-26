# 03: Data to map

**What to build:** The core path through the app, end to end. The real manifest and candidates load and are validated. The map draws the wilderness boundary, one raster layer and the 16 candidate markers. Clicking a marker opens a basic detail card for that candidate. If the essential data is missing or invalid, a full-screen error names the file and the problem.

**Blocked by:** 02 (Deployed skeleton)

**Status:** ready-for-agent

- [ ] The data module loads the manifest, candidates, observations and method through an injected fetch function. It returns either a validated, read-only atlas or a typed error naming the file, the record and the problem. Types are derived from Zod 4 schemas, and fields it doesn't recognise are kept.
- [ ] Validation enforces every assertion from the reference package's data check, as Vitest tests with fixed expected values: 16 unique candidates, six in the Nearby pool, scores consistent with the weights within the rounding tolerance, `[lon, lat]` order, raster bounds order, component and index ranges, canopy values 0–100 or 255 for NoData, 40-ft contours, and the scout order EP-04, EP-05, EP-03, EP-01, EP-06, EP-02.
- [ ] Validation fails with a specific message if a candidate's pool, nearby budget flag and minimum round trip disagree.
- [ ] Malformed fixtures each produce a specific error: swapped coordinates, a duplicate ID, an out-of-range component, a manifest URL from the site root, and a missing candidates file.
- [ ] The map adapter creates the Leaflet map once, removes it on unmount, and takes commands through a narrow interface (layers, candidates, selection, fit to an extent) with event callbacks. It isn't re-created when React re-renders.
- [ ] The boundary, one raster overlay (with Leaflet-order bounds) and the candidate markers render over the correct geography.
- [ ] Clicking a marker opens a detail card showing the candidate's ID, name, scouting index as "N / 100" and its pool.
- [ ] Playwright: the map renders and selecting a candidate opens its card. With the manifest or candidates request blocked, the fatal error screen appears and names the file.
