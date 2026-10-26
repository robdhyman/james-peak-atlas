# React + TypeScript + Tailwind rebuild handoff

## Goal

Rebuild the working atlas as a well-engineered, accessible map product with source on GitHub and a reproducible live demo. Use the current application as the visual and behavioral reference. Preserve the geography and methodology while making deliberate improvements to interaction, architecture and verification.

TypeScript is an explicit working assumption: the request said “Actionscript.” ActionScript is a different language and is not the intended implementation of this handoff. No React or Tailwind project has been generated in this ZIP, and no external skills have been installed or executed.

## Matt Pocock workflow

The repository was reviewed through GitHub on October 26, 2026 at commit **`5beb35b040e3de97e54fa9e386d7e42d15c295c2`** (commit date October 19, 2026). It supplies engineering workflows, not a React/Tailwind starter or an automatic conversion tool.

| Step | Reviewed skill | Use here |
|---|---|---|
| Configure | [setup-matt-pocock-skills](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/setup-matt-pocock-skills/SKILL.md) | Set a tracker, glossary and ADR locations. Local Markdown is sufficient before a GitHub repository exists. |
| Clarify | [grill-with-docs](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/grill-with-docs/SKILL.md) | Resolve candidate versus observation, model rank versus scouting order, and distance versus route. |
| Specify | [to-spec](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/to-spec/SKILL.md) | Convert this handoff into behavior, scope and acceptance criteria. |
| Sequence | [to-tickets](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/to-tickets/SKILL.md) | Define independently demonstrable vertical slices and dependencies. |
| Implement | [implement](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/implement/SKILL.md) | Implement a slice with checks, tests and review. This skill also commits work; invoke it deliberately in the selected local repository. |
| Verify | [tdd](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/tdd/SKILL.md) | Test observable behavior through agreed interfaces with independently chosen expectations. |
| Structure | [codebase-design](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/codebase-design/SKILL.md) | Put substantial behavior behind small, stable interfaces. Avoid architectural ceremony for its own sake. |
| Review | [code-review](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/code-review/SKILL.md) | Review spec fulfillment and engineering standards against a fixed commit. |

Installation routes documented in the reviewed [upstream README](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/README.md):

```sh
# Codex
codex plugin marketplace add mattpocock/skills
codex plugin add mattpocock-skills@mattpocock

# Claude Code alternative
claude plugin install mattpocock-skills@claude-plugins-official

# Other agents / editable local skills alternative
npx skills@latest add mattpocock/skills
```

Choose the route appropriate to your agent, then run `/setup-matt-pocock-skills` in the new repository. The installation commands target the versions available when you run them; they are not pinned by the reviewed commit above. Review current upstream instructions before installation. Do not install every alternative.

## Application architecture proposal

The following recommendations are specific to this atlas; they are not prescriptions quoted from Matt's repository.

Use React for interface state and composition, TypeScript for domain contracts, and Tailwind for a consistent token-based styling system. Keep the existing GIS data as immutable, versioned input during the first migration. Evaluate a direct Leaflet adapter versus a React integration explicitly, record the decision, and avoid changing renderer and data model at the same time without a reason.

Five useful boundaries:

1. **Data loading and validation:** parse the manifest and GeoJSON, validate ranges and coordinate order, surface a specific failure when one layer is absent.
2. **Candidate selectors:** scope, sort and search pure records. Keep `rank`, `score` and `scout_order` separate.
3. **Map adapter:** own map lifecycle, raster bounds, layer attachment and marker events. Dispose of listeners and the map on unmount; do not recreate it for every sidebar change.
4. **Recon storage:** explicit storage version, validation, save failure behavior and export/import decisions. Keep notes separate from immutable candidate metadata.
5. **Export serializers:** generate valid GeoJSON, GPX and CSV independently of the map UI. Test escaping and coordinate precision.

This is enough structure to begin. Extract more only when real complexity requires it. Review [DATA_CONTRACTS.md](DATA_CONTRACTS.md) before defining types. A frontend refactor should not silently change a candidate's location or score.

## Six vertical slices

| Slice | Demonstrable result | Acceptance evidence |
|---|---|---|
| 1. Data to map | Load the actual manifest, render the boundary and one layer, select one real candidate | Typed parsing, invalid-data error state, coordinate/bounds checks; screenshot matches the reference geography |
| 2. Evidence layers | All overlays, legends, opacity and presets work | Each control changes the intended layer; no network tile dependency; units and NoData semantics remain correct |
| 3. Candidate decisions | Nearby/all scopes, explicit sorting, search and detailed evidence | Six nearby records; documented practical order; no claim that minimum distance is route mileage; pool rank is visibly distinguished |
| 4. Field log | Status and notes survive reload, exports download | Validated saved records; storage failure handled; exported files parsed and checked, including special characters |
| 5. Usability and resilience | Responsive layout, keyboard workflow and recoverable failures | Keyboard can reach candidates without manipulating the map; focus returns after closing dialogs/cards; small-screen evidence; a deliberately failed layer remains understandable |
| 6. Publication | Reproducible build, GitHub source and live demo | Clean-checkout setup works; CI uses committed lockfile; host serves correct subpath; source/data attribution and release decision are recorded |

## Preserve these behaviors

- Observation anchors and inferred candidates are distinguishable in both legend and list.
- Candidate selection reveals raw metrics, component scores, source limits and location.
- Canopy 0% stays distinct from NoData 255; candidate canopy can differ from hover sampling.
- GeoJSON uses `[longitude, latitude]`; Leaflet uses `[latitude, longitude]`.
- Raster image bounds remain in Leaflet order over images rendered in EPSG:3857.
- The low-water scenario never turns unknown water into perennial water.
- Straight-line minimum distance, actual route distance and cumulative ascent are distinct concepts.
- Scores are indices and do not acquire percent signs or probability language.
- A failed raster does not leave a checked, apparently working control without an explanation.
- The map is useful through its list/card alternative, including when map interaction is difficult.

## Worthwhile improvements for your portfolio

Choose a few and document the tradeoff; do not turn the exercise into an unlimited roadmap.

- Offer explicit sorts: shortest minimum distance, combined score and component score. Remove the current ambiguity of interleaved within-pool ranks.
- Consolidate the duplicated darkness raster control, or add a genuinely separate normalized-score image with the correct units.
- Make layer loading and failure visible at the affected control, with a retry action.
- Improve mobile selection so the candidate and its immediate geographic context remain visible above the detail sheet.
- Provide a compact candidate comparison with reasons for the ranking, without implying statistical precision.
- Add a repeatable performance check: initial payload, parse/render time, interactive map latency and memory after repeated layer changes.
- Implement a deliberate public-demo data boundary and verify the produced deployment assets.

For each chosen improvement, record the observed problem, the design decision, the implementation and verification result. Keep before/after captures and use honest credit for the AI-assisted starting prototype and public data sources. The claim to prove is your engineering judgment and execution.

## Test seams

Use fixed examples and expected results that do not just call the implementation twice. Useful cases include malformed coordinates, absent layers, missing canopy, duplicate candidate IDs, pool sorting, distance labels, GPX XML escaping, CSV formula-like text, browser storage failure and persisted-note schema changes. End-to-end tests should save an actual exported file and parse it.

If later changing the habitat model, treat that as a separate data/model release with sensitivity analysis and field evidence. A successful TypeScript build does not validate ecological assumptions.

## Suggested first local-agent prompt

> Read README.md, docs/DATA_CONTRACTS.md, docs/REBUILD_HANDOFF.md and public/data/method.json. Run the reference app and package checks. Help me use Matt Pocock's workflow to write a scoped React + TypeScript + Tailwind rebuild spec. I want to make the product and architecture decisions myself. Preserve the supplied data, scores and source attribution until we explicitly approve a model change. Start with one end-to-end slice: validated manifest → map layer → selected candidate card. Before implementation, identify the smallest useful module boundaries and test seams. Keep a local Markdown tracker initially; don't create remote issues, publish data or change the existing hosted app unless I ask.
