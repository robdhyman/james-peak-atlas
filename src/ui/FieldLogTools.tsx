import { type ChangeEvent, useRef, useState } from 'react'
import { encodeFieldLog, type FieldLog, parseImport } from '../fieldLog/fieldLog.ts'
import { ConfirmDialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from './ConfirmDialog.tsx'
import { downloadText } from './download.ts'

type Dialog = { kind: 'reset' } | { kind: 'import'; log: FieldLog; filename: string }
type Report = { ok: true; text: string } | { ok: false; filename: string; problems: readonly string[] }

const TOOL = 'text-[10px] text-[#5f6d55] underline underline-offset-[3px] disabled:no-underline disabled:opacity-50'

function entries(count: number): string {
  return count === 1 ? '1 entry' : `${count} entries`
}

/**
 * Export, import and reset for the field log. Import is all or nothing: a
 * file with any problem is reported and nothing is applied. Replacing or
 * clearing entries asks first, and offers an export.
 */
export function FieldLogTools({ log, candidateIds, onReplace }: { log: FieldLog; candidateIds: ReadonlySet<string>; onReplace(log: FieldLog): void }) {
  const count = Object.keys(log).length
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [exported, setExported] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  function exportLog() {
    const now = new Date().toISOString()
    downloadText(`james-peak-field-log-${now.slice(0, 10)}.json`, encodeFieldLog(log, { exported: now }), 'application/json')
    setExported(true)
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Cleared, so choosing the same file again still fires a change.
    event.target.value = ''
    if (!file) return
    const result = parseImport(await file.text(), candidateIds)
    if (!result.ok) setReport({ ok: false, filename: file.name, problems: result.problems })
    else if (count === 0) apply(result.log, file.name)
    else open({ kind: 'import', log: result.log, filename: file.name })
  }

  function apply(next: FieldLog, filename: string) {
    onReplace(next)
    setReport({ ok: true, text: `Imported ${entries(Object.keys(next).length)} from ${filename}.` })
    setDialog(null)
  }

  function open(next: Dialog) {
    setExported(false)
    setReport(null)
    setDialog(next)
  }

  const exportFirst = (
    <button type="button" onClick={exportLog} className={`${SECONDARY_BUTTON} mr-auto`}>
      Export first
    </button>
  )
  const cancel = (
    <button type="button" data-autofocus onClick={() => setDialog(null)} className={SECONDARY_BUTTON}>
      Cancel
    </button>
  )

  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[10px] text-ink-soft">
          Field log · <span data-testid="field-log-count">{entries(count)}</span>
        </span>
        <button type="button" onClick={exportLog} disabled={count === 0} className={TOOL}>
          Export log
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} className={TOOL}>
          Import log
        </button>
        <button type="button" onClick={() => open({ kind: 'reset' })} disabled={count === 0} className={TOOL}>
          Reset log
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          aria-label="Field log file to import"
          onChange={chooseFile}
          className="hidden"
        />
      </div>

      {report?.ok === true && (
        <p role="status" className="mt-2 text-[10px] text-ink-soft">
          {report.text}
        </p>
      )}
      {report?.ok === false && (
        <div role="alert" className="mt-2 rounded-[5px] border border-alert-line bg-alert px-3 py-2 text-[10px] leading-[1.55] text-alert-text">
          <p className="font-semibold">Nothing was imported from {report.filename}:</p>
          <ul className="mt-1 list-disc pl-4">
            {report.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}

      {dialog?.kind === 'reset' && (
        <ConfirmDialog
          title="Reset the field log?"
          onClose={() => setDialog(null)}
          actions={
            <>
              {exportFirst}
              {cancel}
              <button
                type="button"
                onClick={() => {
                  onReplace({})
                  setDialog(null)
                }}
                className={PRIMARY_BUTTON}
              >
                Clear {entries(count)}
              </button>
            </>
          }
        >
          <p>
            This clears {entries(count)} from this browser: every field status and note. It can’t be undone, so export the log first if you
            might want it back.
          </p>
          {exported && <p className="mt-2 font-semibold">Exported. Check your downloads before clearing.</p>}
        </ConfirmDialog>
      )}
      {dialog?.kind === 'import' && (
        <ConfirmDialog
          title="Replace the field log?"
          onClose={() => setDialog(null)}
          actions={
            <>
              {exportFirst}
              {cancel}
              <button type="button" onClick={() => apply(dialog.log, dialog.filename)} className={PRIMARY_BUTTON}>
                Replace with {entries(Object.keys(dialog.log).length)}
              </button>
            </>
          }
        >
          <p>
            {dialog.filename} holds {entries(Object.keys(dialog.log).length)}. Importing it replaces the {entries(count)} in this browser. Export
            the log first if you might want them back.
          </p>
          {exported && <p className="mt-2 font-semibold">Exported. Check your downloads before replacing.</p>}
        </ConfirmDialog>
      )}
    </div>
  )
}
