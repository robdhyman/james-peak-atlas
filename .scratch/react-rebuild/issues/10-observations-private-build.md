# 10: Observations and private build

**What to build:** The public atlas has no observation UI at all. A private build adds the owner's observations back from the git-ignored folder and shows them as evidence. CI checks that the public build can never ship them.

**Blocked by:** 04 (Evidence layers), 06 (Candidate list and detail)

**Status:** ready-for-agent

- [ ] With zero observations, the observation legend entry, the "your locations" focus control and the observations list section don't render. Nothing is shown disabled.
- [ ] The `dev:private` and `build:private` modes put the git-ignored private observations file in place of the empty one, using a small Vite plugin. The public build and CI never read the private folder.
- [ ] In the private build, observations are styled as evidence, clearly separate from candidates in the map, legend and list, and a focus control fits the map to them.
- [ ] Candidates' "observed at candidate" field doesn't change because of the build mode.
- [ ] CI checks the public build output: the observations collection is empty, and no file in it contains the CalTopo map ID.
- [ ] Playwright, public build: no observation UI is present. Private build, run locally only and never in CI: observations render and the focus control works.
