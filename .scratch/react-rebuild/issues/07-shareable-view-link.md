# 07: Shareable view link

**What to build:** The URL records the selected candidate, the scope and the sort, so a shared link reopens the same view. Broken links fall back to the default view.

**Blocked by:** 06 (Candidate list and detail)

**Status:** ready-for-agent

- [x] Changing the selection, scope or sort updates the URL hash. Layer and opacity changes don't.
- [x] Opening a link selects that candidate, opens its detail panel and applies the scope and sort.
- [x] An unknown candidate ID, an invalid scope or an invalid sort falls back to the default view with a short notice.
- [x] Scout order in a link combined with the All scope resolves to the All default sort.
- [x] Playwright: open a crafted link and confirm the view. Change the view, reload, and confirm it's kept. Open an invalid link and confirm the notice and the default view.

## Comments

**Built and verified locally.** The full CI sequence passes: data check, type check, 85 Vitest tests (14 new), build, and 45 Playwright tests (11 new). The new browser tests also passed three times over with `--repeat-each=3`.

- **The codec** (`src/candidates/viewLink.ts`). `encodeViewHash({ scope, sort, candidate })` writes only what differs from the default, as `#candidate=EP-04&scope=all&sort=water`, so the default view has a clean URL. `decodeViewHash(hash, candidates)` returns the view and a `problem` sentence. The sort is the owner's pick, as in `ListView`, not the sort in effect, so `scope=all&sort=scout` resolves through `resolveSort` to the All default and a picked sort survives a scope change. Keys the atlas doesn't use are ignored.
- **Broken links fall back whole.** An invalid scope or sort, an unknown candidate (IDs are case-sensitive), or a candidate outside the link's scope (for example `#candidate=JP-07` in Nearby) opens the default view rather than half-applying. Scope membership comes from the visible-list selector, so the two can't disagree. The notice reads, for example, "There's no candidate "EP-99" in this atlas. The default view is open instead." It sits in the top-left notice column with the data warnings, and can be dismissed. The URL is rewritten to the default view, so a reload doesn't bring the notice back.
- **Writing the link.** `AtlasView` derives the hash from the scope, the sort pick and the selected candidate, and writes it with `history.replaceState`. View changes add no history entries, and layer and opacity changes never touch the URL. Search isn't part of the link. Any query string is kept.
- **Opening a link.** The view and selection start from the hash. A linked candidate counts as opened from the map, so closing its panel focuses its marker. A link that carries a view opens the sidebar on the Candidates tab, since the scope and sort are only visible there. A `hashchange` listener follows a link pasted into an open tab (it doesn't switch tabs).
- **Reveal timing.** The reveal is queued as state and runs in an effect after the commit that puts the marker on the map. Calling it directly from the `hashchange` handler did nothing when the link changed the scope, because the marker wasn't drawn yet. A browser test pastes `#candidate=JP-03&scope=all` into a Nearby view and checks the marker ends up 140 px left of the map's centre. It fails with the direct call.
