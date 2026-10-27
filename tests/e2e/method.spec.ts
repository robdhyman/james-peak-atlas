import { expect, test, type Page } from '@playwright/test'

const opener = (page: Page) => page.getByRole('banner').getByRole('button', { name: 'Method and sources' })
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Method and sources' })

async function openMethod(page: Page) {
  await page.goto('./')
  await expect(opener(page)).toBeEnabled()
  await opener(page).click()
  await expect(dialog(page)).toBeVisible()
}

test.describe('method and sources', () => {
  test('sets out the scenario, weights, formulas, thresholds, pools, limitations and sources', async ({ page }) => {
    await openMethod(page)
    const method = dialog(page)

    for (const name of [
      'The 2027 scenario',
      'Weights',
      'Component formulas',
      'Admission thresholds',
      'Two pools',
      'Known limitations',
      'Sources',
    ]) {
      await expect(method.getByRole('heading', { level: 3, name, exact: true })).toBeVisible()
    }

    // Values come from data/method.json, not from the page's own copy.
    const scenario = method.getByRole('region', { name: 'The 2027 scenario' })
    await expect(scenario).toContainText('Low surface water')
    await expect(scenario).toContainText('User assumes elk occupancy in 2027')
    await expect(method.getByTestId('heuristic-statement')).toContainText('unvalidated planning heuristics')
    await expect(method.getByTestId('heuristic-statement')).toContainText('It is not a probability.')

    const weights = method.getByRole('region', { name: 'Weights' }).getByRole('listitem')
    await expect(weights).toHaveText(['35%Water', '25%Shelter', '25%Darkness', '15%Security'])

    const formulas = method.getByRole('region', { name: 'Component formulas' }).locator('code')
    await expect(formulas).toHaveCount(4)
    await expect(formulas.nth(1)).toHaveText('100*clip((canopy_percent-10)/60,0,1)')

    const thresholds = method.getByRole('region', { name: 'Admission thresholds' })
    await expect(thresholds).toContainText('Perennial water 30–450 m away')
    await expect(thresholds).toContainText('Canopy cover at least 30%')
    await expect(thresholds).not.toContainText(/anchor/i)

    const pools = method.getByRole('region', { name: 'Two pools' })
    await expect(pools).toContainText('<=3 miles from East Portal')
    await expect(pools).toContainText('Up to ten highest-scoring remaining cells')

    await expect(method.getByRole('region', { name: 'Known limitations' })).toContainText('Distance rasters use 60 m cells')
  })

  test('cites every linked source with a valid external URL, and never the private CalTopo source', async ({ page }) => {
    await openMethod(page)
    const links = dialog(page).getByRole('link')
    await expect(links).toHaveCount(7)

    for (const link of await links.all()) {
      const href = (await link.getAttribute('href'))!
      expect(URL.canParse(href), href).toBe(true)
      expect(new URL(href).protocol).toBe('https:')
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', /noopener/)
    }
    await expect(links.first()).toHaveAccessibleName(/^USFS wilderness boundary.*\(opens in a new tab\)$/)

    await expect(dialog(page)).not.toContainText(/caltopo|observation|your locations/i)
    expect(await page.content()).not.toMatch(/caltopo/i)
  })

  test('traps focus, closes with Escape and returns focus to the opener', async ({ page }) => {
    await openMethod(page)
    const method = dialog(page)
    const close = method.getByRole('button', { name: 'Close method and sources' })
    const lastLink = method.getByRole('link').last()

    await expect(close).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(lastLink).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(close).toBeFocused()

    // A full lap forward never leaves the dialog.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await method.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(method).toBeHidden()
    await expect(opener(page)).toBeFocused()
  })

  test('the close button also returns focus to the opener', async ({ page }) => {
    await openMethod(page)
    await dialog(page).getByRole('button', { name: 'Close method and sources' }).click()
    await expect(dialog(page)).toBeHidden()
    await expect(opener(page)).toBeFocused()
  })

  test('opens from its icon at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMethod(page)
    const box = (await dialog(page).boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
  })
})
