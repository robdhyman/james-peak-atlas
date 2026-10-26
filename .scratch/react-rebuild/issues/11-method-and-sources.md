# 11: Method and sources

**What to build:** A Method and sources dialog generated from the bundled method specification. It sets out the formulas, weights, thresholds, scenario and limitations honestly, and cites the sources.

**Blocked by:** 03 (Data to map)

**Status:** ready-for-agent

- [ ] The dialog renders the four component formulas, the weights, the admission thresholds, the two-pool selection, the scenario (2027 low water, occupancy assumed) and the known limitations from the method specification. None of this text is hard-coded.
- [ ] It states that the weights and thresholds are unvalidated planning heuristics and that the scouting index is not a probability.
- [ ] Source citations come from the manifest, with working external links. The private CalTopo source isn't there.
- [ ] The dialog traps focus while open, closes with Escape, and returns focus to the button that opened it.
- [ ] Playwright: open the dialog, check the key sections are present and every link has a valid URL, then close it and confirm focus returns.
