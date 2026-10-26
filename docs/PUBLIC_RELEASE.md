# Preparing a GitHub repository and live demo

The ZIP is a local handoff. No GitHub repository, issue, deployment workflow or public site was created by the packaging task. The existing private hosted atlas remains unchanged.

## Decide the public data boundary

**Decided: the public repository and site ship no observations** ([ADR 0001](adr/0001-withhold-observations-from-public-build.md)). Before the first commit, the personal observations were removed from the published data, the CalTopo link was removed from the manifest and documentation, the preview image was deleted, and the observation coordinates in the historical assembly script were redacted. The owner's copy lives in the git-ignored `private/` folder. East Portal, a public parking lot, remains the origin. The model code keeps the origin and the generic rule excluding cells near observations.

Changing visible marker labels alone does not remove coordinates from shipped JSON or repository history, which is why this was done before `git init`. The rebuild treats zero observations as its own product state; the reference copy keeps its original UI, so its "Your locations" control does nothing.

The `private: true` flag in package.json only prevents accidental npm publication. It does not make a GitHub repository or website private. The original hosted Site's ChatGPT access gate is not included in this static app.

## Create the project locally

Initialize a repository only after deciding which bundle belongs in it. Preserve third-party licenses and dataset attribution. Choose an application-code license explicitly if the repository will be open source; this handoff does not select one on your behalf.

For the future React project, commit the package-manager lockfile, document the supported Node version and use a clean-checkout build in CI. Confirm current React, TypeScript, Tailwind, map-adapter and build-tool compatibility against their official documentation at implementation time.

## Publish a useful engineering story

The repository should include:

- A working local setup and a live URL with the intended audience.
- A brief architecture explanation and ADRs for decisions that involved real tradeoffs.
- Source register, methodology, uncertainty and the boundary between modeled and observed evidence.
- Tests for actual product failure modes, with a clear account of what is and is not covered.
- Responsive and keyboard evidence, before/after captures, and measured performance rather than unverified claims.
- Clear credit for the AI-assisted baseline, public source data and your subsequent design/engineering changes.

For this reference app, `npm run build` emits a static `dist/` directory. For the React rebuild, replace that packaging step with the framework build and test the deployment path. GitHub Pages or another static host can serve the output if client-side routing and asset paths are configured for that host. This is a deployment option, not a workflow already configured in this ZIP.
