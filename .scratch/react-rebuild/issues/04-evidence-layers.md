# 04: Evidence layers

**What to build:** Every map layer as a working control, with the legend, the overlay strength slider and the three presets. There's a single darkness layer measured in metres, and each layer shows its own loading, ready or failed state, with Retry for a failure.

**Blocked by:** 03 (Data to map)

**Status:** ready-for-agent

- [x] Ground and access controls: trails, roads, developed campgrounds, trailheads, wilderness, ownership, GMUs. Habitat evidence controls: USGS topo, derived 40-ft contours, hillshade, canopy, water, low-water suitability, darkness, and the score layers. Each control switches only its own layer.
- [x] One "Darkness: distance from access (0–2,000 m)" layer replaces the two duplicate toggles, and its legend is in metres.
- [x] The legend lists what's currently shown, and the contour layer says when contours only appear at closer zoom.
- [x] The overlay strength slider changes opacity on the evidence overlays only.
- [x] The Terrain, Low water and Quiet cover presets keep their current layer sets. They switch layers only and never change scores or candidates.
- [x] The UI state reducer tracks each layer's state: loading, ready, or failed with a reason. A failed layer's control unchecks itself, shows the reason inline and offers Retry, which reloads that layer only.
- [x] One layer failing never triggers the full-screen error.
- [x] Playwright: each control toggles its intended layer, each preset sets the expected layers, and no request goes to an external tile server. A blocked layer request shows the failed state, and lifting the block then pressing Retry recovers it.

## Comments

**Built and verified locally.** The full CI sequence passes: data check, type check, 33 Vitest tests, build, and 15 Playwright tests (the 8 from 02–03 plus 7 new ones). The browser suite also passed three times over with `--repeat-each=3`.

- **Layer state** (`src/ui/layerState.ts`). The catalogue lists all 17 controls in the ticket's groups, with the reference atlas's swatch colours. A reducer at the loaded atlas's root holds which layers are on, the overlay strength, the active preset, and each layer's status (`idle`, `loading`, `ready`, or `failed` with a reason). Each layer also has an `attempt` counter. Switching on a layer that's idle or failed starts a new attempt, and any load result from an earlier attempt is ignored. A failure always sets `on: false`, so the control can't stay checked over nothing.
- **Who reports a layer's status.** GeoJSON layers are fetched on demand through `loadGeoJsonLayer` the first time they're switched on, and that promise reports their status. Rasters load as `<img>` inside Leaflet, so the adapter reports them through `onLayerLoad` and `onLayerError`. Each event carries the layer spec's `revision`, which is the attempt number. A Retry therefore builds a fresh overlay and a fresh image request. A Playwright test checks that exactly one request for the image is made.
- **Adapter changes.** `setLayers` now compares layers by source (kind, revision, and URL or data), not by object identity. A layer that's switched off keeps its Leaflet object, so switching the 1.9 MB contour layer off and on doesn't rebuild it. `setOverlayOpacity` applies only to rasters without a fixed opacity: canopy, darkness and the score layers. Hillshade stays at 0.9 and the USGS topo at 1. The adapter writes what Leaflet is actually drawing to `data-drawn-layers` on the map element. Playwright compares this against the controls, because vector layers draw into a shared canvas per pane and can't be told apart in the DOM.
- **Styles** (`src/map/layerStyles.ts`). The reference's panes, path styles, zoom-dependent contour styling and point markers (P, △ and ≈) are ported unchanged. Minor 40 ft contours are hidden below zoom 13, as before, and index-contour elevation labels are drawn at zoom 13 and closer.
- **Darkness.** One control, labelled "Darkness: distance from access (0–2,000 m)", with a legend reading 0 m to 2,000+ m. The manifest's `darkness_score` entry (the same image under a 0–100 name) has no control. The candidate card's 0–100 darkness component is untouched. `water_score` is labelled "Low-water suitability", following the ticket and user story 6. Every other control uses the manifest's own label.
- **Legend.** It lists the layers that are on and ready, in control order, plus the two candidate marker types. Ramps for canopy, darkness and the score layers come from the manifest's `legend` fields. The schema now accepts only `#rrggbb` colours there, because they're written into an inline CSS gradient, and two Vitest cases cover it. The contour entry says "Only the 200 ft lines show at this zoom. Zoom in to see every 40 ft contour." until the map reaches zoom 13. On a phone the legend gives way to an open detail card, as in the reference.
- **Presets** keep the reference's sets exactly (base layers plus contours, plus contours and low-water suitability, or plus canopy and darkness) and only dispatch layer changes. A preset that includes a failed layer tries it again. Changing any single control clears the preset's pressed state.
- **No full-screen error for a layer.** The boundary is now an ordinary layer with its own failed state, and the map notice from 03 shows only atlas warnings (unreadable observations).
- **In passing:** Leaflet's unlayered `.leaflet-tooltip` styles were overriding the candidate tooltip's layered styles from 03. Tooltip rules now sit outside `@layer`, next to the `.leaflet-container` override.
- **Not ported (watch 12 / follow-up):** the reference's feature popups on trails, roads, water and campgrounds. These carry access and honesty notes such as "Road geometry does not establish Mazda 3 access." Point markers show their name on hover but open nothing, and they're kept out of the tab order. The failure message is `role="status"` inline, and screen-reader announcement timing is left for 12.
- **Bundle** is 498 kB of JS (150 kB gzipped).

