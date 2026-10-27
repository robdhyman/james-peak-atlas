# James Peak Scouting Atlas

A map-based planning tool for picking elk scouting locations in Colorado's James Peak Wilderness. It sets modelled candidates next to the terrain, canopy, water and access evidence behind them.

This repository rebuilds the original vanilla-JavaScript atlas as a Vite + React + strict TypeScript + Tailwind static site for GitHub Pages. The rebuild keeps the bundled GIS data, scores and method unchanged. The work is planned in [`.scratch/react-rebuild/spec.md`](.scratch/react-rebuild/spec.md) and tracked as tickets beside it.

## Layout

| Path | Purpose |
|---|---|
| `src/` | The rebuild's React app, with the reference look ported into Tailwind theme tokens in `src/index.css` |
| `public/data/` | The rebuild's data: the bundled GIS layers, candidates and method, with the origin in the manifest and an empty observations file |
| `scripts/` | The data check against the reference copy, and the build step that copies the reference atlas into `dist/reference/` |
| `tests/e2e/` | Playwright tests, run against the built site at its Pages subpath |
| `reference/` | The original atlas, kept as a self-contained comparison baseline. See [`reference/README.md`](reference/README.md) |
| `docs/` | Data contracts, source register, release notes, decision records and the historical model scripts |
| `GLOSSARY.md` | Domain vocabulary (Candidate, Observation, Origin, Pool, Scouting index…) |

## Develop

Requires Node 24 LTS (see `.nvmrc`).

```sh
npm ci
npm run dev
```

The site is served under `/james-peak-atlas/`, the GitHub Pages subpath. CI runs the same steps as these commands, in this order, and deploys `main` to Pages:

```sh
npm run check:data   # reference data contracts, and public/data matches the reference copy
npm run typecheck
npm test             # Vitest
npm run build        # dist/, with the reference atlas at dist/reference/
npm run check:build  # dist/ ships zero observations and no CalTopo map link
npm run test:e2e     # Playwright against the built site; run `npx playwright install chromium` once
```

## Run the reference atlas

```sh
cd reference
npm start
```

Open http://127.0.0.1:4173. `npm run check` verifies its assets and data contracts.

## Privacy

The owner's personal field observations are not in this repository or its history ([ADR 0001](docs/adr/0001-withhold-observations-from-public-build.md)). The public build ships an empty observations collection, and with none the atlas shows no observation UI at all. East Portal, a public parking lot, is the origin.

The owner's own copy is a separate private build. It reads the git-ignored `private/observations.geojson` in place of the empty file, and never runs in CI:

```sh
npm run dev:private       # dev server with observations
npm run build:private     # dist-private/, never dist/
npm run test:e2e:private  # Playwright against dist-private/; refuses to run when CI is set
```

In CI, `check:build` searches `dist/` for CalTopo map links. If the optional `CALTOPO_MAP_ID` repository secret is set, it searches for the bare map ID too.

## Licences

Dataset terms and third-party notices are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) and [`docs/SOURCES.md`](docs/SOURCES.md).
