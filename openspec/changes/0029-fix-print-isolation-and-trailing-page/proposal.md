# Proposal: Print isolation and no trailing empty page

Status: Implemented (2026-09-16). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Korrekturen_Roadmap_Premium_2026-09-16.md` Teil A, A1 and A2.
Roadmap R14-001, R14-002. Priority P0.

## Problem

1. **App chrome prints.** `print.css` hides the app by listing classes — header, footer, workspace
   bar, workspace grid, dialogs, popovers, the menu _panel_. The menu _bar_ (`.app-menu`) was never
   on the list, so the classic File/Edit/Format menu prints above the sheet in Chrome and Firefox.
   Every new piece of chrome would need a new line; a blacklist cannot stay complete.
2. **An empty second sheet.** The print copy sits inside the workspace grid (`gap: 0.75rem`) under
   the menu bar, inside `main` with margins, in a body with `min-height: 100vh`. The A4 sheet is
   pushed below the top of the first page and its tail spills onto a second, blank one. On top of
   that, a `::page-break` as the last thing in the body opened an intentionally empty page
   (R13-006), which the second test round rejects: a trailing break is not a blank sheet.

## Scope

- **Print root outside the shell.** The print copy is teleported to `body` and the print medium
  hides every other child of `body` (`body > :not(.print-root) { display: none }`); `html`/`body`
  lose their minimum height and margins on paper. No class list remains; a new dialog or toast is
  hidden by construction.
- **`.no-print`** as a documented opt-out for anything that has to live outside the shell and must
  not print (none today; the rule exists so the next author does not reinvent it).
- **Page normalisation.** `paginateBody` drops a trailing page break instead of opening a page; a
  page whose source is empty after normalisation is not emitted. Preview, print and PDF read the
  same plan, so the three agree by construction.
- **Regression tests.** Unit tests for the paginator (break between texts → two pages, trailing
  break → one page, one paragraph → one page). Playwright: `emulateMedia({ media: 'print' })` with
  the Format menu open and with the print dialog open — only `.print-root` is visible, exactly as
  many `.paper` elements as the plan has pages.

## Acceptance

- Chrome and Firefox print no menu, toolbar, dialog, popover, status or footer.
- A one-page letter produces exactly one sheet; `text / break / text` exactly two; `text / break`
  exactly one.
- Preview, print and PDF show the same page count.
