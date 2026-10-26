# 01: Public data bundle and first commit

**What to build:** A clean public repository. It contains no observations, either in its files or in its history. The original atlas still runs as a self-contained reference copy, and the rebuild has its own data copy in the new shape: the origin as a field in the manifest, and an observations file that is empty. This is the prefactor every later ticket depends on (ADR 0001).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Before any git history exists, the real observation data is copied into the git-ignored private folder, so nothing of the owner's is lost.
- [x] Observations A1–A3 are removed from every published data file. East Portal stays, as the origin.
- [x] The CalTopo map link is removed from the manifest, the README and the sources register. Source S8's provenance wording is kept, without the link.
- [x] The old preview image is deleted, not blurred.
- [x] In the historical bundling script, the hard-coded observation tuples and the CalTopo line are redacted, with a comment saying why. The model-building script is unchanged.
- [x] The package checksum file is removed.
- [x] The original app, its README and its data move into a reference area as a self-contained copy that still runs from a local static server. The reference data keeps its original shape, with the anchors file holding only the origin.
- [x] The rebuild's data copy is identical to the baseline except that the manifest has an `origin` field (name and coordinates) and points to a separate, empty observations collection. There is no anchors file in the rebuild's data.
- [x] The reference package's data check still passes against the reference copy.
- [x] A search of the whole tree for every observation name, every observation coordinate (at four decimal places and more) and the CalTopo map ID returns nothing, apart from the git-ignored private folder. Take the search terms from the private copy, never from this ticket.
- [x] `git init`, then a first commit containing exactly this tree. A history search for the same terms returns nothing.

## Comments

**Done in the first commit.** Layout: the original app, README, scripts and package are in `reference/`; the rebuild's data copy is `public/data/`; shared docs stay in `docs/`. The owner's data is in `private/observations.geojson`, and the untouched original package is in `private/original-bundle/`.

**Reference app stripped.** `reference/public/app.js` had one string tied to a specific observation, in the observation detail card. It was removed; nothing else in the app was edited.

**Privacy search, accepted residual.** Names, notes and the CalTopo map ID have zero hits in the tree and the history. Coordinate terms (truncated and rounded, 4 dp and more) still match as single-axis substrings inside public agency geometry (contours, trails, roads, water, boundary, ownership, GMUs). The public origin's latitude also equals one observation's latitude rounded to 4 dp. These files must stay byte-identical to the baseline, and no single axis locates a point. A pairwise check found no lon/lat pair in any data file within 13 m of an observation. The search terms are built at runtime from `private/` and aren't committed. Ticket 10's CI check should test the public build for lon/lat pairs rather than single-axis substrings.

