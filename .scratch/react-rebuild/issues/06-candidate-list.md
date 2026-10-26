# 06: Candidate list and detail

**What to build:** The candidate list with Nearby / All scope, an explicit sort control and search, kept in sync with the map. Selecting a candidate opens the full evidence detail panel, and focus returns correctly when it closes.

**Blocked by:** 03 (Data to map)

**Status:** ready-for-agent

- [ ] One visible-list selector (atlas, scope, sort, search) is the only source for both the list and the map markers. Nearby means the Nearby pool, read from the pool field. All means both pools.
- [ ] Sort options: Scout order (Nearby only), Scouting index (descending), Component (water, shelter, darkness or security; descending). The default is Scout order for Nearby and Scouting index for All. Ties break by pool rank, then by ID.
- [ ] Each card shows a pool and pool-rank label (for example "Nearby #2"), separate from its list position. It also shows its minimum round trip labelled as a straight-line lower bound with the route unverified. Wilderness context cards say they are beyond the six-mile minimum and for context only.
- [ ] Search matches ID or name.
- [ ] Selecting from the list highlights the marker and pans to it. Selecting a marker highlights the card.
- [ ] The detail panel shows the scouting index as "N / 100", the four component bars, raw metrics, rationale, cautions, field checks, route status and location, plus the note that a weighted sum lets one component make up for another. Exact vector values and raster-estimated values are labelled as such.
- [ ] Closing the detail panel returns focus to the card or marker that opened it.
- [ ] UI copy follows the glossary. "Perfect spots" and "Recon list" are retired.
- [ ] Vitest tests the selector with fixed expected orders for each scope and sort, tie-breaking and search.
- [ ] Playwright: the Nearby default order matches the scout order, the All default order matches the index order, a keyboard user can reach a card and open and close its detail with focus returning, and list and map selection stay in sync.
