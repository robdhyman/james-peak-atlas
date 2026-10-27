import { useState } from 'react'
import type { FieldLogState } from '../fieldLog/useFieldLog.ts'

/**
 * What the owner must know about the field log, in the map's notice column.
 * Every message about unsaved work lasts until it no longer applies; only
 * the report of a backed-up log can be dismissed, since nothing is at risk.
 */
export function FieldLogNotices({ fieldLog, className }: { fieldLog: FieldLogState; className: string }) {
  const [backupSeen, setBackupSeen] = useState(false)
  const { notice, saveError } = fieldLog

  return (
    <>
      {notice?.kind === 'backed-up' && !backupSeen && (
        <div role="status" aria-label="Field log notice" className={`${className} flex items-start gap-3`}>
          <p className="flex-1">
            Your saved field log couldn’t be read ({notice.reason}), so a new one was started. The old one is kept in this browser’s storage
            under “{notice.backupKey}”.
          </p>
          <button type="button" aria-label="Dismiss field log notice" onClick={() => setBackupSeen(true)} className="-my-0.5 px-1 text-[15px] leading-none">
            ×
          </button>
        </div>
      )}
      {notice?.kind === 'unprotected' && (
        <p role="alert" className={className}>
          Your saved field log couldn’t be read ({notice.reason}) or backed up, so changes won’t be saved, to keep the old one safe. Export
          the log to keep a copy of new changes.
        </p>
      )}
      {notice?.kind === 'unavailable' && (
        <p role="alert" className={className}>
          This browser’s storage can’t be used, so field log changes won’t be saved. Export the log to keep a copy.
        </p>
      )}
      {saveError && (
        <p role="alert" className={className}>
          The field log couldn’t be saved in this browser ({saveError}). Your latest changes will be lost on reload, so export the log to
          keep a copy.
        </p>
      )}
    </>
  )
}
