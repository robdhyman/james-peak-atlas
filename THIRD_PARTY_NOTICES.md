# Third-party notices

## Application code

The rebuild's application code is MIT-licensed ([`LICENSE`](LICENSE)). That licence covers the code only. It doesn't replace the terms of the map data or of the third-party software below.

The original atlas, its model pipeline and the rebuild handoff were generated with ChatGPT. The rebuild was implemented with Claude Code, with the owner making the design and engineering decisions. The README's Credits section describes this.

## Software bundled in the rebuild

The deployed rebuild bundles these npm packages. The build writes their licence texts to `third-party-licenses.md` at the site root, beside the bundle.

| Package | Licence |
|---|---|
| [Leaflet](https://github.com/Leaflet/Leaflet) 1.9.4 | BSD 2-Clause |
| [React and React DOM](https://github.com/facebook/react) 19 | MIT |
| [scheduler](https://github.com/facebook/react) (a React dependency) | MIT |
| [Zod](https://github.com/colinhacks/zod) 4 | MIT |

Build and test tools (Vite, Tailwind CSS, TypeScript, Vitest, Playwright, axe-core) aren't redistributed in the deployed site. Their licences are in `node_modules/` after `npm ci`.

## Leaflet in the reference copy

The reference copy vendors Leaflet 1.9.4, under the BSD 2-Clause license. Preserve [`reference/public/vendor/LICENSE-leaflet.txt`](reference/public/vendor/LICENSE-leaflet.txt) when redistributing the vendor files. Source: https://github.com/Leaflet/Leaflet/tree/v1.9.4

## Map data

USGS, USFS, Colorado Parks and Wildlife, PAD-US contributing organizations and other providers are identified in reference/README.md and docs/SOURCES.md. Preserve the source-specific metadata and attribution. This package does not assert a blanket license for every dataset or incorporated basemap component, and the license chosen for the application code does not replace the data providers' terms.

## User observations

The three observation coordinates and accompanying notes were supplied by the user. They are distinct from public agency data and model-derived candidates, and they are not included in this public repository (ADR 0001).

## Matt Pocock skills

No upstream skill files are redistributed here. The handoff links to the reviewed repository snapshot and describes a proposed workflow. Consult that repository's current license and instructions when installing or redistributing those skills.
