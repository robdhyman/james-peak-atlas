import { expect, test, type Page } from '@playwright/test'

// Fixed expectations from candidates.geojson, chosen independently of the app.
const SCOUT_ORDER = ['EP-04', 'EP-05', 'EP-03', 'EP-01', 'EP-06', 'EP-02']
const ALL_BY_INDEX = [
  'JP-01', 'JP-02', 'JP-03', 'JP-04', 'EP-01', 'JP-05', 'JP-06', 'EP-02',
  'JP-07', 'EP-03', 'JP-08', 'EP-04', 'JP-09', 'JP-10', 'EP-05', 'EP-06',
]
const ALL_BY_SHELTER = [
  'EP-04', 'JP-03', 'EP-05', 'EP-06', 'JP-01', 'JP-06', 'EP-01', 'JP-02',
  'JP-07', 'JP-05', 'JP-08', 'JP-04', 'JP-09', 'EP-03', 'EP-02', 'JP-10',
]

const candidatesTab = (page: Page) => page.getByRole('tab', { name: /^Candidates/ })
const scope = (page: Page, name: 'Nearby' | 'All') => page.getByRole('group', { name: 'Scope' }).getByRole('button', { name, exact: true })
const sort = (page: Page) => page.getByRole('combobox', { name: 'Sort' })
const list = (page: Page) => page.getByRole('list', { name: 'Candidates' })
const cardFor = (page: Page, id: string) => page.locator(`#candidate-card-${id}`)
const marker = (page: Page, id: string) => page.getByRole('button', { name: new RegExp(`^${id}: `) })
const detail = (page: Page) => page.getByRole('region').filter({ hasText: 'SCOUTING CANDIDATE' })
const notice = (page: Page) => page.getByRole('note', { name: 'Link notice' })
const hash = (page: Page) => page.evaluate(() => window.location.hash)

const listedIds = (page: Page) =>
  list(page)
    .getByRole('button')
    .evaluateAll((cards) => cards.map((card) => card.id.replace('candidate-card-', '')))

/**
 * Revealed: on desktop the map centres 140 px right of the marker, so the
 * detail panel doesn't cover it. Polled, since the pan animates.
 */
async function expectRevealed(page: Page, id: string) {
  await expect
    .poll(async () => {
      const map = (await page.getByTestId('map').boundingBox())!
      const pin = (await marker(page, id).boundingBox())!
      const dx = pin.x + pin.width / 2 - (map.x + map.width / 2)
      const dy = pin.y + pin.height / 2 - (map.y + map.height / 2)
      return Math.abs(dx + 140) <= 2 && Math.abs(dy) <= 2
    })
    .toBe(true)
}

/** The default view: Nearby in scout order, nothing selected, and a clean URL. */
async function expectDefaultView(page: Page) {
  await candidatesTab(page).click()
  await expect(scope(page, 'Nearby')).toHaveAttribute('aria-pressed', 'true')
  await expect(sort(page)).toHaveValue('scout')
  expect(await listedIds(page)).toEqual(SCOUT_ORDER)
  await expect(detail(page)).toHaveCount(0)
  expect(await hash(page)).toBe('')
}

test.describe('a shareable view link', () => {
  test('a crafted link selects its candidate, opens the detail panel and applies the scope and sort', async ({ page }) => {
    await page.goto('./#candidate=JP-07&scope=all&sort=shelter')
    await expect(candidatesTab(page)).toHaveAttribute('aria-selected', 'true')
    await expect(scope(page, 'All')).toHaveAttribute('aria-pressed', 'true')
    await expect(sort(page)).toHaveValue('shelter')
    expect(await listedIds(page)).toEqual(ALL_BY_SHELTER)

    await expect(detail(page)).toContainText('JP-07')
    await expect(cardFor(page, 'JP-07')).toHaveAttribute('aria-current', 'true')
    await expect(marker(page, 'JP-07')).toHaveClass(/\bselected\b/)
    await expectRevealed(page, 'JP-07')
    await expect(notice(page)).toHaveCount(0)
  })

  test('closing a linked candidate’s panel focuses its marker and drops it from the link', async ({ page }) => {
    await page.goto('./#candidate=EP-03')
    await expect(detail(page)).toContainText('EP-03')
    await detail(page).getByRole('button', { name: 'Close candidate detail' }).click()
    await expect(detail(page)).toHaveCount(0)
    await expect(marker(page, 'EP-03')).toBeFocused()
    expect(await hash(page)).toBe('')
  })

  test('scout order with the All scope resolves to the All default sort', async ({ page }) => {
    await page.goto('./#scope=all&sort=scout')
    await expect(scope(page, 'All')).toHaveAttribute('aria-pressed', 'true')
    await expect(sort(page)).toHaveValue('index')
    expect(await listedIds(page)).toEqual(ALL_BY_INDEX)
    await expect(notice(page)).toHaveCount(0)
  })

  test('changing the view updates the link, and a reload keeps it', async ({ page }) => {
    await page.goto('./')
    expect(await hash(page)).toBe('')
    await candidatesTab(page).click()
    await scope(page, 'All').click()
    await expect.poll(() => hash(page)).toBe('#scope=all')
    await sort(page).selectOption('shelter')
    await expect.poll(() => hash(page)).toBe('#scope=all&sort=shelter')
    await cardFor(page, 'JP-03').click()
    await expect.poll(() => hash(page)).toBe('#candidate=JP-03&scope=all&sort=shelter')

    await page.reload()
    await expect(scope(page, 'All')).toHaveAttribute('aria-pressed', 'true')
    await expect(sort(page)).toHaveValue('shelter')
    expect(await listedIds(page)).toEqual(ALL_BY_SHELTER)
    await expect(detail(page)).toContainText('JP-03')
  })

  test('layer changes don’t touch the link, and view changes add no history entries', async ({ page }) => {
    await page.goto('./#scope=all')
    const length = await page.evaluate(() => history.length)
    const controls = page.getByRole('complementary', { name: 'Map controls' })
    await page.getByRole('tab', { name: 'Map layers' }).click()
    await controls.getByRole('checkbox', { name: 'Trails', exact: true }).uncheck()
    await controls.getByRole('group', { name: 'Map presets' }).getByRole('button', { name: 'Low water' }).click()
    expect(await hash(page)).toBe('#scope=all')

    await candidatesTab(page).click()
    await sort(page).selectOption('water')
    await cardFor(page, 'EP-01').click()
    await expect.poll(() => hash(page)).toBe('#candidate=EP-01&scope=all&sort=water')
    expect(await page.evaluate(() => history.length)).toBe(length)
  })

  // JP-03 has no marker until the link's All scope is applied, so the reveal must wait for it.
  test('a link pasted into an open tab is followed, including a scope change', async ({ page }) => {
    await page.goto('./')
    await expect(candidatesTab(page)).toBeVisible()
    await expect(marker(page, 'JP-03')).toHaveCount(0)
    await page.evaluate(() => (window.location.hash = '#candidate=JP-03&scope=all'))
    await expect(detail(page)).toContainText('JP-03')
    await expect(marker(page, 'JP-03')).toHaveClass(/\bselected\b/)
    await expectRevealed(page, 'JP-03')
  })
})

test.describe('a broken link opens the default view with a notice', () => {
  for (const [what, link, problem] of [
    ['an unknown candidate', '#candidate=EP-99&scope=all', 'There’s no candidate “EP-99” in this atlas.'],
    ['a candidate outside the link’s scope', '#candidate=JP-07', 'JP-07 isn’t in the Nearby list.'],
    ['an invalid scope', '#scope=near&candidate=EP-04', '“near” isn’t a scope.'],
    ['an invalid sort', '#sort=distance&scope=all', '“distance” isn’t a sort.'],
  ] as const) {
    test(what, async ({ page }) => {
      await page.goto(`./${link}`)
      await expect(notice(page).getByRole('paragraph')).toHaveText(`${problem} The default view is open instead.`)
      await expect(page.getByRole('tab', { name: 'Map layers' })).toHaveAttribute('aria-selected', 'true')
      await expectDefaultView(page)
    })
  }

  test('the notice can be dismissed, and a reload doesn’t bring it back', async ({ page }) => {
    await page.goto('./#candidate=EP-99')
    await expect(notice(page)).toBeVisible()
    await page.getByRole('button', { name: 'Dismiss link notice' }).click()
    await expect(notice(page)).toHaveCount(0)
    await page.reload()
    await expect(candidatesTab(page)).toBeVisible()
    await expect(notice(page)).toHaveCount(0)
  })
})
