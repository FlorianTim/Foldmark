# Proposal: Page numbering

Status: Implemented (1.1)

## Motivation

Multi-page letters need page numbers, and the preview must show the same pages the printer produces.

## Scope

- Options: none, number only, "Page X", "Page X of Y".
- Position: top or bottom × left, centre, right.
- Option to hide on the first page.
- Page numbers are part of the render plan and drawn by the preview, the print copy and therefore
  the PDF from the same plan.
- The preview shows sheets as pages with the plan's pagination.

## Later

Odd/even pages, start number, custom formats (1.2).

## Acceptance

- `Page X of Y` in the preview equals the printed sheet count.
- The number never overlaps a marker region; validation warns when it would.
