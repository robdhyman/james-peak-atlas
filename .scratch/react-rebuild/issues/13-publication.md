# 13: Publication

**What to build:** A public repository and live demo that tell the engineering story: what was rebuilt, why, how it's verified, and who and what to credit.

**Blocked by:** 12 (Usability and resilience pass)

**Status:** ready-for-agent

- [x] The new root README covers what the atlas is, the live demo and reference links, how to run, test and build it, an architecture overview of the six modules and two test seams, links to the ADRs and glossary, the chosen improvements with before and after evidence, and what is and isn't covered by tests.
- [ ] A fresh screenshot of the public build is used in the README and as the repository's social preview.
- [x] An MIT LICENSE for the app code, with third-party notices and dataset terms kept separate.
- [x] Honest credit for the AI-assisted baseline, the public data sources and Leaflet.
- [x] A clean checkout, then install from the lockfile, check, test and build on Node 24, all succeed. The deployed site and the reference both load at their subpaths.
- [x] A final privacy search of the repository history and of the deployed files, using the private search terms, returns nothing.

## Comments

**README, LICENSE and credits done (2026-10-26).** The README's before-and-after table points each improvement at the test that checks it, and the "before" column at the deployed reference copy. The baseline is credited to ChatGPT and the rebuild to Claude Code, with the owner's decisions named. The LICENSE copyright line is "robdhyman".

The deployed bundle includes Leaflet (BSD 2-Clause), React, React DOM, scheduler and Zod (MIT), but `dist/` shipped none of their notices. `build.license` in `vite.config.ts` now writes them to `third-party-licenses.md` at the site root, and a smoke test checks the file is served. THIRD_PARTY_NOTICES.md lists these packages, and no longer says that no licence has been chosen.

Still open: the screenshot (README and social preview), the clean-checkout run and the subpath check after deploy, and the final privacy search.

**Screenshot taken (2026-10-26).** Captured from the public `dist/` build at 1280 × 640: the Quiet cover preset, the Nearby list in scout order, and EP-04's detail panel. The coordinate it shows is EP-04's own, from `candidates.geojson`. `docs/screenshot.png` (2×) is in the README. `docs/social-preview.png` (1×, 616 KB, under GitHub's 1 MB limit) is for the repository's social preview. The owner uploads it under Settings → General → Social preview, so the box stays open until then.

**Clean checkout and subpaths verified (2026-10-26).** Fresh clone of `fa7a763` from GitHub, run on official Node v24.22.1 (npm 11.19.1, checksum-verified from nodejs.org): `npm ci`, `check:data`, `typecheck`, 157 Vitest tests, `build`, `check:build` and 87 Playwright tests all pass. CI run 40453606304 passed and deployed. On the live site, `/james-peak-atlas/` and `/james-peak-atlas/reference/` both load in Chromium with no failed requests or page errors. The live `data/observations.geojson` is an empty collection, and `third-party-licenses.md` lists Leaflet, React, React DOM, scheduler and Zod.

**Final privacy search: clean (2026-10-26).** The terms were built in memory from `private/` and never printed or written to the repo:
- each observation's latitude and longitude as a pair (within 60 bytes of each other): as stored, and rounded or truncated to 5 and 4 dp
- each observation's stored coordinates alone, at full precision
- each observation's name, note, and the note's opening words
- the CalTopo map ID, and any `caltopo.com/m/` link (case-insensitive)
- `atlas-preview.jpg`, by git blob hash and by exact bytes

A positive control against `private/original-bundle/` found every kind of term.

Searched: every commit and every blob (binary included) reachable from every ref of a fresh clone of GitHub (only `main`, no pull requests; 20 commits, 268 blobs), and all 73 files in the `github-pages` artifact that CI run 40453606304 deployed.

Result: no observation coordinates, names, notes, CalTopo ID or preview image. The one match is this tracker's own ticket 10 describing the `caltopo.com/m/` pattern the CI check looks for, with no ID after it.

Limits: images are compared as bytes, not read. The screenshots in `docs/` were all captured from the public build, which has no observations. CI's own build check doesn't search for the bare map ID, because the optional `CALTOPO_MAP_ID` secret isn't set.

Remaining: the owner uploads `docs/social-preview.png` as the repository's social preview.
