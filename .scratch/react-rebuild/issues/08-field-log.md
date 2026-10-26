# 08: Field log

**What to build:** A field log that survives reloads: field status and notes for each candidate. It never loses data without saying so, and can be exported, imported and reset safely.

**Blocked by:** 06 (Candidate list and detail)

**Status:** ready-for-agent

- [ ] The detail panel has a field status control (To scout, Scouted, Camera placed, Ruled out) and a notes field. Each change is saved with an ISO update time.
- [ ] The list gains a field status filter, which works together with scope, sort and search.
- [ ] A pure codec handles a stored value: a valid log, empty, or invalid. An invalid value is written to a backup key and the owner sees a warning. It's never deleted.
- [ ] The storage key is `jpa.fieldlog.v1`. There's no migration from the original site's key.
- [ ] A failed write (quota or private mode) shows a visible, lasting message. The UI never pretends a save worked.
- [ ] JSON export of the field log, and JSON import that is all-or-nothing. Unknown candidate IDs, invalid statuses and malformed JSON are reported and nothing is applied.
- [ ] Reset log opens a confirmation dialog that says how many entries will be cleared and offers to export first.
- [ ] Vitest tests the codec: valid, empty and corrupt reads, the backup, every import rejection case, and a changed schema version.
- [ ] Playwright: set a field status and a note, reload, and both are kept. With storage forced to throw, the failure message appears. Reset can be cancelled, and confirming it clears the log. Importing an exported log in a clean context restores it.
