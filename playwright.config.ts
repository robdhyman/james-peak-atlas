import { defineConfig, devices } from '@playwright/test'
import { BASE } from './vite.config.ts'

// E2E_PORT lets parallel worktrees each serve their own build.
const PORT = Number(process.env['E2E_PORT'] ?? 4173)

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    // Tests navigate relative to the Pages subpath, never the site root.
    baseURL: `http://localhost:${PORT}${BASE}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Serves the built dist/ at the real subpath; run `npm run build` first.
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
  },
})
