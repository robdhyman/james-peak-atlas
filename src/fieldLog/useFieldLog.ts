import { useEffect, useState } from 'react'
import { type FieldLog, type FieldLogNotice, type FieldStatus, openFieldLog, readStored, saveFieldLog, STORAGE_KEY, updateEntry } from './fieldLog.ts'

export interface FieldLogState {
  readonly log: FieldLog
  /** What opening the stored log found, for the owner to be told. */
  readonly notice: FieldLogNotice | null
  /** False when nothing will be saved: storage is unusable, or saving could overwrite an unread log. */
  readonly canSave: boolean
  /** Why the latest save failed; cleared by the next save that succeeds. */
  readonly saveError: string | null
  update(id: string, change: { status?: FieldStatus; notes?: string }): void
  /** Replaces the whole log, for an import or a reset. */
  replace(log: FieldLog): void
}

/**
 * The field log, persisted through an injected Storage. Every change is
 * saved at once. A failed save stays reported until a later save succeeds,
 * so the UI never shows unsaved work as saved.
 */
export function useFieldLog(storage: Storage | null): FieldLogState {
  const [opened] = useState(() => openFieldLog(storage))
  const [log, setLog] = useState(opened.log)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Another tab's save becomes this tab's log, so neither overwrites the
  // other's changes. An unreadable value is left for that tab to report.
  useEffect(() => {
    if (!storage || !opened.canSave) return
    function adopt(event: StorageEvent) {
      if (event.storageArea !== storage || event.key !== STORAGE_KEY) return
      const read = readStored(event.newValue)
      if (read.kind !== 'invalid') setLog(read.kind === 'valid' ? read.log : {})
    }
    window.addEventListener('storage', adopt)
    return () => window.removeEventListener('storage', adopt)
  }, [storage, opened.canSave])

  function replace(next: FieldLog) {
    setLog(next)
    if (!storage || !opened.canSave) return
    const result = saveFieldLog(storage, next)
    setSaveError(result.ok ? null : result.reason)
  }

  return {
    log,
    notice: opened.notice,
    canSave: opened.canSave,
    saveError,
    update: (id, change) => replace(updateEntry(log, id, change, new Date().toISOString())),
    replace,
  }
}
