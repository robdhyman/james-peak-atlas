import { defineConfig, devices } from '@playwright/test'
import { BASE } from './vite.config.ts'

// The private build's browser tests: local only, never in CI (ADR 0001).
// They read the owner's git-ignored private/observations.geojson, which CI
// never has. Run `npm run build:private` first.
if (process.env.CI) throw new Error('The private build tests read private/ and must never run in CI.')

// Its own port, apart from the public suite's 4173 and any preview already running.
const PORT = 4183

export default defineConfig({
  testDir: 'tests/e2e-private',
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Serves dist-private/, the private mode's output folder, at the real subpath.
  webServer: {
    command: `npx vite preview --mode private --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE}`,
    // Never reuse: a server already on this port could be a public build, and these tests would pass it off as private.
    reuseExistingServer: false,
  },
})
