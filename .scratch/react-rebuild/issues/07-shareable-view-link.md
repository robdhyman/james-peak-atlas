# 07: Shareable view link

**What to build:** The URL records the selected candidate, the scope and the sort, so a shared link reopens the same view. Broken links fall back to the default view.

**Blocked by:** 06 (Candidate list and detail)

**Status:** ready-for-agent

- [ ] Changing the selection, scope or sort updates the URL hash. Layer and opacity changes don't.
- [ ] Opening a link selects that candidate, opens its detail panel and applies the scope and sort.
- [ ] An unknown candidate ID, an invalid scope or an invalid sort falls back to the default view with a short notice.
- [ ] Scout order in a link combined with the All scope resolves to the All default sort.
- [ ] Playwright: open a crafted link and confirm the view. Change the view, reload, and confirm it's kept. Open an invalid link and confirm the notice and the default view.
