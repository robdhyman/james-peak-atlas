# 02: Deployed skeleton

**What to build:** A live, deployed shell of the rebuild at its GitHub Pages subpath, with the reference atlas served beside it. It proves the toolchain, the CI pipeline and subpath asset loading before any features are built.

**Blocked by:** 01 (Public data bundle and first commit)

**Status:** ready-for-agent

- [ ] Vite + React 19 + strict TypeScript + Tailwind v4 project, using npm with a committed lockfile. Node 24 LTS is pinned in the package's engines field and in CI.
- [ ] Vite's base is set to the Pages subpath. No runtime URL starts from the site root.
- [ ] The current atlas's look (forest green, amber accents, field-atlas typography) is ported into Tailwind theme tokens. The shell shows the header with the 2027 low-water scenario and the empty sidebar and map areas.
- [ ] One GitHub Actions workflow. On a pull request it runs data check → type check → unit tests → build → browser tests. On main it runs the same steps, then deploys to Pages with the official Pages deploy action.
- [ ] The build output includes the reference atlas under a reference subpath, with a one-line note on it saying observations were removed for public release and its "Your locations" control does nothing.
- [ ] Vitest and Playwright are set up. A Playwright smoke test runs against the built site served at the real subpath, and confirms the shell renders and the reference page loads.
- [ ] The public GitHub repository exists, the first deploy succeeds, and both the live URL and the reference URL load. The owner creates the repository and turns on Pages, or approves it if an agent does this.
