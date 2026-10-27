# 11: Method and sources

**What to build:** A Method and sources dialog generated from the bundled method specification. It sets out the formulas, weights, thresholds, scenario and limitations honestly, and cites the sources.

**Blocked by:** 03 (Data to map)

**Status:** resolved

- [x] The dialog renders the four component formulas, the weights, the admission thresholds, the two-pool selection, the scenario (2027 low water, occupancy assumed) and the known limitations from the method specification. None of this text is hard-coded.
- [x] It states that the weights and thresholds are unvalidated planning heuristics and that the scouting index is not a probability.
- [x] Source citations come from the manifest, with working external links. The private CalTopo source isn't there.
- [x] The dialog traps focus while open, closes with Escape, and returns focus to the button that opened it.
- [x] Playwright: open the dialog, check the key sections are present and every link has a valid URL, then close it and confirm focus returns.

## Comments

**Built and verified locally.** The full CI sequence passes: data check, type check, 38 Vitest tests (7 new), build, and 13 Playwright tests (5 new, in `tests/e2e/method.spec.ts`).

- **Content model** (`src/ui/methodContent.ts`). `methodContent(atlas)` turns the validated method and manifest into the dialog's sections. Every number, formula and description comes from `method.json`. The only wording in code is the component labels, short sentences for the selection keys (filled with the data's values) and the honesty statement the checklist asks for. A selection rule with no wording is still shown, by its own key name, so a new rule in the data never disappears silently.
- **The method is now a contract.** The `Method` schema requires each component's `meaning`, `description` and `formula`, plus `planning_year`, `scenario`, `occupancy_assumption`, both pool descriptions, `route_limits.reason`, `distance_uncertainty`, `source_vintages` and `required_field_checks`. The `Manifest` schema requires `sources`. A source that has a `url` must be an absolute http(s) link, or the manifest fails validation and names the source.
- **Citations follow a rule, not a name.** Only sources with an external link are cited, since a source you can't follow can't be checked. That leaves out S8, whose link was removed under ADR 0001, without the code naming it. Playwright checks that the page never contains "CalTopo". The public `manifest.json` still carries S8's name, as ticket 01 decided; the spec's CI check for no CalTopo reference in `dist/` will need to allow for that or rename it.
- **Withheld: the known-anchor radius.** `selection.exclude_known_anchor_radius_m` (250 m) is the exclusion zone around the owner's observations. Showing it would tell visitors observations exist, so it isn't listed among the thresholds (ADR 0001, "no trace"). `interpretation` isn't shown either, because it names the retired "Perfect spots" label. **Owner decision:** if the 250 m rule should be disclosed for honesty, add it back as a generic "away from known field sites" line.
- **Dialog behaviour** (`src/ui/MethodDialog.tsx`). It uses the native `<dialog>` with `showModal()`, so the page behind is inert. Tab and Shift+Tab wrap at either end, so focus can't leave for the browser's own controls. Escape is handled on `cancel`, so the parent unmounts the dialog and the browser never closes it on its own. That matters in StrictMode, where a native `close` event from the dev-only unmount would arrive after the remount and shut the dialog straight away. On unmount the dialog returns focus to whatever was focused when it opened. A click on the backdrop also closes it, as in the reference.
- **Links are checked for shape, not liveness.** Playwright checks that each link parses as `https:`, opens in a new tab with `rel="noopener noreferrer"` and announces that it opens a new tab. It doesn't fetch the external sites, which would make CI depend on usda.gov and usgs.gov being up.
- **App change** is limited to `Topbar`: a "Method and sources" button (an ⓘ icon with a screen-reader-only label under 800 px) that stays disabled until the atlas loads, and the dialog mount.
