/// <reference types="vitest/config" />
import { copyFile, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// GitHub Pages serves the site from the repository subpath.
export const BASE = '/james-peak-atlas/'

/** `vite --mode private` and `vite build --mode private`: the owner's own copy, with observations. */
export const PRIVATE_MODE = 'private'

/** The observations file as the manifest names it, relative to the base. */
const OBSERVATIONS = 'data/observations.geojson'

export default defineConfig(({ mode }) => ({
  base: BASE,
  // No SPA fallback: an unknown path 404s in preview, as it does on Pages.
  appType: 'mpa',
  // The private build gets its own folder, so it can never be the dist/ that deploys.
  build: { outDir: mode === PRIVATE_MODE ? 'dist-private' : 'dist' },
  plugins: [react(), tailwindcss(), privateObservations()],
  test: {
    include: ['src/**/*.test.ts'],
  },
}))

/**
 * Puts the git-ignored private/observations.geojson in place of the public,
 * empty one (ADR 0001): served by the dev server, and written over the
 * public copy in the build output. Only the private mode applies it, so the
 * public build and CI never read private/.
 */
function privateObservations(): Plugin {
  const file = fileURLToPath(new URL('private/observations.geojson', import.meta.url))
  let outDir = ''
  return {
    name: 'private-observations',
    apply: (_config, { mode }) => mode === PRIVATE_MODE,
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    async buildStart() {
      await readFile(file).catch(() => this.error(`The private build needs ${file}, and it can't be read.`))
    },
    configureServer(server) {
      // Ahead of Vite's own public-folder middleware, so the empty file is never served.
      server.middlewares.use(`${BASE}${OBSERVATIONS}`, (_request, response, next) => {
        readFile(file).then((body) => {
          response.setHeader('Content-Type', 'application/geo+json')
          response.end(body)
        }, next)
      })
    },
    async writeBundle() {
      await copyFile(file, resolve(outDir, OBSERVATIONS))
    },
  }
}
