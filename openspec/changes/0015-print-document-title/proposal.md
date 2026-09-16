# Proposal: Print under the document title

Status: Accepted (1.0.x hotfix)

## Motivation

"Save as PDF" in the browser print dialog proposes the page title as the filename and writes it into
the PDF's Title field. Foldmark's page title is always "Foldmark", so every letter is offered as
`Foldmark.pdf` and the user renames it by hand.

## Scope

- While the print dialog is open, the page title is the document title; fallback the subject, then
  the application name. The title is restored after printing.
- The same sanitisation as for downloaded filenames applies, so a title cannot smuggle path
  characters into the suggestion.

## Out of scope

- Author, subject, keywords or dates in the PDF. Browsers do not take them from the page; that needs
  a Foldmark-owned PDF adapter (roadmap R12-005).

## Acceptance

- With a letter titled "Antrag Bescheinigung", the print dialog suggests `Antrag Bescheinigung`
  (Chrome, Edge and Firefox) and the saved PDF's Title reads the same.
- After the dialog closes, the tab is titled "Foldmark" again.
