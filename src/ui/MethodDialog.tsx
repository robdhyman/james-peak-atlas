import { type ReactNode, useMemo, useRef } from 'react'
import type { Atlas } from '../atlas/data.ts'
import { methodContent } from './methodContent.ts'
import { useModal } from './modal.ts'

/**
 * The Method and sources dialog, generated from the bundled method
 * specification and the manifest's sources. Render it to open it; it closes
 * by calling `onClose`, and on unmount returns focus to whatever opened it.
 */
export function MethodDialog({ atlas, onClose }: { atlas: Atlas; onClose(): void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const content = useMemo(() => methodContent(atlas), [atlas])

  const trapFocus = useModal(ref)

  const { components } = content

  return (
    <dialog
      ref={ref}
      aria-labelledby="method-title"
      // Escape: the parent unmounts the dialog rather than the browser closing it.
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={trapFocus}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="m-auto max-h-[85vh] w-[calc(100%-32px)] max-w-[680px] overflow-hidden rounded-[10px] border border-line-strong bg-sheet p-0 text-ink shadow-[0_20px_70px_#14321e40] backdrop:bg-[#0d291a70] backdrop:backdrop-blur-[2px] open:flex open:flex-col"
    >
      <div className="flex flex-none items-center justify-between gap-4 border-b border-line px-7 pt-6 pb-5 max-tablet:px-5">
        <div>
          <div className="text-[10px] font-bold tracking-[.11em] text-muted">READ THE EVIDENCE</div>
          <h2 id="method-title" className="mt-1 font-display text-[28px] leading-[1.15] font-normal tracking-[-.025em] max-tablet:text-[24px]">
            Method and sources
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close method and sources"
          className="grid size-[34px] flex-none place-items-center rounded-full bg-paper text-[22px] leading-none text-ink-soft"
        >
          ×
        </button>
      </div>

      <div className="min-h-0 overflow-y-auto px-7 pt-5 pb-7 text-[12px] leading-[1.7] text-ink-soft max-tablet:px-5">
        <Section title={`The ${content.planningYear} scenario`} id="scenario">
          <div className="border-l-[3px] border-amber-dot bg-alert px-[15px] py-3 text-alert-text">
            <p>{content.scenario}</p>
            <p className="mt-1.5">{content.occupancy}</p>
          </div>
          <p className="mt-3" data-testid="heuristic-statement">
            <strong className="text-ink">The weights and admission thresholds are unvalidated planning heuristics.</strong>{' '}
            The scouting index ranks candidates against each other from 0 to 100. It is not a probability.
          </p>
        </Section>

        <Section title="Weights" id="weights">
          <ul className="grid grid-cols-4 gap-2 max-tablet:grid-cols-2">
            {components.map(({ key, label, percent }) => (
              <li key={key} className="rounded-[5px] bg-paper px-2 py-3 text-center text-[10px]">
                <strong className="block font-display text-[24px] leading-tight font-normal text-ink">{percent}%</strong>
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-3">
            Scouting index = <code className="font-mono text-[11px] text-ink">{content.indexFormula}</code>
          </p>
        </Section>

        <Section title="Component formulas" id="formulas">
          <dl className="space-y-4">
            {components.map(({ key, label, meaning, formula, description }) => (
              <div key={key}>
                <dt className="font-bold text-ink">
                  {label} <span className="font-normal text-muted">· {meaning}</span>
                </dt>
                <dd>
                  <code className="mt-1 block rounded-[4px] bg-paper px-2.5 py-1.5 font-mono text-[11px] leading-[1.6] text-ink [overflow-wrap:anywhere]">
                    {formula}
                  </code>
                  <p className="mt-1.5">{description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Admission thresholds" id="thresholds">
          <p>A place is a candidate only if it passes every one of these.</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-[18px]">
            {content.thresholds.map(({ key, text }) => (
              <li key={key}>{text}</li>
            ))}
          </ul>
        </Section>

        <Section title="Two pools" id="pools">
          <dl className="space-y-2">
            <div>
              <dt className="font-bold text-ink">Nearby</dt>
              <dd>{content.pools.nearby}</dd>
            </div>
            <div>
              <dt className="font-bold text-ink">Wilderness context</dt>
              <dd>{content.pools.context}</dd>
            </div>
          </dl>
          <p className="mt-2">{content.pools.budget}</p>
        </Section>

        <Section title="Known limitations" id="limitations">
          <ul className="list-disc space-y-1.5 pl-[18px]">
            {content.limitations.map((text) => (
              <li key={text}>{text}</li>
            ))}
            {content.vintages.map(({ label, text }) => (
              <li key={label}>
                <span className="font-bold text-ink">{label} data:</span> {text}
              </li>
            ))}
          </ul>
          <h4 className="mt-3 font-bold text-ink">Only the field can confirm</h4>
          <ul className="mt-1 list-disc space-y-0.5 pl-[18px]">
            {content.fieldChecks.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </Section>

        <Section title="Sources" id="sources">
          <ul className="space-y-3">
            {content.sources.map(({ name, url, vintage, note }) => (
              <li key={url} className="border-t border-line pt-2.5">
                <a href={url} target="_blank" rel="noopener noreferrer" className="font-bold text-ink-soft underline [overflow-wrap:anywhere]">
                  {name}
                  <span aria-hidden="true"> ↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                <small className="block text-[11px] leading-[1.6] text-muted">
                  {vintage} · {note}
                </small>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </dialog>
  )
}

function Section({ title, id, children }: { title: string; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`method-${id}`} className="mt-5 first:mt-0">
      <h3 id={`method-${id}`} className="mb-2 text-[13px] font-bold text-ink">
        {title}
      </h3>
      {children}
    </section>
  )
}
