# Proposal: Page-number extensions

Status: Implemented (2026-09-17). Source: roadmap R12-003 ("odd/even pages, start number, custom
formats"), carried since iteration 1.2 and picked as the next small, self-contained feature after
the QR codes (change 0040). Priority: Could.

## Scope

- **Start number.** `printOptions.pageNumbers.startAt` (1–9999, absent means 1) is the number the
  first sheet carries; "of Y" counts up to the last sheet's number, not the sheet count. For a
  letter that continues an earlier one. The first-page switch keeps following the sheet: hiding on
  the first page still hides the first sheet, whatever number it carries.
- **Mirrored positions.** `mirrorOnEvenPages` swaps left and right on even sheets so a document
  printed on both sides keeps the number on the outer edge. Centred numbers are not affected; the
  switch is disabled for them.
- **Own wording.** Format `custom` with `pattern` (≤ 40 characters, one line, must contain `{page}`;
  `{pages}` optional): `Blatt {page} von {pages}`. Everything else prints as typed. A wording that
  is not usable is kept in the document but the render plan prints "Page X of Y" and the field says
  so. `custom` is a document choice only — Settings → Document offers the six fixed formats as
  global defaults, because the wording itself lives in the document.
- **File format.** `pageNumbers:` in the front matter carries `startAt`, `mirrorOnEvenPages` and
  `pattern` only when they differ from the default; reading guards each one (integer in range,
  boolean `true`, usable wording) and drops what does not fit, never repairs it.
- **Not in scope:** numbers only on odd or only on even pages (no use case named), roman numerals,
  different wording per side.

## Acceptance

- A three-sheet letter with `startAt: 4` and "Page X of Y" prints "Seite 4 von 6", "Seite 5 von 6",
  "Seite 6 von 6"; with "hide on the first page" the first sheet has no number.
- Bottom-left with mirroring: sheet 1 left, sheet 2 right, sheet 3 left; bottom-centre stays
  centred.
- Own wording `– {page} –` prints "– 1 –"; the wording `nothing` prints "Seite 1 von 1" and the
  field is marked invalid.
- The file round-trips all three; a file with `startAt: -3` or `pattern: nothing` decodes to the
  defaults for those two.
