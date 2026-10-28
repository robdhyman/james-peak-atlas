Status: ready-for-agent

# Spec: Figma component library for the James Peak Scouting Atlas

Decided on 2026-10-28 over four grilling rounds (24 decisions, all accepted). Companions in this folder: `inventory.md` (what every component shows, with exact values read from the code) and `state.json` (the build's state ledger).

## Problem Statement

The atlas exists only as code. There is no design file where its chrome can be looked at, rearranged, or handed to someone without running the site. The owner wants the interface around the map, and the icons that sit on top of the map, as basic Figma components in the "James Peak App" file, so that the atlas can be discussed and redesigned in Figma. The map's own content (rasters, contours, vector layers) cannot be Figma components and does not need to be.

Three things make this harder than tracing a screenshot:

- **Figma has no Georgia**, the atlas's display face, so a stand-in has to be chosen and recorded, or the Figma and the site drift quietly.
- **The theme defines 35 colour tokens, but the components mostly use literal hex**: 134 distinct values, several one digit away from a token. A library that bound everything to tokens would claim a system the code does not have. One that bound nothing would not be a library.
- **The Figma file is empty but already subscribes to a team colour library from another project**, which a build would be tempted to reuse.

## Solution

Build a small, honest component library from the shipped code, in four phases: foundations, components, screens, checks.

- **Foundations.** One "Atlas" variable collection that mirrors the theme tokens one for one, plus the two font families and the one panel shadow.
- **Components.** Every piece of chrome in the four regions (top bar, sidebar, map, overlays). Five variant sets where the app has real state; plain components with text properties everywhere else. The four inline SVG icons import as vectors. The glyph markers are rebuilt as shape plus text, which is how they render.
- **Screens.** Three composed frames that match the three captures already in the repo.
- **Checks.** Counts read back from the file, a font assertion over every text node, and a screenshot pair per screen.

The map is a placeholder frame in the map-canvas colour with the chrome composed on top. The published screenshot lives on a Reference page outside the deliverable. The library speaks the glossary: candidate, pool, Nearby, Wilderness context, scouting index, pool rank, scout order, scope, field log, field status, minimum round trip, observation.

## User Stories

### Foundations

1. As the atlas owner, I want every theme colour as a Figma variable named after its CSS custom property (`color/ink` for `--color-ink`), so that a colour in Figma and a colour in code are the same thing by name.
2. As the atlas owner, I want each variable's web code syntax set to the real property (`var(--color-ink)`), so that anyone inspecting a fill in Figma sees what to write in code.
3. As the atlas owner, I want one collection with one mode, so that the file does not pretend to a dark theme the site does not have.
4. As the atlas owner, I want the two font families as variables and the panel shadow as an effect style, so that type and elevation are bound, not typed.
5. As the atlas owner, I want a specimen sheet with the swatches grouped under the stylesheet's own comment headings (Forest green, Paper and rules, Map notices, Candidate markers, Observations, Amber accents, Text on the forest-green header, Water), so that the meaning of each colour survives the flat naming.
6. As the atlas owner, I want the three breakpoints written on the sheet as a note rather than stored as variables, so that nothing exists in Figma that has no property to bind to.
7. As the atlas owner, I want the three tokens the code defines but never uses (amber, amber-pale, water) created anyway, so that the Figma list and the theme list match exactly.
8. As the atlas owner, I want the attached "hevy Colors" library left untouched and unreferenced, so that the atlas never depends on colours I do not control.
9. As the atlas owner, I want a literal colour bound to a variable only on an exact match, snapped to a token when every channel is within 2 and listed as code drift, and otherwise kept as plain hex, so that the file is faithful and the snaps become a free audit of the stylesheet.
10. As the atlas owner, I want Literata for display text and SF Pro for body text, with the Georgia substitution recorded in this spec, so that the one unavoidable difference from the site is a known one.
11. As the atlas owner, I want marker numerals set in Bold, so that the code's weight 750, which Figma cannot express, resolves the way system fonts already render it.

### Components

12. As the atlas owner, I want the top bar as a component holding the brand mark, the eyebrow and title, the method link with its info ring, the scenario badge, the export button, and the phone-only menu button, so that the header can be placed on any screen in one drop.
13. As the atlas owner, I want the sidebar header and the two tabs with their count chip, so that the panel's framing is a component and not loose text.
14. As the atlas owner, I want one Segmented control component instanced as the Nearby / All scope toggle and as the Terrain / Low water / Quiet cover preset group, so that the two identical controls cannot drift apart.
15. As the atlas owner, I want a Section header component for "Ground & access · 01" and "Habitat evidence · 02", so that the layer groups read the way they do on the site.
16. As the atlas owner, I want a Layer switch with four variants, off, checked, checked and loading, and failed with a Retry, each with its line or point swatch, so that "failure you can see" is visible in the library.
17. As the atlas owner, I want the model scores group built as a plain frame of Layer switch instances resized to the compact height, so that it needs no component of its own.
18. As the atlas owner, I want the overlay strength slider as a component with its value and note, so that the layers panel is complete.
19. As the atlas owner, I want a Callout component with an eyebrow and body as text properties, used for the low-water scenario note and for the cautions in the detail panel, so that the two boxes share one shape.
20. As the atlas owner, I want one Select row component used for Sort, for Field status, and for the field log's status in the detail panel, so that the three selects cannot drift apart.
21. As the atlas owner, I want the search field with its magnifier vector and placeholder, so that the list's top is complete.
22. As the atlas owner, I want the field log tools row with its summary and three text links, so that the log's entry points are in the library.
23. As the atlas owner, I want a Candidate card with 3 × 4 variants (default, selected, focused by To scout, Scouted, Camera placed, Ruled out) and six text properties (position, name, index, ID, pool rank, round trip), with the pool rank chip, the field status chip and the caution chip as nested components and the caution chip switchable by a boolean with its own text, so that every card in the published list can be produced without detaching.
24. As the atlas owner, I want the list's empty state as a component, so that "No candidates match this view." is in the library beside the cards it replaces.
25. As the atlas owner, I want the detail panel as one component whose repeating parts are nested components: a Component bar (label, weight, score as text; fill width set by resizing), a Metric tile (value, label, provenance), the chips, the uppercase Detail heading, a bullet list item, the planning chips, and the field log form using the shared Select, so that the panel can be resized to the phone sheet without a second component.
26. As the atlas owner, I want the Legend as two components, a trigger that is a Map button and a panel with symbol rows, ramp rows with end labels, and the two candidate rows, so that each sits where it does on the map.
27. As the atlas owner, I want the Export menu as two components, the top-bar button and the panel with its intro line and three format items, so that the menu is inspectable without a screen.
28. As the atlas owner, I want the canopy readout with its ready, no-data and failed texts, so that the one hover instrument on the map is in the library.
29. As the atlas owner, I want a Notice box used for the field log notices and the link notice, with and without a dismiss button, so that every warning shares one shape.
30. As the atlas owner, I want the confirm dialog (reset and replace instances), the method dialog with its weight tiles and source rows, the fatal error card, and the map loading state, so that every state the rebuild added can be seen.
31. As the atlas owner, I want the feature popup with its title, meta and note lines, so that what a tap on a trail or stream shows is in the library.
32. As the atlas owner, I want a Candidate marker with three variants, Nearby, Context and Selected, and a text property for the short label, so that markers can be placed by hand on the placeholder map.
33. As the atlas owner, I want a Point marker with three kinds, Trailhead as a square green P, Campground as a round grey tent, Spring as a round blue wave, each a 17 px symbol in a 24 px target, so that the evidence points match the site.
34. As the atlas owner, I want the observation marker and its swatch built as components from the public stylesheet, with no observation data anywhere in the file, so that the private build's design is represented without its evidence.
35. As the atlas owner, I want the candidate tooltip and the contour label as components, so that everything that floats over the map is in the library.
36. As the atlas owner, I want the zoom control, scale bar and attribution drawn as plain components from Leaflet's defaults, so that the map chrome is complete.
37. As the atlas owner, I want one Button component set with a Kind axis covering the top bar's export button, the dialogs' primary and secondary, the map button, the text link, Retry and the × dismiss, each with a label text property, so that the seven button styles share one definition.
38. As the atlas owner, I want the four inline SVG icons (menu lines, brand mark, magnifier, download arrow) imported as editable vectors and offered through instance-swap slots, so that icons are never redrawn by eye.

### Screens

39. As the atlas owner, I want a desktop frame at 1440 × 900 showing the Candidates tab in scout order with EP-04 selected, its detail panel open, the legend panel open, the export menu closed, and the candidate tooltip above the selected marker, so that the library is seen in the layout the published screenshot shows.
40. As the atlas owner, I want a phone frame at 390 × 844 with the drawer open on Map layers on the Terrain preset, and a second phone frame with EP-04's detail open as the bottom sheet, so that the two phone captures in the repo have Figma twins.
41. As the atlas owner, I want the map area on every screen to be a placeholder frame filled with the map-canvas token, with markers, legend, zoom, scale bar, attribution and readout composed on top, so that nothing in the file pretends to be a map layer.
42. As the atlas owner, I want the published screenshot placed on a Reference page and never inside a component or screen, so that the real render is there to compare against without becoming part of the deliverable.
43. As the atlas owner, I want the dialogs, the export menu, the notices, the empty state and the loading state shown only in the Components review frame, so that the screens stay faithful to the captures.
44. As the atlas owner, I want the sidebar built with auto-layout so that one instance can be resized from 326 px to the 296 px drawer width, so that no tablet screen or width variant is needed.

### Build and proof

45. As the build agent, I want a state ledger beside this spec recording every created node, variable and style ID, so that a cleared context or a new session can resume without rebuilding.
46. As the build agent, I want to commit the spec and the ledger to main at each phase boundary, so that a stopped build leaves a resumable trail.
47. As a reviewer, I want the main components kept out of the screens and shown as instances in one compact review frame per page, so that screens stay clean and components stay inspectable.
48. As a reviewer, I want the counts, the font assertion and the screenshot pairs run at the end and their results written into the ledger, so that "done" is evidence, not a claim.
49. As the atlas owner, I want every snapped colour listed in the ledger with its literal, its token and the component it came from, so that the stylesheet can be cleaned up later from that list.
50. As the atlas owner, I want nothing private in the file: no observation data, no coordinates other than the public candidates', so that the file could be shared as freely as the repo.

## Implementation Decisions

### Scope and file

- The target is the existing "James Peak App" design file, which has one empty page. Five pages replace it: Foundations, Components, Icons and markers, Screens, Reference.
- Scope, in the Figma library skill's terms, is a full library at v1 inventory: foundations, the component inventory in `inventory.md`, three screens, and the checks. Code Connect, documentation beyond the specimen sheet, and publishing to a team are out.
- The Figma MCP's `figma-generate-library` skill drives the build, with `figma-use` loaded for every write, and `figma-generate-design` for the three screens. Writes are sequential, never parallel.

### Foundations

- One local collection named "Atlas" with one mode. Variables are named flat after their CSS custom properties: `color/ink`, `color/marker-ring`, `font/display`, `font/sans`. No regrouping by role.
- Scopes: fills on frame and shape fill, text colours on text fill, lines on stroke colour. No variable is left on all scopes. Web code syntax is the `var(--…)` form of the property. Primitive and semantic layers are not split, since the theme itself is flat.
- The panel shadow is an effect style named `shadow/panel`. The three breakpoints are a note on the specimen sheet.
- Spacing and radius are plain numbers on components. The code has no spacing scale and the library will not invent one.
- The attached "hevy Colors" library is not imported, aliased or searched for reuse.
- Literal colours: bind on exact match; snap when |Δ| ≤ 2 on every channel and record the snap in the ledger's drift list; otherwise set the literal hex. The three unused tokens are still created.

### Type

- Display: Literata, Regular. Body: SF Pro, Regular and Semibold (the style string is one word in Figma). The markers' weight 750 becomes Bold. These are the only families allowed in the file.
- The sizes come from `inventory.md`; the specimen sheet shows the display ramp (34, 30, 28, 27, 24, 23, 22) and the body ramp (17, 14, 13, 12, 11, 10, 9, 8).

### Components

Variant sets, five in all:

| Set | Axis | Variants |
| --- | --- | --- |
| Layer switch | State | Off, Checked, Loading, Failed (nests a Retry Button) |
| Candidate card | State × Field status | Default, Selected, Focused × To scout, Scouted, Camera placed, Ruled out |
| Candidate marker | Pool | Nearby, Context, Selected |
| Point marker | Kind | Trailhead, Campground, Spring |
| Button | Kind | Export, Primary, Secondary, Map, Text link, Retry, Dismiss |

Plain components with text properties, by page section:

- Top bar: Top bar (nests brand mark vector, Method link, Scenario badge, Export Button, Menu Button), Count chip.
- Sidebar: Sidebar header, Tabs, Segmented control (segment text properties, pressed boolean per segment), Section header, Overlay strength, Callout (eyebrow, body), Select row (label, value), Search field, Field log tools, Empty state, Position badge, Pool rank chip, Field status chip, Caution chip, Planning chip.
- Detail: Detail panel (nests Detail heading, Component bar × 4, Metric tile × 8, Bullet item, Callout, Planning chip, Select row, Notes field), Component bar (label, weight, score; fill by resize), Metric tile (value, label, provenance), Detail heading, Bullet item.
- Map: Map button, Legend panel, Legend symbol row, Legend ramp row, Canopy readout, Notice (dismissable boolean), Feature popup, Zoom control, Scale bar, Attribution, Candidate tooltip, Contour label.
- Overlays: Export menu panel, Export item, Confirm dialog, Method dialog, Weight tile, Source row, Fatal error, Map loading.
- Icons and markers: Menu, Brand mark, Magnifier, Download (vectors from the code's SVG); Candidate marker, Point marker, Observation marker, Observation swatch (shape plus text); the two map text pieces.

Rules that apply to all of them:

- Every component's default text is the published screenshot's data for EP-04, listed in `inventory.md` section 3, so that a fresh instance already reads like the site.
- Icons go into instance-swap properties, never into variants.
- The model scores group, the ramp bars in the legend, and the metric grid are frames of instances, not components.
- The selected Candidate marker is drawn at its 1.12 scale with the 5 px halo, so the set's frames are not all the same size; the screens leave room for it.

### Screens

- Desktop 1440 × 900: top bar, sidebar at 326 px on the Candidates tab (scope toggle visible at the top of the list, scout order, EP-04 card selected), map placeholder with markers E1 to E6 and the two P trailheads near the East Portal, legend panel open at bottom left, detail panel open at right, canopy readout absent, export menu closed.
- Phone drawer 390 × 844: top bar at 72 px with the menu button, the sidebar instance resized to 296 px over the map on the Map layers tab, Terrain preset pressed, legend closed.
- Phone sheet 390 × 844: top bar, map placeholder, detail panel instance resized to full width as the bottom sheet, drawer closed.
- The Reference page holds the published screenshot and the two phone captures as images, labelled with their source paths, outside every component.

### Build process

- The build runs in a fresh session in this checkout, reading this spec, `inventory.md` and `state.json`, not the conversation that produced them.
- The ledger `state.json` is read at the start of every turn and written after every create. It records the run ID, the current step, every entity ID by deterministic name, pending validations, completed steps, and the colour drift list.
- At the end of each phase (foundations, components, screens, checks) the session commits `spec.md` and `state.json` to main. Nothing else in the repo changes.
- A retro runs in the build session when the checks pass.

## Testing Decisions

A good check reads the Figma file back and compares it with this spec; it does not trust the script that wrote it. Three checks, all recorded in the ledger:

1. **Counts.** A read-only script returns the variable count by type (35 colour, 2 font), the effect style count (1), the component set count (5) and each set's variant count (4, 12, 3, 3, 7), the plain component count against the inventory, and the page list. Any mismatch fails the phase it belongs to.
2. **Fonts.** A read-only script walks every text node in the file and returns any whose family is not Literata or SF Pro, with its page and parent. The list must be empty. A successful font load is not evidence; only the read-back is.
3. **Screenshot pairs.** One screenshot of each screen frame beside its capture in the repo (the published desktop screenshot, the 390 px drawer capture, the 390 px detail capture). The build lists every visible difference. Tolerated differences, recorded in advance: the Literata and SF Pro substitution; the legend open on desktop where the capture has it closed; the scope toggle visible where the capture scrolled it away; the map area being a flat placeholder; and the lower half of the detail panel, which the desktop capture crops and which is built from code and data.

Prior art: the repo's usability captures are produced by its end-to-end tests at a 390 × 844 viewport, and the published screenshot at 1280 × 640 CSS pixels; those are the references, and nothing else in the repo tests design.

## Out of Scope

- Map rasters, contours, vector layers, and any attempt to draw the terrain. The map is a placeholder.
- Observation data, the observation list, and anything from the private build other than the marker's style.
- A tablet (800 to 1100 px) screen; the sidebar width is an instance resize.
- Dark mode, a spacing or radius scale, semantic colour aliases, and reuse of the "hevy Colors" library.
- Code Connect mappings, component descriptions beyond a one-line purpose, and publishing the library to a team.
- Prototyping links, interactions and motion.
- A page per component. Five pages in all.
- A Figma Code layer running the app beside the components. It can be added later without touching the library.
- Fixing the stylesheet's colour drift. The build lists it; the fix is separate work.

## Further Notes

- **Figma facts, checked on 2026-10-28.** File key `FqbSZ8tKFAU7j8sInSFwQ7`, single page "Page 1" (`0:1`), empty. Libraries attached: "hevy Colors" (team). Available to add: Material 3, Simple Design System and the Apple OS kits; no icon kit. Fonts: no Georgia, no Helvetica Neue, no Segoe UI; Literata, Source Serif 4, Libre Caslon Text, Fraunces, Playfair Display, SF Pro (Regular, Semibold, Bold, Heavy) and Inter are present.
- **Expansion of one decision.** Round four fixed the Button set at five kinds. The inventory shows the "primary" style is three things in code (the top bar's export button, the dialogs' primary, the dialogs' secondary), so the set carries seven kinds. Still well under the thirty-variant cap.
- **Continuation prompt** for a new session: "Continue the James Peak Atlas Figma library build. Read `.scratch/figma-library/spec.md`, `inventory.md` and `state.json`. Load the figma-generate-library and figma-use skills and resume from the ledger's last completed step."
- **Known gaps from the inventory.** Native browser controls (select chevron, range thumb, search clear) are drawn as simple shapes. Leaflet's zoom, scale and attribution are characterised from Leaflet's own stylesheet, not the repo's.
- **Why a one-page Reference and not a Figma Code layer.** The design skill forbids a flattened capture inside the deliverable; a reference page outside it keeps the real render available for the screenshot pairs without it becoming part of the library.

## Build amendments

- **2026-10-28, body face.** SF Pro appears in Figma's font list but the build runtime cannot load or render it: every SF Pro text node reported `hasMissingFont` and a width of 0, bound or unbound, while Literata rendered. The library's body face is therefore **Inter** (Regular, Semi Bold, Bold for the code's 400, 600 and 700+), held in the `font/sans` variable so that changing that one value to `SF Pro` in Figma desktop re-fonts every body text node. The font assertion in Testing Decisions accepts Literata and Inter; the Literata and Inter substitution is a tolerated screenshot difference. Recorded in `state.json` under `notes`.
- **2026-10-28, colour count.** The theme defines 30 colour tokens, not 35 (2 fonts + 30 colours + 1 shadow + 3 breakpoints). The counts check expects 30 colour variables and 2 font variables.
