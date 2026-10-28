> Companion to `spec.md`. A read-only survey of the code at main 6ce79a0, written 2026-10-28 for the Figma library build. Values are quoted from the code; "static" text is fixed, "data" text comes from the bundle. Quotes no observation data (ADR 0001).

# James Peak Atlas: component content inventory (Figma library build)

Read from `main` @ 6ce79a0: `src/ui/*.tsx`, `src/App.tsx`, `src/map/mapAdapter.ts`, `src/map/layerStyles.ts`, `src/index.css`. Extra reads only for sample strings: `public/data/*.json|geojson`, `src/ui/format.ts`, `methodContent.ts`, `src/map/featurePopup.ts`, `leaflet.css`.

## 0. Reading notes

- Spacing utilities are Tailwind v4 at 4 px per step: 0.5=2, 1=4, 1.5=6, 2=8, 2.5=10, 3=12, 3.5=14, 4=16, 5=20, 6=24, 7=28 px. `[Npx]` values are literal px. `border`=1 px, `border-2`=2 px. `rounded-sm`=4 px. `size-N` = N x 4 px square. `bg-sheet/95` = sheet at 95% opacity.
- Notation: `pad X/Y` = horizontal/vertical padding; `r` = corner radius; `ls` = letter-spacing; `fg` = text colour; `size/wt` = font-size px / weight.
- Preflight: border-box everywhere, buttons/inputs inherit font, `border` with no colour class = currentColor, placeholder = currentColor at 50%. Body: Sans 14 px, line-height 1.45, bg `paper`, fg `ink`. Elements without `leading-*` inherit 1.45 (`leading-tight` 1.25, `leading-normal` 1.5, `leading-none` 1). Headings reset to inherit size/weight.
- **Sans** = `--font-sans` (system stack). **Display** = `--font-display` (Georgia, serif). Mono (`font-mono`, Tailwind default) appears only in MethodDialog.
- Hex written in a class (`#636f57`) is NOT a token. There are 134 distinct literal hex values across these files; only #636f57 (x7, CandidateDetail), #fffaf0, #d9dfd2, #bb8b4d repeat 3+ times. Near-tokens differ: tab text `#616f67` vs `--color-muted #616e67`; selected marker `#173e35` vs `--color-ink #193e35`. Keep them as separate styles.
- Text uses curly apostrophes (U+2019), em dash, middle dot ·, and × (U+00D7) as a text glyph.
- Global focus ring (`:where(button,input,select,textarea,a):focus-visible`): 3 px solid `focus` #df9d52, offset 3 px. Leaflet marker icons: same ring, offset 2, radius 50%. Detail panel: outline-3, offset 2, `focus`. Reduced motion turns off all transitions/animations.
- **Published screenshot** (`docs/screenshot.png`, 2560x1280 = 1280x640 CSS px at 2x): default desktop regime (sidebar 326, header 86; measured 325 / 85.8). Candidates tab active, count 6, Sort "Scout order", Field status "Any field status", "Field log · 0 entries", EP-04 selected (card highlighted, marker E4 selected, detail panel open). Legend panel closed (code default is open). No canopy readout, no Observations button (public build). The Scope toggle is not visible: it is rendered unconditionally but is scrolled out of the panel (the selected card is `scrollIntoView({block:'nearest'})`).
- Public build has 0 observations (`observations.geojson` features = 0). Observation UI renders only in the private build (ADR 0001); sections 35 and 36 are flagged. No observation data is quoted here.

## 1. @theme tokens (`src/index.css` lines 7-66)

| Token | Value | Comment group |
|---|---|---|
| --font-sans | -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif | (no comment; first lines of @theme) |
| --font-display | Georgia, serif | (no comment) |
| --color-ink | #193e35 | Forest green |
| --color-ink-soft | #446057 | Forest green |
| --color-ink-raised | #244a40 | Forest green |
| --color-muted | #616e67 | Forest green |
| --color-paper | #f8f7f2 | Paper and rules |
| --color-sheet | #fffefa | Paper and rules |
| --color-line | #e2e5dc | Paper and rules |
| --color-line-strong | #cdd7cc | Paper and rules |
| --color-map | #e4e8dd | Paper and rules |
| --color-map-canvas | #e9ebdf | Paper and rules |
| --color-alert | #fff5df | Map notices |
| --color-alert-line | #e5d0a7 | Map notices |
| --color-alert-text | #8c642b | Map notices |
| --color-marker | #a56227 | Candidate markers (amber, "a shade darker than the reference's #c7762f" for 4.5:1) |
| --color-marker-ring | #8c501f | Candidate markers |
| --color-marker-context | #e9dfc8 | Candidate markers |
| --color-marker-context-text | #5b5b3c | Candidate markers |
| --color-marker-selected | #173e35 | Candidate markers |
| --color-observation | #315f4d | Observations |
| --color-observation-ring | #1f4234 | Observations |
| --color-amber | #c56e28 | Amber accents (no use found in src/) |
| --color-amber-pale | #faeddc | Amber accents (no use found in src/) |
| --color-amber-dot | #d79b4b | Amber accents |
| --color-focus | #df9d52 | Amber accents |
| --color-topbar-text | #f4f3e9 | Text on the forest-green header |
| --color-topbar-eyebrow | #c1cfc1 | Text on the forest-green header |
| --color-topbar-muted | #c6d2ca | Text on the forest-green header |
| --color-scenario | #ecd9b4 | Text on the forest-green header |
| --color-brand-mark | #d6b784 | Text on the forest-green header |
| --color-water | #438ba0 | (no comment of its own; no use found in src/) |
| --shadow-panel | 0 8px 30px #18372a18 (RRGGBBAA) | (no comment) |
| --breakpoint-tablet | 50rem = 800 px | "The reference layout's own breakpoints (800, 1100 and 1500 px)" |
| --breakpoint-desktop | 68.75rem = 1100 px | same |
| --breakpoint-wide | 93.75rem = 1500 px | same |

Page/map surfaces: `main` bg `map` #e4e8dd; Leaflet container bg `map-canvas` #e9ebdf.

## 2. Breakpoints: tablet 800, desktop 1100, wide 1500 (variants `max-tablet:` = width < 800, `max-desktop:` = width < 1100, `wide:` = width >= 1500)

Three breakpoints give four regimes. What changes:
- **< 800 (phone, `max-tablet`)**: header h 72, gap 11, pad-x 15; hamburger visible; brand mark hidden; title 25 px; "Method and sources" text sr-only (icon + "i" only); scenario line 8 px / ls .05em, occupancy line hidden; export button shows only the count + icon, pad 9 all round, gap 6; **sidebar becomes a drawer** (absolute over map, z 1050, width 296 capped at `calc(100% - 48px)`, shadow `9px 0 30px #18391f22`, `hidden` until opened); **detail panel becomes a bottom sheet** (inset-x 0, bottom 0, max-h 62vh, auto width, top corners 9 only, header pad 20/20/16, body pad 20/16/22); legend left 12, max-w 220, hidden while a candidate is open; notices inset-x 12 top 64; map-button row inset-x 12 top 12, buttons pad 9 / 9 px text; canopy readout fills the row.
- **800-1099 (`max-desktop`)**: sidebar 296 wide, pad-x 19; header h 86, gap 16, pad-x 20; occupancy line hidden; detail 305 wide at right 15; legend left 15; canopy readout 305 wide, margin-top -8.
- **1100-1499 (default)**: sidebar 326, pad-x 23; header h 86, gap 24, pad-x 28; detail 330 at right 23; readout 330.
- **>= 1500 (`wide`)**: sidebar 346, pad-x 28; detail and readout 350.
- JS: `isDrawer()` = `(width < 50rem)`; reveal pans 140 px left of centre when width >= 50rem, else 0.

Overlay anchors in `main` (px): notices top 77 / left 23 / max-w 430 (z 600); map-button row top 20 / right 22 (z 640); legend bottom 55 / left 23 (z 500, max-w 250, min-w 180, max-h `calc(100% - 160px)`); detail top 77 / right 23 / bottom 55 (z 650, max-h 780). Header z 1100, drawer 1050. Leaflet panes (z): relief 210, official 220, raster 300, contours 390, vectors 430, contourLabels 460, points 610, observations 615, candidates 620.

## 3. Sample data (EP-04, published screenshot)

Static origin/limits (manifest): origin "Moffat Tunnel / East Portal lot"; round-trip limit 6 mi; gain limit 4000 ft; vehicle "AWD Mazda 3; no high-clearance approaches".
EP-04 (data): id `EP-04`; name "East Portal scout 4 — Unnamed mapped stream"; score 71.7 -> "72 / 100"; pool nearby, rank 4 -> "Nearby #4"; list position 1 (Scout order); round trip 2.21 -> "2.2 mi"; lat/lon "39.89568, -105.66452"; components water 80, shelter 83.1 -> 83, darkness 31.6 -> 32, security 100; weights 35 / 25 / 25 / 15 %; metrics: water 108.6 m -> "109 m", canopy 59.8 -> "60%", darkness_m 403.9 -> "404 m", slope 14.1 -> "14.1°", elevation 10271 -> "10,271 ft", steep terrain 37.8 -> "38%", GMU "38"; raster note "60 m raster estimate"; field status default "To scout".
Rationale (6): "First access check: shortest straight-line distance from East Portal among the six alternatives. Actual trail distance and elevation still need checking." / "This cell ranks chiefly on security and shelter; its lowest modeled component is darkness (32/100)." / "Mapped perennial stream_river approximately 109 m away; verify it remains wet." / "60% tree canopy at the grid cell; understory cover requires field inspection." / "Approximately 404 m from the nearest mapped road, trail or developed campground." / "38% of nearby terrain meets the steep-slope threshold; local slope 14°."
Field checks (5): "Water present during dry conditions" / "Usable cover and dated elk sign" / "Legal foot approach and camera placement" / "Actual route mileage, cumulative gain and recovery access" / "Unmapped routes, dispersed camps and human use".
Cautions (3): "Route unverified: straight-line distance is only a lower bound." / "Mapped perennial water can still be dry in the 2027 scenario." / "Terrain security is a proxy; confirm approach, escape routes and recovery on foot."
route_status: "Exact route, cumulative gain, road suitability and recovery access unverified".
Other nearby candidates: EP-01..EP-06 (6 Nearby); 10 Wilderness context JP-01..JP-10 (only in scope "All").

---

## 4. Page frame: `Layout` (App.tsx 333-390)

- Root `flex h-full flex-col`; body row `relative flex min-h-0 flex-1 overflow-hidden`: header, then `aside` + `main`.
- `aside` (id `sidebar`, aria-label "Map controls"): `flex w-[326px] flex-none flex-col border-r border-line-strong bg-paper`; 296 below 1100; 346 at >= 1500; drawer rules in section 2. Contains SidebarHeader, then the tabs + panels (or nothing while loading).
- `main` (aria-label "Interactive scouting map"): `relative min-w-0 flex-1 bg-map`; holds map, overlays, detail.
- Escape closes the drawer (phone) and returns focus to the hamburger; drawer closes when focus leaves it.
- States: loading (sidebar null, hamburger/method disabled, Export "Export 0 shown" disabled, MapLoading in main), failed (FatalError replaces everything), ready.

## 5. SidebarHeader (inside `Layout`)

- Wrapper `px-[23px] pt-6 pb-[19px]` (pad-x 19 below 1100, 28 at >= 1500; top 24, bottom 19).
- Eyebrow div, **static**: "JAMES PEAK WILDERNESS"; Sans 10 / 700, ls .11em, fg `muted`.
- Tagline p, **static**: "Find the next place worth a walk."; Sans 17 / 600, ls -.03em, fg `ink` (inherited); margin top 6, bottom 11.
- No icons.

## 6. TopBar (`Topbar`, App.tsx 482-539)

- `header`: `relative z-[1100] flex h-[86px] flex-none items-center gap-6 bg-ink px-7 text-topbar-text`; 72 high, gap 11, pad-x 15 below 800; gap 16, pad-x 20 below 1100. Order: DrawerButton, Brand, MethodButton, ScenarioBadge, ExportMenu.
- **DrawerButton** (phone only; `hidden`, `max-tablet:grid`): 34x34, margin-x -4, fg `paper`, disabled opacity 50% (while loading). aria-label "Map controls", aria-expanded. Icon inline svg `viewBox="0 0 24 24"`, 23x23, fill none, stroke currentColor, stroke-width 1.7, round caps: `<path d="M4 6h16M4 12h16M4 18h16" />` (hamburger).
- **Brand**: row, gap 13. Mark: inline svg `viewBox="0 0 40 34"`, 42x39, fill none, stroke `brand-mark` #d6b784, stroke-width 1.3, round caps+joins, hidden below 800. Paths: `m2 29 13-23 8 13 5-8 10 18H2Z` and `m10 15 5 4 4-5M23 19l5 4 4-4`. Eyebrow span, **static** "FIELD ATLAS / COLORADO": Sans 9 / 700, ls .19em, fg `topbar-eyebrow` (inline span inside a 14 px/1.45 block, so its line box is ~20 px tall). h1, **static** "James Peak": **Display** 30 / 400, line-height 1.1, ls -.025em (25 px below 800), margin-top 2, fg inherits `topbar-text`.
- **MethodButton**: `ml-auto flex flex-none items-center gap-[7px] py-2 text-[12px] text-topbar-text`; disabled opacity 50% while loading; aria-haspopup dialog. Circle "i": text glyph (not svg), 15x15, `rounded-full`, 1 px border `topbar-muted` #c6d2ca, **Display** 11 px, centred. Label **static** "Method and sources" (Sans 12/400; sr-only below 800). Opens MethodDialog.
- **ScenarioBadge**: column, items-end, gap 6. Line 1 (**static**) "LOW WATER · 2027": Sans 10 / 700, ls .12em, fg `scenario` #ecd9b4 (8 px, ls .05em below 800); leading dot = span 6x6 `rounded-full` bg `amber-dot` (gap 7). Line 2 (**static**) "Occupancy assumed for planning": Sans 11 / 400, fg `topbar-muted`; hidden below 1100.
- ExportMenu sits last (section 7).

## 7. ExportMenu (`ExportMenu`, ExportMenu.tsx)

- Root `relative flex-none`.
- **Button**: `flex items-center gap-[13px] rounded-[5px] border border-[#789085] bg-ink-raised px-[13px] py-2.5 text-[12px] text-[#f3f0df]`. Height ~39 px (12 x 1.45 + 20 + 2). Text: "Export " (static) + count (data, `data-testid=export-count`) + " shown" (static) -> "Export 6 shown". Below 800: pad 9, gap 6, the static words are sr-only (count + icon only). Disabled (count 0 or loading): opacity 50%. aria-expanded, aria-controls "export-menu". Icon inline svg `viewBox="0 0 20 20"`, 16x16, fill none, stroke currentColor 1.6, round caps/joins: `<path d="M10 3v9m-4-4 4 4 4-4M4 13v4h12v-4" />` (download arrow into tray).
- **Menu panel** (`hidden` until open; role group, aria-label "Export 6 candidates"): absolute, top 52 (46 below 800), right 0, min-w 230, `rounded-[7px]`, 1 px `line` border, bg `sheet`, fg `ink`, shadow `shadow-panel`, overflow hidden.
  - Intro p: pad 15 x / 12 top / 10 bottom, bottom border `line`, Sans 10, leading 1.5, fg `muted`. Text: "The " + "6 candidates" (data; "1 candidate" singular) + " in the list now, with their field status and notes."
  - Three **items** (repeat, own component): full-width button, pad 15/12, left aligned, Sans 12; hover and focus-visible bg `#edf1e8`. Text `{label} · {use}` (all static): "GeoJSON · map apps", "GPX · GPS devices", "CSV · spreadsheets".
- Hidden live region (sr-only): "Exported 6 candidates as GeoJSON."
- States: closed / open / disabled.

## 8. SidebarTabs (`SidebarTabs`, App.tsx 400-470)

- Tablist: `flex flex-none gap-[27px] border-y border-line px-[23px]` (pad-x 19 below 1100, 28 at >= 1500); aria-label "Atlas panels".
- **Tab** (repeat x2): button, pad top 13 / bottom 11, `border-b-2 border-transparent`, Sans 12 / 600, fg `#616f67`. Selected (`aria-selected`): bottom border `ink`, fg `ink`. Labels (static): "Map layers"; "Candidates" followed by a **count chip** (data): `ml-1`, `rounded-[4px]`, bg `#e6ebdf`, pad 5/2, Sans 10 (weight inherits 600), value "6" (visible list length). Arrow keys swap tabs. Opens on "Map layers", or on "Candidates" when the page was opened with a view link (the screenshot).
- **Tabpanel**: `min-h-0 flex-1 overflow-auto px-[23px] pt-[19px] pb-5`; thin scrollbar, colour `#c4cfbf` on transparent; pad-x 19 below 1100, 28 at >= 1500; inactive panel `hidden`.

## 9. PresetGroup (`LayerControls`, LayerControls.tsx 40-52)

- Container: role group "Map presets"; flex, gap 2, `rounded-[6px]`, 1 px border `line`, bg `#edefe8`, pad 3, margin-bottom 24.
- **Preset button** (repeat x3, flex-1): `rounded-[3px]`, pad 2/6, Sans 10 / 400, fg `ink-soft`. Pressed (`aria-pressed`): bg `#ffffff`, weight 700, fg `ink`, shadow `0 1px 3px #173b3510`. Labels (static): "Terrain", "Low water", "Quiet cover". Default: "Terrain" pressed. Switching any single layer clears the pressed state (no preset pressed).

## 10. LayerSection (`LayerSection`, LayerControls.tsx 102-116)

- Wrapper role group, margin-bottom 23. Heading row: flex, space-between, align centre, margin-bottom 9. h2 Sans 11 / 700, ls .02em, fg `ink`. Number span (aria-hidden) Sans 9, fg `#646e65`.
- Sections (static): "Ground & access" / "01"; "Habitat evidence" / "02". Children: a `<ul>` of LayerSwitch rows. Habitat also ends with the ModelScores group (section 12).
- Ground rows: Trails, Roads, Developed campgrounds, Trailheads / vehicle screen, James Peak Wilderness, Mapped land ownership, GMU boundaries. Habitat rows: USGS topo · 40 ft · 2022, 40 ft contour lines, Terrain relief, Canopy cover · 2025, Mapped water, Low-water suitability, "Darkness: distance from access (0–2,000 m)". (Labels are data from the manifest, except the last two, which the app overrides.)

## 11. LayerSwitch (`LayerRow`, LayerControls.tsx 118-180)

- Row: flex, items-center, gap 9, pad-y 5, min-h 34 (29 in the compact Model-scores group).
- **Checkbox** `.layer-checkbox` (CSS): 15x15, flex none, margin 0, 1 px border `#8fa391`, `r` 3, bg `#ffffff`. Checked: border and bg `ink`; tick is CSS-drawn (not svg): `::after` at left 3 / top 3, 7x4, border-bottom + border-left 1.6 px `#fff`, rotate(-45deg).
- **Label** (clickable, `title` = manifest description): flex, gap 9, leading 1.3, Sans 12 / 400 (11 in compact group), fg `ink`. Contains **swatch** (aria-hidden, inline `background` colour from `LAYERS`, see section 39) then label text (data). Line swatch: 16x4, `r` 3. Point swatch (campgrounds, trailheads): 8x8 circle, margin-x 4.
- **Loading chip** (checked + status loading): right of label, flex, gap 4, Sans 9, fg `muted`; spinner span 10x10 circle, 1 px border `line-strong`, top border `ink`, `animate-spin`; text **static** "Loading".
- **Failure panel** (status failed; checkbox unchecked): below row, margin-left 24, margin-bottom 6, flex gap 8, `rounded-[4px]`, 1 px `alert-line`, bg `alert`, pad 10/6, Sans 10, fg `alert-text`. Text "Couldn’t load: {reason}" (static + data, wraps anywhere). **Retry** button: `rounded-[3px]`, 1 px `alert-line`, bg `sheet`, pad 8/2, weight 700, fg `ink`, label **static** "Retry", aria-label "Retry {layer}".
- States: unchecked, checked, checked+loading, failed (checked false), focus (global ring). Terrain preset default on: hillshade, boundary, trails, roads, water, trailheads, contours.

## 12. ModelScoresGroup (LayerControls.tsx 60-66, inside "Habitat evidence")

- `li`: margin-top 10, margin-left 7, left border 1 px `#d9dfd2`, pad-left 13.
- h3 **static** "Model scores · 0–100": Sans 11 / 700, pad-top 4. p **static** "Relative indices from the scouting model, not probabilities.": Sans 10, leading 1.45, fg `muted`, margin 2/4.
- Rows (compact: min-h 29, label 11 px): "Combined scouting index", "Shelter potential", "Terrain security".

## 13. OverlayStrength slider (LayerControls.tsx 69-89)

- Wrapper: top border 1 px `line`, pad-top 16.
- Label row: flex, space-between, margin-bottom 8, Sans 11, fg `ink-soft`. Left **static** "Overlay strength"; right `<output>` data "65%" (range 10-100, initial 65), fg `muted`, tabular-nums.
- Input range: full width, height 3 (track), `accent-color` `ink`; thumb is the browser's own (not styled).
- Note p **static** "Applies to canopy, darkness and the model score layers.": Sans 10, fg `muted`, margin-top 8.

## 14. LowWaterScenarioNote (LayerControls.tsx 91-97)

- Box: margin-top 24, `r` 5, left border 2 px `#a6b69e`, bg `#eeefe5`, pad 14/13.
- Eyebrow span **static** "LOW-WATER SCENARIO": Sans 8 / 800, ls .09em, fg `#5f7154`.
- p **static** "Mapped perennial water and lakes receive more weight. A blue line is a place to verify water—not a promise it will flow.": Sans 10, leading 1.65, fg `#5f6d57`, margin-top 7.

## 15. ScopeToggle (`CandidateList`, CandidateList.tsx 58-70)

- Role group "Scope"; flex, `r` 8, bg `#e9ede5`, pad 3, margin-bottom 8. Same structure as PresetGroup (reuse as one segmented-control component).
- Button (x2, flex-1): `r` 5, pad 5/8, Sans 10 / 600, fg `ink-soft`. Pressed: bg `sheet`, fg `ink`, shadow `0 1px 4px #183a2420`. Labels (static): "Nearby" (default pressed), "All".

## 16. ScopeNote and list helper text (CandidateList.tsx 71-75, 146-173)

- Scope note p: Sans 10, leading 1.55, fg `muted`, margin-bottom 16. Nearby: "The Nearby pool: within a 6-mile round trip of Moffat Tunnel / East Portal lot as the crow flies. Walking routes are unverified." (budget and origin = data). All: "Both pools: Nearby, and Wilderness context candidates elsewhere in the wilderness."
- Pool-rank explainer p **static**: "Each card’s label is its pool rank: its place by scouting index within its own pool, whatever the list order." Sans 10, leading 1.6, fg `#646e5c`, margin-bottom 15.
- **Empty state** (visible list empty): p, centred, pad 10/22, Sans 12, fg `#646e5c`: "No candidates match this view." / line break / "Try another field status or search" + ", or switch to All" (Nearby scope only) + ".".
- Hidden status (sr-only): "6 candidates" ("1 candidate").

## 17. Sort select and 18. FieldStatus select (`CandidateList`, 77-123): one FieldSelect row component

- Row: flex, items-center, gap 8, margin-bottom 12. Label Sans 10, fg `ink-soft`. Select: flex-1, min-w 0, `r` 4, 1 px border `#d9dfd2`, bg `#f4f5ee`, pad 8/6, Sans 11, fg `ink` (native control; chevron is the browser's). Height ~29 px (measured in the screenshot).
- **Sort** (label **static** "Sort"): value "Scout order" (default, Nearby). Options (static labels): "Scout order" (Nearby scope only), "Scouting index", then optgroup "Component": "Water", "Shelter", "Darkness", "Security". In scope All the default is "Scouting index" and "Scout order" is absent.
- **Field status** (label **static** "Field status"; id `field-status-filter`): value "Any field status" (default). Options: "Any field status", "To scout", "Scouted", "Camera placed", "Ruled out".
- Focus: global ring; open state is the native popup.

## 19. FieldLogTools (FieldLogTools.tsx)

- Wrapper margin-bottom 12; row flex-wrap, items baseline, gap 12 x / 4 y.
- Summary span: Sans 10, fg `ink-soft`: "Field log · " (static) + "0 entries" (data; "1 entry", "3 entries").
- **Tool link-button** (repeat x3): Sans 10, fg `#5f6d55`, underline with offset 3; disabled: no underline, opacity 50%. Labels (static): "Export log" (disabled at 0 entries), "Import log" (always enabled), "Reset log" (disabled at 0). Hidden file input aria-label "Field log file to import".
- Report line: success p (margin-top 8, Sans 10, fg `ink-soft`): "Imported 3 entries from {filename}." (otherwise sr-only empty).
- Error panel (role alert): margin-top 8, `r` 5, 1 px `alert-line`, bg `alert`, pad 12/8, Sans 10, leading 1.55, fg `alert-text`. First line weight 600: "Nothing was imported from {filename}:"; bullet list (disc, pad-left 16, margin-top 4) of problems (data).
- Opens ConfirmDialog (section 28) for Reset and Replace.

## 20. SearchField (CandidateList.tsx 127-144)

- Wrapper `relative`, margin-bottom 12. Icon: inline svg `viewBox="0 0 20 20"`, 16x16, absolute left 11 / top 11, fill none, stroke `#84937c` 1.7, round caps: `<circle cx="8" cy="8" r="5" />` + `<path d="m12 12 5 5" />` (magnifier).
- Input type search: full width, `r` 5, 1 px border `#d7dfcf`, bg `sheet`, pad-left 34 / pad-right 10 / pad-y 10, Sans 11, fg `ink`. Placeholder **static** "Find a candidate by ID or name" (currentColor at 50%). aria-label "Search candidates by ID or name". Browser adds a native clear (x) once it has text. Height ~38 px.

## 21. CandidateCard (`CandidateCard`, CandidateList.tsx 178-230)

- Whole card is one `button` in an `li` of `ol`: block, full width, `r` 6, 1 px border `#dbe1d3`, bg `sheet`, pad 13, left aligned, margin-bottom 9, `transition: border-color`.
- States: default; hover = border `#bb8b4d` + bg `#fffaf0`; **selected** (`aria-current`) = border `#bb8b4d`, bg `#fffaf0`, plus `0 0 0 1px #bb8b4d` ring (looks 2 px); focus = global ring.
- Row 1: flex, items-center, gap 9.
  - **PositionBadge**: 25x25 circle, bg `#f4e3cb`, fg `#8a5322`, Sans 10 / 700, centred; text "1" (data: list position, not pool rank; aria-hidden).
  - Name (data): Sans 12 / 700, leading 1.3, fg `ink`: "East Portal scout 4 — Unnamed mapped stream".
  - Index (data, right-aligned `ml-auto`, no wrap): Sans 12 / 700, fg `#8c5a2d`: "72 / 100".
- Row 2: flex-wrap, items-center, gap 10 x / 4 y, margin-top 9, Sans 10, fg `#626f59`: id "EP-04" (data); **PoolRankChip** (data) "Nearby #4": `r` 3, 1 px `line-strong`, bg `paper`, pad 5/1; "2.2 mi minimum round trip" (data + static " minimum round trip"); **FieldStatusChip** "To scout": `r` 3, pad 5/1, colours below.
- Row 3: **RouteNoteChip** (inline-block, margin-top 8): `r` 3, 1 px `#d8c4a9`, bg `#f9eedf`, pad 5/3, Sans 9, ls .02em, fg `#7a5732`. Text by pool (static templates): Nearby "Straight-line lower bound · route unverified"; Wilderness context "Minimum round trip over 6 mi · context only".
- FieldStatusChip variants (bg / fg): To scout `#edf0e5` / `#56684b`; Scouted `#e4ece0` / `#3f6236`; Camera placed `#ddecdf` / `#2b6b53`; Ruled out `#f3e9e0` / `#7d5f4d`.
- PoolRankChip text for context pool: "Wilderness context #1" etc.

## 22. CandidateDetail (`CandidateDetail`, CandidateDetail.tsx)

- **Panel** (`section`, focusable, takes focus on open; Esc or × closes): absolute, top 77, right 23, bottom 55, width 330 (305 below 1100, 350 at >= 1500), max-h 780, z 650, overflow auto (thin scrollbar `#c7d4ba`), `r` 9, 1 px border `#d8dfd0`, bg `sheet`, shadow `0 9px 40px #21341b2b`. Below 800: bottom sheet (section 2). Appears only when a candidate is selected; the legend hides on phones when it is open.
- **Close button**: absolute top 9 / right 11, z 2, 28x28 circle, bg `#eff2e9`, fg `#5f7154`, text glyph "×" at 20 px, leading none; aria-label "Close candidate detail".
- **Header block**: bottom border `line`; background gradient to bottom-right from `#f8f3e7` to `sheet`; pad left 22, top 23, **right 42**, bottom 19 (phone: 20 / 20 / 20 / 16).
  - Eyebrow: Sans 9 / 700, ls .12em, fg `#92612e`: "SCOUTING CANDIDATE · " (static) + "EP-04" (data).
  - h2 (data) name: **Display** 27 / 400 (24 on phone), leading 1.15, ls -.03em, margin 8 top / 12 bottom.
  - Location p: Sans 11, ls .02em, fg `#58704d`, tabular-nums: "39.89568, -105.66452" (data) + span fg `muted` " · WGS84" (static).
  - Stat row (dl): flex, items-end, gap 24, margin-top 18. Stat 1: dt **static** "Scouting index" (Sans 10, fg `muted`); dd data "72 / 100": **Display** 34, leading none, fg `#9e692c`. Stat 2: dt **static** "Pool rank"; dd data "Nearby #4" as PoolRankChip (`r` 3, 1 px `line-strong`, bg `paper`, pad 6/3, Sans 11, margin-top 4).
  - Caption p **static**: "A relative index for comparing candidates. It isn’t a probability." Sans 10, leading 1.5, fg `#656f5a`, margin-top 8.
  - RouteNoteChip (same as section 21, here a `p`, margin-top 8).
- **Body**: pad 22 x / 19 top / 24 bottom (phone 20 / 16 / 22).
  - **DetailHeading** (repeat): h3 Sans 10 / 700, ls .06em, uppercase, fg `#636f57`, margin-bottom 12. Static texts: "Why this cell stands out", "Scouting rationale", "Field checks", "Field log".
  - **ComponentBar** list (repeat x4, order Water, Shelter, Darkness, Security; `li` margin-bottom 11): top row flex space-between, margin-bottom 4, Sans 11, fg `#4e6842`: label (static) + `small` Sans 9 fg `muted` "· 35% weight" (weight is data); right strong Sans 10 / 600, fg `#5f6b52`, "80 / 100" (data). Track: role meter, height 4, `r` 4, bg `#ebeee3`, overflow hidden; fill `r` 4, width = value%, colours Water `#6395a6`, Shelter `#79936b`, Darkness `#6d776d`, Security `#a88860`. EP-04: Water 80 (35%), Shelter 83 (25%), Darkness 32 (25%), Security 100 (15%).
  - Weighted-sum note p **static**: "The index is a weighted sum, so a strong component can make up for a weak one. Check the bars before trusting the total." Sans 10, leading 1.6, fg `#626f59`, margin-top 4.
  - **MetricGrid**: 2 columns, gap 1, `r` 5, 1 px border `#e7ebdf`, bg `#e7ebdf` (so the 1 px gaps read as rules), margin 18 y. **MetricCell** (repeat x8): bg `#f8f9f2`, pad 10, column-reverse (value above label). Value dd: Sans 14 / 600, fg `#3e5835`, tabular-nums. Label dt: Sans 9, fg `#636f57`, margin-top 2, then block provenance span Sans 8, ls .03em, uppercase, fg `#656e5a`. Cells (value / label / provenance): "109 m" / "to mapped water" / "exact vector"; "60%" / "tree canopy cover" / "60 m raster estimate"; "404 m" / "from mapped access" / "exact vector"; "14.1°" / "local slope" / "60 m raster estimate"; "2.2 mi" / "minimum round trip" / "straight-line lower bound"; "GMU 38" / "hunting unit" / "mapped boundary"; "10,271 ft" / "cell elevation" / "60 m raster estimate"; "38%" / "nearby steep terrain" / "60 m raster estimate". Labels and provenance are static; values data. Provenance renders uppercase.
  - Footnote p **static**: "Exact vector figures are measured to the mapped features. Raster estimates come from the model’s grid, so they can differ slightly from the map layers and from each other." Sans 9, leading 1.6, fg `#636f57`, margin-top -10, bottom 18.
  - **BulletList** (repeat; rationale and field checks; each heading+list shown only if non-empty): `ul` margin-bottom 19; `li` Sans 11, leading 1.6, fg `#5a6f50`, pad-left 13, margin-bottom 7; bullet = CSS `::before` dot 4x4 round, bg `#a8b397`, at left 0 / top 7 (not a glyph).
  - **CautionsCallout**: margin 15 y, left border 2 px `#d2a363`, bg `#faf3e7`, pad 11/9, Sans 10, leading 1.65, fg `#7b6643`. Strong block Sans 9 / 700, ls .04em, margin-bottom 3: Nearby "A candidate to investigate, with access unresolved." / context "A wilderness comparison, outside the day-hike screen." Then p (margin 3 y): "The distance is a straight-line lower bound from Moffat Tunnel / East Portal lot. Terrain, a legal walking route, total ascent, water flow and a safe recovery route need field verification." then one p per data caution (3 for EP-04).
  - **PlanningChips**: `ul` flex-wrap, gap 5, margin 12 y; chip `li` (repeat) `r` 3, bg `#ebeee7`, pad 7/5, Sans 9, fg `#55665c`: "6 mi round-trip limit"; "4,000 ft gain limit"; "AWD Mazda 3; no high-clearance approaches" (gain and vehicle chips only when present in the manifest).
  - Route status p: Sans 10, leading 1.6, fg `#636f57`, margin 15 y. "Route status:" (static, weight 600) + data route_status; line break; **static** "The location is model-derived. Elk activity here hasn’t been confirmed."
  - **FieldLogForm**: top border `line`, margin-top 18, pad-top 16. DetailHeading "Field log". Label "Field status" (Sans 10, fg `#636f57`, margin-bottom 6). Select: full width, `r` 4, 1 px `#d3ddc8`, bg `#ffffff`, pad 10/8, Sans 11, fg `ink`; options as section 18 (without "Any"); default "To scout". Label "Notes" (margin-top 12). Textarea: 3 rows, min-h 65, full width, resize-y, `r` 4, 1 px `#dce3d1`, bg `#fbfcf7`, pad 9, Sans 11, leading 1.5, fg `ink`; placeholder **static** "Water flowing? Tracks? Trail access? Wind or recovery notes…". Saved line p (Sans 9, margin-top 6): three states, **static** except the time: saving + no entry (screenshot state) "Saved in this browser only. Export the log to keep a copy." fg `#636f57`; saving + entry "Saved in this browser at 26 Oct 2026, 20:41. Export the log to keep a copy." (time data, en-GB format); not saving "Not saved in this browser. See the notice on the map." weight 600, fg `alert-text`.
- Icons: only the "×" text glyph. Screenshot shows the panel scrolled to the top, cut off after "Shelter".

## 23. Legend (`Legend`, Legend.tsx)

- Panel `section` id `map-legend`: absolute, bottom 55, left 23, z 500, min-w 180, max-w 250 (220 on phone), max-h `calc(100% - 160px)`, overflow-y auto, `r` 7, 1 px border `#d6ded1`, bg `sheet`/95, pad 14 x / 13 y, shadow `shadow-panel`. Left 15 below 1100, 12 below 800. Shown by default; closed in the screenshot; hidden on phones when a candidate is open.
- Header: flex, space-between, gap 24, margin-bottom 9. h2 **static** "ON THE MAP": Sans 8 / 800, ls .13em, fg `#5f7059`. Close button: pad-x 4, text glyph "×" 17 px, leading none, fg `#646e5d`, aria-label "Hide legend".
- List: Sans 10, fg `#53674f`. Only layers that are on **and** ready appear, in `LAYERS` order (Terrain preset: Trails, Roads, Trailheads / vehicle screen, James Peak Wilderness, 40 ft contour lines, Terrain relief, Mapped water), then candidate rows.
- **LegendEntry, symbol type** (`li`, margin 6 y): flex, gap 9; swatch inline-coloured: line 20x3, `r` 1; point 8x8 circle, margin-x 6. Label text data.
- **LegendEntry, ramp type** (canopy, darkness, water_score, overall/shelter/security scores): `li` margin 10 y; label weight 600; gradient bar height 6, `r` 3, margin 8 top / 3 bottom, `linear-gradient(90deg, ...)`; end labels flex space-between, Sans 9, fg `#5f705b`. Ends: canopy "0%" / "100%"; darkness "0 m" / "2,000+ m"; others "0 · lower" / "100 · higher". Stops from the manifest: canopy #f8fae2, #bcd9a8, #6bb17a, #2b7e55, #064634; darkness #fcfbfd, #dadaeb, #9e9ac8, #6950a3, #3f007d; water_score #f7fbff, #c6dbef, #6aaed6, #2070b4, #08306b; shelter #f7fcf5, #c7e9c0, #73c476, #228a44, #00441b; security #fff5eb, #fdd0a2, #fd8c3b, #d84801, #7f2704; overall #ffffd9, #c6e9b4, #40b5c4, #225da8, #081d58.
- **ContourNote** (under the contours entry): p margin-left 29, margin-top 4, max-w 200, Sans 9, fg `#636f5d`. Zoom >= 13 "Every 40 ft, with heavier lines every 200 ft." else "Only the 200 ft lines show at this zoom. Zoom in to see every 40 ft contour."
- **Candidate rows** (static text): "Nearby candidate" with 12x12 circle, margin-x 4, 2 px border `#fff8e9`, bg `marker`, ring `0 0 0 1px marker-ring`; "Wilderness context candidate" (only when that pool is visible) with 2 px border `sheet`, bg `marker-context`, ring `0 0 0 1px #c9bf9f`.
- Observation row (private build only, `data-legend=observations`): top border `line`, pad-top 6; ObservationSwatch (margin-x 5) + static "Observation · your field evidence".

## 24. MapButton (App.tsx `MAP_BUTTON`, 269-290)

- Row: absolute, top 20, right 22, z 640, flex, gap 8, justify-end, items-start; `pointer-events-none` with buttons `pointer-events-auto`. The CanopyReadout sits left of the buttons.
- Button: flex none, `r` 5, 1 px border `#d8ded2`, bg `sheet`/95, pad 12/10, Sans 10 / 400, fg `ink`, shadow `0 3px 14px #233a1c0c`. Phone: pad 9, text 9 px. About 61x36 px for "Legend".
- Labels (static): "Legend" (aria-expanded, controls `map-legend`; no distinct pressed styling); "Observations" (private build only; aria-label "Fit map to observations").

## 25. CanopyReadout (`CanopyReadout`, CanopyReadout.tsx)

- Renders nothing until the pointer is over the map (or after a tap), the grid has loaded, and the point is on the grid. States: hidden, ready, failed, "No data".
- **Panel** `section` aria-label "Canopy readout": flex, items-center, gap 12, width 330 (305 below 1100 with margin-top -8; 350 at >= 1500; below 800 auto width, flex-1, margin-top 0), `r` 7, 1 px border `line-strong`, bg `sheet`/95, pad 12/8, shadow `shadow-panel`, pointer-events none.
- Ready: p value (data) Sans 13 / 600, flex none: "Canopy 31%" (no-data variant "Canopy: No data"); p **static** "Reads the ~30 m display grid; a candidate’s modelled canopy can differ." Sans 10, leading 1.35, fg `muted`.
- Failed: p Sans 11, fg `alert-text`, **static** "Canopy readout unavailable: the canopy grid couldn’t be loaded."

## 26. Notice (`NOTICE` class, App.tsx 395; notice column 245-267)

- Column: absolute top 77, left 23, z 600, flex column, gap 8, max-w 430 (phone: inset-x 12, top 64, no max-w).
- **Notice box** (repeat; every notice uses it): `r` 5, 1 px border `alert-line`, bg `alert`, pad 14/10, Sans 11, fg `alert-text`, shadow `shadow-panel`.
- Variants: data warning (role status, one p per warning, "Couldn’t load {file}: {problem}"); FieldLogNotices (section 27); LinkNotice (section 27b).

## 27. FieldLogNotices (FieldLogNotices.tsx), 27b. LinkNotice (App.tsx 254-266)

- All four messages use the Notice box. Dismissible ones are flex, items-start, gap 12, with p `flex-1` and a **dismiss button**: text glyph "×" 15 px, leading none, pad-x 4, margin-y -2 (aria-label "Dismiss field log notice" / "Dismiss link notice").
- backed-up (role status, aria-label "Field log notice", dismissible): "Your saved field log couldn’t be read ({reason}), so a new one was started. The old one is kept in this browser’s storage under “{backupKey}”."
- unprotected (role alert, not dismissible): "Your saved field log couldn’t be read ({reason}) or backed up, so changes won’t be saved, to keep the old one safe. Export the log to keep a copy of new changes."
- unavailable (role alert): "This browser’s storage can’t be used, so field log changes won’t be saved. Export the log to keep a copy."
- save error (role alert): "The field log couldn’t be saved in this browser ({error}). Your latest changes will be lost on reload, so export the log to keep a copy."
- 27b LinkNotice (role note, aria-label "Link notice", dismissible): "{problem} The default view is open instead." Problems (data): "“x” isn’t a scope." / "“x” isn’t a sort." / "There’s no candidate “x” in this atlas." / "EP-04 isn’t in the Nearby list."
- None appear in the screenshot.

## 28. ConfirmDialog (ConfirmDialog.tsx)

- Native `dialog`: margin auto, width `calc(100% - 32px)`, max-w 420, `r` 10, 1 px border `line-strong`, bg `sheet`, pad 0, fg `ink`, shadow `0 20px 70px #14321e40`. Backdrop `#0d291a70` + 2 px blur.
- Body pad 24 / 24 / 20. Title h2: **Display** 22 / 400, leading 1.2, ls -.02em. Content: margin-top 12, Sans 12, leading 1.65, fg `ink-soft`.
- Action bar: flex-wrap, justify-end, gap 8, top border `line`, pad 24 x / 16 y. Buttons: **Secondary** `r` 5, 1 px `line-strong`, bg `paper`, pad 12/8, Sans 11, fg `ink`. **Primary** `r` 5, 1 px `ink`, bg `ink`, pad 12/8, Sans 11 / 600, fg `sheet`. (Both exported as `SECONDARY_BUTTON` / `PRIMARY_BUTTON`.) "Export first" has margin-right auto (left of the others). Cancel has initial focus.
- Instance A: title "Reset the field log?"; body "This clears 3 entries from this browser: every field status and note. It can’t be undone, so export the log first if you might want it back."; after exporting, extra p (600, margin-top 8) "Exported. Check your downloads before clearing."; buttons "Export first", "Cancel", "Clear 3 entries" (counts are data).
- Instance B: title "Replace the field log?"; body "{filename} holds 2 entries. Importing it replaces the 3 entries in this browser. Export the log first if you might want them back."; extra "Exported. Check your downloads before replacing."; buttons "Export first", "Cancel", "Replace with 2 entries".

## 29. MethodDialog (MethodDialog.tsx; text from `methodContent.ts`)

- Dialog: margin auto, max-h 85vh, width `calc(100% - 32px)`, max-w 680, `r` 10, 1 px `line-strong`, bg `sheet`, shadow `0 20px 70px #14321e40`, same backdrop; flex column when open.
- Header: flex, space-between, gap 16, bottom border `line`, pad 28 x / 24 top / 20 bottom (phone 20 x). Eyebrow **static** "READ THE EVIDENCE" (Sans 10 / 700, ls .11em, fg `muted`); h2 **static** "Method and sources" (**Display** 28 / 400, leading 1.15, ls -.025em, margin-top 4; 24 on phone). Close: 34x34 circle, bg `paper`, fg `ink-soft`, text glyph "×" 22 px; aria-label "Close method and sources".
- Scroll body: overflow-y auto, pad 28 x / 20 top / 28 bottom (phone 20 x), Sans 12, leading 1.7, fg `ink-soft`. **Section** (repeat): margin-top 20 (first 0); h3 Sans 13 / 700, fg `ink`, margin-bottom 8.
- Sections (titles static): "The 2027 scenario" (year is data): callout left border 3 px `amber-dot`, bg `alert`, pad 15/12, fg `alert-text`, two p's (data: "Low surface water: prioritize mapped perennial water over seasonal or unknown classes. No future discharge, water-level or drought prediction is made." / "User assumes elk occupancy in 2027; model does not estimate occupancy or harvest probability."); then p margin-top 12 with strong (fg `ink`) "The weights and admission thresholds are unvalidated planning heuristics." + " The scouting index ranks candidates against each other from 0 to 100. It is not a probability."
- "Weights": grid 4 columns (2 on phone), gap 8; **WeightTile** (repeat x4): `r` 5, bg `paper`, pad 8/12, centred, Sans 10; strong block **Display** 24 / 400, leading 1.25, fg `ink`: "35%" then label "Water"; Shelter 25%, Darkness 25%, Security 15%. Formula line: "Scouting index = " + code (mono 11, fg `ink`) "0.35 × water + 0.25 × shelter + 0.25 × darkness + 0.15 × security".
- "Component formulas": dl, rows spaced 16. dt weight 700 fg `ink`: label + span (weight 400, fg `muted`) "· {meaning}". dd: code block (mono 11, leading 1.6, `r` 4, bg `paper`, pad 10/6, margin-top 4, wraps anywhere) formula; p margin-top 6 description. All data.
- "Admission thresholds": p **static** "A place is a candidate only if it passes every one of these."; disc list (pad-left 18, gap 2): data, e.g. "Perennial water 30–450 m away", "Inside the wilderness boundary", "Candidates at least 400 m apart", "Slope at most 30°", "On mapped USFS fee land", "Not inside a mapped lake", "Canopy cover at least 30%", "At least 200 m from mapped access", "Water component at least 25", "Security component at least 20".
- "Two pools": dl: dt bold `ink` "Nearby" / "Wilderness context" + dd data; p data (route-limit reason).
- "Known limitations": disc list (gap 6) of data; vintages as "**{Label} data:** {text}" (label bold `ink`); h4 **static** "Only the field can confirm" (700, `ink`, margin-top 12); disc list of required field checks (data).
- "Sources": list, gap 12; **SourceRow** (repeat): top border `line`, pad-top 10; link weight 700, fg `ink-soft`, underlined, opens a new tab: source name (data) + text glyph " ↗" (U+2197, aria-hidden) + sr-only " (opens in a new tab)"; `small` block Sans 11, leading 1.6, fg `muted`: "{vintage} · {note}" (data).
- Opens from the TopBar; not in the screenshot.

## 30. FatalError (FatalError.tsx)

- Full-page: role alert, flex centred, height 100%, bg `ink`, fg `topbar-text`, pad 16 x / 40 y. Card: width 100%, max-w 560, `r` 10, bg `sheet`, fg `ink`, pad 28 (phone 20), shadow `shadow-panel`.
- Eyebrow **static** "JAMES PEAK SCOUTING ATLAS": Sans 10 / 700, ls .11em, fg `muted`. h1 **static** "The atlas data couldn’t be loaded": **Display** 28 / 400, leading 1.15, ls -.025em, margin-top 8. p **static** "Nothing is shown in its place: the atlas never substitutes invented locations." Sans 13, fg `ink-soft`, margin-top 12.
- Detail dl: grid `auto 1fr`, gap 16 x / 8 y, margin-top 20, `r` 5, 1 px `line`, bg `paper`, pad 16, Sans 12. dt (700, fg `muted`) "File" + dd code (data); optional "Record" + dd (data); "Problem" + dd (data, wraps anywhere).
- p **static** "Reload the page. If this keeps happening, the deployed data bundle is incomplete or invalid." Sans 11, fg `muted`, margin-top 16. Button **static** "Reload": `r` 5, 1 px `ink`, bg `ink`, pad 13/10, Sans 12, fg `topbar-text`, margin-top 16.

## 31. MapLoading (App.tsx 472-480)

- Role status, absolute fill of `main`, flex column centred, gap 10, bg `paper`. Spinner span 28x28 circle, 2 px border `line-strong`, top border `ink`, `animate-spin`. Strong **static** "Opening the atlas": **Display** 23 / 400. Span **static** "Loading the bundled map data": Sans 11, fg `muted`.

## 32. FeaturePopup (`popupElement` in mapAdapter.ts; CSS `.feature-popup*`; text from featurePopup.ts)

- Leaflet popup, `maxWidth: 250`, class `feature-popup`. Wrapper: `r` 7, bg `sheet`, fg `ink`; Leaflet defaults still apply: padding 1, left aligned, shadow `0 3px 14px rgba(0,0,0,0.4)`. Tip: 17x17 rotated square, bg `sheet`, same shadow. Content: margin 12 / 16, Sans 12, leading 1.45. Leaflet's close "×" (24x24 link, 16 px, #757575) sits top-right.
- Lines (text nodes): **Title** (700, margin-bottom 3): feature name, else the layer label. **Meta** (Sans 11, fg `ink-soft`, only if non-empty): values joined with " · ", underscores shown as spaces. **Note** (Sans 11, fg `alert-text`, margin-top 4): one line each.
- Variants (layers with popups: trails, roads, water, trailheads, campgrounds, gmu_boundaries). Meta: trails/roads "{surface} · {access} · {type}"; water "{water_regime} · {type}" e.g. "perennial · stream river"; gmu "GMU 38". Notes: water "Mapped feature; 2027 flow not verified."; roads "Road geometry does not establish vehicle access."; trailheads vehicle note else "Vehicle approach unverified."; campgrounds "Inventory status: {status or Unknown}" + "{status note or Not a 2027 opening forecast.}"; trails, gmu none.
- Open and close states only. Markers that open popups get aria-label "{name}, {layer}".

## 33. CandidateMarker (mapAdapter.ts `setCandidates`; CSS `.candidate-marker*`)

- Leaflet divIcon, iconSize 34x34, anchor 17,17, class `candidate-marker` (+ `context` for Wilderness context). Wrapper: no border, transparent. Core `span`: 31x31 circle (top-left of the 34 box), centred text, 2 px border, Sans 11 / 750 (renders as bold with system fonts), fg `#fffaf0`.
- Text **data**: short ID: `EP-04` -> "E4", `JP-10` -> "J10" (E1..E6 for EP-01..06).
- States (core): **Nearby** bg `marker` #a56227, border `#fff8e9`, shadow `0 2px 8px #39250a45, 0 0 0 1px marker-ring`. **Context** bg `marker-context` #e9dfc8, border `sheet`, shadow `0 2px 7px #183a2430`, fg `marker-context-text` #5b5b3c. **Selected** bg `marker-selected` #173e35, fg `#fffaf0`, shadow `0 0 0 5px #bd7b3e44, 0 2px 8px #39250a55`, scale 1.12 (transition 0.15 s transform); selected changes only bg, shadow, fg and scale; the border stays the pool's own (`#fff8e9` Nearby, `sheet` Context). Focus: ring (radius 50%, offset 2). Hover raises it above its neighbours and shows the tooltip.
- Tooltip (see section 37): "EP-04 · East Portal scout 4 — Unnamed mapped stream". aria-label: "EP-04: East Portal scout 4 — Unnamed mapped stream, scouting index 72 / 100, marker E4".

## 34. PointMarker (`pointMarker` in layerStyles.ts; CSS `.point-marker*`)

- divIcon 24x24, anchor 12,12; wrapper flex centred, transparent (24 px hit target around the symbol). Inner `span`: 17x17 circle, 2 px border `#ffffff`, bg `#3e7184`, ring `0 0 0 1px #315a68`, fg `#ffffff`, Sans 8 / 750, line-height 1.
- Variants (**text glyphs**, not svg): Trailhead class `trailhead`: glyph "P", `r` 3 (rounded square), bg `#274c3d`, ring `#1d3a2e`. Campground class `campground`: glyph "△" (U+25B3), round, bg `#7a7160`, ring `#5d5649`. Water/spring class `water`: glyph "≈" (U+2248), round, bg `#3e7184` (base), ring `#315a68`.
- Keyboard focusable only when it opens a popup; focus ring as markers.

## 35. ObservationMarker (private build only; mapAdapter.ts `setObservations`; CSS `.observation-marker`)

- divIcon 20x20, anchor 10,10; inner empty `span`: 14x14 square, margin 3, 2 px border `#ffffff`, bg `observation` #315f4d, shadow `0 0 0 1px observation-ring, 0 2px 6px #183a2440`, rotated 45 deg (diamond). Not keyboard focusable. Tooltip "{id} · {name}" (offset -11). No public sample (public build has none); do not add one to the public library.
- **ObservationSwatch** (ObservationList.tsx, used by Legend and ObservationList): 9x9, rotate 45, 1.5 px border `sheet`, bg `observation`, ring `0 0 0 1px observation-ring`.

## 36. ObservationList (private build only; ObservationList.tsx)

- `section`: margin-top 24, top border `line`, pad-top 20. h2 **static** "OBSERVATIONS": Sans 10 / 700, ls .11em, fg `muted`, margin-bottom 6. p **static** "Field sightings you recorded first-hand. They’re evidence, not model output, and are never ranked with the candidates." Sans 10, leading 1.55, fg `muted`, margin-bottom 12.
- Row `li` (repeat, data): margin-bottom 9, `r` 6, 1 px `#cbd9cf`, bg `#f1f5f0`, pad 13. Line 1: flex, gap 9: swatch (margin-x 4) + name (Sans 12 / 700, leading 1.3). Line 2: flex-wrap, gap 10 x / 4 y, margin-top 8, Sans 10, fg `#5d6f62`: id; "Observed {date}" (optional). Optional note p: Sans 11, leading 1.5, fg `ink-soft`, margin-top 6.

## 37. Map tooltips (`index.css`)

- **CandidateTooltip** (`.candidate-tooltip`, hover over candidate and observation markers; direction top, offset -15 / -11): 1 px border `#d4dccd`, `r` 4, bg `#fffdf2f2`, fg `#2f4d3b`, Sans 10, pad 8 x / 5 y, shadow `0 2px 8px #20341a14`; Leaflet's tip arrow stays. Text data: "EP-04 · East Portal scout 4 — Unnamed mapped stream".
- **ContourLabel** (`.contour-label`, permanent; up to 45): no border, bg transparent, no shadow, fg `#706c58`, 9 px, ls .02em, pad 0, text-shadow `0 1px 2px #fff, 1px 0 2px #fff`, tooltip opacity 0.8, tip hidden. Text data: elevation + prime, e.g. "10,600′" (U+2032). Zoom >= 13 only.

## 38. Leaflet default controls (not styled by the repo; values from `leaflet.css`)

- Zoom (bottom right; `+` and `−` links): bar `r` 4, shadow `0 1px 5px rgba(0,0,0,0.65)`; link 26x26 (30x30 with a 2 px `rgba(0,0,0,0.2)` bar border on `.leaflet-touch`), bg `#fff` (`#f4f4f4` hover), 1 px `#ccc` divider; glyphs bold 18 px 'Lucida Console', Monaco, monospace; fg black; disabled fg `#bbb`.
- Scale (bottom left, margin 5; metric and imperial lines, max 130 px): 2 px `#777` border (no top), bg `rgba(255,255,255,0.8)`, fg `#333`, text-shadow `1px 1px #fff`, pad 5 / 2 / 1; text from the screenshot: "500 m" and "3000 ft" (data).
- Attribution (bottom right): bg `rgba(255,255,255,0.8)`, fg `#333`, pad-x 5, leading 1.4, links no underline. Text: "Leaflet" (link) + " | " + "USGS · USFS · NHD · NLCD" (static). Font inherits Sans (the repo sets `font-family: inherit` on `.leaflet-container.atlas-map`).

## 39. Reference: layer swatch colours (`LAYERS`, layerState.ts) and map line styles (`layerStyles.ts`)

Swatch (control and legend): trails `#9a6035`; roads `#676a60`; campgrounds `#7a7160` (point); trailheads `#355447` (point); boundary `#375f44`; ownership `#849d61`; gmu_boundaries `#946b89`; official_topo `#c7bb97`; contours `#a28a62`; hillshade `#b1b49b`; canopy `#477b45`; water `#438ba0`; water_score `#3d8fa4`; darkness `#5c518a`; overall_score `#be9441`; shelter_score `#5d8751`; security_score `#aa764d`.

Map symbology (colour, weight px, opacity, extras): boundary `#375f44` 2.2, 0.9, dash 8 5, no fill; gmu_boundaries `#946b89` 1.4, 0.85, dash 5 4; contours index `#82704d` 1.05 (0.85 below zoom 14), 0.62, minor `#9a8d70` 0.5, 0.37 (0 below zoom 13); ownership `#849d61` 1, 0.55, fill `#b1c68a` 0.17; trails `#985f34` 2, 0.94, dash 4 4; roads `#686a60` 2.7, 0.8; water `#468ca0` 1.5, 0.86, fill `#80b8c8` 0.32 (unknown or artificial: `#8b9694`, fill `#a8b2af`; intermittent/ephemeral dash 3 4); default `#7a7160` 1.2, fill 0.25. Overlay rasters follow Overlay strength (hillshade fixed 0.9, USGS topo fixed 1).

## 40. Suggested small components to extract

Segmented control (PresetGroup + ScopeToggle), FieldSelect row, LayerSwitch (checkbox + line/point swatch + states), Chip (PoolRank, FieldStatus x4, RouteNote, Planning, count), PositionBadge, ComponentBar x4, MetricCell, DetailHeading, BulletItem, Callout (Cautions, Scenario, LowWater), Notice, MapButton, Button primary / secondary / tool-link / retry / dismiss (×), Legend rows (symbol, ramp, candidate swatch), ExportItem, SourceRow, WeightTile, markers (Candidate x3 states, Point x3 glyphs, Observation), Tooltip x2.

## 41. Not fully characterised

- Native browser controls: select chevron, range thumb, search clear button, file input, dialog focus handling.
- Leaflet's own controls (section 38) are documented from `leaflet.css`, not from the repo.
- Weight 750 on markers depends on the font; system fonts will show 700.
- The screenshot crops CandidateDetail after the Shelter bar; the lower half is built from code and data, not seen rendered.
