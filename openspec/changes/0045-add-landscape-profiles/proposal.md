# Proposal: Landscape profiles

Status: Implemented (2026-09-17). Source: roadmap R16-001 ("Landscape documents … planned for 1.6").
Priority: Could. Pulled forward because the profile model already carried width, height and
orientation, the preview and the print copy already drew the A6 landscape postcard, and what was
missing was three profiles and one switch.

## Scope

- **Built-ins.** `a4-landscape` (297 × 210), `a5-landscape` (210 × 148) and `us-letter-landscape`
  (279.4 × 215.9) in the Letters group, each with the plain margins of its portrait sibling and a
  body that is the margin box; no marks, no address window, no standards claim.
- **Own profiles by orientation.** The editor of a user-owned profile gets Portrait / Landscape.
  Turning swaps width and height and keeps every millimetre of the margins, the markers and the
  other regions; a body that was the margin box follows the turned sheet. When a mark or a region
  would leave the turned sheet the other orientation is disabled with a hint — "turn a copy of a
  blank profile instead" — and the service refuses the update the same way (`InvalidInputError`), so
  a hand-crafted call cannot store a profile that will not validate.
- **Already true, now covered by tests:** `@page { size }` takes the profile's width and height, so
  the printer gets a landscape sheet; the preview shows the wide sheet; the calibration sheet
  (change 0043) follows the profile.
- **Not in scope:** rotating markers when turning (a fold mark at 105 mm on A4 portrait means
  nothing on A4 landscape), mixed orientations in one document, a landscape DIN letter.

## Acceptance

- The Letters group lists "A4 quer / A4 landscape" 297 × 210 mm; a free document can use it and its
  preview is wider than tall; `@page` says `297mm 210mm`.
- A copy of A4 blank turned landscape shows 297 × 210 mm with the body at 20/20/257/170; turned back
  it equals the original.
- A copy of DIN A4 Form B has the Landscape option disabled with the hint; the service rejects the
  turn and stores nothing.
