# 14: Feature popups

**What to build:** Clicking a mapped trail, road, water feature, trailhead or campground opens a short popup naming it, with the same caution the reference atlas gives, so that the honesty notes aren't lost in the rebuild.

**Blocked by:** 04 (Evidence layers)

**Status:** needs-triage

- [ ] Clicking a feature on the trails, roads, water, trailheads, campgrounds or GMU layer opens a popup with its name (or the layer label when it has none) and the reference's metadata line: surface and access for trails and roads, regime and type for water, the GMU number for GMUs.
- [ ] The cautions carry over from the reference: water says "Mapped feature; 2027 flow not verified.", roads say a line doesn't establish vehicle access, trailheads show their vehicle note, and campgrounds show their inventory status with "Not a 2027 opening forecast" when it has no note of its own.
- [ ] Popups are built by the map adapter and escape every property value. Contours stay non-interactive.
- [ ] Clicks on candidate markers still select the candidate, and the canopy inspector (05) still reads where no feature is clicked.
- [ ] Point markers that open a popup are reachable by keyboard, or the popup content is available another way. Decide this together with 12.
- [ ] Playwright: clicking a known trail, water feature and trailhead opens the expected popup text, and a property containing `<` renders as text.
