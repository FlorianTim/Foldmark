# Proposal: Editor — mode switch first, shared toolbar, H1–H6, colour/highlight popovers, table picker, link dialog, image dialog, context-sensitive commands

Status: Implemented (2026-09-15). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Postrelease_Anforderungen_2026-09-13.md` §37–§42, §64, Phase
D. Roadmap R13-021, R13-022.

## Scope

- **Mode switch** Visual / Markdown as the first row above the toolbar, with a clear active state.
- **Shared toolbar** in both modes: in source mode the commands wrap or insert Markdown text; what
  source mode cannot do (undo/redo of the editor, colour on selection) is `disabled`.
- **Headings H1–H6** in the block select; the adapter renders h1–h6 (the paper keeps h2–h4 sizes for
  1–3 and smaller steps for 4–6).
- **Colour popover** with "Standard" reset; **highlight popover** with the highlight tone and reset.
- **Table picker**: a 6 × 6 grid popover with hover label "3 × 3", plus rows/columns fields.
- **Link dialog**: text and URL, prefilled from the selection; http(s)/mailto only.
- **Image dialog**: Library and Import tabs, thumbnail, title, dimensions, size, width in mm.
- **Context-sensitive**: table, image, page break disabled inside a table cell; block directives
  disabled inside a table; headings disabled in list items.
- Icons for every toolbar button (0020 sprite), `aria-label` + `title`, `aria-pressed` states.

## Acceptance

AC-EDIT-001…010. Component tests: `TablePopover`, `LinkDialog`, `ColorPopover`, `ImageDialog`; port
test for `selectionState` context flags; e2e: H4 heading, table 2 × 4, link with text.
