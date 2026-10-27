import type { Candidate, Pool } from '../atlas/schemas.ts'

export const POOL_LABELS: Record<Pool, string> = {
  nearby: 'Nearby',
  wilderness_context: 'Wilderness context',
}

/** "72 / 100": a relative index, never a percentage or a probability. */
export function formatScoutingIndex(score: number): string {
  return `${Math.round(score)} / 100`
}

/** The basic detail card for a selected candidate. */
export function CandidateCard({ candidate, onClose }: { candidate: Candidate; onClose(): void }) {
  const { id, name, pool, score } = candidate.properties
  return (
    <section
      aria-labelledby="candidate-card-title"
      className="absolute top-[77px] right-[23px] z-[650] w-[330px] overflow-auto rounded-[9px] border border-line-strong bg-sheet shadow-panel max-desktop:right-[15px] max-desktop:w-[305px] max-tablet:inset-x-0 max-tablet:top-auto max-tablet:bottom-0 max-tablet:w-auto max-tablet:rounded-b-none wide:w-[350px]"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close candidate detail"
        className="absolute top-[9px] right-[11px] grid size-7 place-items-center rounded-full bg-paper text-[20px] leading-none text-ink-soft"
      >
        ×
      </button>
      <div className="bg-gradient-to-br from-amber-pale/60 to-sheet px-[22px] pt-[23px] pb-[19px] pr-[42px]">
        <div className="text-[9px] font-bold tracking-[.12em] text-amber">SCOUTING CANDIDATE · {id}</div>
        <h2 id="candidate-card-title" className="mt-2 mb-3 font-display text-[27px] leading-[1.15] font-normal tracking-[-.03em] max-tablet:text-[24px]">
          {name}
        </h2>
        <dl className="mt-[18px] flex items-end gap-6">
          <div>
            <dt className="text-[10px] text-muted">Scouting index</dt>
            <dd data-testid="scouting-index" className="font-display text-[34px] leading-none text-amber">
              {formatScoutingIndex(score)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted">Pool</dt>
            <dd data-testid="pool" className="mt-1 rounded-[3px] border border-line-strong bg-paper px-[6px] py-[3px] text-[11px]">
              {POOL_LABELS[pool]}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
