import { type KeyboardEvent, useEffect, useRef } from 'react'
import { COMPONENTS, type Candidate, type ComponentKey, type Manifest, type Method } from '../atlas/schemas.ts'
import { FIELD_STATUS_LABELS, FIELD_STATUSES, type FieldLogEntry, type FieldStatus } from '../fieldLog/fieldLog.ts'
import { formatMetres, formatMiles, formatPoolRank, formatScoutingIndex, routeNote } from './format.ts'

const COMPONENT_LABELS: Record<ComponentKey, string> = {
  water: 'Water',
  shelter: 'Shelter',
  darkness: 'Darkness',
  security: 'Security',
}

const BAR_COLOURS: Record<ComponentKey, string> = {
  water: 'bg-[#6395a6]',
  shelter: 'bg-[#79936b]',
  darkness: 'bg-[#6d776d]',
  security: 'bg-[#a88860]',
}

/** How a figure was measured, so differences between figures make sense. */
type Provenance = 'vector' | 'raster' | 'straight-line' | 'mapped'

interface CandidateDetailProps {
  candidate: Candidate
  manifest: Manifest
  method: Method
  /** The candidate's field log entry, if it has one. */
  logEntry: FieldLogEntry | undefined
  /** False while changes aren't reaching storage; the map's notice says why. */
  saving: boolean
  onLogChange(change: { status?: FieldStatus; notes?: string }): void
  onClose(): void
}

/** The full evidence for one candidate. It takes focus when it opens; Escape or × closes it. */
export function CandidateDetail({ candidate, manifest, method, logEntry, saving, onLogChange, onClose }: CandidateDetailProps) {
  const { geometry, properties } = candidate
  const { id, name, pool, rank, score, components, metrics } = properties
  const [lon, lat] = geometry.coordinates
  const budget = manifest.constraints.roundtrip_miles
  const grid = method['grid_resolution_m']
  const rasterNote = typeof grid === 'number' ? `${grid} m raster estimate` : 'raster estimate'
  const panel = useRef<HTMLElement>(null)

  useEffect(() => panel.current?.focus({ preventScroll: true }), [id])

  function closeOnEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    onClose()
  }

  const metricCells: readonly [value: string, label: string, provenance: Provenance][] = [
    [formatMetres(metrics.water_distance_m), 'to mapped water', 'vector'],
    [`${Math.round(metrics.canopy_percent)}%`, 'tree canopy cover', 'raster'],
    [formatMetres(metrics.darkness_m), 'from mapped access', 'vector'],
    [`${metrics.slope_deg.toFixed(1)}°`, 'local slope', 'raster'],
    [formatMiles(metrics.roundtrip_lower_bound_miles), 'minimum round trip', 'straight-line'],
    [`GMU ${properties.gmu}`, 'hunting unit', 'mapped'],
    [`${Math.round(metrics.elevation_ft).toLocaleString('en-US')} ft`, 'cell elevation', 'raster'],
    [`${Math.round(metrics.nearby_steep_terrain_percent)}%`, 'nearby steep terrain', 'raster'],
  ]
  const provenanceLabel: Record<Provenance, string> = {
    vector: 'exact vector',
    raster: rasterNote,
    'straight-line': 'straight-line lower bound',
    mapped: 'mapped boundary',
  }

  const constraints = manifest.constraints
  const chips = [
    `${budget} mi round-trip limit`,
    ...(constraints.gain_ft ? [`${constraints.gain_ft.toLocaleString('en-US')} ft gain limit`] : []),
    ...(constraints.vehicle ? [constraints.vehicle] : []),
  ]

  return (
    <section
      ref={panel}
      tabIndex={-1}
      onKeyDown={closeOnEscape}
      aria-labelledby="candidate-detail-title"
      className="absolute top-[77px] right-[23px] bottom-[55px] z-[650] max-h-[780px] w-[330px] overflow-auto rounded-[9px] border border-[#d8dfd0] bg-sheet shadow-[0_9px_40px_#21341b2b] [scrollbar-color:#c7d4ba_transparent] [scrollbar-width:thin] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus max-desktop:right-[15px] max-desktop:w-[305px] max-tablet:inset-x-0 max-tablet:top-auto max-tablet:bottom-0 max-tablet:max-h-[62vh] max-tablet:w-auto max-tablet:rounded-b-none wide:w-[350px]"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close candidate detail"
        className="absolute top-[9px] right-[11px] z-[2] grid size-7 place-items-center rounded-full bg-[#eff2e9] text-[20px] leading-none text-[#5f7154]"
      >
        ×
      </button>

      <div className="border-b border-line bg-gradient-to-br from-[#f8f3e7] to-sheet px-[22px] pt-[23px] pr-[42px] pb-[19px] max-tablet:px-5 max-tablet:pt-5 max-tablet:pb-4">
        <div className="text-[9px] font-bold tracking-[.12em] text-[#92612e]">SCOUTING CANDIDATE · {id}</div>
        <h2
          id="candidate-detail-title"
          className="mt-2 mb-3 font-display text-[27px] leading-[1.15] font-normal tracking-[-.03em] max-tablet:text-[24px]"
        >
          {name}
        </h2>
        <p data-testid="location" className="text-[11px] tracking-[.02em] text-[#58704d] tabular-nums">
          {lat.toFixed(5)}, {lon.toFixed(5)} <span className="text-muted">· WGS84</span>
        </p>
        <dl className="mt-[18px] flex items-end gap-6">
          <div>
            <dt className="text-[10px] text-muted">Scouting index</dt>
            <dd data-testid="scouting-index" className="font-display text-[34px] leading-none text-[#9e692c]">
              {formatScoutingIndex(score)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted">Pool rank</dt>
            <dd data-testid="pool" className="mt-1 rounded-[3px] border border-line-strong bg-paper px-[6px] py-[3px] text-[11px]">
              {formatPoolRank(pool, rank)}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-[10px] leading-normal text-[#656f5a]">A relative index for comparing candidates. It isn’t a probability.</p>
        <p
          data-testid="route-note"
          className="mt-2 inline-block rounded-[3px] border border-[#d8c4a9] bg-[#f9eedf] px-[5px] py-[3px] text-[9px] tracking-[.02em] text-[#7a5732]"
        >
          {routeNote(pool, budget)}
        </p>
      </div>

      <div className="px-[22px] pt-[19px] pb-6 max-tablet:px-5 max-tablet:pt-4 max-tablet:pb-[22px]">
        <DetailHeading>Why this cell stands out</DetailHeading>
        <ul aria-label="Components">
          {COMPONENTS.map((key) => {
            const value = Math.round(components[key])
            const weight = Math.round(method.components[key].weight * 100)
            return (
              <li key={key} className="mb-[11px]">
                <div className="mb-1 flex items-center justify-between text-[11px] text-[#4e6842]">
                  <span>
                    {COMPONENT_LABELS[key]} <small className="text-[9px] text-muted">· {weight}% weight</small>
                  </span>
                  <strong className="text-[10px] font-semibold text-[#5f6b52]">{value} / 100</strong>
                </div>
                <div
                  role="meter"
                  aria-label={`${COMPONENT_LABELS[key]} component`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={value}
                  className="h-1 overflow-hidden rounded-sm bg-[#ebeee3]"
                >
                  <i className={`block h-full rounded-sm ${BAR_COLOURS[key]}`} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
        <p data-testid="weighted-sum-note" className="mt-1 text-[10px] leading-[1.6] text-[#626f59]">
          The index is a weighted sum, so a strong component can make up for a weak one. Check the bars before
          trusting the total.
        </p>

        <dl
          aria-label="Raw metrics"
          className="my-[18px] grid grid-cols-2 gap-px overflow-hidden rounded-[5px] border border-[#e7ebdf] bg-[#e7ebdf]"
        >
          {metricCells.map(([value, label, provenance]) => (
            <div key={label} className="flex flex-col-reverse bg-[#f8f9f2] p-2.5">
              <dt className="mt-0.5 text-[9px] text-[#636f57]">
                {label}
                <span className="block text-[8px] tracking-[.03em] text-[#656e5a] uppercase">{provenanceLabel[provenance]}</span>
              </dt>
              <dd className="text-[14px] font-semibold text-[#3e5835] tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="-mt-2.5 mb-[18px] text-[9px] leading-[1.6] text-[#636f57]">
          Exact vector figures are measured to the mapped features. Raster estimates come from the model’s grid, so
          they can differ slightly from the map layers and from each other.
        </p>

        {properties.rationale.length > 0 && (
          <>
            <DetailHeading>Scouting rationale</DetailHeading>
            <BulletList items={properties.rationale} />
          </>
        )}

        <div data-testid="cautions" className="my-[15px] border-l-2 border-[#d2a363] bg-[#faf3e7] px-[11px] py-[9px] text-[10px] leading-[1.65] text-[#7b6643]">
          <strong className="mb-[3px] block text-[9px] tracking-[.04em]">
            {pool === 'nearby'
              ? 'A candidate to investigate, with access unresolved.'
              : 'A wilderness comparison, outside the day-hike screen.'}
          </strong>
          <p className="my-[3px]">
            The distance is a straight-line lower bound from {manifest.origin.name}. Terrain, a legal walking route,
            total ascent, water flow and a safe recovery route need field verification.
          </p>
          {properties.cautions.map((caution) => (
            <p key={caution} className="my-[3px]">
              {caution}
            </p>
          ))}
        </div>

        {properties.field_checks && properties.field_checks.length > 0 && (
          <>
            <DetailHeading>Field checks</DetailHeading>
            <BulletList items={properties.field_checks} />
          </>
        )}

        <ul aria-label="Planning limits" className="my-3 flex flex-wrap gap-[5px]">
          {chips.map((chip) => (
            <li key={chip} className="rounded-[3px] bg-[#ebeee7] px-[7px] py-[5px] text-[9px] text-[#55665c]">
              {chip}
            </li>
          ))}
        </ul>

        <p data-testid="route-status" className="my-[15px] text-[10px] leading-[1.6] text-[#636f57]">
          <span className="font-semibold">Route status:</span> {properties.route_status}
          <br />
          The location is model-derived. Elk activity here hasn’t been confirmed.
        </p>

        <div className="mt-[18px] border-t border-line pt-4">
          <DetailHeading>Field log</DetailHeading>
          <label htmlFor="detail-field-status" className="mb-1.5 block text-[10px] text-[#636f57]">
            Field status
          </label>
          <select
            id="detail-field-status"
            value={logEntry?.status ?? 'to_scout'}
            onChange={(event) => onLogChange({ status: event.target.value as FieldStatus })}
            className="w-full rounded-[4px] border border-[#d3ddc8] bg-white px-2.5 py-2 text-[11px] text-ink"
          >
            {FIELD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {FIELD_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <label htmlFor="detail-notes" className="mt-3 mb-1.5 block text-[10px] text-[#636f57]">
            Notes
          </label>
          <textarea
            id="detail-notes"
            rows={3}
            value={logEntry?.notes ?? ''}
            onChange={(event) => onLogChange({ notes: event.target.value })}
            placeholder="Water flowing? Tracks? Trail access? Wind or recovery notes…"
            className="min-h-[65px] w-full resize-y rounded-[4px] border border-[#dce3d1] bg-[#fbfcf7] p-[9px] text-[11px] leading-normal text-ink"
          />
          <p data-testid="field-log-saved" className={`mt-1.5 text-[9px] ${saving ? 'text-[#636f57]' : 'font-semibold text-alert-text'}`}>
            {!saving
              ? 'Not saved in this browser. See the notice on the map.'
              : logEntry
                ? `Saved in this browser at ${formatTime(logEntry.updated)}. Export the log to keep a copy.`
                : 'Saved in this browser only. Export the log to keep a copy.'}
          </p>
        </div>
      </div>
    </section>
  )
}

/** "26 Oct 2026, 20:41", in the viewer's time zone. */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function DetailHeading({ children }: { children: string }) {
  return <h3 className="mb-3 text-[10px] font-bold tracking-[.06em] text-[#636f57] uppercase">{children}</h3>
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mb-[19px]">
      {items.map((item) => (
        <li
          key={item}
          className="relative mb-[7px] pl-[13px] text-[11px] leading-[1.6] text-[#5a6f50] before:absolute before:top-[7px] before:left-0 before:size-1 before:rounded-full before:bg-[#a8b397] before:content-['']"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}
