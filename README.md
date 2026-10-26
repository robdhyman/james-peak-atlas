# James Peak Scouting Atlas

A map-based planning tool for picking elk scouting locations in Colorado's James Peak Wilderness. It sets modelled candidates next to the terrain, canopy, water and access evidence behind them.

This repository rebuilds the original vanilla-JavaScript atlas as a Vite + React + strict TypeScript + Tailwind static site for GitHub Pages. The rebuild keeps the bundled GIS data, scores and method unchanged. The work is planned in [`.scratch/react-rebuild/spec.md`](.scratch/react-rebuild/spec.md) and tracked as tickets beside it.

## Layout

| Path | Purpose |
|---|---|
| `public/data/` | The rebuild's data: the bundled GIS layers, candidates and method, with the origin in the manifest and an empty observations file |
| `reference/` | The original atlas, kept as a self-contained comparison baseline. See [`reference/README.md`](reference/README.md) |
| `docs/` | Data contracts, source register, release notes, decision records and the historical model scripts |
| `GLOSSARY.md` | Domain vocabulary (Candidate, Observation, Origin, Pool, Scouting index…) |

## Run the reference atlas

```sh
cd reference
npm start
```

Open http://127.0.0.1:4173. `npm run check` verifies its assets and data contracts.

## Privacy

The owner's personal field observations are not in this repository or its history ([ADR 0001](docs/adr/0001-withhold-observations-from-public-build.md)). The public build ships an empty observations collection. East Portal, a public parking lot, is the origin.

## Licences

Dataset terms and third-party notices are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) and [`docs/SOURCES.md`](docs/SOURCES.md).
