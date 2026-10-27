// Where a lat/lng is on screen, worked out from the hillshade overlay rather
// than the app's own code. Shared by the specs that point at exact places.
import { expect, type Page } from '@playwright/test'

export type Point = { lat: number; lng: number }

export const hillshade = (page: Page) => page.getByRole('main').locator('img.leaflet-image-layer')

/** EPSG:3857 metres. */
export function mercator({ lat, lng }: Point) {
  const R = 6378137
  return { x: (R * lng * Math.PI) / 180, y: R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) }
}

/**
 * The hillshade's on-screen box once Leaflet has stopped moving it: the same
 * across three reads, and at least `minWidth` wide (a zoom in doubles it).
 */
async function settledHillshadeBox(page: Page, minWidth = 0) {
  const reads: string[] = []
  await expect
    .poll(
      async () => {
        const box = await hillshade(page).boundingBox()
        reads.push(JSON.stringify(box))
        const [a, b, c] = reads.slice(-3)
        return !!box && box.width >= minWidth && reads.length >= 3 && a === b && b === c
      },
      { intervals: [100] },
    )
    .toBe(true)
  return JSON.parse(reads.at(-1)!) as { x: number; y: number; width: number; height: number }
}

/**
 * Maps a point to the screen through the hillshade overlay, which Leaflet
 * draws linearly in EPSG:3857 between its bounds. Independent of the app's
 * own code: it only uses the manifest's bounds and the image's box.
 */
export async function mapProjection(page: Page, minWidth = 0) {
  const manifest = await (await page.request.get('data/manifest.json')).json()
  const [[south, west], [north, east]] = manifest.layers.hillshade.bounds as [[number, number], [number, number]]
  const sw = mercator({ lat: south, lng: west })
  const ne = mercator({ lat: north, lng: east })
  const box = await settledHillshadeBox(page, minWidth)
  /** Screen pixels per EPSG:3857 metre. */
  const scale = box.width / (ne.x - sw.x)
  return {
    width: box.width,
    scale,
    toScreen(point: Point) {
      const { x, y } = mercator(point)
      return { x: box.x + (x - sw.x) * scale, y: box.y + ((ne.y - y) / (ne.y - sw.y)) * box.height }
    },
  }
}
