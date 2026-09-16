# Rendering and Printing

## Requirement

A document, a profile, a resolved sender and resolved asset metadata collapse into a **render
plan**: a pure, deterministic data structure containing pages, markers and positioned blocks in
millimetres, with no DOM, no Vue, no CSS and no HTML. The same plan feeds the on-screen preview, the
print copy and any future PDF adapter.

### Zoom can never change an export

The preview draws the plan in CSS millimetres and applies display scale as a CSS `transform` on a
parent element. A transform does not change layout, so no zoom level can alter a coordinate that
reaches the printer. This is asserted in a unit test and again in the browser.

### Two plans, two modes

- `screen` mode draws preview-only guides.
- `paper` mode draws only what the profile says prints.

Printing renders a separate, print-only copy of the document built in `paper` mode. The preview is
never printed, so CSS cannot decide which marks appear.

### The guides toggle

The preview's "Hide guides" control hides **every** marker on screen, printed marks included; "Show
guides" draws every marker the screen plan contains. The toggle is a viewing preference: it is not
an input to the paper plan, so it can never change what prints or what a PDF contains. A marker
whose `preview` flag is off is never drawn on screen, whatever the toggle says.

### Pagination

Blocks are assigned to pages by the plan, using a deliberately pessimistic text-height estimate,
rather than being reflowed by the browser — otherwise the fold marks on sheet two would be drawn by
Foldmark while the page break was decided by the layout engine. The blocks are the parser's own
(`blockSources`, change 0016), lists split into their items, so the estimate measures the document
the preview draws. A `::page-break` directive ends the page; a break at the top of a page, two in a
row, or a break as the last thing in the body never yield an empty page (change 0029): a sheet
exists only for content, never because a technical container does, and a deliberately blank page
needs its own command. Preview, print and PDF read the same normalised page list. Content that still
does not fit is reported as a warning rather than silently clipped.

### Document theme

The plan carries the resolved document theme (`plan.theme`, change 0017): font family from a local
stack, body size and leading, paragraph spacing, small size and the palette. The height estimate
uses it — a 12 pt letter paginates as a 12 pt letter — and each surface sets it as CSS custom
properties, so the paper draws the same sizes the estimate assumed. The preview resolves palette
names to their **screen** values, the print copy to their **print** values (≥ 4.5:1 on white); the
app theme never reaches the paper.

### Page numbers

Page numbering is stored on the document (`printOptions.pageNumbers`: none, number only, "Page X",
"Page X of Y"; six positions in the top or bottom margin; optional hiding on the first page) and
resolved by the render plan into a positioned block per page, across the content width, halfway
between paper edge and content. The presentation layer words it in the UI language; no CSS counter
or `@page` margin box is involved, so preview, print copy and PDF agree. The preview shows every
page of the plan stacked in print order; selecting a page scrolls to it.

### Print isolation

The print copy is the only thing on paper (change 0029). It is rendered next to the app shell, as a
direct child of `body`, and the print medium hides every other child of `body` — there is no list of
chrome classes to keep complete, so a new dialog, toast or menu is hidden by construction; `html`
and `body` lose their minimum height on paper so a one-page letter is one sheet. `.no-print` marks
the one case the rule cannot reach, something rendered inside the print root that must not print.

### Printing is the browser's

Foldmark opens the browser print dialog and writes an `@page` size rule through a constructable
stylesheet, which the strict style policy permits. "Save as PDF" is a destination in that dialog;
Foldmark does not generate PDFs itself and does not claim to. Every print path reminds the user that
scaling must be 100 %.

While the print dialog is open the page title is the document title — else the subject, else the
application name — sanitised like a download filename, so "Save as PDF" suggests it as the filename
and writes it as the PDF's Title. The tab title is restored afterwards. Author, subject and dates
are not written: browsers take none of them from the page.

## Verification

- `tests/renderPlan.test.ts` covers determinism, marker positions, mode differences, the four
  guides-toggle combinations and pagination (block agreement with the parser, page breaks);
  `tests/pageNumbers.test.ts` the number block and its round trip; `tests/documentTheme.test.ts` the
  theme's effect on the page count and the catalogue's heights.
- `tests/e2e/foldmark.spec.ts` asserts marker positions are identical at every zoom level and that
  hiding guides removes every mark from the sheet and showing them restores the same offsets; in the
  print medium, with the Format menu or the print dialog open, only `.print-root` is laid out and a
  one-page letter has one sheet.
