Status: ready-for-agent

# Spec: React + TypeScript + Tailwind rebuild of the James Peak Scouting Atlas

## Problem Statement

The James Peak Scouting Atlas works, but it's a single vanilla-JavaScript file. Its data contracts are implicit, its behaviour is untested, and it can't be published as it is. The owner wants it as a public portfolio piece, with source on GitHub and a live demo on GitHub Pages, that shows deliberate engineering judgement rather than "the same interface moved into React."

Five things stand in the way:

- **Privacy.** The bundle contains the owner's personal field observations at about 1 m precision (an active wallow and camera detections), plus a CalTopo link and a preview image that reveal them. Anything committed to a public repo stays in its history for good.
- **Ambiguity in the current interface.** The All list interleaves the two pools' rankings, so the order isn't really a score ranking. Two darkness toggles show the same image. "Nearby" is defined three ways in the data and the code. And "status" means two unrelated things: the data's own `status` and the owner's field status.
- **Silent failure.** A raster that fails to load can leave a checked control that looks like it works. Export ignores the search and status filters without saying so. A failed save to browser storage isn't reported.
- **No verification.** The GPX export has never been checked end to end. There's no CI, no lockfile, and no reproducible public build.
- **No portable state.** A view can't be shared as a link. The field log is tied to one browser origin and can't be moved to another.

## Solution

Rebuild the atlas as a Vite + React 19 + strict TypeScript + Tailwind v4 static site. The rebuild keeps the bundled GIS data, scores and methodology byte-for-byte unchanged, apart from removing the observations. It's built and deployed from a fresh public GitHub repository to GitHub Pages by one GitHub Actions workflow.

For the owner and for visitors:

- **One honest public atlas.** The public site and repo ship no observations. The interface works as a complete product without them, and there's no trace of where they used to be. A separate private build adds the owner's observations back for personal use.
- **Explicit ranking.** A visible Sort control offers Scout order, Scouting index, or a single component. Each card shows its pool and pool rank as a label, separate from its position in the list. All sorts across both pools, not interleaved.
- **Failure you can see and fix.** Each layer control shows whether it's loading, ready or failed, and a failed layer offers a Retry.
- **What you see is what you export.** Export covers exactly the visible list and includes the field log, and every format is verified by parsing a real downloaded file.
- **Shareable views.** The URL carries the selected candidate, scope and sort.
- **A durable field log.** It's versioned and validated, never deleted silently, and reports when a save fails. It can be exported and imported as JSON.
- **An accessible list.** Every candidate can be reached and fully inspected without touching the map, targeting WCAG 2.2 AA.
- **A side-by-side comparison.** The original app is deployed next to the rebuild as a baseline. It's stripped of observations but otherwise unmodified.

The visual design is ported faithfully into Tailwind theme tokens (forest green, amber accents, field-atlas typography) so the before-and-after comparison is about engineering, not restyling.

## User Stories

### Viewing the map

1. As the atlas owner, I want the map to open on the wilderness boundary with terrain visible, so that I recognise the area immediately.
2. As a visitor, I want every map layer served from the site itself, with no third-party tile dependency, so that the atlas works the same wherever it's hosted.
3. As the atlas owner, I want independent controls for trails, roads, developed campgrounds, trailheads, the wilderness boundary, ownership and GMUs, so that I can build the view I need.
4. As the atlas owner, I want the official 2022 USGS topo raster and a separate layer of derived 40-ft contour lines, so that I can read the terrain either way.
5. As the atlas owner, I want a canopy cover layer (0–100%), so that I can judge overhead cover.
6. As the atlas owner, I want the mapped water classes and the low-water suitability overlay, so that I can plan around water in a dry scenario.
7. As the atlas owner, I want a single darkness layer labelled "Darkness: distance from access (0–2,000 m)" with a legend in metres, so that I'm never misled into thinking it's a 0–100 score surface.
8. As the atlas owner, I want an overlay strength control, so that the evidence layers don't hide the terrain beneath them.
9. As the atlas owner, I want the Terrain, Low water and Quiet cover presets, so that I can switch to a common view in one click.
10. As the atlas owner, I want a preset to change only which layers are shown, never the scores or candidates, so that the presets can't be mistaken for re-running the model.
11. As the atlas owner, I want a legend listing what's currently on the map, so that I can interpret colours and symbols.
12. As the atlas owner, I want the contour layer to say when contours appear only at closer zoom, so that I don't think the layer is broken.
13. As the atlas owner, I want the cursor's WGS84 coordinates shown, so that I can cross-reference other tools.
14. As the atlas owner, I want focus buttons for the Wilderness and East Portal, so that I can jump to either extent.

### Inspecting canopy

15. As the atlas owner on a desktop, I want to hover anywhere on the map and read the canopy percentage under the cursor, so that I can check cover precisely.
16. As the atlas owner on a phone, I want to tap the map and read the canopy percentage at that point, so that I can inspect canopy without a mouse.
17. As the atlas owner, I want missing canopy shown as "No data", never as 0% or 255%, so that missing data isn't mistaken for open ground.
18. As the atlas owner, I want the inspector to say it reads the ~30 m display grid, which can differ from a candidate's modelled canopy, so that I don't think one of them is wrong.

### Candidates and the list

19. As the atlas owner, I want candidates and observations to look clearly different on the map, in the legend and in the list, so that I never mistake a hypothesis for evidence.
20. As the atlas owner, I want a Nearby / All scope switch, so that I can focus on what I can reach from the origin.
21. As the atlas owner, I want Nearby to show exactly the Nearby pool's six candidates, so that "nearby" means what the model decided.
22. As the atlas owner, I want Nearby to default to scout order (EP-04, EP-05, EP-03, EP-01, EP-06, EP-02), so that the list reads as a practical visiting plan.
23. As the atlas owner, I want a Sort control with Scout order (Nearby only), Scouting index, and Component (water, shelter, darkness or security), so that I can rank candidates the way I'm thinking about them.
24. As the atlas owner, I want All to default to sorting by scouting index across both pools, so that the order is a true ranking and not interleaved pool ranks.
25. As the atlas owner, I want each card to show its pool and pool rank as a label (for example "Nearby #2"), separate from its list position, so that rank and order are never confused.
26. As the atlas owner, I want to search candidates by ID or name, so that I can find one quickly.
27. As the atlas owner, I want to filter the list by field status, so that I can see what's left to scout.
28. As the atlas owner, I want each card to show its minimum round trip, labelled as a straight-line lower bound with the route unverified, so that I never treat it as hike distance.
29. As the atlas owner, I want Wilderness context candidates labelled as beyond the six-mile minimum and for context only, so that I don't plan a trip to them by mistake.
30. As the atlas owner, I want to select a candidate from the list or the map and see the same selection in both, so that the two views stay in sync.
31. As the atlas owner, I want the map to pan to a candidate when I select it in the list, so that I see its surroundings.

### Candidate detail

32. As the atlas owner, I want a selected candidate's detail panel to show its scouting index, the four component bars, raw metrics, rationale, cautions, field checks, route status and location, so that I can judge it from evidence.
33. As the atlas owner, I want the scouting index shown as "72 / 100" with no percent sign or probability language, so that it's never read as odds.
34. As the atlas owner, I want a note that a weighted sum lets a strong component make up for a weak one, so that I check the component bars before trusting the total.
35. As the atlas owner, I want exact vector distances and raster-estimated values labelled as such in the detail, so that I understand why figures can differ slightly.
36. As the atlas owner, I want to set a candidate's field status (To scout, Scouted, Camera placed, Ruled out) and write notes from its detail panel, so that I can record field work where I'm looking.
37. As the atlas owner, I want closing the detail panel to return focus to the card or marker that opened it, so that keyboard use isn't disrupted.

### Field log

38. As the atlas owner, I want my field status and notes to survive a reload, so that my field work is kept.
39. As the atlas owner, I want a clear message if my field log can't be saved (for example in private mode or when storage is full), so that I don't lose notes without knowing.
40. As the atlas owner, I want an unreadable saved field log to be backed up and reported rather than deleted, so that a format change can never destroy my notes.
41. As the atlas owner, I want to export my field log as JSON and import it in another browser or on another site, so that my notes can move with me.
42. As the atlas owner, I want an import that contains unknown candidate IDs or invalid values to be reported clearly rather than partly applied, so that I know exactly what was imported.
43. As the atlas owner, I want Reset log to ask for confirmation, say how many entries it will clear, and offer to export first, so that I can't wipe my field log by accident.

### Export

44. As the atlas owner, I want to export the visible list as GeoJSON, GPX or CSV, so that I can take candidates into map apps, GPS devices or a spreadsheet.
45. As the atlas owner, I want the export menu to say how many candidates it will export (for example "Export 4 shown"), so that I know the search, filters and scope apply.
46. As the atlas owner, I want each exported candidate to include its field status and notes, so that the file carries my field work.
47. As the atlas owner, I want GPX waypoints to be valid XML even when my notes contain `&`, `<` or quotes, so that my GPS device accepts the file.
48. As the atlas owner, I want CSV cells that start with `=`, `+`, `-` or `@` neutralised, so that opening the export in a spreadsheet can't run a formula.
49. As the atlas owner, I want exported coordinates in `[longitude, latitude]` order for GeoJSON and as lat/lon attributes for GPX, at consistent precision, so that every tool places them correctly.
50. As the atlas owner, I want exports to contain no observations, base rasters or routes, and GPX to contain waypoints only, so that the files contain only what I expect.

### Shareable views

51. As the atlas owner, I want the URL to carry the selected candidate, scope and sort, so that a link reopens the same view.
52. As a visitor, I want to open a shared link and land on that candidate with its detail open, so that I see what was shared.
53. As a visitor, I want a link with an unknown candidate ID or invalid scope or sort to open the default view with a short notice, so that a broken link isn't a dead end.
54. As the atlas owner, I want layer changes not to rewrite the URL, so that the browser's back button stays useful.

### Failure and resilience

55. As the atlas owner, I want each layer control to show loading, ready or failed, so that I always know what's really on the map.
56. As the atlas owner, I want a failed layer to switch its control off and show a short reason with a Retry button, so that I can recover without reloading.
57. As the atlas owner, I want a full-screen error only when the manifest or candidates can't load or validate, so that one missing layer never takes down the whole atlas.
58. As the atlas owner, I want a data validation failure to name the file and the problem (for example "candidates feature 7: coordinates look like [lat, lon]"), so that a data defect is easy to diagnose.
59. As a maintainer, I want validation to fail if the candidates' pool, nearby budget flag and minimum round trip disagree about what "nearby" means, so that the three definitions can't drift apart.

### Observations (private build only)

60. As a visitor to the public site, I want no observation UI at all (no legend entry, no "your locations" control, no observations list section), so that the atlas doesn't hint at removed data.
61. As the atlas owner, I want a private build that adds my observations from a git-ignored file, so that my personal copy still shows them.
62. As the atlas owner, I want observations in the private build shown as evidence, clearly separate from candidates, with a focus control that fits the map to them, so that my personal copy matches how I think about the field.
63. As the atlas owner, I want the public build verified in CI to contain zero observations and no CalTopo reference, so that a mistake can't publish them.

### Method, sources and honesty

64. As a visitor, I want a Method and sources dialog that sets out the formulas, weights, thresholds, scenario and limitations from the bundled method specification, so that I can see exactly how candidates were chosen.
65. As a visitor, I want the weights and thresholds described as unvalidated planning heuristics, so that I don't mistake the atlas for a predictive model.
66. As a visitor, I want the dataset sources and vintages cited, with the links working, so that I can check the evidence.
67. As a visitor, I want the scenario (2027 low water, occupancy assumed) visible in the header, so that I read everything in that context.

### Accessibility and mobile

68. As a keyboard user, I want to reach the scope, sort, search, filter, list and every candidate's detail without the map, so that the atlas is fully usable without a pointer.
69. As a screen-reader user, I want the list, detail panel, dialogs and status messages announced properly, so that I can use the atlas without seeing it.
70. As a keyboard user, I want visible focus everywhere and no focus traps outside dialogs, so that I always know where I am.
71. As a phone user at 390 px, I want the sidebar as a drawer and the detail panel over the map, matching the current atlas, so that the small-screen layout stays usable.
72. As a user with low vision, I want text and control contrast to meet WCAG 2.2 AA, so that I can read the atlas.

### Publication and the comparison

73. As a visitor, I want the live site at the repository's Pages subpath with every asset loading, so that the demo works.
74. As a visitor, I want the original atlas deployed under a reference subpath, with a note explaining that observations were removed and one control does nothing, so that I can compare before and after.
75. As a visitor, I want a README that explains the rebuild, links the live demo, shows a current screenshot, describes the architecture and decisions, and credits the AI-assisted baseline and the data sources, so that the engineering story is clear.
76. As a maintainer, I want a clean checkout to install from the committed lockfile and build on Node 24 LTS, so that the build is reproducible.
77. As a maintainer, I want every pull request to run the data check, type check, unit tests, build and browser tests, and every merge to main to deploy, so that main is always releasable.
78. As a maintainer, I want the app code MIT-licensed, with dataset terms and third-party notices kept separate, so that reuse rights are clear.
79. As a maintainer, I want the repository's first commit to contain no observation coordinates, names, CalTopo ID or old preview image, so that its history is clean from the start.

## Implementation Decisions

### Repository and publication

- **A fresh public repository**, `robdhyman/james-peak-atlas`, served by GitHub Pages at `/james-peak-atlas/`. Nothing is imported from the original hosted site's history.
- **The first commit is the stripped public bundle** (ADR 0001). Before `git init`:
  - Remove observations A1–A3 from the observation data.
  - Remove the CalTopo map link from the manifest, README and sources register, keeping the rest of source S8's provenance wording without the link.
  - Delete the preview image.
  - Redact the hard-coded observation tuples and the CalTopo line in the historical bundling script. The model-building script reads observations from an external file and holds only the public origin, so it ships unchanged.
  - Remove the package checksum file.
  - Acceptance: a search of the whole tree finds no observation coordinates, names or CalTopo ID.
- **The original app moves to a reference area of the repo**, stripped but otherwise unedited, and the CI build deploys it under a reference subpath. Its README moves with it, and a new root README tells the rebuild's story.
- **Node 24 LTS.** npm with a committed lockfile, and Node 24 pinned in the package's engines field and in CI.
- **One GitHub Actions workflow.** On a pull request it runs data check → type check → unit tests → build → browser tests. On main it does the same, then deploys to Pages with the official Pages deploy action.
- **App code is MIT.** Dataset terms and third-party notices stay as separate documents.

### Stack

- Vite, React 19, TypeScript in strict mode, and Tailwind v4 through its Vite plugin. No routing framework: this is a single screen.
- Vite's `base` is set to the Pages subpath, and every runtime data URL resolves relative to it, never from the site root.
- Leaflet 1.9.4 is installed from npm in place of the vendored copy, and driven only through the map adapter (ADR 0002). No `react-leaflet`.
- Zod 4 validates the data, and the TypeScript types are derived from the Zod schemas.
- No state-management library.

### Modules

There are six modules. The four pure ones make up the **atlas core**.

1. **Data** (pure). Loads the manifest, layers, candidates, observations, method and canopy grid through an injected fetch function, and returns either a validated, read-only atlas or a typed error naming the file, the record and the problem.
   - It enforces the data contracts: `[lon, lat]` order, raster bounds order, IDs unique across the 16 candidates, component and index ranges, weighted-score consistency within the rounding tolerance, and canopy values 0–100 or 255 for NoData.
   - It also checks that the candidates' pool, nearby budget flag and minimum round trip agree.
   - It keeps fields it doesn't recognise, and never changes the raw records.
   - Each layer loads on its own, with its own result, so one failed layer doesn't affect the others.
2. **Candidates** (pure). A selector computes the visible list from the atlas, scope, sort, search text, field-status filter and field log.
   - Scope **Nearby** means the Nearby pool, read from the pool field. **All** means both pools.
   - Sort options are *scout order*, available in Nearby only; *scouting index*, descending across everything in scope; and *component*, one of water, shelter, darkness or security, descending.
   - The default sort is scout order for Nearby and scouting index for All.
   - Ties break by pool rank, then by ID, so the order is stable.
   - Pool rank and list position are separate outputs.
   - This one selector feeds the list, the map markers and Export.
3. **Export** (pure). Serialisers turn the visible list plus the field log into GeoJSON, GPX (waypoints only) or CSV text.
   - The outputs are GeoJSON with `[lon, lat]`; GPX with lat/lon attributes, XML-escaped text, and waypoints only; CSV per RFC 4180, with cells beginning `=`, `+`, `-` or `@` neutralised.
   - Coordinates use the same precision throughout.
   - Exports never include observations.
   - Starting the download is the UI's job, not the serialisers'.
4. **Field log** (pure codec, plus a thin storage hook).
   - The codec turns a raw stored value into one of three results: a valid log, empty, or invalid with the raw value kept for backup.
   - It also encodes a log, and validates an import, which is applied all-or-nothing with a report.
   - Storage uses the key `jpa.fieldlog.v1`. An entry holds an optional field status, optional notes and an ISO update time, keyed by candidate ID.
   - The hook persists through an injected Storage. On an invalid read it writes the backup key and shows a warning. A failed write produces an error state the UI can show.
   - There's no migration from the original site's key, because browser storage belongs to one origin.
5. **Map adapter** (imperative). Creates the Leaflet map once per mount and removes it on unmount. It takes commands through a narrow interface: set the visible layers, set the overlay opacity, set the candidates and observations, select a candidate, fit to an extent. It reports events back through callbacks: candidate clicked, canopy probe at a point, layer image error. React never re-creates the map when the sidebar changes. Raster overlays use Leaflet-order bounds over images rendered in EPSG:3857.
6. **UI** (React). Holds UI state in one of four places, each chosen by how long the state needs to last:
   - **URL hash:** selected candidate, scope and sort. A missing or invalid value falls back to the default with a notice.
   - **A reducer at the app root:** which layers are on, overlay opacity, and each layer's state (loading, ready, or failed with a reason).
   - **The field-log hook.**
   - **The read-only atlas.**

   Components follow the glossary vocabulary.

### Data changes

- **Origin.** It moves out of the old anchors file into its own field in the manifest, holding a name and coordinates. The reference app's copy of the data keeps its original shape, so the reference app still runs.
- **Observations.** They become their own file, which the manifest points to. The public build ships it as an empty collection. A private build mode (`dev:private` / `build:private`) puts the git-ignored private file in its place, using a small Vite plugin. The public build and CI never read the private folder.
- **No other changes.** Every other GIS, candidate, method and provenance file stays byte-identical to the baseline.

### Interaction specifics

- **Darkness.** A single "Darkness: distance from access" layer replaces the two duplicate toggles. The candidate card keeps the separate 0–100 darkness component.
- **Layer failure.** A failed layer's control unchecks itself and shows the reason inline with a Retry button. Retrying reloads that layer only.
- **Presets.** Terrain, Low water and Quiet cover keep their current layer sets and only switch layers.
- **Hidden observation UI.** With zero observations, the observation legend entry, the "your locations" focus control and the observations list section don't render.
- **Canopy inspector.** It reads values on hover with a pointer and on tap with touch. NoData shows as "No data".
- **Reset log.** It opens a confirmation dialog that states how many entries will be cleared and offers to export first.
- **Copy.** UI text uses the glossary terms. The "Perfect spots", "Recon list" and "Your locations" labels are retired.
- **Visual design.** The current look is ported faithfully into Tailwind theme tokens.
- **Mobile.** The responsive layout matches the current atlas at 390 px.

## Testing Decisions

### What makes a good test

- It tests behaviour through a public interface, never internal state or helper functions.
- Its expected values are fixed and chosen independently of the code under test. For example, the scout order EP-04, EP-05, EP-03, EP-01, EP-06, EP-02 is written into the test. It never compares the implementation's output with a second run of the implementation.
- It names the failure mode it guards against.

### Seam 1: the browser (Playwright)

The built site runs in a real browser, served at the real Pages subpath. This is where each slice's acceptance evidence comes from. It covers:

- layers loading, and every control changing its intended layer
- presets
- keyboard reaching candidates without the map, and focus returning after the detail panel closes
- the URL hash reopening a view, and invalid links
- a layer failure forced by blocking its request, with Retry recovering it
- a fatal failure when the manifest or candidates are blocked
- the field log surviving a reload
- storage failure, simulated by making storage throw
- **real downloaded exports for all three formats, saved and parsed back**, including notes with special characters
- the public build containing zero observations and no CalTopo reference
- the 390 px layout, captured as screenshots

The map adapter and the React components are covered only through this seam.

### Seam 2: the atlas core (Vitest)

The four pure modules, through their public functions only:

- **Load and validate.** Fixtures are the real bundled data plus small malformed variants: swapped coordinates, a missing layer, a duplicate candidate ID, missing canopy, an out-of-range component, a manifest URL from the site root, and disagreeing nearby definitions. The assertions from the reference package check move here as tests.
- **Visible list.** Scope, each sort, tie-breaking, search, the field-status filter and its interaction with scope, and pool rank kept separate from position.
- **Serialisers.** XML escaping, CSV formula neutralisation and quoting, coordinate order and precision, field-log notes included, observations excluded.
- **Field-log codec.** Valid, empty and corrupt reads; backup on corruption; import of unknown IDs, invalid statuses and malformed JSON; a schema version change.

### No standing component-test layer

Testing Library component tests are not a standing layer. A component test is added only when Playwright can't reach a specific case cheaply.

### Prior art

The reference package's data and asset check script already holds independently chosen expectations for the snapshot: 16 candidates, six nearby, scores consistent with the weights, coordinate order, canopy decoding and 40-ft contours. The rebuild's data tests carry these over. The original browser QA covered layers, cards, the 390 px layout and log persistence, but the GPX download was never verified. These browser tests close that gap.

## Out of Scope

- Re-running or changing the GIS model, weights, thresholds or candidate selection, and any sensitivity analysis. A model change would be a separate data and model release.
- A true 0–100 darkness score overlay, which would need a new derived raster.
- The improved mobile detail sheet, the candidate comparison view, and a repeatable performance harness. These are deferred portfolio improvements.
- Users adding their own observations in the browser.
- Migrating field logs from the original hosted site's storage key. JSON import covers moving notes by hand.
- Offline support or a service worker.
- Routing, walking routes, cumulative ascent and road conditions.
- Replacing Leaflet, or using MapLibre or `react-leaflet`.
- A state-management library.
- Any change to the original private hosted site.

## Further Notes

- Decisions are recorded in ADR 0001 (withhold observations from the public build) and ADR 0002 (Leaflet behind a hand-written adapter). The vocabulary is in the root glossary.
- **The privacy rule for this tracker applies.** Refer to observations by ID only. Never write their coordinates or the CalTopo ID into this spec or into tickets.
- Implementation order follows the handoff's six slices, with stripping the public data bundle as ticket 01. The three chosen improvements fold into the slices they touch: sorting into candidate decisions, layer failure into evidence layers or resilience, and darkness into evidence layers.
- Tickets are worked one at a time with `/implement`, clearing context between tickets.
- Check current React, Tailwind, Vite, Zod, Leaflet and Pages-action compatibility against their official documentation at implementation time.
- Credit the AI-assisted baseline honestly in the README. The portfolio claim is the engineering judgement and execution in the rebuild.
