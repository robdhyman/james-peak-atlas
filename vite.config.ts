/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves the site from the repository subpath.
export const BASE = '/james-peak-atlas/'

export default defineConfig({
  base: BASE,
  // No SPA fallback: an unknown path 404s in preview, as it does on Pages.
  appType: 'mpa',
  plugins: [react(), tailwindcss()],
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
