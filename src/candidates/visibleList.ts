// The visible-list selector: the one source for the candidate list and the
// map markers. Pure, so its orders can be pinned by tests.
import { COMPONENTS, type Candidate, type ComponentKey, type Pool } from '../atlas/schemas.ts'
import { type FieldLog, type FieldStatus, fieldStatusOf } from '../fieldLog/fieldLog.ts'

export const SCOPES = ['nearby', 'all'] as const
export type Scope = (typeof SCOPES)[number]

/** Scout order, scouting index, or one component. */
export type SortKey = 'scout' | 'index' | ComponentKey
export const SORTS: readonly SortKey[] = ['scout', 'index', ...COMPONENTS]

export interface ListView {
  readonly scope: Scope
  /** The sort the owner picked, or `null` for the scope's default. */
  readonly sort: SortKey | null
  readonly search: string
  /** Only candidates with this field status; absent or `null` for every field status. */
  readonly fieldStatus?: FieldStatus | null
}

export interface VisibleCandidate {
  readonly candidate: Candidate
  /** 1-based place in this list. */
  readonly position: number
  /** Place by scouting index within the candidate's own pool; never the list position. */
  readonly poolRank: number
  readonly pool: Pool
}

/** Scout order is a Nearby plan, so only Nearby offers it. */
export function sortsFor(scope: Scope): readonly SortKey[] {
  return scope === 'nearby' ? SORTS : SORTS.filter((sort) => sort !== 'scout')
}

/** The sort in effect: the owner's pick when the scope offers it, else the scope's default. */
export function resolveSort(scope: Scope, sort: SortKey | null): SortKey {
  if (sort && sortsFor(scope).includes(sort)) return sort
  return scope === 'nearby' ? 'scout' : 'index'
}

/** The field log decides each candidate's field status; one without an entry is To scout. */
export function visibleCandidates(candidates: readonly Candidate[], view: ListView, log: FieldLog = {}): readonly VisibleCandidate[] {
  const sort = resolveSort(view.scope, view.sort)
  const term = view.search.trim().toLowerCase()
  return candidates
    .filter(({ properties }) => view.scope === 'all' || properties.pool === 'nearby')
    .filter(({ properties }) => !term || properties.id.toLowerCase().includes(term) || properties.name.toLowerCase().includes(term))
    .filter(({ properties }) => !view.fieldStatus || fieldStatusOf(log, properties.id) === view.fieldStatus)
    .toSorted((a, b) => compare(a, b, sort))
    .map((candidate, index) => ({
      candidate,
      position: index + 1,
      poolRank: candidate.properties.rank,
      pool: candidate.properties.pool,
    }))
}

/** By the sort's key, then pool rank, then ID, so equal keys keep a stable order. */
function compare({ properties: a }: Candidate, { properties: b }: Candidate, sort: SortKey): number {
  const key =
    sort === 'scout' ? a.scout_order - b.scout_order : sort === 'index' ? b.score - a.score : b.components[sort] - a.components[sort]
  return key || a.rank - b.rank || a.id.localeCompare(b.id)
}
