# Tasks: Fix preview marker visibility

- [x] Add `visibleScreenMarkers(page, showGuides)` beside the render plan, with tests for preview
      on/off × print on/off.
- [x] `PaperSurface.vue` uses the helper; the prop comment states the new rule.
- [x] `PaperPreview.vue`: no change to the toggle itself; the setting keeps its key.
- [x] e2e: guides off yields no `.print-marker`; guides on restores the recorded offsets.
- [x] `openspec/specs/render-and-print.md` records the toggle rule.
- [x] `CHANGELOG.md` Fixed entry.
- [ ] Manual regression list from `design.md` — **owner: Florian, after the hotfixes, at a physical
      printer**. Result goes into the CHANGELOG release entry. Not automatable: whether a fold mark
      sits at 105 mm on paper is a ruler question.
- [ ] Follow-up noted: the values behind that list (margins, fold and hole positions) must be easy
      to adjust in the UI — that is the numeric profile editor, roadmap R02-001, scheduled before
      the next print check so a measured offset can be corrected without editing code.
