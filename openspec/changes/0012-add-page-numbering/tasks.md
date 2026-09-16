# Tasks: Page numbering

- [x] `PageNumberOptions` in the domain and codec.
- [x] Render plan: positioned number block per page; unit tests for all positions and modes.
- [x] Preview shows all pages; print copy unchanged in structure.
- [x] Document mode UI for the options.
- [x] `openspec/specs/render-and-print.md` reconciled.

Open: a validation warning when the number line would overlap a marker region (the proposal's second
acceptance line) is not implemented; the line sits in the margin, where no built-in profile places a
region. Odd/even, start number and custom formats stay 1.2.
