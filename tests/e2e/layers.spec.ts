import { expect, test, type Page } from '@playwright/test'

/** Every layer control, by its visible name, and the manifest layer it should switch. */
const CONTROLS: readonly (readonly [name: string, key: string])[] = [
  ['Trails', 'trails'],
  ['Roads', 'roads'],
  ['Developed campgrounds', 'campgrounds'],
  ['Trailheads / vehicle screen', 'trailheads'],
  ['James Peak Wilderness', 'boundary'],
  ['Mapped land ownership', 'ownership'],
  ['GMU boundaries', 'gmu_boundaries'],
  ['USGS topo · 40 ft · 2022', 'official_topo'],
  ['40 ft contour lines', 'contours'],
  ['Terrain relief', 'hillshade'],
  ['Canopy cover · 2025', 'canopy'],
  ['Mapped water', 'water'],
  ['Low-water suitability', 'water_score'],
  ['Darkness: distance from access (0–2,000 m)', 'darkness'],
  ['Combined scouting index', 'overall_score'],
  ['Shelter potential', 'shelter_score'],
  ['Terrain security', 'security_score'],
]

const RASTERS = new Set(['official_topo', 'hillshade', 'canopy', 'water_score', 'darkness', 'overall_score', 'shelter_score', 'security_score'])

const TERRAIN = ['boundary', 'contours', 'hillshade', 'roads', 'trailheads', 'trails', 'water']
const LOW_WATER = [...TERRAIN, 'water_score'].sort()
const QUIET_COVER = ['boundary', 'canopy', 'darkness', 'hillshade', 'roads', 'trailheads', 'trails', 'water']

const controls = (page: Page) => page.getByRole('complementary', { name: 'Map controls' })
const control = (page: Page, name: string) => controls(page).getByRole('checkbox', { name, exact: true })
/** A control's list row, which holds its status and Retry button. */
const row = (page: Page, name: string) =>
  controls(page).getByRole('listitem').filter({ has: page.getByRole('checkbox', { name, exact: true }) })
const preset = (page: Page, name: string) => controls(page).getByRole('group', { name: 'Map presets' }).getByRole('button', { name })
const legend = (page: Page) => page.getByRole('region', { name: 'ON THE MAP' })

/** The layers Leaflet is drawing, as the map adapter reports them. */
async function drawn(page: Page): Promise<string[]> {
  const value = await page.getByTestId('map').getAttribute('data-drawn-layers')
  return (value ?? '').split(' ').filter(Boolean).sort()
}

/** Opens the atlas and waits for the Terrain preset's layers to finish loading. */
async function openAtlas(page: Page) {
  await page.goto('./')
  await expect.poll(() => drawn(page)).toEqual(TERRAIN)
  await expect(controls(page).getByText('Loading', { exact: true })).toHaveCount(0)
}

test.describe('evidence layers', () => {
  test('each control switches only its own layer, and nothing comes from an external tile server', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (request) => requests.push(request.url()))
    await openAtlas(page)

    await expect(controls(page).getByRole('checkbox')).toHaveCount(CONTROLS.length)
    // One darkness layer, labelled in metres; the 0–100 duplicate is gone.
    await expect(controls(page).getByRole('checkbox', { name: /darkness/i })).toHaveCount(1)

    for (const [name, key] of CONTROLS) {
      const before = await drawn(page)
      const wasOn = before.includes(key)
      await expect(control(page, name), name).toBeChecked({ checked: wasOn })

      await control(page, name).click()
      const toggled = wasOn ? before.filter((k) => k !== key) : [...before, key].sort()
      await expect.poll(() => drawn(page), `${name} switches ${key} only`).toEqual(toggled)
      await expect(control(page, name)).toBeChecked({ checked: !wasOn })

      if (!wasOn && RASTERS.has(key)) {
        // The image really loaded over the map, not just an empty element.
        const image = page.locator(`img.layer-${key}`)
        await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0)
      }

      await control(page, name).click()
      await expect.poll(() => drawn(page), `${name} switches back`).toEqual(before)
    }

    const external = requests.filter((url) => new URL(url).origin !== new URL(page.url()).origin)
    expect(external).toEqual([])
  })

  test('the darkness control draws the distance raster', async ({ page }) => {
    await openAtlas(page)
    await control(page, 'Darkness: distance from access (0–2,000 m)').check()
    await expect(page.locator('img.layer-darkness')).toHaveAttribute('src', /\/data\/darkness_distance\.png$/)
  })

  test('presets switch layers only, never scores or candidates', async ({ page }) => {
    await openAtlas(page)
    await expect(preset(page, 'Terrain')).toHaveAttribute('aria-pressed', 'true')

    await preset(page, 'Low water').click()
    await expect.poll(() => drawn(page)).toEqual(LOW_WATER)
    await expect(preset(page, 'Low water')).toHaveAttribute('aria-pressed', 'true')
    await expect(preset(page, 'Terrain')).toHaveAttribute('aria-pressed', 'false')

    await preset(page, 'Quiet cover').click()
    await expect.poll(() => drawn(page)).toEqual(QUIET_COVER)

    // The candidates and their scores are untouched.
    const markers = page.getByRole('button', { name: /^(EP|JP)-\d\d: / })
    await expect(markers).toHaveCount(16)
    await expect(page.getByRole('button', { name: /^EP-04: / })).toHaveAccessibleName(/scouting index 72 \/ 100$/)

    // A preset also turns off what it doesn't include.
    await control(page, 'GMU boundaries').check()
    await expect(preset(page, 'Quiet cover')).toHaveAttribute('aria-pressed', 'false')
    await preset(page, 'Terrain').click()
    await expect.poll(() => drawn(page)).toEqual(TERRAIN)
  })

  test('the legend lists what is shown, with darkness in metres and a note on contour zoom', async ({ page }) => {
    await openAtlas(page)
    const items = legend(page).getByRole('listitem')
    await expect(items).toHaveText([
      'Trails',
      'Roads',
      'Trailheads / vehicle screen',
      'James Peak Wilderness',
      /^40 ft contour lines/,
      'Terrain relief',
      'Mapped water',
      'Nearby candidate',
      'Wilderness context candidate',
    ])
    await expect(legend(page).getByTestId('contour-zoom-note')).toHaveText(
      'Only the 200 ft lines show at this zoom. Zoom in to see every 40 ft contour.',
    )

    // From the wilderness-wide fit, three steps in reaches zoom 13.
    // Leaflet folds a click made mid-animation into the zoom in progress, so
    // each step waits for the scale bar to settle on the new zoom.
    const scale = page.locator('.leaflet-control-scale-line').first()
    for (let step = 0; step < 3; step++) {
      const before = (await scale.textContent()) ?? ''
      await page.getByRole('button', { name: 'Zoom in' }).click()
      await expect(scale).not.toHaveText(before)
    }
    await expect(legend(page).getByTestId('contour-zoom-note')).toHaveText('Every 40 ft, with heavier lines every 200 ft.')

    await preset(page, 'Quiet cover').click()
    await expect(legend(page).getByText('40 ft contour lines')).toHaveCount(0)
    const darkness = legend(page).getByRole('listitem').filter({ hasText: 'Darkness: distance from access' })
    await expect(darkness).toContainText('0 m')
    await expect(darkness).toContainText('2,000+ m')
    const canopy = legend(page).getByRole('listitem').filter({ hasText: 'Canopy cover · 2025' })
    await expect(canopy).toContainText('0%')
    await expect(canopy).toContainText('100%')

    await control(page, 'Trails').uncheck()
    await expect(legend(page).getByText('Trails', { exact: true })).toHaveCount(0)

    await legend(page).getByRole('button', { name: 'Hide legend' }).click()
    await expect(legend(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Legend' })).toHaveAttribute('aria-expanded', 'false')
    await page.getByRole('button', { name: 'Legend' }).click()
    await expect(legend(page)).toBeVisible()
  })

  test('overlay strength changes the evidence overlays only', async ({ page }) => {
    await openAtlas(page)
    await preset(page, 'Quiet cover').click()
    await control(page, 'Combined scouting index').check()
    const opacity = (key: string) => page.locator(`img.layer-${key}`).evaluate((img) => getComputedStyle(img).opacity)
    await expect.poll(() => opacity('canopy')).toBe('0.65')

    await controls(page).getByRole('slider', { name: 'Overlay strength' }).fill('30')
    await expect(controls(page).getByText('30%')).toBeVisible()
    for (const key of ['canopy', 'darkness', 'overall_score']) await expect.poll(() => opacity(key)).toBe('0.3')
    expect(await opacity('hillshade')).toBe('0.9')

    // A layer switched on later starts at the current strength.
    await control(page, 'Shelter potential').check()
    await expect.poll(() => opacity('shelter_score')).toBe('0.3')
  })
})

test.describe('layer failure', () => {
  test('a blocked GeoJSON layer fails in its own control, and Retry recovers it', async ({ page }) => {
    await page.route('**/james-peak-atlas/data/trails.geojson', (route) => route.abort())
    await page.goto('./')

    const trails = row(page, 'Trails')
    await expect(trails.getByRole('status')).toContainText('Couldn’t load: data/trails.geojson: request failed')
    await expect(control(page, 'Trails')).not.toBeChecked()
    // Only trails failed: no full-screen error, and the rest of the atlas works.
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect.poll(() => drawn(page)).toEqual(TERRAIN.filter((key) => key !== 'trails'))
    await expect(page.getByRole('button', { name: /^(EP|JP)-\d\d: / })).toHaveCount(16)

    await page.unroute('**/james-peak-atlas/data/trails.geojson')
    await trails.getByRole('button', { name: 'Retry Trails' }).click()
    await expect.poll(() => drawn(page)).toEqual(TERRAIN)
    await expect(control(page, 'Trails')).toBeChecked()
    await expect(trails.getByRole('status')).toHaveCount(0)
  })

  test('a blocked raster fails in its own control, and Retry reloads that layer only', async ({ page }) => {
    await openAtlas(page)
    await page.route('**/james-peak-atlas/data/canopy.png', (route) => route.abort())
    const requests: string[] = []
    page.on('request', (request) => requests.push(new URL(request.url()).pathname))

    await control(page, 'Canopy cover · 2025').check()
    const canopy = row(page, 'Canopy cover · 2025')
    await expect(canopy.getByRole('status')).toContainText('Couldn’t load: the image couldn’t be loaded')
    await expect(control(page, 'Canopy cover · 2025')).not.toBeChecked()
    await expect.poll(() => drawn(page)).toEqual(TERRAIN)
    await expect(page.getByRole('alert')).toHaveCount(0)

    await page.unroute('**/james-peak-atlas/data/canopy.png')
    requests.length = 0
    await canopy.getByRole('button', { name: 'Retry Canopy cover · 2025' }).click()
    const image = page.locator('img.layer-canopy')
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0)
    await expect(control(page, 'Canopy cover · 2025')).toBeChecked()
    await expect(canopy.getByRole('status')).toHaveCount(0)
    expect(requests).toEqual(['/james-peak-atlas/data/canopy.png'])
  })
})
