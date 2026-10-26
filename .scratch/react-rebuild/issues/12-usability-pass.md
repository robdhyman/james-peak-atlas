# 12: Usability and resilience pass

**What to build:** A check across the whole app that it's usable with the keyboard only, meets WCAG 2.2 AA, works at 390 px, and stays understandable when something fails.

**Blocked by:** 04, 05, 06, 07, 08, 09, 10, 11

**Status:** ready-for-agent

- [ ] One keyboard-only Playwright journey reaches the scope, sort, search, field status filter, a candidate, its detail panel, its field status and notes, and Export, without using the map. Focus is visible throughout and returns correctly after every dialog and panel.
- [ ] An automated accessibility scan (axe-core in Playwright) of the main states reports no WCAG 2.2 AA violations, or each remaining one is documented with a reason.
- [ ] Screen-reader semantics: the list, detail panel, dialogs and status messages (save failure, layer failure, link fallback) use correct roles and live regions.
- [ ] At 390 px, the sidebar works as a drawer and the detail panel sits over the map, matching the current atlas. Screenshots are captured as evidence.
- [ ] With a layer deliberately failed, the app stays understandable: the control says what failed and the rest of the app works.
- [ ] Any problems found are fixed in this ticket, or split into new tickets if they're large.
