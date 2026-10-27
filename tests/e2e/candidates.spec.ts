import { expect, test, type Page } from '@playwright/test'

// Fixed expectations from candidates.geojson, chosen independently of the app.
const SCOUT_ORDER = ['EP-04', 'EP-05', 'EP-03', 'EP-01', 'EP-06', 'EP-02']
const ALL_BY_INDEX = [
  'JP-01', 'JP-02', 'JP-03', 'JP-04', 'EP-01', 'JP-05', 'JP-06', 'EP-02',
  'JP-07', 'EP-03', 'JP-08', 'EP-04', 'JP-09', 'JP-10', 'EP-05', 'EP-06',
]

const candidatesTab = (page: Page) => page.getByRole('tab', { name: /^Candidates/ })
const scope = (page: Page, name: 'Nearby' | 'All') => page.getByRole('group', { name: 'Scope' }).getByRole('button', { name, exact: true })
const sort = (page: Page) => page.getByRole('combobox', { name: 'Sort' })
const search = (page: Page) => page.getByRole('searchbox', { name: 'Search candidates by ID or name' })
const list = (page: Page) => page.getByRole('list', { name: 'Candidates' })
const cardFor = (page: Page, id: string) => page.locator(`#candidate-card-${id}`)
const marker = (page: Page, id: string) => page.getByRole('button', { name: new RegExp(`^${id}: `) })
const markers = (page: Page) => page.getByRole('main').getByRole('button', { name: /^(EP|JP)-\d\d: / })
const detail = (page: Page) => page.getByRole('region').filter({ hasText: 'SCOUTING CANDIDATE' })

/** The candidate IDs in list order, read from the cards. */
const listedIds = (page: Page) =>
  list(page)
    .getByRole('button')
    .evaluateAll((cards) => cards.map((card) => card.id.replace('candidate-card-', '')))

/** The candidate IDs with a marker on the map, sorted. */
const markerIds = async (page: Page) =>
  (await markers(page).evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')!.slice(0, 5)))).sort()

async function openList(page: Page) {
  await page.goto('./')
  await candidatesTab(page).click()
  await expect(list(page)).toBeVisible()
}

test.describe('the candidate list', () => {
  test('Nearby defaults to scout order, and the map shows the same six', async ({ page }) => {
    await openList(page)
    await expect(scope(page, 'Nearby')).toHaveAttribute('aria-pressed', 'true')
    await expect(sort(page)).toHaveValue('scout')
    expect(await listedIds(page)).toEqual(SCOUT_ORDER)
    await expect(page.getByTestId('candidate-count')).toHaveText('6')
    await expect.poll(() => markerIds(page)).toEqual(SCOUT_ORDER.toSorted())
  })

  test('All defaults to the scouting index across both pools, with no scout order on offer', async ({ page }) => {
    await openList(page)
    await scope(page, 'All').click()
    await expect(sort(page)).toHaveValue('index')
    expect(await listedIds(page)).toEqual(ALL_BY_INDEX)
    await expect(sort(page).locator('option[value="scout"]')).toHaveCount(0)
    await expect.poll(() => markers(page).count()).toBe(16)
    await expect(page.getByRole('region', { name: 'ON THE MAP' }).getByRole('listitem').filter({ hasText: 'candidate' })).toHaveText([
      'Nearby candidate',
      'Wilderness context candidate',
    ])

    // Back to Nearby: its own default returns, since no sort was chosen.
    await scope(page, 'Nearby').click()
    await expect(sort(page)).toHaveValue('scout')
    expect(await listedIds(page)).toEqual(SCOUT_ORDER)
  })

  test('a component sort orders by that component, descending, with ties by pool rank', async ({ page }) => {
    await openList(page)
    await sort(page).selectOption({ label: 'Darkness' })
    expect(await listedIds(page)).toEqual(['EP-03', 'EP-02', 'EP-01', 'EP-06', 'EP-05', 'EP-04'])

    // The chosen component carries over to All.
    await scope(page, 'All').click()
    await sort(page).selectOption({ label: 'Security' })
    expect((await listedIds(page)).slice(0, 8)).toEqual(['EP-04', 'EP-01', 'EP-02', 'JP-01', 'JP-05', 'JP-02', 'EP-05', 'JP-10'])
  })

  test('search matches ID or name, and filters the markers too', async ({ page }) => {
    await openList(page)
    await scope(page, 'All').click()
    await search(page).fill('blue creek')
    expect(await listedIds(page)).toEqual(['JP-01', 'JP-03'])
    await expect.poll(() => markerIds(page)).toEqual(['JP-01', 'JP-03'])

    await search(page).fill('ep-0')
    expect(await listedIds(page)).toEqual(['EP-01', 'EP-02', 'EP-03', 'EP-04', 'EP-05', 'EP-06'])

    await scope(page, 'Nearby').click()
    await search(page).fill('Blue Creek')
    await expect(list(page)).toHaveCount(0)
    await expect(page.getByText('No candidates match this view.')).toBeVisible()
    await expect.poll(() => markers(page).count()).toBe(0)
  })

  test('cards show the pool rank apart from list position, and the round trip as a lower bound', async ({ page }) => {
    await openList(page)
    // EP-04 is first to visit but fourth by index in its pool.
    const first = cardFor(page, 'EP-04')
    await expect(list(page).getByRole('listitem').first()).toContainText('East Portal scout 4')
    await expect(first.getByTestId('pool-rank')).toHaveText('Nearby #4')
    await expect(first.getByTestId('card-index')).toHaveText('72 / 100')
    await expect(first.getByTestId('card-roundtrip')).toHaveText('2.2 mi minimum round trip')
    await expect(first.getByTestId('card-route-note')).toHaveText('Straight-line lower bound · route unverified')

    await scope(page, 'All').click()
    const context = cardFor(page, 'JP-01')
    await expect(context.getByTestId('pool-rank')).toHaveText('Wilderness context #1')
    await expect(context.getByTestId('card-roundtrip')).toHaveText('19.6 mi minimum round trip')
    await expect(context.getByTestId('card-route-note')).toHaveText('Minimum round trip over 6 mi · context only')
    // Retired wording stays retired.
    await expect(page.getByText(/perfect spots|recon list/i)).toHaveCount(0)
  })
})

test.describe('list and map selection', () => {
  test('selecting a card highlights its marker and pans to it', async ({ page }) => {
    await openList(page)
    const map = (await page.getByTestId('map').boundingBox())!
    await cardFor(page, 'EP-02').click()

    await expect(cardFor(page, 'EP-02')).toHaveAttribute('aria-current', 'true')
    await expect(marker(page, 'EP-02')).toHaveClass(/\bselected\b/)
    await expect(detail(page).getByRole('heading', { level: 2 })).toHaveText('East Portal scout 2 — Unnamed mapped stream')
    // Panned so the marker sits left of centre, clear of the detail panel.
    await expect
      .poll(async () => {
        const box = (await marker(page, 'EP-02').boundingBox())!
        return [Math.round(box.x + box.width / 2 - (map.x + map.width / 2)), Math.round(box.y + box.height / 2 - (map.y + map.height / 2))]
      })
      .toEqual([-140, 0])
  })

  test('selecting a marker highlights its card', async ({ page }) => {
    await openList(page)
    await marker(page, 'EP-06').click()
    await expect(cardFor(page, 'EP-06')).toHaveAttribute('aria-current', 'true')
    await expect(list(page).locator('[aria-current]')).toHaveCount(1)

    // At the wilderness-wide fit the selected EP-06 covers EP-01, so the second pick is EP-04.
    await marker(page, 'EP-04').click()
    await expect(cardFor(page, 'EP-04')).toHaveAttribute('aria-current', 'true')
    await expect(cardFor(page, 'EP-06')).not.toHaveAttribute('aria-current')
    await expect(marker(page, 'EP-06')).not.toHaveClass(/\bselected\b/)
  })

  test('a selection that leaves the visible list closes its detail', async ({ page }) => {
    await openList(page)
    await scope(page, 'All').click()
    await cardFor(page, 'JP-04').click()
    await expect(detail(page)).toBeVisible()
    await scope(page, 'Nearby').click()
    await expect(detail(page)).toHaveCount(0)
    await expect(list(page).locator('[aria-current]')).toHaveCount(0)
  })
})

test.describe('the detail panel', () => {
  test('shows the evidence, with each figure labelled by how it was measured', async ({ page }) => {
    await openList(page)
    await cardFor(page, 'EP-04').click()
    const panel = detail(page)

    await expect(panel.getByTestId('scouting-index')).toHaveText('72 / 100')
    await expect(panel.getByTestId('pool')).toHaveText('Nearby #4')
    await expect(panel.getByTestId('location')).toHaveText('39.89568, -105.66452 · WGS84')

    const meters = panel.getByRole('meter')
    await expect(meters).toHaveCount(4)
    await expect(panel.getByRole('meter', { name: 'Water component' })).toHaveAttribute('aria-valuenow', '80')
    await expect(panel.getByRole('meter', { name: 'Shelter component' })).toHaveAttribute('aria-valuenow', '83')
    await expect(panel.getByRole('meter', { name: 'Darkness component' })).toHaveAttribute('aria-valuenow', '32')
    await expect(panel.getByRole('meter', { name: 'Security component' })).toHaveAttribute('aria-valuenow', '100')
    await expect(panel).toContainText('Water · 35% weight')
    await expect(panel.getByTestId('weighted-sum-note')).toContainText('a strong component can make up for a weak one')

    // Each cell: its label, how it was measured, then the value.
    await expect(panel.getByLabel('Raw metrics').locator(':scope > div')).toHaveText([
      'to mapped waterexact vector109 m',
      'tree canopy cover60 m raster estimate60%',
      'from mapped accessexact vector404 m',
      'local slope60 m raster estimate14.1°',
      'minimum round tripstraight-line lower bound2.2 mi',
      'hunting unitmapped boundaryGMU 38',
      'cell elevation60 m raster estimate10,271 ft',
      'nearby steep terrain60 m raster estimate38%',
    ])

    await expect(panel.getByRole('heading', { name: 'Scouting rationale' })).toBeVisible()
    await expect(panel.getByRole('heading', { name: 'Field checks' })).toBeVisible()
    await expect(panel).toContainText('Water present during dry conditions')
    await expect(panel.getByTestId('cautions')).toContainText('straight-line lower bound from Moffat Tunnel / East Portal lot')
    await expect(panel.getByTestId('route-status')).toContainText('Route status: Exact route, cumulative gain')
    await expect(panel.getByRole('list', { name: 'Planning limits' }).getByRole('listitem')).toHaveText([
      '6 mi round-trip limit',
      '4,000 ft gain limit',
      'AWD Mazda 3; no high-clearance approaches',
    ])
  })
})

test.describe('keyboard', () => {
  test('a keyboard user reaches a card without the map, opens its detail, and focus returns on close', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('tab', { name: 'Map layers' })).toBeVisible()

    // Past the top bar's method button to the panel tabs, then arrow across to Candidates.
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Method and sources' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('tab', { name: 'Map layers' })).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(candidatesTab(page)).toBeFocused()
    await expect(candidatesTab(page)).toHaveAttribute('aria-selected', 'true')

    // Scope (two buttons), sort, field status, Import log and search come before the first card.
    // Export log and Reset log are disabled while the field log is empty.
    for (let i = 0; i < 7; i++) await page.keyboard.press('Tab')
    await expect(cardFor(page, 'EP-04')).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(detail(page)).toBeFocused()
    await expect(detail(page).getByRole('heading', { level: 2 })).toHaveText('East Portal scout 4 — Unnamed mapped stream')
    await page.keyboard.press('Tab')
    await expect(detail(page).getByRole('button', { name: 'Close candidate detail' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(detail(page)).toHaveCount(0)
    await expect(cardFor(page, 'EP-04')).toBeFocused()

    // Escape closes it too.
    await page.keyboard.press('Tab')
    await expect(cardFor(page, 'EP-05')).toBeFocused()
    await page.keyboard.press(' ')
    await expect(detail(page)).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(detail(page)).toHaveCount(0)
    await expect(cardFor(page, 'EP-05')).toBeFocused()
  })

  test('closing a detail opened from a marker returns focus to that marker', async ({ page }) => {
    await page.goto('./')
    await marker(page, 'EP-03').focus()
    await page.keyboard.press('Enter')
    await expect(detail(page)).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(marker(page, 'EP-03')).toBeFocused()
  })
})
