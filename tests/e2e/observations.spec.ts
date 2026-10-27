import { expect, test } from '@playwright/test'

// The public build ships zero observations (ADR 0001), so no observation UI
// may render: no legend entry, no focus control, no list section, nothing
// disabled in their place. The private build's side is tests/e2e-private/.

test('the public build ships an empty observations collection', async ({ request }) => {
  const manifest = await (await request.get('data/manifest.json')).json()
  const observations = await (await request.get(manifest.observations)).json()
  expect(observations).toEqual({ type: 'FeatureCollection', features: [] })
})

test('the public atlas has no observation UI and no trace of where it was', async ({ page }) => {
  await page.goto('./')
  const legend = page.getByRole('region', { name: 'ON THE MAP' })
  await expect(legend.getByText('Nearby candidate')).toBeVisible()

  await expect(page.locator('[data-legend="observations"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /observations|your locations/i })).toHaveCount(0)
  await expect(page.locator('.observation-marker')).toHaveCount(0)

  await page.getByRole('tab', { name: /Candidates/ }).click()
  await expect(page.getByRole('list', { name: 'Candidates' }).getByRole('listitem')).toHaveCount(6)
  await expect(page.getByRole('heading', { name: /observations/i })).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Observations' })).toHaveCount(0)

  // No disabled stand-in or leftover wording anywhere on the screen.
  await expect(page.locator('body')).not.toContainText(/observation|your locations|caltopo/i)
})
