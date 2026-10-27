import { expect, test, type Page } from '@playwright/test'
import { hillshade, mapProjection, type Point } from './mapScreen.ts'

// The centre of display-grid row 394, column 320, which reads 31%. Its
// neighbours differ (north 22%, east 23%, west 0%), so a reading of 31%
// means the pointer landed on exactly this pixel.
const KNOWN: Point = { lat: 39.86176, lng: -105.688311 }
// One display-grid pixel in EPSG:3857 metres: the grid spans 25,023.7 m in 642 columns.
const CELL_METRES = 38.978

const readout = (page: Page) => page.getByRole('region', { name: 'Canopy readout' })

/** The projection, plus how many screen pixels a display-grid pixel covers. */
async function geometry(page: Page, minWidth = 0) {
  const projection = await mapProjection(page, minWidth)
  return { ...projection, cellPixels: CELL_METRES * projection.scale }
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

  // Desktop, the narrower card below 1100 px, and a phone, where the readout fills the row.
  for (const width of [1440, 1000, 390]) {
    test(`at ${width} px the readout sits beside the Legend button, not over it`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.goto('./')
      const map = (await page.getByTestId('map').boundingBox())!
      await page.mouse.move(map.x + map.width / 2, map.y + map.height / 2)
      await expect(readout(page).getByTestId('canopy-value')).toBeVisible()

      const shown = (await readout(page).boundingBox())!
      const legend = (await page.getByRole('button', { name: 'Legend', exact: true }).boundingBox())!
      expect(shown.x + shown.width).toBeLessThanOrEqual(legend.x)
      expect(shown.x).toBeGreaterThanOrEqual(map.x)
    })
  }

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
    await expect(page.getByRole('button', { name: /^(EP|JP)-\d\d: / })).toHaveCount(6)
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
