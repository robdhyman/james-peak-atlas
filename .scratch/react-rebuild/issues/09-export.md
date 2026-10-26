# 09: Export

**What to build:** Export exactly the visible list, including the field log, as GeoJSON, GPX or CSV. Each format is verified by parsing a real downloaded file.

**Blocked by:** 08 (Field log)

**Status:** ready-for-agent

- [ ] Pure serialisers take the visible list and the field log and return file text. GeoJSON uses `[lon, lat]`. GPX has waypoints only, with lat/lon attributes and XML-escaped text. CSV follows RFC 4180 quoting, and cells beginning `=`, `+`, `-` or `@` are neutralised. Coordinates use the same precision throughout.
- [ ] Each exported candidate includes its field status and notes. Observations, base rasters and routes are never included.
- [ ] The export menu shows the count ("Export N shown") and exports the list exactly as currently filtered by scope, search and field status.
- [ ] Vitest checks each serialiser against fixed expected output, including notes containing `&`, `<`, quotes, commas, line breaks and text that looks like a formula.
- [ ] Playwright: for each format, the downloaded file is saved, parsed (GeoJSON with a JSON parser, GPX with an XML parser, CSV with a CSV parser) and checked for the expected candidate IDs, coordinates and notes, after filtering the list down to a subset.
