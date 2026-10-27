import { readFile } from 'node:fs/promises'
import { describe, expect, test } from 'vitest'
import { type LatLng, sampleCanopy } from './canopy.ts'
import { type CanopyGrid, type DataSource, formatDataError, loadAtlas, loadCanopyGrid } from './data.ts'

/** The inverse of EPSG:3857, written out here so the tests don't reuse the sampler's projection. */
function unproject(x: number, y: number): LatLng {
  const R = 6378137
  return { lat: (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI), lng: (x / R) * (180 / Math.PI) }
}

describe('a small grid with known pixels', () => {
  // Three 1 km columns by two 1 km rows, just north-east of (0, 0):
  //   row 0 (north): 10  255   0
  //   row 1 (south): 100  55   7
  const grid: CanopyGrid = {
    width: 3,
    height: 2,
    bounds: [0, 0, 3000, 2000],
    nodata: 255,
    year: 2025,
    pixels: Uint8Array.from([10, 255, 0, 100, 55, 7]),
  }
  const at = (x: number, y: number) => sampleCanopy(grid, unproject(x, y))

  test('row zero is the north edge', () => {
    expect(at(500, 1500)).toEqual({ kind: 'cover', percent: 10 })
    expect(at(500, 500)).toEqual({ kind: 'cover', percent: 100 })
  })

  test('columns run west to east', () => {
    expect(at(1500, 500)).toEqual({ kind: 'cover', percent: 55 })
    expect(at(2500, 500)).toEqual({ kind: 'cover', percent: 7 })
  })

  test('255 is NoData, not a percentage', () => {
    expect(at(1500, 1500)).toEqual({ kind: 'nodata' })
  })

  test('0 is a valid reading of open ground, not NoData', () => {
    expect(at(2500, 1500)).toEqual({ kind: 'cover', percent: 0 })
  })

  test('the west and north edges are inside; the east and south edges are outside', () => {
    expect(at(0, 1999)).toEqual({ kind: 'cover', percent: 10 })
    expect(at(2999, 1)).toEqual({ kind: 'cover', percent: 7 })
    expect(at(3000, 1000)).toBeNull()
    expect(at(1000, 0)).toBeNull()
  })

  test('points outside the grid read nothing', () => {
    expect(at(-1, 1000)).toBeNull()
    expect(at(1000, 2001)).toBeNull()
    expect(sampleCanopy(grid, { lat: 39.86, lng: -105.69 })).toBeNull()
  })
})

describe('the real display grid', () => {
  const PUBLIC = new URL('../../public/', import.meta.url)
  const bundle: DataSource = { base: PUBLIC, fetch: async (url) => new Response(await readFile(new URL(url))) }

  let loaded: Promise<CanopyGrid> | undefined
  function realGrid() {
    loaded ??= (async () => {
      const atlas = await loadAtlas(bundle)
      if (!atlas.ok) throw new Error(formatDataError(atlas.error))
      const grid = await loadCanopyGrid(bundle, atlas.value.manifest)
      if (!grid.ok) throw new Error(formatDataError(grid.error))
      return grid.value
    })()
    return loaded
  }

  // Pixel centres, as [latitude, longitude] → expected percent. Values read
  // from the 2025 snapshot; update deliberately if the grid changes.
  test.each([
    ['row 394, column 320', 39.86176, -105.688311, 31],
    ['its north neighbour', 39.862029, -105.688311, 22],
    ['its south neighbour', 39.861491, -105.688311, 26],
    ['its west neighbour (open ground)', 39.86176, -105.688661, 0],
    ['its east neighbour', 39.86176, -105.687961, 23],
    ['the north-west corner pixel', 39.967551, -105.800357, 44],
    ['the south-east corner pixel', 39.743964, -105.575915, 42],
    ['row 200, column 450', 39.91387, -105.642792, 50],
  ])('%s reads %d%%', async (_, lat, lng, percent) => {
    expect(sampleCanopy(await realGrid(), { lat, lng })).toEqual({ kind: 'cover', percent })
  })

  test('just beyond the west edge reads nothing', async () => {
    expect(sampleCanopy(await realGrid(), { lat: 39.86, lng: -105.801 })).toBeNull()
  })
})
