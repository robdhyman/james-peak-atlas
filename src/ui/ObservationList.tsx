import type { Observation } from '../atlas/schemas.ts'

/** The observation marker's green diamond, for the legend and the list. */
export function ObservationSwatch({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`size-[9px] flex-none rotate-45 border-[1.5px] border-sheet bg-observation shadow-[0_0_0_1px_var(--color-observation-ring)] ${className}`}
    />
  )
}

/**
 * The owner's observations, under the candidates but apart from them: they're
 * evidence, so they have no rank, score or field status. Only the private
 * build has any; with none, nothing renders.
 */
export function ObservationList({ observations }: { observations: readonly Observation[] }) {
  return (
    <section aria-labelledby="observations-heading" className="mt-6 border-t border-line pt-5">
      <h2 id="observations-heading" className="mb-1.5 text-[10px] font-bold tracking-[.11em] text-muted">
        OBSERVATIONS
      </h2>
      <p className="mb-3 text-[10px] leading-[1.55] text-muted">
        Field sightings you recorded first-hand. They’re evidence, not model output, and are never ranked with the
        candidates.
      </p>
      <ul aria-label="Observations">
        {observations.map(({ properties: { id, name, observed, note } }) => (
          <li key={id} className="mb-[9px] rounded-[6px] border border-[#cbd9cf] bg-[#f1f5f0] p-[13px]">
            <span className="flex items-center gap-[9px]">
              <ObservationSwatch className="mx-1" />
              <span className="text-[12px] leading-[1.3] font-bold">{name}</span>
            </span>
            <span className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1 text-[10px] text-[#5d6f62]">
              <span>{id}</span>
              {observed && <span>Observed {observed}</span>}
            </span>
            {note && <p className="mt-1.5 text-[11px] leading-[1.5] text-ink-soft">{note}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
