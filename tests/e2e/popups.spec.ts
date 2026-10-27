import { expect, test, type Page } from '@playwright/test'
import { mapProjection, type Point } from './mapScreen.ts'

// Picked from the bundle: each is at least 350 m from any other clickable
// feature or marker, so a click there can only land on the one feature.
/** The middle vertex of a Rogers Pass trail line. */
const ROGERS_PASS: Point = { lat: 39.886196, lng: -105.706365 }
/** Inside the Lake Caroline polygon. */
const LAKE_CAROLINE: Point = { lat: 39.835593, lng: -105.688071 }
/** Over 500 m from every trail, road, water feature, marker and GMU line, but inside a GMU. */
const NOTHING: Point = { lat: 39.8825, lng: -105.665 }

const popup = (page: Page) => page.locator('.leaflet-popup.feature-popup')
const readout = (page: Page) => page.getByRole('region', { name: 'Canopy readout' })
const controls = (page: Page) => page.getByRole('complementary', { name: 'Map controls' })

/** Opens the atlas once the Terrain preset's trails, water and trailheads are drawn. */
async function openAtlas(page: Page) {
  await page.goto('./')
  await expect
    .poll(async () => (await page.getByTestId('map').getAttribute('data-drawn-layers'))?.split(' ') ?? [])
    .toEqual(expect.arrayContaining(['boundary', 'roads', 'trailheads', 'trails', 'water']))
  await expect(controls(page).getByText('Loading', { exact: true })).toHaveCount(0)
}

/** Clicks the map at a point, after checking the point is on the map. */
async function clickAt(page: Page, point: Point) {
  const { toScreen } = await mapProjection(page)
  const { x, y } = toScreen(point)
  const map = (await page.getByTestId('map').boundingBox())!
  expect(x).toBeGreaterThan(map.x)
  expect(x).toBeLessThan(map.x + map.width)
  expect(y).toBeGreaterThan(map.y)
  expect(y).toBeLessThan(map.y + map.height)
  await page.mouse.click(x, y)
}

test.describe('feature popups', () => {
  test('clicking a trail names it, with its surface and type', async ({ page }) => {
    await openAtlas(page)
    await clickAt(page, ROGERS_PASS)
    await expect(popup(page).locator('.feature-popup-title')).toHaveText('ROGERS PASS')
    await expect(popup(page).locator('.feature-popup-meta')).toHaveText(/native .*· trail$/i)
    // The click still reaches the canopy inspector.
    await expect(readout(page).getByTestId('canopy-value')).toHaveText(/^Canopy (\d+%|: No data)$/)
  })

  test('clicking a lake gives its regime and type, and that 2027 flow is not verified', async ({ page }) => {
    await openAtlas(page)
    await clickAt(page, LAKE_CAROLINE)
    await expect(popup(page).locator('.feature-popup-title')).toHaveText('Lake Caroline')
    await expect(popup(page).locator('.feature-popup-meta')).toHaveText('perennial · lake pond')
    await expect(popup(page).locator('.feature-popup-note')).toHaveText('Mapped feature; 2027 flow not verified.')
  })

  test('clicking a trailhead shows its vehicle note', async ({ page }) => {
    await openAtlas(page)
    await page.getByRole('button', { name: 'James Peak Lake Trailhead, Trailheads / vehicle screen' }).click()
    await expect(popup(page).locator('.feature-popup-title')).toHaveText('James Peak Lake Trailhead')
    await expect(popup(page).locator('.feature-popup-note')).toHaveText(
      'USFS recommends or requires high clearance/4WD for this trailhead; outside the stated Mazda access constraint.',
    )
  })

  test('a trailhead opens from the keyboard, and Escape closes it with focus kept', async ({ page }) => {
    await openAtlas(page)
    const trailhead = page.getByRole('button', { name: 'East Portal Trailhead, Trailheads / vehicle screen' })
    await trailhead.focus()
    await page.keyboard.press('Enter')
    await expect(popup(page).locator('.feature-popup-title')).toHaveText('East Portal Trailhead')
    await expect(popup(page).locator('.feature-popup-note')).toContainText('User confirms East Portal parking')
    await page.keyboard.press('Escape')
    await expect(popup(page)).toHaveCount(0)
    await expect(trailhead).toBeFocused()
    await page.keyboard.press(' ')
    await expect(popup(page)).toHaveCount(1)
  })

  test('a property containing markup renders as text', async ({ page }) => {
    const name = '<img src=x onerror="window.injected=true">Rogers <b>Pass</b>'
    await page.route('**/james-peak-atlas/data/trails.geojson', async (route) => {
      const trails = await (await route.fetch()).json()
      for (const { properties } of trails.features) if (properties.name === 'ROGERS PASS') properties.name = name
      await route.fulfill({ json: trails })
    })
    await openAtlas(page)
    await clickAt(page, ROGERS_PASS)
    await expect(popup(page).locator('.feature-popup-title')).toHaveText(name)
    await expect(popup(page).locator('img, b')).toHaveCount(0)
    expect(await page.evaluate(() => (window as { injected?: boolean }).injected)).toBeUndefined()
  })

  test('a click on no feature opens nothing, even inside a GMU, and the canopy inspector reads', async ({ page }) => {
    await openAtlas(page)
    await controls(page).getByRole('checkbox', { name: 'GMU boundaries', exact: true }).check()
    await expect.poll(async () => (await page.getByTestId('map').getAttribute('data-drawn-layers'))?.split(' ')).toContain('gmu_boundaries')
    await clickAt(page, NOTHING)
    await expect(readout(page).getByTestId('canopy-value')).toHaveText(/^Canopy (\d+%|: No data)$/)
    await expect(popup(page)).toHaveCount(0)
  })

  test('with a popup open, a candidate marker still selects its candidate', async ({ page }) => {
    await openAtlas(page)
    await clickAt(page, LAKE_CAROLINE)
    await expect(popup(page)).toHaveCount(1)
    // EP-04 is the one East Portal marker its neighbours don't overlap at this zoom.
    await page.getByRole('button', { name: /^EP-04: / }).click()
    await expect(popup(page)).toHaveCount(0)
    const card = page.getByRole('region').filter({ hasText: 'SCOUTING CANDIDATE' })
    await expect(card.getByRole('heading', { level: 2 })).toHaveText('East Portal scout 4 — Unnamed mapped stream')
  })
})
