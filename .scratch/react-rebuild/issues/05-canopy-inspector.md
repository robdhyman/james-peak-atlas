# 05: Canopy inspector

**What to build:** A numeric canopy readout. It appears on hover with a pointer and on tap with touch, shows "No data" where data is missing, and says it reads the display grid.

**Blocked by:** 03 (Data to map)

**Status:** ready-for-agent

- [x] The canopy grid decodes as row-major bytes with row zero at the north edge, sampled at the projected position under the pointer. This is a pure function with Vitest tests at known pixels, including a NoData pixel and a valid 0%.
- [x] Hovering shows "Canopy N%". Tapping on a touch device shows the same readout at the tapped point.
- [x] A 255 value shows "No data", never 0% or 255%. Points outside the grid show nothing.
- [x] The readout notes that it reads the ~30 m display grid, which can differ from a candidate's modelled canopy.
- [x] Playwright: hovering a known point shows the expected value, and the touch emulation path shows the readout.

## Comments

**Built and verified locally.** The full CI sequence passes: data check, type check, 46 Vitest tests (15 new) and build, then 13 Playwright tests (5 new, in `tests/e2e/canopy.spec.ts`).

- **Sampler** (`src/atlas/canopy.ts`). `sampleCanopy(grid, { lat, lng })` projects to EPSG:3857 itself, so it doesn't depend on Leaflet. It returns `{ kind: 'cover', percent }`, `{ kind: 'nodata' }` or `null` off the grid. Each pixel is a half-open cell, so the east and south edges of the grid are outside it. The tests use a 3 × 2 grid with a NoData pixel and a valid 0%, and reach it through their own inverse projection rather than the sampler's. They also pin eight pixels of the real 2025 grid: the corners, and row 394, column 320 (31%) with its four different neighbours.
- **The real grid has no NoData pixels.** "No data" is checked in Playwright by serving a copy of the grid with every pixel set to 255.
- **Adapter event.** `MapEvents.onProbe(point | null)`: the point under the pointer or the last tap, or null once the pointer leaves the map. No layer method changed.
- **Leaflet's canvas renderer drops moves.** With `preferCanvas`, the renderer flags its `<canvas>` so the map ignores events from it. It then re-fires `mousemove` at most every 32 ms, so a move within that window is lost, including the last one before the pointer stops, and the readout would show the previous pixel. The adapter therefore listens for `mousemove` and `mouseleave` on the container itself and converts them with `mouseEventToLatLng`. Taps use the map's `click`, which skips markers and controls. The listeners are removed in `destroy`, so StrictMode's remount on the same element leaves no stale handler. A Playwright test makes back-to-back moves to catch a regression.
- **Readout** (`src/ui/CanopyReadout.tsx`). It loads the grid through `loadCanopyGrid` on its own, so it doesn't wait on 04's layer state. It shows "Canopy N%" or "Canopy: No data" with the note "Reads the ~30 m display grid; a candidate's modelled canopy can differ." There's nothing while no point is set or the point is off the grid. If the grid fails to load, a probe shows "Canopy readout unavailable"; the rest of the atlas is unaffected. `App.tsx` gains two imports and three lines inside `AtlasMap`.
- **Placement.** Top-right, at the candidate card's width and above it. The legend from 04 goes bottom-left and notices sit top-left. Below 1100 px the card narrows and the note wraps to three lines, so the readout moves up to 12 px from the top to clear the card. It sits under the card in z-order, so wider fonts let the card cover it rather than the other way round. On phones it spans the top of the map. It has `pointer-events: none`, so it never blocks hover.
- **Not a live region.** Hovering would announce every pixel, so the readout is a named region (`Canopy readout`) and not `role="status"`. Ticket 12's usability pass may revisit this for screen-reader users who tap.
- **Watch (12):** on a phone, the top-left notice (shown only when observations or a layer fail) and the readout share the top edge, so the readout can cover the notice.
- **Playwright geometry.** Tests find screen positions through the hillshade overlay's box and its manifest bounds, without reaching into Leaflet. They zoom until a grid pixel is at least 8 screen pixels across: a pointer test double-clicks the known point, which keeps it on screen, and the touch test uses the zoom control. Each zoom step waits until the overlay has doubled in width and held still for three reads. A check that only compared two reads could pass before the animation had started.

**After merging with 04 and 06.** The branch predated 04's Legend button, which also sits top-right, so the readout covered it while the pointer was on the map. The readout and the button now share one top-right row in `App.tsx`, with the readout left of the button: at the card's width on desktop, raised 8 px below 1100 px, and filling the row on phones. A Playwright test at 1440, 1000 and 390 px checks the readout ends left of the button.
