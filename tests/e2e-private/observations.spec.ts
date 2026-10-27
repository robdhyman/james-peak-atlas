import { readFile } from 'node:fs/promises'
import { expect, test, type Locator, type Page } from '@playwright/test'

// The private build (ADR 0001), run locally only: observations render as
// evidence, apart from candidates, and the focus control fits the map to
// them. Expectations name observations by ID only and never by position, so
// this file is safe in the public repo.

interface PrivateObservation {
  readonly properties: { readonly id: string }
}

const privateIds = async (): Promise<string[]> => {
  const file = new URL('../../private/observations.geojson', import.meta.url)
  const { features } = JSON.parse(await readFile(file, 'utf8')) as { features: PrivateObservation[] }
  return features.map(({ properties }) => properties.id)
}

const markers = (page: Page) => page.locator('.observation-marker')

/** The smallest box around every observation marker on screen, in pixels. */
async function spread(locator: Locator) {
  const boxes = await Promise.all((await locator.all()).map((marker) => marker.boundingBox()))
  const xs = boxes.map((box) => box!.x)
  const ys = boxes.map((box) => box!.y)
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
}

test('observations render as evidence on the map, in the legend and in their own list section', async ({ page }) => {
  const ids = await privateIds()
  expect(ids.length).toBeGreaterThan(0)
  await page.goto('./')

  await expect(markers(page)).toHaveCount(ids.length)
  // Evidence, not candidates: their own marker class, with no candidate label or keyboard stop.
  for (const marker of await markers(page).all()) {
    await expect(marker).not.toHaveClass(/candidate-marker/)
    await expect(marker).not.toHaveAttribute('tabindex')
    await expect(marker).not.toHaveAttribute('role', 'button')
  }
  await expect(page.locator('.candidate-marker')).toHaveCount(6)

  const legend = page.getByRole('region', { name: 'ON THE MAP' })
  await expect(legend.locator('[data-legend="observations"]')).toHaveText('Observation · your field evidence')

  await page.getByRole('tab', { name: /Candidates/ }).click()
  // The candidate list is unchanged; observations sit in a separate section.
  await expect(page.getByRole('list', { name: 'Candidates' }).getByRole('listitem')).toHaveCount(6)
  const section = page.getByRole('region', { name: 'OBSERVATIONS' })
  await expect(section.getByRole('listitem')).toHaveCount(ids.length)
  for (const id of ids) await expect(section.getByText(id, { exact: true })).toBeVisible()
})

test('the focus control fits the map to the observations', async ({ page }) => {
  await page.goto('./')
  await expect(markers(page)).toHaveCount((await privateIds()).length)
  const before = await spread(markers(page))

  await page.getByRole('button', { name: 'Fit map to observations' }).click()

  // Zoomed in on them: they spread further apart, and every one is inside the map.
  await expect.poll(async () => (await spread(markers(page))).width).toBeGreaterThan(before.width * 1.5)
  const map = (await page.getByTestId('map').boundingBox())!
  for (const marker of await markers(page).all()) {
    const box = (await marker.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(map.x)
    expect(box.y).toBeGreaterThanOrEqual(map.y)
    expect(box.x + box.width).toBeLessThanOrEqual(map.x + map.width)
    expect(box.y + box.height).toBeLessThanOrEqual(map.y + map.height)
  }
})

test('candidates, including "observed at candidate", are the public build’s, byte for byte', async ({ request }) => {
  const served = await (await request.get('data/candidates.geojson')).body()
  const committed = await readFile(new URL('../../public/data/candidates.geojson', import.meta.url))
  expect(served.equals(committed)).toBe(true)

  const { features } = JSON.parse(served.toString('utf8')) as { features: { properties: Record<string, unknown> }[] }
  expect(features.map(({ properties }) => properties['observed_elk_at_candidate'])).toEqual(Array(16).fill(false))
})
