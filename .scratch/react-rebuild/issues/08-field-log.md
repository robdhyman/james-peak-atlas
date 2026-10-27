# 08: Field log

**What to build:** A field log that survives reloads: field status and notes for each candidate. It never loses data without saying so, and can be exported, imported and reset safely.

**Blocked by:** 06 (Candidate list and detail)

**Status:** ready-for-agent

- [x] The detail panel has a field status control (To scout, Scouted, Camera placed, Ruled out) and a notes field. Each change is saved with an ISO update time.
- [x] The list gains a field status filter, which works together with scope, sort and search.
- [x] A pure codec handles a stored value: a valid log, empty, or invalid. An invalid value is written to a backup key and the owner sees a warning. It's never deleted.
- [x] The storage key is `jpa.fieldlog.v1`. There's no migration from the original site's key.
- [x] A failed write (quota or private mode) shows a visible, lasting message. The UI never pretends a save worked.
- [x] JSON export of the field log, and JSON import that is all-or-nothing. Unknown candidate IDs, invalid statuses and malformed JSON are reported and nothing is applied.
- [x] Reset log opens a confirmation dialog that says how many entries will be cleared and offers to export first.
- [x] Vitest tests the codec: valid, empty and corrupt reads, the backup, every import rejection case, and a changed schema version.
- [x] Playwright: set a field status and a note, reload, and both are kept. With storage forced to throw, the failure message appears. Reset can be cancelled, and confirming it clears the log. Importing an exported log in a clean context restores it.

## Comments

**Built and verified locally.** The full CI sequence passes: data check, type check, 125 Vitest tests (40 new), build, and 60 Playwright tests (10 new). The whole browser suite also passed five times over with `--repeat-each=5`. One earlier full run reported a single failure I couldn't identify and that never came back in 531 runs since; worth watching in CI.

- **The codec** (`src/fieldLog/fieldLog.ts`). The stored and exported document is `{ "version": 1, "entries": { "EP-04": { "status": "scouted", "notes": "…", "updated": "<ISO>" } } }`; an export adds `exported`. Field statuses are `to_scout`, `scouted`, `camera_placed` and `ruled_out`, labelled as in the glossary. `readStored` gives empty, valid, or invalid with the raw value and a reason (malformed JSON, not a field log, another version, a bad status, notes that aren't text, a missing update time). A stored entry for an unknown candidate is kept, never trimmed. `parseImport` checks the same things plus unknown candidate IDs, reports every problem, and applies nothing if there are any. `updateEntry` stamps each change; an entry left with no field status and no notes is removed. A candidate without an entry is To scout, as in the reference.
- **Storage** (`openFieldLog`, `saveFieldLog`, through an injected `Storage`). Only `jpa.fieldlog.v1` is read; there's no migration. An unreadable value is copied to `jpa.fieldlog.v1.backup` (or `.backup.2` and on, so an older backup is never overwritten, and the same value isn't copied twice) and left in place until the next save. If the backup can't be written, or storage can't be read at all, saving is switched off so an unread log can't be overwritten. `main.tsx` passes `window.localStorage`, or `null` when reaching it throws.
- **The hook** (`useFieldLog`) saves every change at once. A failed write stays reported until a later save succeeds. It also listens for the `storage` event, so a save in another tab becomes this tab's log and two open tabs don't overwrite each other. A browser test proves the overwrite happens without it.
- **Messages.** In the map's notice column: a dismissible report of a backed-up log, and lasting alerts when saving is off or a save failed. The detail panel's line under the notes says "Saved in this browser at …" or "Not saved in this browser", never both.
- **Detail panel.** A Field log section after the route status: a field status select and a notes field, each change saved with its time.
- **List.** A field-status filter ("Any field status" or one status) next to sort. It's part of the visible-list selector, so the markers follow it too. Each card shows its field status. The empty message now reads "No candidates match this view." **One exception to 06's rule:** changing the open candidate's field status so the filter hides it doesn't close the panel, since that would pull it away mid-edit. Its card and marker do go; closing then focuses the filter (or the Candidates tab if the sidebar is on Map layers).
- **Export, import, reset** (`FieldLogTools.tsx`), under the filters: "Field log · N entries", Export log, Import log and Reset log. Export and Reset are disabled while the log is empty. Export downloads `james-peak-field-log-YYYY-MM-DD.json`. An import into an empty log applies at once; over existing entries it asks first, saying how many it replaces. Reset's dialog says how many entries it clears, offers Export first, and focuses Cancel. Both dialogs reuse 11's modal behaviour, moved into `src/ui/modal.ts`.
- **Tests outside this ticket.** The 06 keyboard test now tabs past the filter and Import log; its empty-list copy changed.
- **Not in this ticket:** marker styling by field status (the reference faded Ruled out markers and dotted Camera placed ones), and the field log in candidate exports (09).
- **Watch (12):** notes save on every keystroke, which is fine for localStorage but stamps a new update time each time. At 800 px the field-log tools row wraps to two lines. The bundle is 539 kB of JS (162 kB gzipped).
