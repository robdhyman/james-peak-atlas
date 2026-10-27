# 13: Publication

**What to build:** A public repository and live demo that tell the engineering story: what was rebuilt, why, how it's verified, and who and what to credit.

**Blocked by:** 12 (Usability and resilience pass)

**Status:** ready-for-agent

- [x] The new root README covers what the atlas is, the live demo and reference links, how to run, test and build it, an architecture overview of the six modules and two test seams, links to the ADRs and glossary, the chosen improvements with before and after evidence, and what is and isn't covered by tests.
- [ ] A fresh screenshot of the public build is used in the README and as the repository's social preview.
- [x] An MIT LICENSE for the app code, with third-party notices and dataset terms kept separate.
- [x] Honest credit for the AI-assisted baseline, the public data sources and Leaflet.
- [ ] A clean checkout, then install from the lockfile, check, test and build on Node 24, all succeed. The deployed site and the reference both load at their subpaths.
- [ ] A final privacy search of the repository history and of the deployed files, using the private search terms, returns nothing.

## Comments

**README, LICENSE and credits done (2026-10-26).** The README's before-and-after table points each improvement at the test that checks it, and the "before" column at the deployed reference copy. The baseline is credited to ChatGPT and the rebuild to Claude Code, with the owner's decisions named. The LICENSE copyright line is "robdhyman".

The deployed bundle includes Leaflet (BSD 2-Clause), React, React DOM, scheduler and Zod (MIT), but `dist/` shipped none of their notices. `build.license` in `vite.config.ts` now writes them to `third-party-licenses.md` at the site root, and a smoke test checks the file is served. THIRD_PARTY_NOTICES.md lists these packages, and no longer says that no licence has been chosen.

Still open: the screenshot (README and social preview), the clean-checkout run and the subpath check after deploy, and the final privacy search.

**Screenshot taken (2026-10-26).** Captured from the public `dist/` build at 1280 × 640: the Quiet cover preset, the Nearby list in scout order, and EP-04's detail panel. The coordinate it shows is EP-04's own, from `candidates.geojson`. `docs/screenshot.png` (2×) is in the README. `docs/social-preview.png` (1×, 616 KB, under GitHub's 1 MB limit) is for the repository's social preview. The owner uploads it under Settings → General → Social preview, so the box stays open until then.
