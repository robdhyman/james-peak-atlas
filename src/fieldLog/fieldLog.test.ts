import { describe, expect, test } from 'vitest'
import {
  BACKUP_KEY,
  encodeFieldLog,
  type FieldLog,
  fieldStatusOf,
  openFieldLog,
  parseImport,
  readStored,
  saveFieldLog,
  STORAGE_KEY,
  updateEntry,
} from './fieldLog.ts'

const T1 = '2026-10-20T15:04:05.000Z'
const T2 = '2026-10-21T09:30:00.000Z'
const KNOWN = new Set(['EP-01', 'EP-04', 'JP-07'])

const LOG: FieldLog = {
  'EP-04': { status: 'scouted', notes: 'Wallow & seep, "fresh" <tracks>', updated: T1 },
  'JP-07': { status: 'ruled_out', updated: T2 },
}

/** A Storage double. `failWrites` makes setItem throw as a full or private-mode store does. */
function memoryStorage(initial: Record<string, string> = {}, { failReads = false, failWrites = false } = {}): Storage {
  const items = new Map(Object.entries(initial))
  return {
    get length() {
      return items.size
    },
    key: (index) => [...items.keys()][index] ?? null,
    getItem(key) {
      if (failReads) throw new DOMException('The operation is insecure.', 'SecurityError')
      return items.get(key) ?? null
    },
    setItem(key, value) {
      if (failWrites) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      items.set(key, value)
    },
    removeItem: (key) => void items.delete(key),
    clear: () => items.clear(),
  }
}

describe('reading the stored value', () => {
  test('nothing stored is an empty log', () => {
    expect(readStored(null)).toEqual({ kind: 'empty' })
    expect(readStored('')).toEqual({ kind: 'empty' })
  })

  test('a stored log reads back exactly', () => {
    expect(readStored(encodeFieldLog(LOG))).toEqual({ kind: 'valid', log: LOG })
  })

  test('a log with no entries is valid, not empty', () => {
    expect(readStored('{"version":1,"entries":{}}')).toEqual({ kind: 'valid', log: {} })
  })

  // Guards against a format change destroying notes: each of these must come back as invalid with the raw value kept.
  test.each([
    ['malformed JSON', '{"version":1,"entries":', 'it isn’t valid JSON'],
    ['not a field log', '[1,2,3]', 'it isn’t a field log'],
    ['the original site’s shape', '{"EP-04":{"status":"todo"}}', 'it isn’t a field log'],
    ['a changed schema version', '{"version":2,"entries":{}}', 'it was saved as field log version 2, and this atlas reads version 1'],
    ['an invalid field status', '{"version":1,"entries":{"EP-04":{"status":"done","updated":"2026-10-20T15:04:05.000Z"}}}', 'EP-04 has an invalid field status “done”'],
    ['notes that aren’t text', '{"version":1,"entries":{"EP-04":{"notes":42,"updated":"2026-10-20T15:04:05.000Z"}}}', 'EP-04 has notes that aren’t text'],
    ['a missing update time', '{"version":1,"entries":{"EP-04":{"status":"scouted"}}}', 'EP-04 has no valid update time'],
  ])('%s is invalid, with the raw value kept', (_, raw, reason) => {
    expect(readStored(raw)).toEqual({ kind: 'invalid', raw, reason })
  })

  test('a stored entry for a candidate this atlas doesn’t have is kept, not dropped', () => {
    const raw = '{"version":1,"entries":{"EP-99":{"status":"scouted","updated":"2026-10-20T15:04:05.000Z"}}}'
    expect(readStored(raw)).toEqual({ kind: 'valid', log: { 'EP-99': { status: 'scouted', updated: T1 } } })
  })
})

describe('opening the log from storage', () => {
  test('uses the jpa.fieldlog.v1 key', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: encodeFieldLog(LOG) })
    expect(openFieldLog(storage)).toEqual({ log: LOG, notice: null, canSave: true })
  })

  test('ignores the original site’s key: there’s no migration', () => {
    const storage = memoryStorage({ 'jpw-scouting-log-2027-v1': '{"EP-04":{"status":"scouted"}}' })
    expect(openFieldLog(storage)).toEqual({ log: {}, notice: null, canSave: true })
  })

  test('an invalid value is written to the backup key, left in place, and reported', () => {
    const raw = '{"version":2,"entries":{}}'
    const storage = memoryStorage({ [STORAGE_KEY]: raw })
    const opened = openFieldLog(storage)
    expect(opened.log).toEqual({})
    expect(opened.canSave).toBe(true)
    expect(opened.notice).toEqual({
      kind: 'backed-up',
      reason: 'it was saved as field log version 2, and this atlas reads version 1',
      backupKey: BACKUP_KEY,
    })
    expect(storage.getItem(BACKUP_KEY)).toBe(raw)
    expect(storage.getItem(STORAGE_KEY)).toBe(raw)
  })

  test('opening twice doesn’t back the same value up twice', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: 'not json' })
    openFieldLog(storage)
    openFieldLog(storage)
    expect(storage.length).toBe(2)
  })

  test('an older, different backup is never overwritten', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: 'second', [BACKUP_KEY]: 'first' })
    const opened = openFieldLog(storage)
    expect(opened.notice).toMatchObject({ kind: 'backed-up', backupKey: `${BACKUP_KEY}.2` })
    expect(storage.getItem(BACKUP_KEY)).toBe('first')
    expect(storage.getItem(`${BACKUP_KEY}.2`)).toBe('second')
  })

  test('if the backup can’t be written, saving is switched off so the old value survives', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: 'not json' }, { failWrites: true })
    expect(openFieldLog(storage)).toEqual({
      log: {},
      notice: { kind: 'unprotected', reason: 'it isn’t valid JSON' },
      canSave: false,
    })
  })

  test('storage that can’t be read, or isn’t there, switches saving off', () => {
    expect(openFieldLog(memoryStorage({}, { failReads: true }))).toEqual({ log: {}, notice: { kind: 'unavailable' }, canSave: false })
    expect(openFieldLog(null)).toEqual({ log: {}, notice: { kind: 'unavailable' }, canSave: false })
  })
})

describe('saving', () => {
  test('a saved log opens again unchanged', () => {
    const storage = memoryStorage()
    expect(saveFieldLog(storage, LOG)).toEqual({ ok: true })
    expect(openFieldLog(storage).log).toEqual(LOG)
  })

  test('a failed write is reported with its reason, never as saved', () => {
    expect(saveFieldLog(memoryStorage({}, { failWrites: true }), LOG)).toEqual({ ok: false, reason: 'The quota has been exceeded.' })
  })
})

describe('editing', () => {
  test('a candidate without an entry is To scout', () => {
    expect(fieldStatusOf(LOG, 'EP-01')).toBe('to_scout')
    expect(fieldStatusOf(LOG, 'JP-07')).toBe('ruled_out')
  })

  test('each change records the ISO update time and keeps the other field', () => {
    const withNotes = updateEntry(LOG, 'JP-07', { notes: 'Too steep' }, T1)
    expect(withNotes['JP-07']).toEqual({ status: 'ruled_out', notes: 'Too steep', updated: T1 })
    const withStatus = updateEntry(withNotes, 'EP-01', { status: 'camera_placed' }, T2)
    expect(withStatus['EP-01']).toEqual({ status: 'camera_placed', updated: T2 })
    expect(withStatus['EP-04']).toBe(LOG['EP-04'])
  })

  test('clearing the notes of an entry without a field status removes the entry', () => {
    const log = updateEntry({}, 'EP-01', { notes: 'Check the seep' }, T1)
    expect(updateEntry(log, 'EP-01', { notes: '' }, T2)).toEqual({})
  })
})

describe('importing', () => {
  test('an exported log imports exactly', () => {
    const exported = encodeFieldLog(LOG, { exported: T2 })
    expect(JSON.parse(exported)).toMatchObject({ version: 1, exported: T2 })
    expect(parseImport(exported, KNOWN)).toEqual({ ok: true, log: LOG })
  })

  // Guards against a partial import: any problem rejects the whole file, and every problem is reported.
  test.each([
    ['malformed JSON', '{"version":1,', ['The file isn’t valid JSON.']],
    ['not a field log', '{"hello":"world"}', ['The file isn’t a field log export.']],
    ['a changed schema version', '{"version":2,"entries":{}}', ['The file is field log version 2, and this atlas reads version 1.']],
    [
      'unknown IDs and invalid values, all reported',
      JSON.stringify({
        version: 1,
        entries: {
          'EP-99': { status: 'scouted', updated: T1 },
          'EP-04': { status: 'todo', updated: T1 },
          'EP-01': { notes: ['x'], updated: 'yesterday' },
          'JP-07': { status: 'scouted', updated: T1 },
        },
      }),
      [
        'EP-99 isn’t a candidate in this atlas.',
        'EP-04 has an invalid field status “todo”.',
        'EP-01 has notes that aren’t text.',
        'EP-01 has no valid update time.',
      ],
    ],
  ])('%s is rejected', (_, text, problems) => {
    expect(parseImport(text, KNOWN)).toEqual({ ok: false, problems })
  })
})
