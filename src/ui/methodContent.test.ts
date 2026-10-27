import { readFile } from 'node:fs/promises'
import { describe, expect, test } from 'vitest'
import { type DataSource, formatDataError, loadAtlas } from '../atlas/data.ts'
import { methodContent } from './methodContent.ts'

const PUBLIC = new URL('../../public/', import.meta.url)

/** The real bundle, with the manifest optionally edited. */
function bundle(editManifest?: (json: Record<string, any>) => void): DataSource {
  return {
    base: PUBLIC,
    fetch: async (url) => {
      const text = await readFile(new URL(url), 'utf8').catch(() => null)
      if (text === null) return new Response(null, { status: 404 })
      if (!editManifest || !url.endsWith('data/manifest.json')) return new Response(text)
      const json = JSON.parse(text)
      editManifest(json)
      return new Response(JSON.stringify(json))
    },
  }
}

async function content(source = bundle()) {
  const result = await loadAtlas(source)
  if (!result.ok) throw new Error(formatDataError(result.error))
  return methodContent(result.value)
}

describe('method content from the real bundle', () => {
  test('lists the four components with their weights and formulas', async () => {
    const { components, indexFormula } = await content()
    expect(components.map(({ label, percent }) => [label, percent])).toEqual([
      ['Water', 35],
      ['Shelter', 25],
      ['Darkness', 25],
      ['Security', 15],
    ])
    expect(components.every(({ formula }) => formula.length > 0)).toBe(true)
    expect(components[1]?.formula).toBe('100*clip((canopy_percent-10)/60,0,1)')
    expect(indexFormula).toBe('0.35 × water + 0.25 × shelter + 0.25 × darkness + 0.15 × security')
  })

  test('states the 2027 low-water scenario and the occupancy assumption', async () => {
    const { planningYear, scenario, occupancy } = await content()
    expect(planningYear).toBe(2027)
    expect(scenario).toMatch(/^Low surface water/)
    expect(occupancy).toMatch(/assumes elk occupancy in 2027/)
  })

  test('words the admission thresholds from the data values', async () => {
    const { thresholds } = await content()
    expect(thresholds.map(({ text }) => text)).toEqual([
      'Perennial water 30–450 m away',
      'Canopy cover at least 30%',
      'Slope at most 30°',
      'At least 200 m from mapped access',
      'Inside the wilderness boundary',
      'Candidates at least 400 m apart',
      'On mapped USFS fee land',
      'Not inside a mapped lake',
      'Water component at least 25',
      'Security component at least 20',
    ])
  })

  test('never shows the exclusion radius around observations', async () => {
    const { thresholds, ...rest } = await content()
    expect(thresholds.map(({ key }) => key)).not.toContain('exclude_known_anchor_radius_m')
    expect(thresholds.map(({ text }) => text).join()).not.toMatch(/250|anchor/i)
    expect(JSON.stringify(rest)).not.toMatch(/anchor/i)
  })

  test('cites only linked sources, so the private CalTopo source is left out', async () => {
    const { sources } = await content()
    expect(sources).toHaveLength(7)
    expect(sources.every(({ url }) => url.startsWith('https://'))).toBe(true)
    expect(JSON.stringify(sources)).not.toMatch(/caltopo/i)
  })

  test('shows a selection rule it has no wording for by its own name', async () => {
    const result = await loadAtlas(bundle())
    if (!result.ok) throw new Error('expected the bundle to load')
    const { method } = result.value
    const atlas = { ...result.value, method: { ...method, selection: { ...method.selection, max_new_rule_m: 9 } } }
    expect(methodContent(atlas).thresholds.at(-1)).toEqual({ key: 'max_new_rule_m', text: 'Max new rule m: 9' })
  })
})

test('a source link that is not an absolute http(s) URL fails validation', async () => {
  const source = bundle((json) => {
    json['sources'][2].url = 'data/elevation.html'
  })
  const result = await loadAtlas(source)
  expect(result.ok ? null : result.error).toEqual({
    file: 'data/manifest.json',
    record: 'sources[2] (USGS 3D Elevation Program)',
    problem: 'data/elevation.html is not an absolute http(s) link',
  })
})
