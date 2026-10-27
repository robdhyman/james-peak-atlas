import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import type { VisibleCandidate } from '../candidates/visibleList.ts'
import { EXPORT_FORMATS, type ExportFormat, EXPORTS } from '../export/exportCandidates.ts'
import type { FieldLog } from '../fieldLog/fieldLog.ts'
import { downloadText } from './download.ts'

function candidates(count: number): string {
  return count === 1 ? '1 candidate' : `${count} candidates`
}

/**
 * The header's export button and its menu of formats. It exports the
 * visible list exactly, with the field log, and says how many it holds:
 * "Export 4 shown". `visible` is null while the atlas loads.
 */
export function ExportMenu({ visible, log }: { visible: readonly VisibleCandidate[] | null; log: FieldLog }) {
  const [open, setOpen] = useState(false)
  const [report, setReport] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const count = visible?.length ?? 0

  // A click or focus anywhere else closes the menu.
  useEffect(() => {
    if (!open) return
    function closeOutside(event: Event) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('focusin', closeOutside)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('focusin', closeOutside)
    }
  }, [open])

  function closeOnEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !open) return
    setOpen(false)
    button.current?.focus()
  }

  function exportAs(format: ExportFormat) {
    if (!visible) return
    const { label, extension, type, serialise } = EXPORTS[format]
    downloadText(`james-peak-candidates-${new Date().toISOString().slice(0, 10)}.${extension}`, serialise(visible, log), type)
    setReport(`Exported ${candidates(count)} as ${label}.`)
    setOpen(false)
    button.current?.focus()
  }

  return (
    <div ref={root} onKeyDown={closeOnEscape} className="relative flex-none">
      <button
        ref={button}
        type="button"
        disabled={count === 0}
        aria-expanded={open}
        aria-controls="export-menu"
        onClick={() => {
          setReport('')
          setOpen(!open)
        }}
        className="flex items-center gap-[13px] rounded-[5px] border border-[#789085] bg-ink-raised px-[13px] py-2.5 text-[12px] text-[#f3f0df] disabled:opacity-50 max-tablet:gap-1.5 max-tablet:p-[9px]"
      >
        <span>
          <span className="max-tablet:sr-only">Export </span>
          <span data-testid="export-count">{count}</span>
          <span className="max-tablet:sr-only"> shown</span>
        </span>
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]">
          <path d="M10 3v9m-4-4 4 4 4-4M4 13v4h12v-4" />
        </svg>
      </button>
      <div
        id="export-menu"
        role="group"
        aria-label={`Export ${candidates(count)}`}
        hidden={!open}
        className="absolute top-[52px] right-0 min-w-[230px] overflow-hidden rounded-[7px] border border-line bg-sheet text-ink shadow-panel max-tablet:top-[46px]"
      >
        <p className="border-b border-line px-[15px] pt-3 pb-2.5 text-[10px] leading-[1.5] text-muted">
          The {candidates(count)} in the list now, with their field status and notes.
        </p>
        {EXPORT_FORMATS.map((format) => (
          <button
            key={format}
            type="button"
            onClick={() => exportAs(format)}
            className="block w-full px-[15px] py-3 text-left text-[12px] hover:bg-[#edf1e8] focus-visible:bg-[#edf1e8]"
          >
            {EXPORTS[format].label} · {EXPORTS[format].use}
          </button>
        ))}
      </div>
      <p role="status" className="sr-only">
        {report}
      </p>
    </div>
  )
}
