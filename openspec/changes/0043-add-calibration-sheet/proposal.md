# Proposal: Calibration sheet

Status: Implemented (2026-09-17). Source: roadmap R02-002 ("A calibration sheet prints known
distances so a user can measure their printer's offset"), open since iteration 2. Priority: Should.
Picked because every fold and punch mark Foldmark draws is only as true as the printer that puts it
on paper, and until now there was no way to find out by how much a printer is off.

## Scope

- **One sheet per profile.** Under Print profiles, below the selected profile: a scaled preview of
  the sheet and **Print calibration sheet**. The sheet has the profile's paper size, so what is
  measured is the paper a letter would use.
- **What is on it.** A frame 10 mm from every paper edge (the distance from the edge to the line is
  the offset on that side); ticks every 10 mm along the frame's top and left edge, longer and
  labelled every 50 mm (the scale); a cross at the sheet's centre; the profile's printed marks
  (fold, hole, cut …) exactly where a letter prints them, listed with their coordinates; the title,
  the profile name and size, and four numbered instructions in the UI language.
- **How it prints.** The sheet is an ordinary render page — markers and blocks in millimetres —
  drawn by `PaperSurface` into a print root next to the app shell (R14-001) for the duration of the
  print, with `@page { size }` set to the profile's paper and the tab title "Calibration sheet –
  <profile>" (change 0015). No document is opened, changed or saved.
- **Not in scope:** storing a measured offset and correcting the print by it (a later change may add
  an offset to a user-owned profile), a landscape sheet (R16-001), a per-marker check list.

## Acceptance

- DIN A4 Form B: the frame lines sit at x/y 10 mm and 200/287 mm, 18 ticks along the width and 27
  along the height, the cross at 105 / 148.5 mm, and the three printed marks of the profile are on
  the sheet; nothing lies outside the paper.
- Under print media only the sheet's print root is visible, the page rule says `210mm 297mm`, and
  the tab title names the sheet and the profile.
- A profile without printed marks gets a sheet without the marks list.
