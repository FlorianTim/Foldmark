# Proposal: Save status indicator and always-visible Save button

Status: Accepted (1.0.x hotfix)

## Motivation

The workspace shows an "Unsaved" badge and a Save button that is disabled once the document is
clean. Users cannot tell whether a save is in progress, whether it succeeded, or when — and a
disabled Save button reads as "saving is not possible" rather than "nothing to save". The 1.1
autosave will build on the same status, so the vocabulary is fixed now.

## Scope

- One save status with five states: new, unsaved, saving, saved (with time), error.
- Each state has an icon and text; colour is additional, never the only signal.
- The Save button stays enabled; on a clean document it re-saves and confirms.
- Saving reports immediately: the status flips to "saving" before the write and to "saved · HH:MM"
  or "error" after it.

## Out of scope

- Autosave, working copy and checkpoints (change 0008).
- Document history (change 0009).

## Acceptance

- The five states render with distinct icon and text in both locales.
- A failed save shows the error state and keeps the document dirty.
