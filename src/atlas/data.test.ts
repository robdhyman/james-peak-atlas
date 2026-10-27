import { readFile } from 'node:fs/promises'
import { describe, expect, test } from 'vitest'
import { type DataSource, formatDataError, loadAtlas, loadCanopyGrid, loadGeoJsonLayer } from './data.ts'
import { bundle, PUBLIC } from './testing/bundle.ts'

type Json = Record<string, any>

/** The real bundle with one file edited, or missing when `edit` is `null`. */
function withFile(file: string, edit: ((json: Json) => void) | null): DataSource {
  const target = new URL(file, PUBLIC).href
  return {
    base: PUBLIC,
    fetch: async (url) => {
      if (url !== target) return bundle.fetch(url)
      if (edit === null) return new Response(null, { status: 404 })
      const json = JSON.parse(await readFile(new URL(url), 'utf8'))
      edit(json)
      return new Response(JSON.stringify(json))
    },
  }
}

const candidate = (json: Json, id: string) => json['features'].find((f: Json) => f['properties'].id === id)

async function atlas(source = bundle) {
  const result = await loadAtlas(source)
  if (!result.ok) throw new Error(formatDataError(result.error))
  return result.value
}

async function atlasError(source: DataSource) {
  const result = await loadAtlas(source)
  if (result.ok) throw new Error('expected the atlas to fail validation')
  return result.error
}

describe('the real bundle', () => {
  test('loads 16 candidates with unique IDs (snapshot count changed? update deliberately)', async () => {
    const { candidates } = await atlas()
    expect(candidates).toHaveLength(16)
    expect(new Set(candidates.map((c) => c.properties.id)).size).toBe(16)
  })

  test('has six candidates in the Nearby pool and ten in Wilderness context', async () => {
    const { candidates } = await atlas()
    const ids = (pool: string) => candidates.filter((c) => c.properties.pool === pool).map((c) => c.properties.id)
    expect(ids('nearby').toSorted()).toEqual(['EP-01', 'EP-02', 'EP-03', 'EP-04', 'EP-05', 'EP-06'])
    expect(ids('wilderness_context')).toHaveLength(10)
  })

  test('scout order is EP-04, EP-05, EP-03, EP-01, EP-06, EP-02', async () => {
    const { candidates } = await atlas()
    const order = candidates
      .filter((c) => c.properties.pool === 'nearby')
      .toSorted((a, b) => a.properties.scout_order - b.properties.scout_order)
      .map((c) => c.properties.id)
    expect(order).toEqual(['EP-04', 'EP-05', 'EP-03', 'EP-01', 'EP-06', 'EP-02'])
  })

  test('weights are water .35, shelter .25, darkness .25, security .15', async () => {
    const { components } = (await atlas()).method
    expect([components.water, components.shelter, components.darkness, components.security].map((c) => c.weight)).toEqual([
      0.35, 0.25, 0.25, 0.15,
    ])
  })

  test('positions are [lon, lat]: EP-04 sits west of -105 and north of 39', async () => {
    const { candidates } = await atlas()
    const ep04 = candidates.find((c) => c.properties.id === 'EP-04')
    const [lon, lat] = ep04!.geometry.coordinates
    expect(lon).toBeCloseTo(-105.66, 1)
    expect(lat).toBeCloseTo(39.9, 1)
  })

  test('keeps fields the schema does not name, unchanged', async () => {
    const { candidates } = await atlas()
    const jp01 = candidates.find((c) => c.properties.id === 'JP-01')!
    expect(jp01.properties['score_kind']).toBe('Unvalidated scouting opportunity index 0–100; not probability')
    expect(jp01.properties['water']).toMatchObject({ name: 'Blue Creek', regime: 'perennial' })
    expect(jp01.properties.metrics['water_kind']).toBe('perennial stream river')
  })

  test('is read-only at every depth', async () => {
    const { candidates, manifest } = await atlas()
    expect(Object.isFrozen(candidates)).toBe(true)
    expect(Object.isFrozen(candidates[0]!.properties.components)).toBe(true)
    const hillshade = manifest.layers['hillshade']
    expect(hillshade?.type === 'raster' && Object.isFrozen(hillshade.bounds[0])).toBe(true)
  })

  test('ships zero observations and no warnings', async () => {
    const { observations, warnings } = await atlas()
    expect(observations).toEqual([])
    expect(warnings).toEqual([])
  })

  test('canopy decodes to 642 × 833 pixels of 0–100 or 255 for NoData, year 2025', async () => {
    const result = await loadCanopyGrid(bundle, (await atlas()).manifest)
    if (!result.ok) throw new Error(formatDataError(result.error))
    const { width, height, pixels, year } = result.value
    expect([width, height, year]).toEqual([642, 833, 2025])
    expect(pixels).toHaveLength(642 * 833)
    expect(pixels.every((v) => v <= 100 || v === 255)).toBe(true)
  })

  test('contours load on the 40 ft interval', async () => {
    const result = await loadGeoJsonLayer(bundle, (await atlas()).manifest, 'contours')
    if (!result.ok) throw new Error(formatDataError(result.error))
    expect(result.value.features.length).toBe(1002)
  })
})

describe('malformed data names the file, the record and the problem', () => {
  test('swapped coordinates', async () => {
    const source = withFile('data/candidates.geojson', (json) => {
      candidate(json, 'EP-01').geometry.coordinates.reverse()
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/candidates.geojson',
      record: 'feature 11 (EP-01)',
      problem: 'coordinates look like [lat, lon]; expected [lon, lat]',
    })
  })

  test('a duplicate ID', async () => {
    const source = withFile('data/candidates.geojson', (json) => {
      candidate(json, 'EP-02').properties.id = 'EP-01'
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/candidates.geojson',
      record: 'feature 12 (EP-01)',
      problem: 'duplicate ID; feature 11 (EP-01) already uses it',
    })
  })

  test('an out-of-range component', async () => {
    const source = withFile('data/candidates.geojson', (json) => {
      candidate(json, 'JP-03').properties.components.shelter = 180.9
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/candidates.geojson',
      record: 'feature 3 (JP-03)',
      problem: 'properties.components.shelter: Too big: expected number to be <=100',
    })
  })

  test('an out-of-range scouting index', async () => {
    const source = withFile('data/candidates.geojson', (json) => {
      candidate(json, 'EP-06').properties.score = -1
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/candidates.geojson',
      record: 'feature 16 (EP-06)',
      problem: 'properties.score: Too small: expected number to be >=0',
    })
  })

  test('a scouting index inconsistent with the weights beyond rounding', async () => {
    // JP-02's components weigh to 84.88: the stored 84.9 is within ±0.12, 85.1 is not.
    const source = withFile('data/candidates.geojson', (json) => {
      candidate(json, 'JP-02').properties.score = 85.1
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/candidates.geojson',
      record: 'feature 2 (JP-02)',
      problem: "scouting index 85.1 doesn't match its weighted components (84.88) within ±0.12",
    })
  })

  test('a manifest URL from the site root', async () => {
    const source = withFile('data/manifest.json', (json) => {
      json['candidates'] = '/data/candidates.geojson'
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/manifest.json',
      record: 'candidates',
      problem: '"/data/candidates.geojson" starts from the site root; it must be relative to the site base',
    })
  })

  test('a remote layer URL', async () => {
    const source = withFile('data/manifest.json', (json) => {
      json['layers'].hillshade.url = 'https://tiles.example.com/hillshade.png'
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/manifest.json',
      record: 'layers.hillshade.url',
      problem: '"https://tiles.example.com/hillshade.png" is an absolute URL; data must be served from the site itself',
    })
  })

  test('raster bounds out of order', async () => {
    const source = withFile('data/manifest.json', (json) => {
      json['layers'].canopy.bounds.reverse()
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/manifest.json',
      record: 'layers.canopy.bounds',
      problem: 'bounds are out of order; expected [[south, west], [north, east]]',
    })
  })

  // Legend colours are drawn into a CSS gradient, so only plain hex colours may pass.
  test('a legend gradient that is not a list of colours', async () => {
    const source = withFile('data/manifest.json', (json) => {
      json['layers'].darkness.legend.gradient = '#fcfbfd,red;background:url(https://example.com/x)'
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/manifest.json',
      record: 'layers.darkness.legend.gradient',
      problem: 'expected comma-separated #rrggbb colours',
    })
  })

  test('a legend stop colour that is not a colour', async () => {
    const source = withFile('data/manifest.json', (json) => {
      json['layers'].canopy.legend[1].color = 'url(https://example.com/x)'
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/manifest.json',
      record: 'layers.canopy.legend.1.color',
      problem: 'expected a #rrggbb colour',
    })
  })

  test('raster bounds given as [lon, lat] pairs', async () => {
    const source = withFile('data/manifest.json', (json) => {
      for (const corner of json['layers'].hillshade.bounds) corner.reverse()
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/manifest.json',
      record: 'layers.hillshade.bounds',
      problem: 'bounds look like [lon, lat] pairs; expected [[south, west], [north, east]]',
    })
  })

  test('a missing candidates file', async () => {
    expect(await atlasError(withFile('data/candidates.geojson', null))).toEqual({
      file: 'data/candidates.geojson',
      problem: 'file not found (HTTP 404)',
    })
  })

  test('a missing manifest', async () => {
    expect(await atlasError(withFile('data/manifest.json', null))).toEqual({
      file: 'data/manifest.json',
      problem: 'file not found (HTTP 404)',
    })
  })

  test('a blocked request', async () => {
    const source: DataSource = {
      base: PUBLIC,
      fetch: async (url) => (url.endsWith('candidates.geojson') ? Promise.reject(new TypeError('Failed to fetch')) : bundle.fetch(url)),
    }
    expect(await atlasError(source)).toEqual({ file: 'data/candidates.geojson', problem: 'request failed (Failed to fetch)' })
  })

  test('weights that do not sum to 1', async () => {
    const source = withFile('data/method.json', (json) => {
      json['components'].security.weight = 0.1
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/method.json',
      record: 'components',
      problem: 'weights sum to 0.95; expected 1',
    })
  })

  test('a scout order that does not follow the minimum round trip', async () => {
    const source = withFile('data/candidates.geojson', (json) => {
      candidate(json, 'EP-04').properties.scout_order = 2
      candidate(json, 'EP-05').properties.scout_order = 1
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/candidates.geojson',
      record: 'feature 14 (EP-04)',
      problem: 'scout order 2 has a shorter minimum round trip (2.21 mi) than scout order 1 (3.97 mi)',
    })
  })

  test('a canopy below the selection minimum', async () => {
    const source = withFile('data/candidates.geojson', (json) => {
      candidate(json, 'JP-05').properties.metrics.canopy_percent = 25
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/candidates.geojson',
      record: 'feature 5 (JP-05)',
      problem: 'canopy 25% is outside the selection range 30–100%',
    })
  })
})

describe('the three definitions of "nearby" must agree', () => {
  test('a Nearby pool candidate flagged outside the budget', async () => {
    const source = withFile('data/candidates.geojson', (json) => {
      candidate(json, 'EP-03').properties.within_east_portal_straightline_budget = false
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/candidates.geojson',
      record: 'feature 13 (EP-03)',
      problem:
        'nearby definitions disagree: pool is nearby, within_east_portal_straightline_budget is false, and the minimum round trip of 4.51 mi is within the 6 mi budget',
    })
  })

  test('a Wilderness context candidate whose minimum round trip fits the budget', async () => {
    const source = withFile('data/candidates.geojson', (json) => {
      candidate(json, 'JP-05').properties.metrics.roundtrip_lower_bound_miles = 5.5
    })
    expect(await atlasError(source)).toEqual({
      file: 'data/candidates.geojson',
      record: 'feature 5 (JP-05)',
      problem:
        'nearby definitions disagree: pool is wilderness_context, within_east_portal_straightline_budget is false, and the minimum round trip of 5.5 mi is within the 6 mi budget',
    })
  })
})

describe('optional and per-layer files', () => {
  test('unreadable observations are a warning, never an error', async () => {
    const { observations, warnings } = await atlas(withFile('data/observations.geojson', null))
    expect(observations).toEqual([])
    expect(warnings).toEqual([{ file: 'data/observations.geojson', problem: 'file not found (HTTP 404)' }])
  })

  test('a contour off the 40 ft interval', async () => {
    const source = withFile('data/contours_40ft.geojson', (json) => {
      json['features'][4].properties.elevation_ft = 9610
    })
    const result = await loadGeoJsonLayer(source, (await atlas()).manifest, 'contours')
    expect(result).toEqual({
      ok: false,
      error: { file: 'data/contours_40ft.geojson', record: 'feature 5', problem: 'elevation 9610 ft is not on the 40 ft contour interval' },
    })
  })

  test('a canopy pixel that is neither a percentage nor NoData', async () => {
    const source = withFile('data/canopy_grid.json', (json) => {
      const pixels = Buffer.from(json['data_base64'], 'base64')
      pixels[642 * 2 + 5] = 254
      json['data_base64'] = pixels.toString('base64')
    })
    const result = await loadCanopyGrid(source, (await atlas()).manifest)
    expect(result).toEqual({
      ok: false,
      error: {
        file: 'data/canopy_grid.json',
        record: 'pixel 1289 (row 2, column 5)',
        problem: 'value 254 is not a percentage 0–100 or 255 for NoData',
      },
    })
  })
})

test('formatDataError reads as one line', () => {
  expect(formatDataError({ file: 'data/candidates.geojson', record: 'feature 7 (JP-07)', problem: 'duplicate ID' })).toBe(
    'data/candidates.geojson feature 7 (JP-07): duplicate ID',
  )
  expect(formatDataError({ file: 'data/manifest.json', problem: 'not valid JSON' })).toBe('data/manifest.json: not valid JSON')
})
