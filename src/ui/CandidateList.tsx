import { type ReactNode, useEffect } from 'react'
import type { Manifest } from '../atlas/schemas.ts'
import { FIELD_STATUS_LABELS, FIELD_STATUSES, type FieldLog, type FieldStatus, fieldStatusOf } from '../fieldLog/fieldLog.ts'
import { type ListView, type Scope, type SortKey, resolveSort, sortsFor, type VisibleCandidate } from '../candidates/visibleList.ts'
import { formatMiles, formatPoolRank, formatScoutingIndex, routeNote } from './format.ts'

const SCOPE_LABELS: Record<Scope, string> = { nearby: 'Nearby', all: 'All' }

const SORT_LABELS: Record<SortKey, string> = {
  scout: 'Scout order',
  index: 'Scouting index',
  water: 'Water',
  shelter: 'Shelter',
  darkness: 'Darkness',
  security: 'Security',
}

/** Field status chips, as the reference atlas's status tags. */
const FIELD_STATUS_CHIP: Record<FieldStatus, string> = {
  to_scout: 'bg-[#edf0e5] text-[#56684b]',
  scouted: 'bg-[#e4ece0] text-[#3f6236]',
  camera_placed: 'bg-[#ddecdf] text-[#2b6b53]',
  ruled_out: 'bg-[#f3e9e0] text-[#7d5f4d]',
}

/** The field-status filter's DOM id: focus falls back to it when a closed candidate's card is filtered out. */
export const FIELD_STATUS_FILTER_ID = 'field-status-filter'

/** The DOM id of a candidate's card, so focus can come back to it. */
export function cardId(candidateId: string): string {
  return `candidate-card-${candidateId}`
}

interface CandidateListProps {
  manifest: Manifest
  view: ListView
  visible: readonly VisibleCandidate[]
  log: FieldLog
  selectedId: string | null
  /** The field log's export, import and reset, shown under the filters. */
  tools: ReactNode
  onViewChange(view: ListView): void
  onSelect(id: string): void
}

/** Scope, sort, field status and search over the visible list, and a card per candidate in it. */
export function CandidateList({ manifest, view, visible, log, selectedId, tools, onViewChange, onSelect }: CandidateListProps) {
  const sort = resolveSort(view.scope, view.sort)
  const budget = manifest.constraints.roundtrip_miles

  // A selection made on the map brings its card into view.
  useEffect(() => {
    if (selectedId) document.getElementById(cardId(selectedId))?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  return (
    <>
      <div role="group" aria-label="Scope" className="mb-2 flex rounded-[8px] bg-[#e9ede5] p-[3px]">
        {(Object.keys(SCOPE_LABELS) as Scope[]).map((scope) => (
          <button
            key={scope}
            type="button"
            aria-pressed={view.scope === scope}
            onClick={() => onViewChange({ ...view, scope })}
            className="flex-1 rounded-[5px] px-[5px] py-2 text-[10px] font-semibold text-ink-soft aria-pressed:bg-sheet aria-pressed:text-ink aria-pressed:shadow-[0_1px_4px_#183a2420]"
          >
            {SCOPE_LABELS[scope]}
          </button>
        ))}
      </div>
      <p className="mb-4 text-[10px] leading-[1.55] text-muted">
        {view.scope === 'nearby'
          ? `The Nearby pool: within a ${budget}-mile round trip of ${manifest.origin.name} as the crow flies. Walking routes are unverified.`
          : 'Both pools: Nearby, and Wilderness context candidates elsewhere in the wilderness.'}
      </p>

      <div className="mb-3 flex items-center gap-2">
        <label htmlFor="candidate-sort" className="text-[10px] text-ink-soft">
          Sort
        </label>
        <select
          id="candidate-sort"
          value={sort}
          onChange={(event) => onViewChange({ ...view, sort: event.target.value as SortKey })}
          className="min-w-0 flex-1 rounded-[4px] border border-[#d9dfd2] bg-[#f4f5ee] px-2 py-1.5 text-[11px] text-ink"
        >
          {sortsFor(view.scope)
            .filter((key) => key === 'scout' || key === 'index')
            .map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          <optgroup label="Component">
            {sortsFor(view.scope)
              .filter((key) => key !== 'scout' && key !== 'index')
              .map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
          </optgroup>
        </select>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <label htmlFor={FIELD_STATUS_FILTER_ID} className="text-[10px] text-ink-soft">
          Field status
        </label>
        <select
          id={FIELD_STATUS_FILTER_ID}
          value={view.fieldStatus ?? ''}
          onChange={(event) => onViewChange({ ...view, fieldStatus: (event.target.value || null) as FieldStatus | null })}
          className="min-w-0 flex-1 rounded-[4px] border border-[#d9dfd2] bg-[#f4f5ee] px-2 py-1.5 text-[11px] text-ink"
        >
          <option value="">Any field status</option>
          {FIELD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {FIELD_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {tools}

      <div className="relative mb-3">
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="absolute top-[11px] left-[11px] size-4 fill-none stroke-[#84937c] stroke-[1.7] [stroke-linecap:round]"
        >
          <circle cx="8" cy="8" r="5" />
          <path d="m12 12 5 5" />
        </svg>
        <input
          type="search"
          value={view.search}
          onChange={(event) => onViewChange({ ...view, search: event.target.value })}
          placeholder="Find a candidate by ID or name"
          aria-label="Search candidates by ID or name"
          className="w-full rounded-[5px] border border-[#d7dfcf] bg-sheet py-2.5 pr-2.5 pl-[34px] text-[11px] text-ink"
        />
      </div>

      <p className="mb-[15px] text-[10px] leading-[1.6] text-[#646e5c]">
        Each card’s label is its pool rank: its place by scouting index within its own pool, whatever the list order.
      </p>

      <p role="status" className="sr-only">
        {visible.length === 1 ? '1 candidate' : `${visible.length} candidates`}
      </p>
      {visible.length > 0 ? (
        <ol aria-label="Candidates">
          {visible.map((entry) => (
            <li key={entry.candidate.properties.id}>
              <CandidateCard
                entry={entry}
                budget={budget}
                fieldStatus={fieldStatusOf(log, entry.candidate.properties.id)}
                selected={entry.candidate.properties.id === selectedId}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-2.5 py-[22px] text-center text-[12px] text-[#646e5c]">
          No candidates match this view.
          <br />
          Try another field status or search{view.scope === 'nearby' && ', or switch to All'}.
        </p>
      )}
    </>
  )
}

function CandidateCard({
  entry: { candidate, position, poolRank, pool },
  budget,
  fieldStatus,
  selected,
  onSelect,
}: {
  entry: VisibleCandidate
  budget: number
  fieldStatus: FieldStatus
  selected: boolean
  onSelect(id: string): void
}) {
  const { id, name, score, metrics } = candidate.properties
  return (
    <button
      type="button"
      id={cardId(id)}
      aria-current={selected || undefined}
      onClick={() => onSelect(id)}
      className="mb-[9px] block w-full rounded-[6px] border border-[#dbe1d3] bg-sheet p-[13px] text-left transition-[border-color] hover:border-[#bb8b4d] hover:bg-[#fffaf0] aria-[current]:border-[#bb8b4d] aria-[current]:bg-[#fffaf0] aria-[current]:shadow-[0_0_0_1px_#bb8b4d]"
    >
      <span className="flex items-center gap-[9px]">
        <span
          aria-hidden="true"
          className="grid size-[25px] flex-none place-items-center rounded-full bg-[#f4e3cb] text-[10px] font-bold text-[#8a5322]"
        >
          {position}
        </span>
        <span className="text-[12px] leading-[1.3] font-bold">{name}</span>
        <span data-testid="card-index" className="ml-auto flex-none text-[12px] font-bold whitespace-nowrap text-[#8c5a2d]">
          {formatScoutingIndex(score)}
        </span>
      </span>
      <span className="mt-[9px] flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-[#626f59]">
        <span>{id}</span>
        <span data-testid="pool-rank" className="rounded-[3px] border border-line-strong bg-paper px-[5px] py-px">
          {formatPoolRank(pool, poolRank)}
        </span>
        <span data-testid="card-roundtrip">{formatMiles(metrics.roundtrip_lower_bound_miles)} minimum round trip</span>
        <span data-testid="card-field-status" className={`rounded-[3px] px-[5px] py-px ${FIELD_STATUS_CHIP[fieldStatus]}`}>
          {FIELD_STATUS_LABELS[fieldStatus]}
        </span>
      </span>
      <span
        data-testid="card-route-note"
        className="mt-2 inline-block rounded-[3px] border border-[#d8c4a9] bg-[#f9eedf] px-[5px] py-[3px] text-[9px] tracking-[.02em] text-[#7a5732]"
      >
        {routeNote(pool, budget)}
      </span>
    </button>
  )
}
