# 14: Feature popups

**What to build:** Clicking a mapped trail, road, water feature, trailhead or campground opens a short popup naming it, with the same caution the reference atlas gives, so that the honesty notes aren't lost in the rebuild.

**Blocked by:** 04 (Evidence layers)

**Status:** resolved

- [x] Clicking a feature on the trails, roads, water, trailheads, campgrounds or GMU layer opens a popup with its name (or the layer label when it has none) and the reference's metadata line: surface and access for trails and roads, regime and type for water, the GMU number for GMUs.
- [x] The cautions carry over from the reference: water says "Mapped feature; 2027 flow not verified.", roads say a line doesn't establish vehicle access, trailheads show their vehicle note, and campgrounds show their inventory status with "Not a 2027 opening forecast" when it has no note of its own.
- [x] Popups are built by the map adapter and escape every property value. Contours stay non-interactive.
- [x] Clicks on candidate markers still select the candidate, and the canopy inspector (05) still reads where no feature is clicked.
- [x] Point markers that open a popup are reachable by keyboard, or the popup content is available another way. Decide this together with 12.
- [x] Playwright: clicking a known trail, water feature and trailhead opens the expected popup text, and a property containing `<` renders as text.

## Comments

**Built and verified locally.** Rebased onto tickets 10 and 09 (6779e39). Data check, type check, 157 Vitest tests (12 new), build, public build check, 74 Playwright tests (7 new) and the 4 private-build tests pass. Before 09 landed, the new popup and canopy specs also passed three times over with `--repeat-each=3`.

- **Content** (`src/map/featurePopup.ts`): a pure function that returns the popup's title, metadata line and cautions for the six layers in the ticket. Its metadata keys follow the bundle rather than the reference: the GMU number comes from `gmu` (the reference read `GMU`/`GMUID`, which the bundle doesn't have), and water reads `water_regime` and `type`. `snake_case` codes are shown with spaces ("lake pond"). The road caution is generic ("…does not establish vehicle access."). The bundle's own `access_note` still names the vehicle.
- **Escaping.** The adapter builds each popup from `textContent` nodes, so no property value is ever parsed as HTML. Playwright feeds a trail name containing `<img onerror>` and `<b>` through a routed `trails.geojson`. It checks the popup shows the raw text, contains no elements, and runs no script.
- **One vector canvas.** This was a bug in the reference too. Each canvas pane gets its own `<canvas>` covering the whole map, and the top one takes every click. The wilderness boundary's pane is on by default and above the others, so clicks never reached a trail, road or stream. Every vector layer except the contours now shares one canvas renderer in a `vectors` pane (430). `setLayers` restacks the layers in `VECTOR_STACK` order whenever one is added, so water stays under access and boundaries stay on top. With per-pane canvases restored, the trail and lake tests fail.
- **Outlines.** A canvas counts a click anywhere inside a polygon as a hit, even an unfilled one. So the GMU and wilderness polygons are drawn as their rings, as lines. Otherwise every click inside a GMU would open the GMU's popup. Playwright checks that a click inside a GMU, away from any line, opens nothing and still gives a canopy reading.
- **Hit tolerance.** The shared canvas counts clicks within 5 px of a line, because the lines are only 1.5–2.7 px wide.
- **Keyboard (decided here, for 12 to check).** Trailhead, campground and spring markers are now keyboard buttons named "‹name›, ‹layer label›". Enter or Space opens the popup. Escape closes it and leaves focus on the marker. `.leaflet-marker-icon:focus-visible` gives every map marker the app's focus ring, candidates included. Line and area features can't be reached by keyboard. Their cautions also appear in the method dialog and the candidate detail.
- **Unchanged.** Contours stay non-interactive. Candidate markers still select on click, even with a popup open, and the map click still reaches the canopy inspector.
- **Tests.** `tests/e2e/mapScreen.ts` holds the hillshade-based projection that `canopy.spec.ts` used, so both specs share it. The click targets are each at least 350 m from any other clickable feature: a Rogers Pass trail vertex, Lake Caroline and the James Peak Lake trailhead. `playwright.config.ts` now reads `E2E_PORT`, so parallel worktrees don't reuse each other's preview server. `atlas.spec.ts` now looks for the boundary's canvas in the `vectors` pane.
- **Left for 12.** Point markers come before candidate markers in the tab order, because the `points` pane is earlier in the DOM. Screen readers aren't told when a popup opens. Two Rogers Pass trailheads sit on the same spot, so only one can be clicked, though both are reachable by keyboard.
