import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { parse } from 'csv-parse/sync'

const KEY = 'jpa.fieldlog.v1'
const UPDATED = '2026-10-20T15:04:05.000Z'

// Notes with every awkward character: &, <, quotes, commas, a line break, and a formula.
const TRICKY = 'Wallow & seep, "fresh" <tracks>\nSecond line, O\'Brien'
const FORMULA = '=HYPERLINK("http://example.com","x")'
const ENTRIES = {
  'EP-04': { status: 'scouted', notes: TRICKY, updated: UPDATED },
  'EP-03': { status: 'scouted', notes: FORMULA, updated: UPDATED },
  // Scouted but not an EP-*, so the search filters it out.
  'JP-07': { status: 'scouted', notes: 'Filtered out by search', updated: UPDATED },
  // An EP-* that isn't Scouted, so the field-status filter takes it out.
  'EP-05': { status: 'ruled_out', notes: 'Filtered out by field status', updated: UPDATED },
}

// The subset after All, Scouted and "EP", in scouting-index order.
const SUBSET = ['EP-03', 'EP-04']

interface Geo {
  features: { geometry: { coordinates: [number, number] }; properties: { id: string } }[]
}

let positions: Map<string, [lon: number, lat: number]>

test.beforeAll(async () => {
  const data: Geo = JSON.parse(await readFile(new URL('../../public/data/candidates.geojson', import.meta.url), 'utf8'))
  positions = new Map(data.features.map((f) => [f.properties.id, f.geometry.coordinates]))
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!)
    },
    [KEY, JSON.stringify({ version: 1, entries: ENTRIES })],
  )
  await page.goto('./')
})

const exportButton = (page: Page) => page.getByRole('banner').getByRole('button', { name: /^Export \d+ shown$/ })

/** All scope, Scouted, and a search for "EP": the list is down to two. */
async function filterToSubset(page: Page) {
  await page.getByRole('tab', { name: /^Candidates/ }).click()
  await page.getByRole('group', { name: 'Scope' }).getByRole('button', { name: 'All', exact: true }).click()
  await page.locator('#field-status-filter').selectOption({ label: 'Scouted' })
  await page.getByRole('searchbox', { name: 'Search candidates by ID or name' }).fill('EP')
  await expect(page.getByRole('list', { name: 'Candidates' }).getByRole('button')).toHaveCount(2)
}

/** Exports in `format` and returns the saved file's text. */
async function download(page: Page, format: RegExp): Promise<{ name: string; text: string }> {
  await exportButton(page).click()
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: format }).click()])
  return { name: file.suggestedFilename(), text: await readFile((await file.path())!, 'utf8') }
}

test.describe('export', () => {
  test('the button counts the visible list and follows every filter', async ({ page }) => {
    await expect(exportButton(page)).toHaveAccessibleName('Export 6 shown')
    await filterToSubset(page)
    await expect(exportButton(page)).toHaveAccessibleName('Export 2 shown')
    await page.getByRole('searchbox', { name: 'Search candidates by ID or name' }).fill('no such candidate')
    await expect(exportButton(page)).toHaveAccessibleName('Export 0 shown')
    await expect(exportButton(page)).toBeDisabled()
  })

  test('GeoJSON: parsed, it holds exactly the subset, [lon, lat], with notes', async ({ page }) => {
    await filterToSubset(page)
    const { name, text } = await download(page, /^GeoJSON/)
    expect(name).toMatch(/^james-peak-candidates-\d{4}-\d{2}-\d{2}\.geojson$/)
    const data = JSON.parse(text)
    expect(data.type).toBe('FeatureCollection')
    expect(data.features.map((f: Geo['features'][number]) => f.properties.id)).toEqual(SUBSET)
    for (const feature of data.features) {
      expect(feature.geometry).toEqual({ type: 'Point', coordinates: positions.get(feature.properties.id) })
      expect(feature.properties.field_status).toBe('Scouted')
    }
    expect(data.features[0].properties.notes).toBe(FORMULA)
    expect(data.features[1].properties.notes).toBe(TRICKY)
  })

  test('GPX: it parses as XML, waypoints only, with lat/lon attributes and notes intact', async ({ page }) => {
    await filterToSubset(page)
    const { name, text } = await download(page, /^GPX/)
    expect(name).toMatch(/\.gpx$/)
    // The browser's own XML parser: a parse error comes back as a <parsererror> document.
    const parsed = await page.evaluate((xml) => {
      const doc = new DOMParser().parseFromString(xml, 'application/xml')
      return {
        error: doc.getElementsByTagName('parsererror').length > 0,
        root: doc.documentElement.localName,
        routes: doc.querySelectorAll('rte, trk').length,
        waypoints: [...doc.getElementsByTagName('wpt')].map((wpt) => ({
          lat: Number(wpt.getAttribute('lat')),
          lon: Number(wpt.getAttribute('lon')),
          name: wpt.getElementsByTagName('name')[0]?.textContent ?? '',
          desc: wpt.getElementsByTagName('desc')[0]?.textContent ?? '',
        })),
      }
    }, text)
    expect(parsed).toMatchObject({ error: false, root: 'gpx', routes: 0 })
    expect(parsed.waypoints.map((wpt) => wpt.name.slice(0, 5))).toEqual(SUBSET)
    for (const wpt of parsed.waypoints) {
      const [lon, lat] = positions.get(wpt.name.slice(0, 5))!
      expect([wpt.lat, wpt.lon]).toEqual([lat, lon])
      expect(wpt.desc).toContain('Field status: Scouted.')
    }
    expect(parsed.waypoints[0]!.desc).toContain(`Notes: ${FORMULA}`)
    expect(parsed.waypoints[1]!.desc).toContain(`Notes: ${TRICKY}`)
  })

  test('CSV: it parses, holds exactly the subset, and neutralises the formula', async ({ page }) => {
    await filterToSubset(page)
    const { name, text } = await download(page, /^CSV/)
    expect(name).toMatch(/\.csv$/)
    const rows: Record<string, string>[] = parse(text, { bom: true, columns: true, strict: true } as never)
    expect(rows.map((row) => row.id)).toEqual(SUBSET)
    for (const row of rows) {
      const [lon, lat] = positions.get(row.id!)!
      expect([Number(row.latitude), Number(row.longitude)]).toEqual([lat, lon])
      expect(row.field_status).toBe('Scouted')
    }
    expect(rows[0]!.notes).toBe(`'${FORMULA}`)
    expect(rows[1]!.notes).toBe(TRICKY)
  })

  test('the menu closes on Escape and gives focus back to its button', async ({ page }) => {
    await exportButton(page).click()
    await expect(exportButton(page)).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('button', { name: /^GPX/ }).focus()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: /^GPX/ })).toBeHidden()
    await expect(exportButton(page)).toBeFocused()
    await expect(exportButton(page)).toHaveAttribute('aria-expanded', 'false')
  })
})
