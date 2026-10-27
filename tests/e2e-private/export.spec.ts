import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { parse } from 'csv-parse/sync'

// The private build has observations on the map, and exports must still
// never carry them (ADR 0001). Observation IDs and positions are read from
// the git-ignored file at run time, so none is written here.

interface PrivateObservation {
  readonly geometry: { readonly coordinates: readonly [number, number] }
  readonly properties: { readonly id: string }
}

const round = (degrees: number) => Number(degrees.toFixed(6))

test('no export format carries an observation, by ID or by position', async ({ page }) => {
  const file = new URL('../../private/observations.geojson', import.meta.url)
  const { features } = JSON.parse(await readFile(file, 'utf8')) as { features: PrivateObservation[] }
  expect(features.length).toBeGreaterThan(0)
  const ids = features.map(({ properties }) => properties.id)
  const positions = new Set(features.map(({ geometry: { coordinates: [lon, lat] } }) => `${round(lat)},${round(lon)}`))

  await page.goto('./')
  await expect(page.locator('.observation-marker')).toHaveCount(features.length)
  await page.getByRole('tab', { name: /^Candidates/ }).click()
  await page.getByRole('group', { name: 'Scope' }).getByRole('button', { name: 'All', exact: true }).click()
  const button = page.getByRole('banner').getByRole('button', { name: 'Export 16 shown' })

  const exported: Record<string, string> = {}
  for (const format of ['GeoJSON', 'GPX', 'CSV']) {
    await button.click()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: new RegExp(`^${format}`) }).click()])
    exported[format] = await readFile((await download.path())!, 'utf8')
  }

  const latLons = [
    ...JSON.parse(exported.GeoJSON!).features.map((f: PrivateObservation) => `${f.geometry.coordinates[1]},${f.geometry.coordinates[0]}`),
    ...[...exported.GPX!.matchAll(/<wpt lat="([^"]+)" lon="([^"]+)">/g)].map(([, lat, lon]) => `${Number(lat)},${Number(lon)}`),
    ...(parse(exported.CSV!, { bom: true, columns: true } as never) as Record<string, string>[]).map((row) => `${Number(row.latitude)},${Number(row.longitude)}`),
  ]
  expect(latLons).toHaveLength(48)
  expect(latLons.filter((position) => positions.has(position))).toEqual([])
  for (const text of Object.values(exported)) {
    for (const id of ids) expect(text).not.toMatch(new RegExp(`\\b${id}\\b`))
  }
})
