# 12: Usability and resilience pass

**What to build:** A check across the whole app that it's usable with the keyboard only, meets WCAG 2.2 AA, works at 390 px, and stays understandable when something fails.

**Blocked by:** 04, 05, 06, 07, 08, 09, 10, 11

**Status:** resolved

- [x] One keyboard-only Playwright journey reaches the scope, sort, search, field status filter, a candidate, its detail panel, its field status and notes, and Export, without using the map. Focus is visible throughout and returns correctly after every dialog and panel.
- [x] An automated accessibility scan (axe-core in Playwright) of the main states reports no WCAG 2.2 AA violations, or each remaining one is documented with a reason.
- [x] Screen-reader semantics: the list, detail panel, dialogs and status messages (save failure, layer failure, link fallback) use correct roles and live regions.
- [x] At 390 px, the sidebar works as a drawer and the detail panel sits over the map, matching the current atlas. Screenshots are captured as evidence.
- [x] With a layer deliberately failed, the app stays understandable: the control says what failed and the rest of the app works.
- [x] Any problems found are fixed in this ticket, or split into new tickets if they're large.

## Comments

**From 14 (feature popups):** trailhead, campground and spring markers are now in the tab order, before the candidate markers because of DOM pane order. Enter or Space opens their popup and Escape closes it. Popups aren't announced to screen readers yet. Every map marker now has the focus ring. See 14's comments.

**Built and verified locally.** Data check, type check, 157 Vitest tests, build, the public build check, 85 Playwright tests (11 new, in `tests/e2e/usability.spec.ts`) and the 4 private-build tests all pass. Evidence and the decisions below are in `docs/usability/README.md`, with the 390 px screenshots beside it.

- **Keyboard journey.** One test goes from the method dialog and back, through the panel tabs, scope, sort, field status filter, Import log, search, a card, its detail, field status and notes, and then to Export. It downloads a GeoJSON file and parses it. At every step it checks that the focused element draws a focus ring of at least 2 px. The journey covers the panel's focus fallback: the candidate's new status takes it out of the filtered list, so closing the panel puts focus on the filter. Textareas now get the app's focus ring too.
- **axe (WCAG 2.2 AA).** Four scan tests cover desktop and 390 px. One finding is accepted, in `ACCEPTED` with its reason: map markers closer together than 24 px, under 2.5.8's "essential" exception for map pins. Everything else was fixed:
  - **Contrast.** Muted greys were 3.3–4.4:1. Each is darkened along its own hue to about 4.6:1, and the theme's `muted` is now `#616e67`.
  - **Marker amber.** It's now `#a56227`, up from `#c7762f`, which gives the numerals 4.6:1. **This is a visible change from the reference look**, so the owner may want to look at it.
  - **Marker names.** Each now ends with "marker E4" (2.5.3).
  - **Point markers.** Each is a 24 px target.
- **Drawer.** Below 800 px the sidebar is a drawer, toggled by a header button named "Map controls" (`aria-expanded`, `aria-controls`). It starts closed, as in the reference. A selection closes it. Escape closes it and focuses the button. Focus leaving it closes it, because otherwise Tab would land on markers hidden under it (2.4.11). A blur to nowhere, such as a map tap or the file picker, leaves it open. **This differs from the reference:** closing a detail opened from the list reopens the drawer, so focus can go back to the card.
- **Live regions.**
  - **Layer failures.** A region inside the hidden Layers tab can't announce anything. `AtlasView` now has one status region that's always present and announces a failed layer ("Canopy cover · 2025 couldn’t load. Retry it in Map layers.") and a link problem from a hashchange. The failure box in the layer row is no longer `role="status"`, and the link notice is `role="note"`, so nothing is read out twice. Tests changed to match.
  - **Import report.** Now always present.
  - **Popups.** The map adapter owns an `sr-only` status region that reads out a popup's title, metadata and cautions on open and clears on close. This closes 14's note.
- **Tab order.** Panes are now created top first, so candidate markers come before trailheads. Their z-index is unchanged. This closes 14's other note.
- **Left as is.**
  - **Notices present at load.** The atlas warnings, a backed-up field log, and a broken link opened directly aren't announced. They're there at first render, and a screen reader reads them with the page.
  - **No screen reader check.** Nothing here was checked with a real screen reader. The checks are axe and Playwright's accessibility tree.
