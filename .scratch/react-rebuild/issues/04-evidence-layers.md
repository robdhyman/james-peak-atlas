# 04: Evidence layers

**What to build:** Every map layer as a working control, with the legend, the overlay strength slider and the three presets. There's a single darkness layer measured in metres, and each layer shows its own loading, ready or failed state, with Retry for a failure.

**Blocked by:** 03 (Data to map)

**Status:** ready-for-agent

- [ ] Ground and access controls: trails, roads, developed campgrounds, trailheads, wilderness, ownership, GMUs. Habitat evidence controls: USGS topo, derived 40-ft contours, hillshade, canopy, water, low-water suitability, darkness, and the score layers. Each control switches only its own layer.
- [ ] One "Darkness: distance from access (0–2,000 m)" layer replaces the two duplicate toggles, and its legend is in metres.
- [ ] The legend lists what's currently shown, and the contour layer says when contours only appear at closer zoom.
- [ ] The overlay strength slider changes opacity on the evidence overlays only.
- [ ] The Terrain, Low water and Quiet cover presets keep their current layer sets. They switch layers only and never change scores or candidates.
- [ ] The UI state reducer tracks each layer's state: loading, ready, or failed with a reason. A failed layer's control unchecks itself, shows the reason inline and offers Retry, which reloads that layer only.
- [ ] One layer failing never triggers the full-screen error.
- [ ] Playwright: each control toggles its intended layer, each preset sets the expected layers, and no request goes to an external tile server. A blocked layer request shows the failed state, and lifting the block then pressing Retry recovers it.
