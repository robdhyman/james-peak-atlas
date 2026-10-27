import { expect, test, type Page } from '@playwright/test'

const marker = (page: Page, id: string) => page.getByRole('button', { name: new RegExp(`^${id}: `) })
const card = (page: Page) => page.getByRole('region').filter({ has: page.getByRole('heading', { level: 2 }) })

test.describe('data to map', () => {
  test('draws the hillshade, the wilderness boundary and 16 candidate markers over the same ground', async ({ page }) => {
    await page.goto('./')
    const map = page.getByRole('main', { name: 'Interactive scouting map' })

    await expect(map.getByRole('button', { name: /^(EP|JP)-\d\d: / })).toHaveCount(16)

    const hillshade = map.locator('img.leaflet-image-layer')
    await expect(hillshade).toHaveAttribute('src', /\/james-peak-atlas\/data\/hillshade\.png$/)
    await expect.poll(() => hillshade.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0)
    // The boundary is drawn by Leaflet's canvas renderer in its own pane.
    await expect(map.locator('.leaflet-boundaries-pane canvas')).toHaveCount(1)

    // Georeferencing: every marker sits on the hillshade, which covers the
    // wilderness. Swapped [lat, lon] would put them far off the image.
    const image = (await hillshade.boundingBox())!
    for (const box of await Promise.all(
      (await map.getByRole('button', { name: /^(EP|JP)-\d\d: / }).all()).map((m) => m.boundingBox()),
    )) {
      const x = box!.x + box!.width / 2
      const y = box!.y + box!.height / 2
      expect(x).toBeGreaterThan(image.x)
      expect(x).toBeLessThan(image.x + image.width)
      expect(y).toBeGreaterThan(image.y)
      expect(y).toBeLessThan(image.y + image.height)
    }
    // EP-04 (closest to East Portal) lies north-east of JP-01 (Blue Creek).
    const ep04 = (await marker(page, 'EP-04').boundingBox())!
    const jp01 = (await marker(page, 'JP-01').boundingBox())!
    expect(ep04.x).toBeGreaterThan(jp01.x)
    expect(ep04.y).toBeLessThan(jp01.y)
  })

  test('clicking a marker opens its detail card, without re-creating the map', async ({ page }) => {
    await page.goto('./')
    await expect(marker(page, 'EP-04')).toBeVisible()
    // Tag the live map element; a re-created map would lose the tag.
    await page.locator('.leaflet-container').evaluate((el) => el.setAttribute('data-original', ''))

    await marker(page, 'EP-04').click()
    await expect(card(page)).toContainText('SCOUTING CANDIDATE · EP-04')
    await expect(card(page).getByRole('heading', { level: 2 })).toHaveText('East Portal scout 4 — Unnamed mapped stream')
    await expect(card(page).getByTestId('scouting-index')).toHaveText('72 / 100')
    await expect(card(page).getByTestId('pool')).toHaveText('Nearby')
    await expect(marker(page, 'EP-04')).toHaveClass(/\bselected\b/)

    await marker(page, 'JP-02').click()
    await expect(card(page).getByRole('heading', { level: 2 })).toHaveText('Wilderness context 2 — Unnamed mapped stream')
    await expect(card(page).getByTestId('scouting-index')).toHaveText('85 / 100')
    await expect(card(page).getByTestId('pool')).toHaveText('Wilderness context')
    await expect(marker(page, 'EP-04')).not.toHaveClass(/\bselected\b/)
    await expect(marker(page, 'JP-02')).toHaveClass(/\bselected\b/)

    await expect(page.locator('.leaflet-container[data-original]')).toHaveCount(1)

    await card(page).getByRole('button', { name: 'Close candidate detail' }).click()
    await expect(card(page)).toHaveCount(0)
    await expect(marker(page, 'JP-02')).not.toHaveClass(/\bselected\b/)
  })

  test('a keyboard user can open a card from a marker with Enter or Space', async ({ page }) => {
    await page.goto('./')
    await marker(page, 'EP-05').focus()
    await page.keyboard.press('Enter')
    await expect(card(page).getByRole('heading', { level: 2 })).toHaveText('East Portal scout 5 — Unnamed mapped stream')
    await expect(card(page).getByTestId('scouting-index')).toHaveText('71 / 100')

    // JP-01 is covered by its neighbours at this zoom, but still reachable.
    await marker(page, 'JP-01').focus()
    await page.keyboard.press(' ')
    await expect(card(page).getByRole('heading', { level: 2 })).toHaveText('Wilderness context 1 — Blue Creek')
    await expect(card(page).getByTestId('scouting-index')).toHaveText('89 / 100')
  })
})

test.describe('fatal data errors', () => {
  for (const file of ['data/manifest.json', 'data/candidates.geojson']) {
    test(`a blocked ${file} shows the full-screen error naming the file`, async ({ page }) => {
      await page.route(`**/james-peak-atlas/${file}`, (route) => route.abort())
      await page.goto('./')

      const alert = page.getByRole('alert')
      await expect(alert.getByRole('heading', { name: 'The atlas data couldn’t be loaded' })).toBeVisible()
      await expect(alert.getByTestId('fatal-file')).toHaveText(file)
      await expect(alert).toContainText('request failed')
      await expect(page.getByRole('main', { name: 'Interactive scouting map' })).toHaveCount(0)
    })
  }

  test('an invalid candidates file names the record and the problem', async ({ page }) => {
    await page.route('**/james-peak-atlas/data/candidates.geojson', async (route) => {
      const json = await (await route.fetch()).json()
      json.features[10].geometry.coordinates.reverse()
      await route.fulfill({ json })
    })
    await page.goto('./')

    const alert = page.getByRole('alert')
    await expect(alert.getByTestId('fatal-file')).toHaveText('data/candidates.geojson')
    await expect(alert).toContainText('feature 11 (EP-01)')
    await expect(alert).toContainText('coordinates look like [lat, lon]; expected [lon, lat]')
  })
})
