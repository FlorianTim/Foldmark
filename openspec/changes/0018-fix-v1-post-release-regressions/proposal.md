# Proposal: 1.0 post-release regressions (P0)

Status: Implemented (2026-09-13, uncommitted on `main`). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Postrelease_Anforderungen_2026-09-13.md` §42–44, §47–48, §55,
§57, §59, §67–68 and Phase A of §85. Roadmap R13-001…R13-008.

## Motivation

Testing the released 1.0 found eight defects that make the core promise — what you see is what the
printer receives, and the document can leave the app without technical friction — untrue in places:
Chrome sometimes prints the output dialog instead of the letter; an image inserted from the library
is not reliably visible; the plain-text email carries Markdown syntax; the guides toggle in the
preview is not independent of print; a translation key (`metadata.field.region`) is missing; a page
break does not always yield a second preview page; a long preview scrolls with jumps; the About view
still reads like a template. Each has to be fixed before, and independently of, the redesign.

## Scope

- **Chrome print** (R13-001): the output dialog is closed before `window.print()` and reopened
  afterwards; `@media print` hides every `dialog`, popover and menu; `.print-root` is the only thing
  printed. The tab title still becomes the PDF filename (change 0015).
- **Image insertion** (R13-002): the editor's image node view shows a placeholder while it resolves
  the object URL; inserting at the end of the document places the image in its own paragraph; the
  picker refreshes after an import and shows a thumbnail; preview and print copy resolve the same
  asset; a reopened document shows the image.
- **Plain-text mail** (R13-003): the plain renderer emits no Markdown: `-` bullets for unordered
  lists, `1.` for ordered ones, headings as their text, quotes indented, code as its text, tables as
  tab-separated rows, links as `text (url)`, directives as their content; fixtures assert the
  absence of `**`, `:::` and `:name[`.
- **Guides** (R13-004): the preview toggle hides preview-only guides and keeps printed marks visible
  (they are ink); a second control shows whether printed marks are on, bound to the document's print
  preference; the print copy never sees the preview toggle.
- **i18n** (R13-005): `metadata.field.region` in both catalogues; the i18n test checks every key
  built from a field list.
- **Page break and preview** (R13-006, R13-007): a page break at the end of the visual editor is
  serialised as `::page-break` followed by a paragraph and the layout produces the extra page; the
  preview scrolls to a page only when the navigator asks, measures the viewport only when its size
  changes, and keeps a constant gap between pages.
- **About** (R13-008): the About view lists the third-party libraries structured (name, version,
  licence, link) from a JSON the licence generator writes next to the notices; template wording
  (`app.demo`) is gone.

## Out of scope

Everything behind the redesign: separate output actions (0019), the workspace layout (0020), the
document settings (0021), the editor toolbar (0022).

## Acceptance

- AC-PRINT-001/002, AC-EDIT-008/009, AC-OUT-003, AC-PRINT-006, AC-PREV-001/005 from the source
  document.
- Unit tests: `tests/email.test.ts` (no Markdown in plain text), `tests/i18n.test.ts` (field keys),
  `tests/renderPlan.test.ts` (page break → two pages), `tests/markdown.test.ts`.
- E2E (Chromium): the dialog is hidden in the print medium; an image inserted from the library
  appears in editor and preview; a page break yields two preview pages.
