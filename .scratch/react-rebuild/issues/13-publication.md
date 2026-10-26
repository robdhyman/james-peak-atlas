# 13: Publication

**What to build:** A public repository and live demo that tell the engineering story: what was rebuilt, why, how it's verified, and who and what to credit.

**Blocked by:** 12 (Usability and resilience pass)

**Status:** ready-for-agent

- [ ] The new root README covers what the atlas is, the live demo and reference links, how to run, test and build it, an architecture overview of the six modules and two test seams, links to the ADRs and glossary, the chosen improvements with before and after evidence, and what is and isn't covered by tests.
- [ ] A fresh screenshot of the public build is used in the README and as the repository's social preview.
- [ ] An MIT LICENSE for the app code, with third-party notices and dataset terms kept separate.
- [ ] Honest credit for the AI-assisted baseline, the public data sources and Leaflet.
- [ ] A clean checkout, then install from the lockfile, check, test and build on Node 24, all succeed. The deployed site and the reference both load at their subpaths.
- [ ] A final privacy search of the repository history and of the deployed files, using the private search terms, returns nothing.
