# Proposal: Numeric marker editor

Status: Implemented (2026-09-17). Source: roadmap R02-001 ("A numeric print-profile editor can add,
move, enable and reorder markers on a user-owned profile"), a Must open since iteration 2 — the last
part of the profile editor that was still read-only: name and margins (change 0027), orientation
(change 0045), now the marks.

## Scope

- **Where.** Under Print profiles, the "Helper marks" section of a user-owned profile is an editor;
  a built-in keeps its read-only list. Editing a built-in's marks means cloning it first, as before.
- **What.** Every mark as a row: kind (every kind the model knows), label, x and y in millimetres,
  length and direction for a line or width and height for a region, line style, stroke width,
  printed, in the preview, and the side on a duplex profile. Actions: move up, move down, remove;
  "Add mark" with a kind, which starts a line at the left edge halfway down the sheet (printed for
  fold, punch and cut marks) or a 40 mm region in the top-left corner (preview-only, dashed).
- **Draft and checks.** The list is a draft until "Save marks"; the checks of the would-be profile
  are shown while editing, and Save is disabled while any of them is an error — a mark outside the
  sheet, an invalid stroke. "Discard changes" returns to the stored list. The fold and bleed claims
  of the profile follow the marks on save, so the "capability without marker" warning cannot be
  produced by the editor itself.
- **Bounds.** At most 64 marks per profile; ids are `<kind>-<n>` and never typed.
- **Not in scope:** dragging marks on the sheet (R03-001 is the visual editor), editing regions (the
  address window, the body), per-mark colour.

## Acceptance

- A copy of DIN A4 Form B: move the punch mark to y = 150, add a cut mark, remove the top fold, move
  the cut mark up, save; a new letter on that profile draws marks at 150 and 210 mm and none at 105
  mm.
- x = 500 on the punch mark shows "outside the page" and disables Save; x = 5 enables it again.
- The built-in DIN profile shows no editor.
