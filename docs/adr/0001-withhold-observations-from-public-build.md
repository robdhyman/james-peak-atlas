# Withhold personal observations from the public build

The atlas is published as a public GitHub repository and a public GitHub Pages site. The original bundle includes three personal field observations (A1–A3: a trailhead sign, an active wallow and camera detections) at roughly 1 m precision. Those are hunting intel, and anything committed stays in git history even after it's deleted. So the public repo and site ship **no observations**. The real points stay in git-ignored `private/`. East Portal (a public parking lot) remains the access origin.

## Consequences

- The CalTopo map link, `atlas-preview.jpg`, and the coordinates in the historical `docs/reference/` scripts are stripped or omitted **before the first commit**, not after.
- The UI must work as its own product state with zero observations: legend, list and the "your locations" focus control.
- Candidate positions are unchanged. They were selected at least 250 m from the observations, which leaves a faint, accepted trace: among 1,255 qualifying cells, the gaps don't realistically reveal the points.
- Observations are an optional data file. The public build ships an empty `observations.geojson`. A separate private build (`dev:private` / `build:private`) puts `private/observations.geojson` in its place, and CI never reads `private/`. A check on the public `dist/` confirms it ships zero observations.
- With zero observations, the observation UI (legend entry, focus control, list section) is hidden, not disabled.
