import type { DataError } from '../atlas/data.ts'

/** Shown instead of the atlas when its essential data can't load or validate. */
export function FatalError({ error }: { error: DataError }) {
  return (
    <div role="alert" className="flex h-full items-center justify-center bg-ink px-4 py-10 text-topbar-text">
      <div className="w-full max-w-[560px] rounded-[10px] bg-sheet p-7 text-ink shadow-panel max-tablet:p-5">
        <div className="text-[10px] font-bold tracking-[.11em] text-muted">JAMES PEAK SCOUTING ATLAS</div>
        <h1 className="mt-2 font-display text-[28px] leading-[1.15] font-normal tracking-[-.025em]">
          The atlas data couldn’t be loaded
        </h1>
        <p className="mt-3 text-[13px] text-ink-soft">
          Nothing is shown in its place: the atlas never substitutes invented locations.
        </p>
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-[5px] border border-line bg-paper p-4 text-[12px]">
          <dt className="font-bold text-muted">File</dt>
          <dd>
            <code data-testid="fatal-file">{error.file}</code>
          </dd>
          {error.record && (
            <>
              <dt className="font-bold text-muted">Record</dt>
              <dd>{error.record}</dd>
            </>
          )}
          <dt className="font-bold text-muted">Problem</dt>
          <dd className="[overflow-wrap:anywhere]">{error.problem}</dd>
        </dl>
        <p className="mt-4 text-[11px] text-muted">
          Reload the page. If this keeps happening, the deployed data bundle is incomplete or invalid.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-[5px] border border-ink bg-ink px-[13px] py-2.5 text-[12px] text-topbar-text"
        >
          Reload
        </button>
      </div>
    </div>
  )
}
