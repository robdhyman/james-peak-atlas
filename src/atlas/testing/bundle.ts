// The real bundled data, served from disk for Vitest.
import { readFile } from 'node:fs/promises'
import type { DataSource } from '../data.ts'

export const PUBLIC = new URL('../../../public/', import.meta.url)

/** Serves the real bundle from disk, as the site serves it under its base. */
export const bundle: DataSource = {
  base: PUBLIC,
  fetch: async (url) => {
    try {
      return new Response(await readFile(new URL(url)))
    } catch {
      return new Response(null, { status: 404 })
    }
  },
}
