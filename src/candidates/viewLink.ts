// The shareable view link: the selected candidate, scope and sort, kept in
// the URL hash. Pure, so links can be pinned by tests.
import type { Candidate } from '../atlas/schemas.ts'
import { type Scope, SCOPES, type SortKey, SORTS, visibleCandidates } from './visibleList.ts'

/** What a link carries. Search and layers aren't part of it. */
export interface LinkedView {
  readonly scope: Scope
  /** The sort the owner picked, or `null` for the scope's default, as in `ListView`. */
  readonly sort: SortKey | null
  readonly candidate: string | null
}

export const DEFAULT_VIEW: LinkedView = { scope: 'nearby', sort: null, candidate: null }

export interface OpenedLink {
  readonly view: LinkedView
  /** Why the link fell back to the default view, as a sentence; `null` when it opened as written. */
  readonly problem: string | null
}

/** `#candidate=EP-04&scope=all&sort=water`, leaving out each default; the default view is `''`. */
export function encodeViewHash({ scope, sort, candidate }: LinkedView): string {
  const params = new URLSearchParams()
  if (candidate !== null) params.set('candidate', candidate)
  if (scope !== DEFAULT_VIEW.scope) params.set('scope', scope)
  if (sort !== null) params.set('sort', sort)
  const query = params.toString()
  return query && `#${query}`
}

/**
 * Reads a hash back against the atlas. A link it can't honour in full opens
 * the default view with the problem, rather than half-applying: an invalid
 * scope or sort, an unknown candidate, or a candidate outside the link's
 * scope. Keys the atlas doesn't use are ignored.
 */
export function decodeViewHash(hash: string, candidates: readonly Candidate[]): OpenedLink {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const scope = params.get('scope') ?? DEFAULT_VIEW.scope
  const sort = params.get('sort')
  const id = params.get('candidate')
  const fallBack = (problem: string): OpenedLink => ({ view: DEFAULT_VIEW, problem })

  if (!isScope(scope)) return fallBack(`“${scope}” isn’t a scope.`)
  if (sort !== null && !isSort(sort)) return fallBack(`“${sort}” isn’t a sort.`)
  if (id !== null) {
    if (!candidates.some(({ properties }) => properties.id === id)) return fallBack(`There’s no candidate “${id}” in this atlas.`)
    // Scope membership comes from the visible-list selector, so the two can't disagree.
    const inScope = visibleCandidates(candidates, { scope, sort: null, search: '' }).some(({ candidate }) => candidate.properties.id === id)
    if (!inScope) return fallBack(`${id} isn’t in the ${scope === 'nearby' ? 'Nearby' : 'All'} list.`)
  }
  return { view: { scope, sort, candidate: id }, problem: null }
}

function isScope(value: string): value is Scope {
  return (SCOPES as readonly string[]).includes(value)
}

function isSort(value: string): value is SortKey {
  return (SORTS as readonly string[]).includes(value)
}
