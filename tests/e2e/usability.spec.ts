import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'

// Ticket 12: keyboard only, WCAG 2.2 AA, 390 px, and failure that stays understandable.

const KEY = 'jpa.fieldlog.v1'
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * The axe findings this atlas accepts, each with its reason. Anything else fails the scan.
 * Keep this list short: a finding belongs here only when the criterion itself allows it.
 */
const ACCEPTED: readonly { rule: string; element: string; reason: string }[] = [
  {
    rule: 'target-size',
    element: 'leaflet-marker-icon',
    reason:
      'Map markers sit where their places are, so close places give close markers: nearby candidates overlap at the opening zoom, and two Rogers Pass trailheads share one spot. ' +
      'WCAG 2.5.8’s Understanding document gives map pins as its example of the “essential” exception. ' +
      'Each candidate marker also has an equivalent target in its list card, and every point marker is a 24 px target and reachable by Tab.',
  },
]

const layersTab = (page: Page) => page.getByRole('tab', { name: 'Map layers' })
const candidatesTab = (page: Page) => page.getByRole('tab', { name: /^Candidates/ })
const drawer = (page: Page) => page.getByRole('complementary', { name: 'Map controls' })
const drawerButton = (page: Page) => page.getByRole('button', { name: 'Map controls' })
const methodButton = (page: Page) => page.getByRole('button', { name: 'Method and sources' })
const exportButton = (page: Page) => page.getByRole('button', { name: /^Export \d+ shown$/ })
const scope = (page: Page, name: 'Nearby' | 'All') => page.getByRole('group', { name: 'Scope' }).getByRole('button', { name, exact: true })
const sort = (page: Page) => page.getByRole('combobox', { name: 'Sort' })
const statusFilter = (page: Page) => page.getByRole('combobox', { name: 'Field status' }).first()
const search = (page: Page) => page.getByRole('searchbox', { name: 'Search candidates by ID or name' })
const cards = (page: Page) => page.getByRole('list', { name: 'Candidates' }).getByRole('button')
const cardFor = (page: Page, id: string) => page.locator(`#candidate-card-${id}`)
const detail = (page: Page) => page.getByRole('region').filter({ hasText: 'SCOUTING CANDIDATE' })
/** The app's own status region: the one live region for failures after load. */
const announcer = (page: Page) => page.getByRole('main').locator('> p[role="status"]')

/** Fails unless the focused element draws the app's focus ring: an outline at least 2 px wide. */
async function expectFocusRing(page: Page) {
  const ring = await page.evaluate(() => {
    const element = document.activeElement
    if (!(element instanceof HTMLElement) || element === document.body) return { element: 'nothing', drawn: false }
    const { outlineStyle, outlineWidth } = getComputedStyle(element)
    return { element: element.id || element.tagName, drawn: outlineStyle !== 'none' && parseFloat(outlineWidth) >= 2 }
  })
  expect(ring.drawn, `focus ring on ${ring.element}`).toBe(true)
}

/** Presses Tab (or Shift+Tab) and checks where focus lands and that it shows. */
async function tabTo(page: Page, target: Locator, { back = false } = {}) {
  await page.keyboard.press(back ? 'Shift+Tab' : 'Tab')
  await expect(target).toBeFocused()
  await expectFocusRing(page)
}

/** A screenshot kept with the test's results as evidence for the 390 px layout. */
async function evidence(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`)
  await page.screenshot({ path })
  await testInfo.attach(name, { path, contentType: 'image/png' })
}

/** Runs axe for WCAG 2.2 AA and returns what it found outside ACCEPTED, as readable lines. */
async function violations(page: Page, build: (axe: AxeBuilder) => AxeBuilder = (axe) => axe): Promise<string[]> {
  const { violations } = await build(new AxeBuilder({ page }).withTags(WCAG_22_AA)).analyze()
  return violations.flatMap(({ id, nodes }) =>
    nodes
      .filter(({ html }) => !ACCEPTED.some(({ rule, element }) => rule === id && html.includes(element)))
      .map(({ target, failureSummary }) => `${id} at ${target.join(' ')}: ${failureSummary?.replace(/\s+/g, ' ')}`),
  )
}

/** Opens the atlas and waits for the default layers, so a scan sees the settled page. */
async function openAtlas(page: Page, path = './') {
  await page.goto(path)
  await expect
    .poll(async () => (await page.getByTestId('map').getAttribute('data-drawn-layers'))?.split(' ') ?? [])
    .toEqual(expect.arrayContaining(['boundary', 'trails', 'water']))
}

test.describe('keyboard only', () => {
  test('every list control, a candidate, its field log and Export are reachable without the map, with focus shown and returned', async ({ page }) => {
    await page.goto('./')
    await expect(layersTab(page)).toBeVisible()

    // The method dialog hands focus back to its button.
    await tabTo(page, methodButton(page))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Method and sources' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(methodButton(page)).toBeFocused()
    await expectFocusRing(page)

    await tabTo(page, exportButton(page))
    await tabTo(page, layersTab(page))
    await page.keyboard.press('ArrowRight')
    await expect(candidatesTab(page)).toBeFocused()
    await expectFocusRing(page)

    // Scope, sort and field status.
    await tabTo(page, scope(page, 'Nearby'))
    await tabTo(page, scope(page, 'All'))
    await page.keyboard.press('Enter')
    await expect(scope(page, 'All')).toHaveAttribute('aria-pressed', 'true')
    await tabTo(page, sort(page))
    await page.keyboard.type('W')
    await expect(sort(page)).toHaveValue('water')
    await tabTo(page, statusFilter(page))
    await page.keyboard.type('T')
    await expect(statusFilter(page)).toHaveValue('to_scout')

    // Import log is the only field log tool on offer while the log is empty; then search.
    await tabTo(page, page.getByRole('button', { name: 'Import log' }))
    await tabTo(page, search(page))
    await page.keyboard.type('JP-0')
    await expect(page.getByTestId('candidate-count')).toHaveText('9')

    // The first card, its detail panel, and its field log.
    const first = cards(page).first()
    const id = (await first.getAttribute('id'))!.replace('candidate-card-', '')
    await tabTo(page, first)
    await page.keyboard.press('Enter')
    await expect(detail(page)).toBeFocused()
    await expectFocusRing(page)
    await expect(detail(page)).toContainText(`SCOUTING CANDIDATE · ${id}`)
    await tabTo(page, detail(page).getByRole('button', { name: 'Close candidate detail' }))
    await tabTo(page, detail(page).getByRole('combobox', { name: 'Field status' }))
    await page.keyboard.type('S')
    await expect(detail(page).getByRole('combobox', { name: 'Field status' })).toHaveValue('scouted')
    await tabTo(page, detail(page).getByRole('textbox', { name: 'Notes' }))
    await page.keyboard.type('Fresh tracks by the seep')
    await expect(detail(page).getByTestId('field-log-saved')).toContainText('Saved in this browser at')

    // Scouted now, so the To scout filter has taken its card: closing the panel
    // keeps it open until here, then hands focus to the filter.
    await page.keyboard.press('Escape')
    await expect(detail(page)).toHaveCount(0)
    await expect(cardFor(page, id)).toHaveCount(0)
    await expect(statusFilter(page)).toBeFocused()
    await expectFocusRing(page)
    await page.keyboard.type('S')
    await expect(statusFilter(page)).toHaveValue('scouted')
    await expect(cards(page)).toHaveCount(1)

    // Back up to the header and export the one candidate shown.
    await tabTo(page, sort(page), { back: true })
    await tabTo(page, scope(page, 'All'), { back: true })
    await tabTo(page, scope(page, 'Nearby'), { back: true })
    await tabTo(page, candidatesTab(page), { back: true })
    await tabTo(page, page.getByRole('button', { name: 'Export 1 shown' }), { back: true })
    await page.keyboard.press('Enter')
    await expect(exportButton(page)).toHaveAttribute('aria-expanded', 'true')
    await tabTo(page, page.getByRole('button', { name: 'GeoJSON · map apps' }))
    const download = page.waitForEvent('download')
    await page.keyboard.press('Enter')
    const exported = JSON.parse(await readFile((await (await download).path())!, 'utf8')) as { features: { properties: Record<string, unknown> }[] }
    expect(exported.features).toHaveLength(1)
    expect(JSON.stringify(exported.features[0]!.properties)).toContain('Fresh tracks by the seep')
    await expect(exportButton(page)).toBeFocused()
    await expectFocusRing(page)
  })
})

test.describe('WCAG 2.2 AA scan', () => {
  test('the layers panel, the list, a candidate, and the legend', async ({ page }) => {
    await openAtlas(page)
    expect(await violations(page)).toEqual([])

    await candidatesTab(page).click()
    await scope(page, 'All').click()
    expect(await violations(page)).toEqual([])

    // A Wilderness context candidate shows the other pool's styling.
    await cardFor(page, 'JP-01').click()
    await expect(detail(page)).toBeVisible()
    expect(await violations(page)).toEqual([])
  })

  test('the method dialog, the export menu and the reset dialog', async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, JSON.stringify({ version: 1, entries: { 'EP-04': { status: 'scouted', notes: 'Wallow', updated: '2026-10-20T15:04:05.000Z' } } }))
    }, KEY)
    await openAtlas(page)

    await methodButton(page).click()
    await expect(page.getByRole('dialog', { name: 'Method and sources' })).toBeVisible()
    expect(await violations(page)).toEqual([])
    await page.keyboard.press('Escape')

    // Only the open menu: it covers the map buttons beneath it while it's open.
    await exportButton(page).click()
    expect(await violations(page, (axe) => axe.include('#export-menu'))).toEqual([])
    await page.keyboard.press('Escape')

    await candidatesTab(page).click()
    await page.getByRole('button', { name: 'Reset log' }).click()
    await expect(page.getByRole('dialog', { name: 'Reset the field log?' })).toBeVisible()
    expect(await violations(page)).toEqual([])
  })

  test('failure notices: a failed layer, a broken link, and a field log that can’t be saved', async ({ page }) => {
    await page.route('**/james-peak-atlas/data/trails.geojson', (route) => route.abort())
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      }
    })
    await page.goto('./#candidate=XX-99')
    await expect(page.getByRole('note', { name: 'Link notice' })).toBeVisible()
    await expect(page.getByTestId('layer-failure')).toBeVisible()
    await candidatesTab(page).click()
    await cardFor(page, 'EP-04').click()
    await detail(page).getByRole('combobox', { name: 'Field status' }).selectOption('scouted')
    await expect(page.getByRole('alert')).toContainText('The field log couldn’t be saved')
    expect(await violations(page)).toEqual([])
  })

  test('at 390 px: the drawer and the detail sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openAtlas(page)
    expect(await violations(page)).toEqual([])

    await drawerButton(page).click()
    expect(await violations(page)).toEqual([])
    await candidatesTab(page).click()
    expect(await violations(page)).toEqual([])

    await cardFor(page, 'EP-04').click()
    await expect(detail(page)).toBeVisible()
    expect(await violations(page)).toEqual([])
  })
})

test.describe('at 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the sidebar is a drawer over the map, and the detail panel is a sheet over the map', async ({ page }, testInfo) => {
    await openAtlas(page)
    await expect(drawer(page)).toBeHidden()
    await expect(drawerButton(page)).toHaveAttribute('aria-expanded', 'false')
    await evidence(page, testInfo, '390-map')

    await drawerButton(page).click()
    await expect(drawerButton(page)).toHaveAttribute('aria-expanded', 'true')
    const panel = (await drawer(page).boundingBox())!
    const map = (await page.getByTestId('map').boundingBox())!
    // Over the map, not beside it: the map keeps the full width.
    expect(panel.x).toBe(0)
    expect(map.width).toBe(390)
    expect(panel.width).toBeLessThan(390)
    await evidence(page, testInfo, '390-drawer-layers')

    await candidatesTab(page).click()
    await evidence(page, testInfo, '390-drawer-candidates')

    // A card opens its detail as a sheet along the bottom, and the drawer gets out of its way.
    await cardFor(page, 'EP-04').click()
    await expect(drawer(page)).toBeHidden()
    await expect(detail(page)).toBeVisible()
    const sheet = (await detail(page).boundingBox())!
    expect(sheet.x).toBe(0)
    expect(sheet.width).toBe(390)
    expect(Math.round(sheet.y + sheet.height)).toBe(844)
    expect(sheet.height).toBeLessThanOrEqual(844 * 0.62 + 1)
    await evidence(page, testInfo, '390-detail')

    // Closing it goes back to the list it came from.
    await detail(page).getByRole('button', { name: 'Close candidate detail' }).click()
    await expect(drawer(page)).toBeVisible()
    await expect(cardFor(page, 'EP-04')).toBeFocused()
  })

  test('from the keyboard: Escape closes the drawer, and leaving it closes it so nothing focused is hidden beneath', async ({ page }) => {
    await openAtlas(page)
    await drawerButton(page).focus()
    await page.keyboard.press('Enter')
    await expect(drawer(page)).toBeVisible()

    // Tab carries on into the drawer: the method and export buttons, then its tabs.
    await tabTo(page, methodButton(page))
    await tabTo(page, exportButton(page))
    await tabTo(page, layersTab(page))
    await page.keyboard.press('Escape')
    await expect(drawer(page)).toBeHidden()
    await expect(drawerButton(page)).toBeFocused()

    // Out of the drawer's last control and onto the map: the drawer closes.
    await page.keyboard.press('Enter')
    await layersTab(page).focus()
    await page.getByRole('slider', { name: 'Overlay strength' }).focus()
    await page.keyboard.press('Tab')
    await expect(drawer(page)).toBeHidden()
    const focused = page.locator(':focus')
    await expect(focused).toBeInViewport()

    // A card opened from the keyboard returns focus to itself on Escape, with the drawer back.
    await drawerButton(page).click()
    await candidatesTab(page).click()
    await cardFor(page, 'EP-05').focus()
    await page.keyboard.press('Enter')
    await expect(detail(page)).toBeFocused()
    await expect(drawer(page)).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(cardFor(page, 'EP-05')).toBeFocused()
    await expect(drawer(page)).toBeVisible()
  })
})

test.describe('screen-reader semantics', () => {
  test('the list, the detail panel and the dialogs carry their roles and names', async ({ page }) => {
    await page.goto('./')
    await candidatesTab(page).click()
    await expect(page.getByRole('list', { name: 'Candidates' }).getByRole('listitem')).toHaveCount(6)
    await expect(page.getByRole('status').filter({ hasText: /^6 candidates$/ })).toBeAttached()
    await cardFor(page, 'EP-04').click()
    await expect(page.getByRole('region', { name: 'East Portal scout 4 — Unnamed mapped stream' })).toBeFocused()
    await expect(cardFor(page, 'EP-04')).toHaveAttribute('aria-current', 'true')
    await methodButton(page).click()
    await expect(page.getByRole('dialog', { name: 'Method and sources' })).toBeVisible()
  })

  test('a layer that fails after load is announced, and its switch is described by the failure', async ({ page }) => {
    await openAtlas(page)
    // Present from the first render, empty, so its later text is read out.
    await expect(announcer(page)).toHaveText('')
    await page.route('**/james-peak-atlas/data/canopy.png', (route) => route.abort())
    // On the Candidates tab, so the layer's own control is out of sight.
    const canopy = page.getByRole('checkbox', { name: 'Canopy cover · 2025' })
    // A click, not check(): the control unticks itself as the image fails, which check() would report as a failed click.
    await canopy.click()
    await candidatesTab(page).click()
    await expect(announcer(page)).toHaveText('Canopy cover · 2025 couldn’t load. Retry it in Map layers.')

    // The rest of the atlas still works: the list, a candidate, and the legend leave canopy out.
    await cardFor(page, 'EP-04').click()
    await expect(detail(page)).toBeVisible()
    await expect(page.getByRole('region', { name: 'ON THE MAP' })).not.toContainText('Canopy')

    await layersTab(page).click()
    await expect(canopy).not.toBeChecked()
    await expect(canopy).toHaveAccessibleDescription('Couldn’t load: the image couldn’t be loaded')
    await page.unroute('**/james-peak-atlas/data/canopy.png')
    await page.getByRole('button', { name: 'Retry Canopy cover · 2025' }).click()
    await expect(canopy).toBeChecked()
    await expect(announcer(page)).toHaveText('')
  })

  test('a link pasted into the tab that can’t be followed is announced', async ({ page }) => {
    await openAtlas(page)
    await page.evaluate(() => (window.location.hash = '#candidate=XX-99'))
    await expect(page.getByRole('note', { name: 'Link notice' })).toBeVisible()
    await expect(announcer(page)).toContainText('The default view is open instead.')
  })

  test('a map popup opened from the keyboard is read out', async ({ page }) => {
    await openAtlas(page)
    const trailhead = page.getByRole('button', { name: 'James Peak Lake Trailhead, Trailheads / vehicle screen' })
    await trailhead.focus()
    await page.keyboard.press('Enter')
    const popupStatus = page.getByTestId('map').getByRole('status')
    await expect(popupStatus).toContainText('James Peak Lake')
    await page.keyboard.press('Escape')
    await expect(popupStatus).toHaveText('')
  })
})
