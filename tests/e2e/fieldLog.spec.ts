import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const KEY = 'jpa.fieldlog.v1'
const SCOUT_ORDER = ['EP-04', 'EP-05', 'EP-03', 'EP-01', 'EP-06', 'EP-02']

const candidatesTab = (page: Page) => page.getByRole('tab', { name: /^Candidates/ })
const list = (page: Page) => page.getByRole('list', { name: 'Candidates' })
const cardFor = (page: Page, id: string) => page.locator(`#candidate-card-${id}`)
const markers = (page: Page) => page.getByRole('main').getByRole('button', { name: /^(EP|JP)-\d\d: / })
const detail = (page: Page) => page.getByRole('region').filter({ hasText: 'SCOUTING CANDIDATE' })
const filter = (page: Page) => page.locator('#field-status-filter')
const statusControl = (page: Page) => detail(page).getByLabel('Field status')
const notes = (page: Page) => detail(page).getByLabel('Notes')
const entryCount = (page: Page) => page.getByTestId('field-log-count')
const stored = (page: Page, key = KEY) => page.evaluate((k) => localStorage.getItem(k), key)

const listedIds = (page: Page) =>
  list(page)
    .getByRole('button')
    .evaluateAll((cards) => cards.map((card) => card.id.replace('candidate-card-', '')))
const markerIds = async (page: Page) =>
  (await markers(page).evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')!.slice(0, 5)))).sort()

async function openCandidate(page: Page, id: string) {
  await candidatesTab(page).click()
  await cardFor(page, id).click()
  await expect(detail(page)).toContainText(id)
}

/** Records a field status and a note for each candidate, through the detail panel. */
async function logEntries(page: Page, entries: Record<string, [status: string, note: string]>) {
  for (const [id, [status, note]] of Object.entries(entries)) {
    await openCandidate(page, id)
    await statusControl(page).selectOption({ label: status })
    await notes(page).fill(note)
    await detail(page).getByRole('button', { name: 'Close candidate detail' }).click()
  }
}

test.describe('the field log', () => {
  test('a field status and a note survive a reload', async ({ page }) => {
    await page.goto('./')
    await openCandidate(page, 'EP-04')
    await expect(statusControl(page)).toHaveValue('to_scout')
    await statusControl(page).selectOption({ label: 'Camera placed' })
    await notes(page).fill('Wallow & seep, "fresh" <tracks>')
    await expect(detail(page).getByTestId('field-log-saved')).toContainText('Saved in this browser at')
    await expect(cardFor(page, 'EP-04').getByTestId('card-field-status')).toHaveText('Camera placed')

    const saved = JSON.parse((await stored(page))!)
    expect(saved.version).toBe(1)
    expect(saved.entries['EP-04']).toMatchObject({ status: 'camera_placed', notes: 'Wallow & seep, "fresh" <tracks>' })
    expect(new Date(saved.entries['EP-04'].updated).toISOString()).toBe(saved.entries['EP-04'].updated)

    await page.reload()
    await openCandidate(page, 'EP-04')
    await expect(statusControl(page)).toHaveValue('camera_placed')
    await expect(notes(page)).toHaveValue('Wallow & seep, "fresh" <tracks>')
    await expect(cardFor(page, 'EP-05').getByTestId('card-field-status')).toHaveText('To scout')
  })

  test('the field-status filter works with scope, and the map follows it', async ({ page }) => {
    await page.goto('./')
    await logEntries(page, { 'EP-04': ['Scouted', ''], 'EP-03': ['Ruled out', 'Too steep'] })

    await filter(page).selectOption({ label: 'Scouted' })
    expect(await listedIds(page)).toEqual(['EP-04'])
    await expect.poll(() => markerIds(page)).toEqual(['EP-04'])

    await filter(page).selectOption({ label: 'To scout' })
    expect(await listedIds(page)).toEqual(['EP-05', 'EP-01', 'EP-06', 'EP-02'])

    await page.getByRole('group', { name: 'Scope' }).getByRole('button', { name: 'All', exact: true }).click()
    await expect(list(page).getByRole('button')).toHaveCount(14)

    await filter(page).selectOption({ label: 'Any field status' })
    await page.getByRole('group', { name: 'Scope' }).getByRole('button', { name: 'Nearby', exact: true }).click()
    expect(await listedIds(page)).toEqual(SCOUT_ORDER)
  })

  test('changing the open candidate’s field status out of the filter keeps its panel open', async ({ page }) => {
    await page.goto('./')
    await candidatesTab(page).click()
    await filter(page).selectOption({ label: 'To scout' })
    await cardFor(page, 'EP-05').click()
    await statusControl(page).selectOption({ label: 'Scouted' })

    await expect(detail(page)).toContainText('EP-05')
    await expect(cardFor(page, 'EP-05')).toHaveCount(0)
    // Its card is gone, so closing hands focus to the filter that removed it.
    await page.keyboard.press('Escape')
    await expect(detail(page)).toHaveCount(0)
    await expect(filter(page)).toBeFocused()
  })

  test('two open tabs don’t overwrite each other’s changes', async ({ page, context }) => {
    await page.goto('./')
    const other = await context.newPage()
    await other.goto(page.url())
    await logEntries(other, { 'EP-01': ['Ruled out', 'From the other tab'] })

    await expect(cardFor(page, 'EP-01').getByTestId('card-field-status')).toHaveText('Ruled out')
    await logEntries(page, { 'EP-04': ['Scouted', ''] })
    const saved = JSON.parse((await stored(page))!)
    expect(Object.keys(saved.entries).sort()).toEqual(['EP-01', 'EP-04'])
    expect(saved.entries['EP-01'].notes).toBe('From the other tab')
  })

  test('a failed save shows a lasting message, and the panel doesn’t claim it saved', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      }
    })
    await page.goto('./')
    await openCandidate(page, 'EP-04')
    await statusControl(page).selectOption({ label: 'Scouted' })

    const alert = page.getByRole('alert').filter({ hasText: 'The field log couldn’t be saved in this browser' })
    await expect(alert).toContainText('(The quota has been exceeded.)')
    await expect(detail(page).getByTestId('field-log-saved')).toHaveText('Not saved in this browser. See the notice on the map.')
    // The change stays on screen, so it can still be exported, and the message stays with it.
    await expect(cardFor(page, 'EP-04').getByTestId('card-field-status')).toHaveText('Scouted')
    await notes(page).fill('Still not saved')
    await expect(alert).toBeVisible()
  })

  test('an unreadable stored log is backed up, reported and left in place, never deleted', async ({ page }) => {
    await page.goto('./')
    const raw = '{"version":2,"entries":{"EP-04":{"mood":"good"}}}'
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), [KEY, raw] as const)
    await page.reload()

    await expect(page.getByRole('status', { name: 'Field log notice' })).toContainText(
      'Your saved field log couldn’t be read (it was saved as field log version 2, and this atlas reads version 1), so a new one was started. The old one is kept in this browser’s storage under “jpa.fieldlog.v1.backup”.',
    )
    expect(await stored(page, `${KEY}.backup`)).toBe(raw)
    expect(await stored(page)).toBe(raw)

    await page.getByRole('button', { name: 'Dismiss field log notice' }).click()
    await expect(page.getByRole('status', { name: 'Field log notice' })).toHaveCount(0)
  })

  test('Reset can be cancelled, says how many entries it clears, and clears them when confirmed', async ({ page }) => {
    await page.goto('./')
    await candidatesTab(page).click()
    await expect(page.getByRole('button', { name: 'Reset log' })).toBeDisabled()
    await logEntries(page, { 'EP-04': ['Scouted', 'Seep'], 'EP-01': ['Ruled out', ''] })
    await expect(entryCount(page)).toHaveText('2 entries')

    await page.getByRole('button', { name: 'Reset log' }).click()
    const dialog = page.getByRole('dialog', { name: 'Reset the field log?' })
    await expect(dialog).toContainText('This clears 2 entries from this browser')
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(entryCount(page)).toHaveText('2 entries')

    await page.getByRole('button', { name: 'Reset log' }).click()
    const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Export first' }).click()])
    expect(Object.keys(JSON.parse(await readFile((await download.path())!, 'utf8')).entries)).toEqual(['EP-04', 'EP-01'])
    await expect(dialog).toContainText('Exported.')
    await dialog.getByRole('button', { name: 'Clear 2 entries' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(entryCount(page)).toHaveText('0 entries')
    await expect(cardFor(page, 'EP-04').getByTestId('card-field-status')).toHaveText('To scout')

    await page.reload()
    await candidatesTab(page).click()
    await expect(entryCount(page)).toHaveText('0 entries')
  })

  test('an exported log imports into a clean browser', async ({ page, browser }) => {
    await page.goto('./')
    await logEntries(page, { 'EP-04': ['Camera placed', 'Wallow & seep, "fresh" <tracks>'], 'EP-06': ['Scouted', ''] })
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export log' }).click()])
    expect(download.suggestedFilename()).toMatch(/^james-peak-field-log-\d{4}-\d{2}-\d{2}\.json$/)
    const file = (await download.path())!

    const context = await browser.newContext()
    const clean = await context.newPage()
    await clean.goto(page.url().split('#')[0]!)
    await candidatesTab(clean).click()
    await expect(entryCount(clean)).toHaveText('0 entries')
    await clean.getByLabel('Field log file to import').setInputFiles({ name: 'field-log.json', mimeType: 'application/json', buffer: await readFile(file) })

    await expect(clean.getByRole('status').filter({ hasText: 'Imported 2 entries from field-log.json.' })).toBeVisible()
    await expect(entryCount(clean)).toHaveText('2 entries')
    await openCandidate(clean, 'EP-04')
    await expect(statusControl(clean)).toHaveValue('camera_placed')
    await expect(notes(clean)).toHaveValue('Wallow & seep, "fresh" <tracks>')

    // It was saved, not only shown.
    await clean.reload()
    await candidatesTab(clean).click()
    await expect(entryCount(clean)).toHaveText('2 entries')
    await context.close()
  })

  test('an import with any problem is reported in full and applies nothing', async ({ page }) => {
    await page.goto('./')
    await logEntries(page, { 'EP-04': ['Scouted', 'Keep me'] })
    const bad = JSON.stringify({
      version: 1,
      entries: {
        'EP-01': { status: 'scouted', updated: '2026-10-20T15:04:05.000Z' },
        'EP-99': { status: 'scouted', updated: '2026-10-20T15:04:05.000Z' },
        'EP-02': { status: 'done', updated: '2026-10-20T15:04:05.000Z' },
      },
    })
    await page.getByLabel('Field log file to import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(bad) })
    const alert = page.getByRole('alert').filter({ hasText: 'Nothing was imported from bad.json:' })
    await expect(alert.getByRole('listitem')).toHaveText(['EP-99 isn’t a candidate in this atlas.', 'EP-02 has an invalid field status “done”.'])
    await expect(entryCount(page)).toHaveText('1 entry')
    await expect(cardFor(page, 'EP-01').getByTestId('card-field-status')).toHaveText('To scout')

    await page.getByLabel('Field log file to import').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,') })
    await expect(page.getByRole('alert').filter({ hasText: 'Nothing was imported from notes.json:' })).toContainText('The file isn’t valid JSON.')
  })

  test('importing over existing entries asks first', async ({ page }) => {
    await page.goto('./')
    await logEntries(page, { 'EP-04': ['Scouted', 'Keep me'] })
    const other = JSON.stringify({ version: 1, entries: { 'EP-01': { status: 'ruled_out', updated: '2026-10-20T15:04:05.000Z' } } })
    const choose = () =>
      page.getByLabel('Field log file to import').setInputFiles({ name: 'other.json', mimeType: 'application/json', buffer: Buffer.from(other) })

    await choose()
    const dialog = page.getByRole('dialog', { name: 'Replace the field log?' })
    await expect(dialog).toContainText('other.json holds 1 entry. Importing it replaces the 1 entry in this browser.')
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(cardFor(page, 'EP-04').getByTestId('card-field-status')).toHaveText('Scouted')

    await choose()
    await dialog.getByRole('button', { name: 'Replace with 1 entry' }).click()
    await expect(cardFor(page, 'EP-04').getByTestId('card-field-status')).toHaveText('To scout')
    await expect(cardFor(page, 'EP-01').getByTestId('card-field-status')).toHaveText('Ruled out')
  })
})
