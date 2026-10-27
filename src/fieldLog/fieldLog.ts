// The field log: the atlas owner's field status and notes for each
// candidate. A pure codec for what's stored and what's imported, and the
// storage side, so nothing is lost without the owner being told.
import { z } from 'zod'

export const STORAGE_KEY = 'jpa.fieldlog.v1'
/** Where an unreadable stored log is copied before anything can overwrite it. */
export const BACKUP_KEY = `${STORAGE_KEY}.backup`
const VERSION = 1

export const FIELD_STATUSES = ['to_scout', 'scouted', 'camera_placed', 'ruled_out'] as const
export type FieldStatus = (typeof FIELD_STATUSES)[number]

export const FIELD_STATUS_LABELS: Record<FieldStatus, string> = {
  to_scout: 'To scout',
  scouted: 'Scouted',
  camera_placed: 'Camera placed',
  ruled_out: 'Ruled out',
}

export interface FieldLogEntry {
  readonly status?: FieldStatus
  readonly notes?: string
  /** ISO 8601, set on every change. */
  readonly updated: string
}

/** Entries keyed by candidate ID. */
export type FieldLog = Readonly<Record<string, FieldLogEntry>>

export type StoredRead = { kind: 'empty' } | { kind: 'valid'; log: FieldLog } | { kind: 'invalid'; raw: string; reason: string }

/** What the owner must be told after opening the log. */
export type FieldLogNotice =
  /** The stored log couldn't be read; it's kept under `backupKey` and a new log started. */
  | { kind: 'backed-up'; reason: string; backupKey: string }
  /** The stored log couldn't be read or backed up, so saving is off to keep it. */
  | { kind: 'unprotected'; reason: string }
  /** This browser's storage can't be read at all. */
  | { kind: 'unavailable' }

export interface OpenedFieldLog {
  readonly log: FieldLog
  readonly notice: FieldLogNotice | null
  /** False when saving could overwrite a log that wasn't read. */
  readonly canSave: boolean
}

export type ImportResult = { ok: true; log: FieldLog } | { ok: false; problems: readonly string[] }

const isoTime = z.iso.datetime()

/** A candidate without an entry, or an entry without a field status, is To scout. */
export function fieldStatusOf(log: FieldLog, id: string): FieldStatus {
  return log[id]?.status ?? 'to_scout'
}

/** Applies one change, stamped `now`. An entry left with no field status and no notes is removed. */
export function updateEntry(log: FieldLog, id: string, change: { status?: FieldStatus; notes?: string }, now: string): FieldLog {
  const { [id]: current, ...rest } = log
  const status = 'status' in change ? change.status : current?.status
  const notes = ('notes' in change ? change.notes : current?.notes) || undefined
  if (!status && !notes) return rest
  return { ...log, [id]: { ...(status && { status }), ...(notes && { notes }), updated: now } }
}

/** The stored and exported document. An export also records when it was made. */
export function encodeFieldLog(log: FieldLog, { exported }: { exported?: string } = {}): string {
  return exported ? JSON.stringify({ version: VERSION, exported, entries: log }, null, 2) : JSON.stringify({ version: VERSION, entries: log })
}

/**
 * Reads the stored value. Anything it can't read in full is invalid, with the
 * raw value kept for a backup. Entries for candidates this atlas doesn't
 * have are kept: a stored log is never trimmed.
 */
export function readStored(raw: string | null): StoredRead {
  if (!raw) return { kind: 'empty' }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { kind: 'invalid', raw, reason: 'it isn’t valid JSON' }
  }
  const document = documentOf(data)
  if (document.kind === 'not-a-log') return { kind: 'invalid', raw, reason: 'it isn’t a field log' }
  if (document.kind === 'other-version') {
    return { kind: 'invalid', raw, reason: `it was saved as field log version ${document.version}, and this atlas reads version ${VERSION}` }
  }
  const [problem] = Object.entries(document.entries).flatMap(([id, value]) => entryProblems(id, value))
  if (problem) return { kind: 'invalid', raw, reason: problem }
  return { kind: 'valid', log: document.entries as FieldLog }
}

/**
 * Validates an import against the atlas's candidate IDs. It's all or
 * nothing: any problem rejects the file, and every problem is reported.
 */
export function parseImport(text: string, candidateIds: ReadonlySet<string>): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, problems: ['The file isn’t valid JSON.'] }
  }
  const document = documentOf(data)
  if (document.kind === 'not-a-log') return { ok: false, problems: ['The file isn’t a field log export.'] }
  if (document.kind === 'other-version') {
    return { ok: false, problems: [`The file is field log version ${document.version}, and this atlas reads version ${VERSION}.`] }
  }
  const problems = Object.entries(document.entries)
    .flatMap(([id, value]) => (candidateIds.has(id) ? entryProblems(id, value) : [`${id} isn’t a candidate in this atlas`]))
    .map((problem) => `${problem}.`)
  return problems.length ? { ok: false, problems } : { ok: true, log: document.entries as FieldLog }
}

/** Opens the stored log. An unreadable value is backed up and left in place, never deleted. */
export function openFieldLog(storage: Storage | null): OpenedFieldLog {
  const unavailable: OpenedFieldLog = { log: {}, notice: { kind: 'unavailable' }, canSave: false }
  if (!storage) return unavailable
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return unavailable
  }
  const read = readStored(raw)
  if (read.kind === 'empty') return { log: {}, notice: null, canSave: true }
  if (read.kind === 'valid') return { log: read.log, notice: null, canSave: true }
  try {
    return { log: {}, notice: { kind: 'backed-up', reason: read.reason, backupKey: backUp(storage, read.raw) }, canSave: true }
  } catch {
    return { log: {}, notice: { kind: 'unprotected', reason: read.reason }, canSave: false }
  }
}

/** Writes the log. A failure (a full store, private mode) comes back with its reason; it's never reported as saved. */
export function saveFieldLog(storage: Storage, log: FieldLog): { ok: true } | { ok: false; reason: string } {
  try {
    storage.setItem(STORAGE_KEY, encodeFieldLog(log))
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Copies `raw` to the first backup key that's free or already holds it, so
 * an older backup is never overwritten and the same value isn't copied twice.
 */
function backUp(storage: Storage, raw: string): string {
  for (let n = 1; ; n++) {
    const key = n === 1 ? BACKUP_KEY : `${BACKUP_KEY}.${n}`
    const existing = storage.getItem(key)
    if (existing === raw) return key
    if (existing === null) {
      storage.setItem(key, raw)
      return key
    }
  }
}

type Document =
  | { kind: 'log'; entries: Readonly<Record<string, unknown>> }
  | { kind: 'other-version'; version: number }
  | { kind: 'not-a-log' }

function documentOf(data: unknown): Document {
  if (!isRecord(data) || typeof data.version !== 'number') return { kind: 'not-a-log' }
  if (data.version !== VERSION) return { kind: 'other-version', version: data.version }
  return isRecord(data.entries) ? { kind: 'log', entries: data.entries } : { kind: 'not-a-log' }
}

/** What's wrong with one entry, as sentence fragments; empty when it's valid. */
function entryProblems(id: string, value: unknown): string[] {
  if (!isRecord(value)) return [`${id} isn’t a field log entry`]
  const problems: string[] = []
  if (value.status !== undefined && !(FIELD_STATUSES as readonly unknown[]).includes(value.status)) {
    problems.push(`${id} has an invalid field status “${String(value.status)}”`)
  }
  if (value.notes !== undefined && typeof value.notes !== 'string') problems.push(`${id} has notes that aren’t text`)
  if (!isoTime.safeParse(value.updated).success) problems.push(`${id} has no valid update time`)
  return problems
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
