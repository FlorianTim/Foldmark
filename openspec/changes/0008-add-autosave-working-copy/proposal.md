# Proposal: Automatic working copy

Status: Implemented (1.1)

## Motivation

1.0 persists only on Save. A closed tab loses everything since the last click. The feedback asks for
a working copy written automatically after a short pause, kept distinct from manual saves and from
the editor's undo history.

## Scope

- After the last change, with a debounce of 1.5–3 s, the working copy is written to local storage.
  It is overwritten, never versioned per keystroke.
- Manual Save writes immediately and may create a durable checkpoint (change 0009).
- On reopening a document with a newer working copy than its saved record, the UI offers to continue
  from the working copy or discard it.
- The save status (change 0004) shows "saving …" and "saved · HH:MM" for both paths.

## Out of scope

- The history view (0009); undo/redo (0010).

## Acceptance

- Typing, waiting 3 s, reloading: the text is there.
- The working copy never appears as a version in the history.
