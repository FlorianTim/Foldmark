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

Foldmark ships fourteen profiles (change 0027), grouped in the catalogue and in the document's
profile select as Letters (DIN A4 letter Form B and Form A, A4 blank, A4 with letterhead, A5 letter,
US Letter), Cards (A6 landscape duplex postcard, A5 card, A6 card), Photos (10 × 15, 13 × 18, 15 ×
20 cm) and Other (DL envelope, A7 index card). They are deep-frozen at runtime, never written to
storage and cannot be deleted. Editing one produces a user-owned copy that loses the standards
claim, because a profile stops being "DIN A4 letter – Form B" the moment a fold mark moves. A
user-owned profile can be renamed and its margins set by number; a body region that was the margin
box follows them, a structured body and every marker stay; it can be duplicated and deleted behind a
confirmation.

### Standards honesty

`standardsStatus` is data with three values: `draft-unverified`, `verified`, `not-applicable`. The
DIN-style profiles use commonly cited working values — Form B folds at 105 mm and 210 mm, Form A at
87 mm and 192 mm, both punched at 148.5 mm — and are `draft-unverified` until checked against a
licensed copy of the current standard. The profile view and the print checks say so. Foldmark claims
no conformance it has not verified.

### Validation

Profile validation is graded: an unrenderable profile is an error, a profile that will very likely
be wrong on paper is a warning, and everything else is information. A profile may not claim a
capability it has no markers for, nor carry markers for a capability it denies. Region overlap is
reported per surface, excluding regions whose purpose is to sit under, between or beyond the others.

## Verification

- `tests/printProfiles.test.ts` asserts every shipped profile validates without warnings, that the
  working values are the documented ones, and that built-ins are frozen.
- `tests/e2e/foldmark.spec.ts` asserts the marks render at their millimetre coordinates.
