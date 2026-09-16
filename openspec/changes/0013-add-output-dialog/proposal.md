# Proposal: Output dialog

Status: Implemented (1.1)

## Motivation

Print and export controls are needed at the end of writing, not while writing. Moving them into a
dialog frees the workspace and gives each destination room for its own options.

## Scope

- One action, "Print / Export", opens a dialog with tabs Print, Export, Email.
- Print: profile, markers on/off, page numbers, then the system print dialog.
- Export: PDF (via print dialog), Markdown, filename; ODT later.
- Email: PDF attachment guidance, HTML, plain text — the existing hand-off, relocated.
- Validation findings for the chosen target are shown in the dialog before the action.

## Acceptance

- Every 1.0 export path is reachable from the dialog; none remains in the workspace.
