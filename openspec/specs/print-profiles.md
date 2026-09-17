# Print Profiles and Markers

## Requirement

A print profile describes one physical target: page size, orientation, margins, named regions,
helper markers, optional duplex surfaces and optional bleed — all in millimetres.

### Markers

Marker kinds are `fold`, `hole`, `cut`, `bleed`, `safe-area`, `separator`, `address-window`,
`stamp-area`, `grid` and `custom`. Every marker carries **two independent visibilities**: `preview`
(seen on screen) and `print` (reaches the paper). A safe area is a design aid that must never print;
a fold mark is a printed line that must survive into an export.

### Built-in profiles

Foldmark ships seventeen profiles (changes 0027, 0045), grouped in the catalogue and in the
document's profile select as Letters (DIN A4 letter Form B and Form A, A4 blank, A4 with letterhead,
A5 letter, US Letter, A4 landscape, A5 landscape, US Letter landscape), Cards (A6 landscape duplex
postcard, A5 card, A6 card), Photos (10 × 15, 13 × 18, 15 × 20 cm) and Other (DL envelope, A7 index
card). They are deep-frozen at runtime, never written to storage and cannot be deleted. Editing one
produces a user-owned copy that loses the standards claim, because a profile stops being "DIN A4
letter – Form B" the moment a fold mark moves. A user-owned profile can be renamed, its margins set
by number and its sheet turned between portrait and landscape (change 0045, R16-001); a body region
that was the margin box follows them, a structured body and every marker stay their millimetres; a
turn that would put a mark or a region outside the sheet is refused by the geometry check and
disabled in the editor. `@page { size }` follows the profile's width and height, so a landscape
profile prints on a landscape sheet. Its marks are edited by number (change 0047, R02-001): kind,
label, x/y, length and direction or width and height, line style, stroke, printed and preview
switches, the side on a duplex profile; marks are added (a line at the left edge halfway down, or a
region in the corner), moved up and down and removed; the list is a draft whose checks are shown
while editing, saved only when none is an error, at most 64 marks; the fold and bleed claims follow
the marks. It can be duplicated and deleted behind a confirmation.

### Standards honesty

`standardsStatus` is data with three values: `draft-unverified`, `verified`, `not-applicable`. The
DIN-style profiles use commonly cited working values — Form B folds at 105 mm and 210 mm, Form A at
87 mm and 192 mm, both punched at 148.5 mm — and are `draft-unverified` until checked against a
licensed copy of the current standard. The profile view and the print checks say so. Foldmark claims
no conformance it has not verified.

### Calibration sheet

Every profile offers a calibration sheet (change 0043, R02-002): a render page of the profile's
paper size with a frame 10 mm from every edge, ticks every 10 mm along the frame's top and left edge
(longer and labelled every 50 mm), a centre cross, the profile's printed marks exactly where a
letter prints them with their coordinates, and instructions in the UI language. It is drawn by the
same `PaperSurface` and printed through the same isolated print copy as a document, with the
profile's `@page` size, so the measured offset and scale apply to every letter on that profile.
Nothing is stored; a measured offset is read off with a ruler and, for now, corrected in the printer
driver.

### Validation

Profile validation is graded: an unrenderable profile is an error, a profile that will very likely
be wrong on paper is a warning, and everything else is information. A profile may not claim a
capability it has no markers for, nor carry markers for a capability it denies. Region overlap is
reported per surface, excluding regions whose purpose is to sit under, between or beyond the others.

## Verification

- `tests/printProfiles.test.ts` asserts every shipped profile validates without warnings, that the
  working values are the documented ones, and that built-ins are frozen.
- `tests/e2e/foldmark.spec.ts` asserts the marks render at their millimetre coordinates.
- `tests/markerEditing.test.ts` covers the list operations and `updateMarkers`; the e2e suite edits
  a copy's marks and checks them on a letter.
- `tests/calibrationSheet.test.ts` asserts the frame, ticks, cross and profile marks of the
  calibration sheet and that everything stays on the paper.
