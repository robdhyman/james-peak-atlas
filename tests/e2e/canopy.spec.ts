import { expect, test, type Page } from '@playwright/test'

type Point = { lat: number; lng: number }

// The centre of display-grid row 394, column 320, which reads 31%. Its
// neighbours differ (north 22%, east 23%, west 0%), so a reading of 31%
// means the pointer landed on exactly this pixel.
const KNOWN: Point = { lat: 39.86176, lng: -105.688311 }
// One display-grid pixel in EPSG:3857 metres: the grid spans 25,023.7 m in 642 columns.
const CELL_METRES = 38.978

const readout = (page: Page) => page.getByRole('region', { name: 'Canopy readout' })
const hillshade = (page: Page) => page.getByRole('main').locator('img.leaflet-image-layer')

function mercator({ lat, lng }: Point) {
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
 * own sampler: it only uses the manifest's bounds and the image's box.
 */
async function geometry(page: Page, minWidth = 0) {
  const manifest = await (await page.request.get('data/manifest.json')).json()
  const [[south, west], [north, east]] = manifest.layers.hillshade.bounds as [[number, number], [number, number]]
  const sw = mercator({ lat: south, lng: west })
  const ne = mercator({ lat: north, lng: east })
  const box = await settledHillshadeBox(page, minWidth)
  const scale = box.width / (ne.x - sw.x)
  return {
    width: box.width,
    cellPixels: CELL_METRES * scale,
    toScreen(point: Point) {
      const { x, y } = mercator(point)
      return { x: box.x + (x - sw.x) * scale, y: box.y + ((ne.y - y) / (ne.y - sw.y)) * box.height }
    },
  }
}

/**
 * Zooms in until a display-grid pixel is at least 8 screen pixels across.
 * A pointer double-clicks the known point, which Leaflet zooms around, so
 * it stays clear of the map's edges; touch uses the zoom control.
 */
async function zoomToReadablePixels(page: Page, by: 'pointer' | 'touch') {
  await expect.poll(() => hillshade(page).evaluate((img: HTMLImageElement) => img.complete)).toBe(true)
  for (let current = await geometry(page); current.cellPixels < 8; current = await geometry(page, current.width * 1.9)) {
    if (by === 'touch') await page.getByRole('button', { name: 'Zoom in' }).tap()
    else {
      const { x, y } = current.toScreen(KNOWN)
      await page.mouse.dblclick(x, y)
    }
  }
  return geometry(page)
}

test.describe('canopy inspector with a pointer', () => {
  test('hovering a known point reads its canopy, and leaving the map hides it', async ({ page }) => {
    await page.goto('./')
    await expect(readout(page)).toHaveCount(0)
    const { cellPixels, toScreen } = await zoomToReadablePixels(page, 'pointer')
    const known = toScreen(KNOWN)

    // Over the sidebar the pointer has left the map, so zooming's clicks leave no reading.
    const sidebar = (await page.getByRole('complementary', { name: 'Map controls' }).boundingBox())!
    await page.mouse.move(sidebar.x + sidebar.width / 2, sidebar.y + sidebar.height / 2)
    await expect(readout(page)).toHaveCount(0)

    await page.mouse.move(known.x, known.y)
    await expect(readout(page).getByTestId('canopy-value')).toHaveText('Canopy 31%')
    await expect(readout(page)).toContainText('Reads the ~30 m display grid; a candidate’s modelled canopy can differ.')

    // Row zero is north and columns run west to east. Each move follows the
    // last within a few milliseconds, which Leaflet's canvas renderer would
    // throttle away; the readout must still show where the pointer stopped.
    await page.mouse.move(known.x, known.y - cellPixels)
    await expect(readout(page).getByTestId('canopy-value')).toHaveText('Canopy 22%')
    await page.mouse.move(known.x - cellPixels, known.y)
    await expect(readout(page).getByTestId('canopy-value')).toHaveText('Canopy 0%')

    await page.mouse.move(sidebar.x + sidebar.width / 2, sidebar.y + sidebar.height / 2)
    await expect(readout(page)).toHaveCount(0)
  })

  test('a point on the map but off the display grid shows nothing', async ({ page }) => {
    await page.goto('./')
    await expect.poll(() => hillshade(page).evaluate((img: HTMLImageElement) => img.complete)).toBe(true)
    const { toScreen } = await geometry(page)
    const map = (await page.getByTestId('map').boundingBox())!
    const west = toScreen({ lat: KNOWN.lat, lng: -105.81 })
    expect(west.x).toBeGreaterThan(map.x)

    await page.mouse.move(map.x + map.width / 2, map.y + map.height / 2)
    await expect(readout(page).getByTestId('canopy-value')).toHaveText(/^Canopy \d+%$/)
    await page.mouse.move(west.x, west.y)
    await expect(readout(page)).toHaveCount(0)
  })

  test('a NoData pixel reads "No data", never 0% or 255%', async ({ page }) => {
    await page.route('**/data/canopy_grid.json', async (route) => {
      const grid = await (await route.fetch()).json()
      grid.data_base64 = Buffer.alloc(grid.width * grid.height, 255).toString('base64')
      await route.fulfill({ json: grid })
    })
    await page.goto('./')
    const map = (await page.getByTestId('map').boundingBox())!
    await page.mouse.move(map.x + map.width / 2, map.y + map.height / 2)
    await expect(readout(page).getByTestId('canopy-value')).toHaveText('Canopy: No data')
    await expect(readout(page)).not.toContainText('%')
  })

  test('if the canopy grid can’t load, the readout says so and the map still works', async ({ page }) => {
    await page.route('**/data/canopy_grid.json', (route) => route.abort())
    await page.goto('./')
    await expect(page.getByRole('button', { name: /^(EP|JP)-\d\d: / })).toHaveCount(16)
    const map = (await page.getByTestId('map').boundingBox())!
    await page.mouse.move(map.x + map.width / 2, map.y + map.height / 2)
    await expect(readout(page)).toHaveText('Canopy readout unavailable: the canopy grid couldn’t be loaded.')
  })
})

test.describe('canopy inspector with touch', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('tapping a known point reads its canopy', async ({ page }) => {
    await page.goto('./')
    const { cellPixels, toScreen } = await zoomToReadablePixels(page, 'touch')
    const known = toScreen(KNOWN)

    await page.touchscreen.tap(known.x, known.y)
    await expect(readout(page).getByTestId('canopy-value')).toHaveText('Canopy 31%')
    await expect(readout(page)).toContainText('~30 m display grid')

    await page.touchscreen.tap(known.x + cellPixels, known.y)
    await expect(readout(page).getByTestId('canopy-value')).toHaveText('Canopy 23%')
  })
})
