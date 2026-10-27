# 10: Observations and private build

**What to build:** The public atlas has no observation UI at all. A private build adds the owner's observations back from the git-ignored folder and shows them as evidence. CI checks that the public build can never ship them.

**Blocked by:** 04 (Evidence layers), 06 (Candidate list and detail)

**Status:** ready-for-agent

- [x] With zero observations, the observation legend entry, the "your locations" focus control and the observations list section don't render. Nothing is shown disabled.
- [x] The `dev:private` and `build:private` modes put the git-ignored private observations file in place of the empty one, using a small Vite plugin. The public build and CI never read the private folder.
- [x] In the private build, observations are styled as evidence, clearly separate from candidates in the map, legend and list, and a focus control fits the map to them.
- [x] Candidates' "observed at candidate" field doesn't change because of the build mode.
- [x] CI checks the public build output: the observations collection is empty, and no file in it contains the CalTopo map ID.
- [x] Playwright, public build: no observation UI is present. Private build, run locally only and never in CI: observations render and the focus control works.

## Comments

**Built and verified locally.** The full CI sequence passes: data check, type check, 129 Vitest tests (4 new), build, the new public build check, and 62 Playwright tests (2 new). The private build's 3 Playwright tests pass against `dist-private/`. The check was also proven to fail: on the private build output ("ships 3 observations"), and on planted fake CalTopo links and IDs in `dist/`.

- **Private mode** (`vite.config.ts`). A small `private-observations` plugin applies only under `--mode private`. The dev server answers `data/observations.geojson` from `private/` ahead of the public folder, and the build copies the private file over the empty one after writing. Private builds go to `dist-private/` (git-ignored), so they can never be the `dist/` that deploys. A missing private file stops the build with an error. Scripts: `dev:private`, `build:private`, `test:e2e:private`.
- **Data.** Observations are now typed: a unique non-empty `id` and `name`, and optional `observed` and `note`. Any problem is still only a warning, and the atlas then carries none. The unit tests use made-up observations, never the real ones.
- **UI.** All three pieces are gated on `atlas.observations.length > 0` and are absent, not disabled, in the public build:
  - map: green diamond markers in their own pane between points and candidates, with a tooltip and no tab stop
  - legend: "Observation · your field evidence"
  - focus control: an "Observations" button beside Legend (accessible name "Fit map to observations"), fitting with 70 px padding and up to zoom 15 like the reference
  - list section: OBSERVATIONS under the candidate list, with ID, name, date and note, and no rank, score or field status
- **CI** (`scripts/check-public-build.mjs`, the "Public build check" step after Build). It reads `dist/` only: the collection the manifest names must be empty, and no file (binary included) may contain a `caltopo.com/m/` or `/map/` link. The optional `CALTOPO_MAP_ID` secret adds a search for the bare ID, which is never printed. Without the secret the bare ID isn't checked, so it's worth adding.
- **Observed at candidate.** It's read only from `candidates.geojson`, never derived from observations. The private test proves the private build serves that file byte for byte as committed, with all 16 values `false`.
- **Private tests** (`tests/e2e-private/`, `playwright.private.config.ts`). The config throws if `CI` is set. It serves `dist-private/` on port 4183 and never reuses a running server. An earlier run reused a public preview another session had left on a shared port and tested the wrong build. The tests name observations by ID only.
- **Watch (12):** after the focus control fits, the open legend can cover an observation in the map's lower left. The fit padding doesn't allow for the legend.
