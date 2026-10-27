# 02: Deployed skeleton

**What to build:** A live, deployed shell of the rebuild at its GitHub Pages subpath, with the reference atlas served beside it. It proves the toolchain, the CI pipeline and subpath asset loading before any features are built.

**Blocked by:** 01 (Public data bundle and first commit)

**Status:** ready-for-agent

- [x] Vite + React 19 + strict TypeScript + Tailwind v4 project, using npm with a committed lockfile. Node 24 LTS is pinned in the package's engines field and in CI.
- [x] Vite's base is set to the Pages subpath. No runtime URL starts from the site root.
- [x] The current atlas's look (forest green, amber accents, field-atlas typography) is ported into Tailwind theme tokens. The shell shows the header with the 2027 low-water scenario and the empty sidebar and map areas.
- [x] One GitHub Actions workflow. On a pull request it runs data check → type check → unit tests → build → browser tests. On main it runs the same steps, then deploys to Pages with the official Pages deploy action.
- [x] The build output includes the reference atlas under a reference subpath, with a one-line note on it saying observations were removed for public release and its "Your locations" control does nothing.
- [x] Vitest and Playwright are set up. A Playwright smoke test runs against the built site served at the real subpath, and confirms the shell renders and the reference page loads.
- [ ] The public GitHub repository exists, the first deploy succeeds, and both the live URL and the reference URL load. The owner creates the repository and turns on Pages, or approves it if an agent does this.

## Comments

**Built and verified locally.** The full CI sequence (data check, type check, unit tests, build, browser tests) passes from a clean `npm ci`. The live deploy waits on the repository and Pages being turned on.

- **Data check** runs the reference package's check against `reference/public/`, then `scripts/check-data.mjs`: every manifest URL in `public/data/` is relative to the site base and non-empty, and every data file other than the manifest and the observations file is byte-identical to the reference copy. That guards the spec's "no other changes" rule.
- **Reference copy.** `scripts/copy-reference.mjs` copies `reference/public/` to `dist/reference/` after the Vite build and adds the note to the copy only, so the source stays unedited.
- **No SPA fallback.** `appType: 'mpa'` makes `vite preview` 404 an unknown path, as Pages does. Without it a missing `dist/reference/` would fall back to the app's own page. The reference smoke test was checked to fail when `dist/reference/` is removed.
- **Smoke tests** fail on any failed request or 4xx/5xx response, and confirm the reference app drew its 16 candidates, not just its HTML.
- **Breakpoints.** The reference's 800, 1100 and 1500 px breakpoints are theme tokens (`tablet`, `desktop`, `wide`). Below 800 px the empty sidebar is hidden for now; the drawer belongs with the sidebar's content.
- **Vitest** has no tests yet (`passWithNoTests`). The first atlas-core tests arrive with ticket 03.
- **Node.** `engines` is `24.x` and CI reads `.nvmrc`. A newer local Node only warns (`EBADENGINE`).
- **TypeScript 7** (the native compiler) runs the type check.
