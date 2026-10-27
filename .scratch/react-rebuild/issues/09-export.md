# 09: Export

**What to build:** Export exactly the visible list, including the field log, as GeoJSON, GPX or CSV. Each format is verified by parsing a real downloaded file.

**Blocked by:** 08 (Field log)

**Status:** ready-for-agent

- [x] Pure serialisers take the visible list and the field log and return file text. GeoJSON uses `[lon, lat]`. GPX has waypoints only, with lat/lon attributes and XML-escaped text. CSV follows RFC 4180 quoting, and cells beginning `=`, `+`, `-` or `@` are neutralised. Coordinates use the same precision throughout.
- [x] Each exported candidate includes its field status and notes. Observations, base rasters and routes are never included.
- [x] The export menu shows the count ("Export N shown") and exports the list exactly as currently filtered by scope, search and field status.
- [x] Vitest checks each serialiser against fixed expected output, including notes containing `&`, `<`, quotes, commas, line breaks and text that looks like a formula.
- [x] Playwright: for each format, the downloaded file is saved, parsed (GeoJSON with a JSON parser, GPX with an XML parser, CSV with a CSV parser) and checked for the expected candidate IDs, coordinates and notes, after filtering the list down to a subset.

## Comments

**Built and verified locally**, rebased onto ticket 10. The full CI sequence passes: data check, type check, 145 Vitest tests (16 new), build, the public build check, and 67 Playwright tests (5 new). The export tests also passed 25 of 25 with `--repeat-each=5`. The private suite passes as well (4 tests, 1 new). This was built in its own worktree (`.claude/worktrees/ticket-09-export`), because tickets 10 and 14 were being worked on in the main checkout at the same time.

- **Serialisers** (`src/export/exportCandidates.ts`). `toGeoJson`, `toGpx` and `toCsv` take the visible list and the field log and return text. All three draw on one record per candidate, with its fields picked one by one from a fixed column list. Raw fields such as `land`, `water` and `rationale` can't leak into a file, and an entry in the log for a candidate that isn't listed never appears.
  - **Columns:** id, name, pool, pool rank, scouting index, the four components, latitude and longitude, field status, notes, field-log update time, the seven metrics, route status and GMU. Pool and field status use their display labels ("Nearby", "Camera placed"), as a map app or spreadsheet shows them.
  - **Coordinates** are rounded to six decimals (about 0.1 m, the bundle's own precision) and written as the same number text in all three formats.
  - **GeoJSON** is a FeatureCollection with positions in `[lon, lat]`.
  - **GPX 1.1** holds waypoints only. Each has lat/lon attributes, a name ("EP-04 …") and a description with the index, pool rank, field status, route status and notes. Every text and attribute is escaped for all five XML characters. Characters that XML 1.0 can't hold even when escaped (most control characters, U+FFFE and U+FFFF, lone surrogates) become U+FFFD, so the file always parses.
  - **CSV** follows RFC 4180: CRLF line endings, and a cell holding a comma, quote or line break is quoted, with its quotes doubled. Text cells starting with `=`, `+`, `-` or `@` get a leading `'`. Tab and carriage return are neutralised too, since some spreadsheets read a formula after them. Numbers are never neutralised, so a negative longitude stays a number. A UTF-8 byte order mark comes first so Excel reads the em dashes in the names correctly.
  - **No timestamps** inside the files, so the output is fixed for a given list and log. The date is in the filename: `james-peak-candidates-YYYY-MM-DD.<ext>`.
- **Menu** (`src/ui/ExportMenu.tsx`). It sits at the right end of the header, as in the reference. The button reads "Export N shown" from the same visible-list selector that feeds the cards and markers, so scope, search and field status all apply. It's disabled at 0. On a phone it shows only the count and an icon, and keeps its full accessible name.
  - **Disclosure, not an ARIA menu:** the button controls a group of three format buttons with a one-line note on what's included. Escape, or a click or focus outside, closes it. Escape and an export return focus to the button.
  - **After an export,** a visually hidden status says "Exported N candidates as GPX".
- **Browser tests** (`tests/e2e/export.spec.ts`).
  - **Setup:** the field log is seeded, then the list is narrowed with all three filters at once: All, Scouted and the search "EP". The excluded candidates are seeded so they'd appear if a filter were ignored.
  - **Each format** is downloaded and parsed with a real parser: `JSON.parse`, the browser's `DOMParser` (with a check for `parsererror`) and `csv-parse` (strict, with BOM handling). The new dev dependency is `csv-parse` 7.0.3.
  - **Checks:** the candidate IDs, coordinates against `candidates.geojson`, notes with `&`, `<`, quotes, commas and line breaks surviving intact, and a neutralised formula.
- **Private check** (`tests/e2e-private/export.spec.ts`, local only). In the private build, which has observations, it exports all 16 candidates in each format. It then checks that no exported position matches an observation and that no observation ID appears in any file. IDs and positions are read from `private/` at run time, so none is written in the repo.
- **Tests outside this ticket.** 06's keyboard test now tabs past the export button.
- **Not in this ticket:** an export of observations (ADR 0001 keeps them out of every file), and elevation in GPX (`<ele>`), since the elevation is a 60 m raster estimate in feet.
- **Watch (12):** at 390 px the header fits, but there is little room left if anything else joins it. Screen-reader timing of the export status is left to 12, as with the other live regions.
