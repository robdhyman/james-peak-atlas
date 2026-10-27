import { beforeAll, describe, expect, test } from 'vitest'
import { formatDataError, loadAtlas } from '../atlas/data.ts'
import type { Candidate } from '../atlas/schemas.ts'
import { bundle } from '../atlas/testing/bundle.ts'
import type { FieldLog } from '../fieldLog/fieldLog.ts'
import { type ListView, resolveSort, sortsFor, visibleCandidates } from './visibleList.ts'

// Expected orders are worked out by hand from candidates.geojson, not from the selector.
const SCOUT_ORDER = ['EP-04', 'EP-05', 'EP-03', 'EP-01', 'EP-06', 'EP-02']
const NEARBY_BY_INDEX = ['EP-01', 'EP-02', 'EP-03', 'EP-04', 'EP-05', 'EP-06']
// JP-02 and JP-03 tie at 84.9, and EP-02 and JP-07 at 75.6; pool rank breaks both.
const ALL_BY_INDEX = [
  'JP-01', 'JP-02', 'JP-03', 'JP-04', 'EP-01', 'JP-05', 'JP-06', 'EP-02',
  'JP-07', 'EP-03', 'JP-08', 'EP-04', 'JP-09', 'JP-10', 'EP-05', 'EP-06',
]

let candidates: readonly Candidate[]

beforeAll(async () => {
  const result = await loadAtlas(bundle)
  if (!result.ok) throw new Error(formatDataError(result.error))
  candidates = result.value.candidates
})

const ids = (view: Partial<ListView>) =>
  visibleCandidates(candidates, { scope: 'nearby', sort: null, search: '', ...view }).map((v) => v.candidate.properties.id)

describe('scope', () => {
  test('Nearby is exactly the Nearby pool, read from the pool field', () => {
    expect(ids({ scope: 'nearby' }).toSorted()).toEqual(NEARBY_BY_INDEX)
  })

  test('All is both pools', () => {
    expect(ids({ scope: 'all' })).toHaveLength(16)
  })

  test('Nearby follows the pool field even when the distance flag disagrees', () => {
    // Guards against "nearby" drifting back to a computed distance test.
    const relabelled = candidates.map((c) =>
      c.properties.id === 'JP-02' ? { ...c, properties: { ...c.properties, pool: 'nearby' as const } } : c,
    )
    const nearby = visibleCandidates(relabelled, { scope: 'nearby', sort: 'index', search: '' })
    expect(nearby.map((v) => v.candidate.properties.id)).toContain('JP-02')
  })
})

describe('default sorts', () => {
  test('Nearby defaults to scout order', () => {
    expect(ids({ scope: 'nearby', sort: null })).toEqual(SCOUT_ORDER)
  })

  test('All defaults to scouting index across both pools, not interleaved pool ranks', () => {
    expect(ids({ scope: 'all', sort: null })).toEqual(ALL_BY_INDEX)
  })

  test('scout order is offered in Nearby only, and falls back to the index in All', () => {
    expect(sortsFor('nearby')).toEqual(['scout', 'index', 'water', 'shelter', 'darkness', 'security'])
    expect(sortsFor('all')).toEqual(['index', 'water', 'shelter', 'darkness', 'security'])
    expect(resolveSort('all', 'scout')).toBe('index')
    expect(resolveSort('nearby', 'scout')).toBe('scout')
    expect(resolveSort('nearby', 'water')).toBe('water')
    expect(ids({ scope: 'all', sort: 'scout' })).toEqual(ALL_BY_INDEX)
  })
})

describe('explicit sorts', () => {
  test('Nearby by scouting index, descending', () => {
    expect(ids({ scope: 'nearby', sort: 'index' })).toEqual(NEARBY_BY_INDEX)
  })

  test.each([
    ['water', ['EP-01', 'EP-02', 'EP-03', 'EP-05', 'EP-06', 'EP-04']],
    ['shelter', ['EP-04', 'EP-05', 'EP-06', 'EP-01', 'EP-03', 'EP-02']],
    ['darkness', ['EP-03', 'EP-02', 'EP-01', 'EP-06', 'EP-05', 'EP-04']],
    ['security', ['EP-04', 'EP-01', 'EP-02', 'EP-05', 'EP-03', 'EP-06']],
  ] as const)('Nearby by %s, descending', (sort, expected) => {
    expect(ids({ scope: 'nearby', sort })).toEqual(expected)
  })

  test.each([
    [
      'water',
      // Twelve candidates tie at 90: pool rank, then ID (EP before JP) decides.
      ['EP-01', 'JP-01', 'EP-02', 'JP-02', 'EP-03', 'JP-04', 'EP-05', 'JP-05',
       'JP-06', 'JP-07', 'JP-08', 'JP-10', 'JP-03', 'EP-06', 'EP-04', 'JP-09'],
    ],
    [
      'shelter',
      ['EP-04', 'JP-03', 'EP-05', 'EP-06', 'JP-01', 'JP-06', 'EP-01', 'JP-02',
       'JP-07', 'JP-05', 'JP-08', 'JP-04', 'JP-09', 'EP-03', 'EP-02', 'JP-10'],
    ],
    [
      'darkness',
      ['JP-01', 'JP-02', 'JP-03', 'JP-04', 'JP-09', 'JP-08', 'EP-03', 'EP-02',
       'JP-07', 'JP-06', 'JP-10', 'JP-05', 'EP-01', 'EP-06', 'EP-05', 'EP-04'],
    ],
    [
      'security',
      // JP-02, EP-05 and JP-10 tie at 77.2 with pool ranks 2, 5 and 10.
      ['EP-04', 'EP-01', 'EP-02', 'JP-01', 'JP-05', 'JP-02', 'EP-05', 'JP-10',
       'JP-06', 'JP-09', 'JP-03', 'EP-03', 'JP-04', 'JP-07', 'EP-06', 'JP-08'],
    ],
  ] as const)('All by %s, descending', (sort, expected) => {
    expect(ids({ scope: 'all', sort })).toEqual(expected)
  })
})

describe('tie-breaking', () => {
  // A synthetic pair that ties on everything but the ID.
  const twin = (id: string): Candidate => {
    const base = candidates.find((c) => c.properties.id === 'EP-01')!
    return { ...base, properties: { ...base.properties, id } }
  }

  test('equal keys and equal pool ranks fall back to ID, whatever the input order', () => {
    for (const input of [[twin('EP-09'), twin('EP-08')], [twin('EP-08'), twin('EP-09')]]) {
      for (const sort of ['scout', 'index', 'water'] as const) {
        const order = visibleCandidates(input, { scope: 'nearby', sort, search: '' }).map((v) => v.candidate.properties.id)
        expect(order).toEqual(['EP-08', 'EP-09'])
      }
    }
  })
})

describe('search', () => {
  test('matches the ID, ignoring case and surrounding space', () => {
    expect(ids({ scope: 'all', search: '  jp-1 ' })).toEqual(['JP-10'])
  })

  test('matches the name, keeping the sort', () => {
    expect(ids({ scope: 'all', search: 'Blue Creek' })).toEqual(['JP-01', 'JP-03'])
    expect(ids({ scope: 'nearby', search: 'clayton' })).toEqual(['EP-03'])
  })

  test('works within the scope', () => {
    expect(ids({ scope: 'nearby', search: 'blue creek' })).toEqual([])
  })

  test('blank search shows the whole scope', () => {
    expect(ids({ scope: 'nearby', search: '   ' })).toEqual(SCOUT_ORDER)
  })
})

describe('pool rank and position', () => {
  test('are separate outputs', () => {
    const list = visibleCandidates(candidates, { scope: 'nearby', sort: null, search: '' })
    // EP-04 is first to visit but fourth by index within the Nearby pool.
    expect(list[0]).toMatchObject({ position: 1, poolRank: 4, pool: 'nearby' })
    expect(list.map((v) => v.position)).toEqual([1, 2, 3, 4, 5, 6])
    expect(list.map((v) => v.poolRank)).toEqual([4, 5, 3, 1, 6, 2])
  })

  test('pool rank is the rank within the pool, not across both', () => {
    const all = visibleCandidates(candidates, { scope: 'all', sort: null, search: '' })
    const ep01 = all.find((v) => v.candidate.properties.id === 'EP-01')!
    expect(ep01).toMatchObject({ position: 5, poolRank: 1, pool: 'nearby' })
  })

  test('positions count the filtered list', () => {
    const found = visibleCandidates(candidates, { scope: 'all', sort: null, search: 'blue creek' })
    expect(found.map((v) => [v.position, v.poolRank])).toEqual([
      [1, 1],
      [2, 3],
    ])
  })
})

describe('field-status filter', () => {
  const at = '2026-10-20T15:04:05.000Z'
  const log: FieldLog = {
    'EP-04': { status: 'scouted', updated: at },
    'JP-07': { status: 'scouted', updated: at },
    'EP-03': { status: 'ruled_out', updated: at },
    // Notes alone leave a candidate To scout.
    'EP-01': { notes: 'Check the seep', updated: at },
  }
  const filtered = (view: Partial<ListView>) =>
    visibleCandidates(candidates, { scope: 'nearby', sort: null, search: '', ...view }, log).map((v) => v.candidate.properties.id)

  test('To scout includes candidates with no entry, and keeps the sort', () => {
    expect(filtered({ fieldStatus: 'to_scout' })).toEqual(['EP-05', 'EP-01', 'EP-06', 'EP-02'])
  })

  test('works together with scope', () => {
    expect(filtered({ fieldStatus: 'scouted' })).toEqual(['EP-04'])
    expect(filtered({ scope: 'all', fieldStatus: 'scouted' })).toEqual(['JP-07', 'EP-04'])
  })

  test('works together with search', () => {
    expect(filtered({ scope: 'all', fieldStatus: 'scouted', search: 'jp' })).toEqual(['JP-07'])
  })

  test('a status nobody has gives an empty list, and no filter shows every field status', () => {
    expect(filtered({ fieldStatus: 'camera_placed' })).toEqual([])
    expect(filtered({ fieldStatus: null })).toEqual(SCOUT_ORDER)
  })

  test('renumbers the list but keeps each pool rank', () => {
    const [first] = visibleCandidates(candidates, { scope: 'nearby', sort: null, search: '', fieldStatus: 'scouted' }, log)
    expect(first).toMatchObject({ position: 1, poolRank: 4 })
  })
})
