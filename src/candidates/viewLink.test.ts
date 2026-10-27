import { beforeAll, describe, expect, test } from 'vitest'
import { formatDataError, loadAtlas } from '../atlas/data.ts'
import type { Candidate } from '../atlas/schemas.ts'
import { bundle } from '../atlas/testing/bundle.ts'
import { decodeViewHash, DEFAULT_VIEW, encodeViewHash, type LinkedView } from './viewLink.ts'
import { resolveSort } from './visibleList.ts'

let candidates: readonly Candidate[]

beforeAll(async () => {
  const result = await loadAtlas(bundle)
  if (!result.ok) throw new Error(formatDataError(result.error))
  candidates = result.value.candidates
})

const open = (hash: string) => decodeViewHash(hash, candidates)

describe('encoding', () => {
  test('the default view has no hash, so a plain visit keeps a clean URL', () => {
    expect(encodeViewHash(DEFAULT_VIEW)).toBe('')
  })

  test('only values that differ from the default are written', () => {
    expect(encodeViewHash({ scope: 'nearby', sort: null, candidate: 'EP-04' })).toBe('#candidate=EP-04')
    expect(encodeViewHash({ scope: 'all', sort: null, candidate: null })).toBe('#scope=all')
    expect(encodeViewHash({ scope: 'all', sort: 'water', candidate: 'JP-07' })).toBe('#candidate=JP-07&scope=all&sort=water')
  })

  test('a sort the owner picked is written even when it matches the default, so it survives a scope change', () => {
    expect(encodeViewHash({ scope: 'nearby', sort: 'scout', candidate: null })).toBe('#sort=scout')
  })
})

describe('decoding a good link', () => {
  test('no hash, or an empty one, opens the default view without a notice', () => {
    expect(open('')).toEqual({ view: DEFAULT_VIEW, problem: null })
    expect(open('#')).toEqual({ view: DEFAULT_VIEW, problem: null })
  })

  test('the candidate, scope and sort come back as written', () => {
    expect(open('#candidate=JP-07&scope=all&sort=water')).toEqual({
      view: { scope: 'all', sort: 'water', candidate: 'JP-07' },
      problem: null,
    })
  })

  test('every view round-trips through its hash', () => {
    const views: LinkedView[] = [
      DEFAULT_VIEW,
      { scope: 'nearby', sort: 'scout', candidate: 'EP-06' },
      { scope: 'nearby', sort: 'security', candidate: null },
      { scope: 'all', sort: 'index', candidate: 'EP-01' },
      { scope: 'all', sort: 'darkness', candidate: 'JP-10' },
    ]
    for (const view of views) expect(open(encodeViewHash(view))).toEqual({ view, problem: null })
  })

  test('scout order with the All scope is kept as the pick, and resolves to the All default sort', () => {
    const { view, problem } = open('#scope=all&sort=scout')
    expect(problem).toBeNull()
    expect(view.sort).toBe('scout')
    expect(resolveSort(view.scope, view.sort)).toBe('index')
  })

  test('keys the atlas doesn’t use are ignored', () => {
    expect(open('#scope=all&zoom=12')).toEqual({ view: { scope: 'all', sort: null, candidate: null }, problem: null })
  })
})

// Guards against a broken link half-applying, or opening a view the list can't show.
describe('decoding a broken link opens the default view with a notice', () => {
  test.each([
    ['an unknown candidate', '#candidate=EP-99&scope=all', 'There’s no candidate “EP-99” in this atlas.'],
    ['a candidate ID in the wrong case', '#candidate=ep-04', 'There’s no candidate “ep-04” in this atlas.'],
    ['an empty candidate', '#candidate=', 'There’s no candidate “” in this atlas.'],
    ['a Wilderness context candidate in the Nearby scope', '#candidate=JP-07', 'JP-07 isn’t in the Nearby list.'],
    ['an invalid scope', '#scope=near&candidate=EP-04', '“near” isn’t a scope.'],
    ['an invalid sort', '#sort=distance&scope=all', '“distance” isn’t a sort.'],
  ])('%s', (_, hash, problem) => {
    expect(open(hash)).toEqual({ view: DEFAULT_VIEW, problem })
  })
})
