import { expect, test, type Page } from '@playwright/test'

/** Collects every failed request, so a broken subpath asset can't pass unnoticed. */
function trackFailedRequests(page: Page) {
  const failed: string[] = []
  page.on('requestfailed', (request) => failed.push(`${request.url()} (${request.failure()?.errorText})`))
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(`${response.url()} (${response.status()})`)
  })
  return failed
}

test('the shell renders at the Pages subpath with every asset loading', async ({ page }) => {
  const failed = trackFailedRequests(page)
  await page.goto('./')

  await expect(page.getByRole('heading', { level: 1, name: 'James Peak' })).toBeVisible()
  await expect(page.getByRole('banner')).toContainText('LOW WATER · 2027')
  await expect(page.getByRole('complementary', { name: 'Map controls' })).toBeVisible()
  await expect(page.getByRole('main', { name: 'Interactive scouting map' })).toBeVisible()
  // The Tailwind theme reached the page: the header is forest green.
  await expect(page.getByRole('banner')).toHaveCSS('background-color', 'rgb(25, 62, 53)')
  expect(failed).toEqual([])
})

test('the reference atlas loads under its subpath with the public-release note', async ({ page }) => {
  const failed = trackFailedRequests(page)
  await page.goto('reference/')

  await expect(page.getByRole('note')).toContainText('Observations were removed for public release')
  await expect(page.getByRole('note')).toContainText('“Your locations” control does nothing')
  // The original app has fetched and drawn its bundled data, not just its HTML.
  await expect(page.locator('#candidateCount')).toHaveText('16 scouting candidates')
  await expect(page.locator('#bundleStatus')).toHaveText('Local map bundle · no live tiles')
  expect(failed).toEqual([])
})

test('the bundled packages’ licences ship beside the bundle', async ({ request }) => {
  const response = await request.get('third-party-licenses.md')
  expect(response.ok()).toBe(true)
  const licences = await response.text()
  // Leaflet's BSD 2-Clause asks for its copyright notice in binary redistributions.
  expect(licences).toContain('## leaflet - 1.9.4 (BSD-2-Clause)')
  expect(licences).toContain('Volodymyr Agafonkin')
  for (const name of ['react', 'react-dom', 'zod']) expect(licences).toMatch(new RegExp(`## ${name} - \\S+ \\(MIT\\)`))
})
