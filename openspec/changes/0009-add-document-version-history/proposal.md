# Proposal: Document version history

Status: Implemented (1.1)

## Motivation

Letters are edited over days. A manual save or an import should be recoverable without a backup
file.

## Scope

- Checkpoints: created by manual save (when content changed since the last checkpoint), by import,
  and optionally by an automatic rule (at most one automatic checkpoint per N minutes of change).
- History view grouped by day: time, origin (manual, automatic, imported).
- Actions: preview, restore, open as copy, export.
- Restore creates a new checkpoint of the current state first; it never destroys it.
- Retention: a bounded count per document (default 50) with the oldest automatic ones pruned first;
  manual checkpoints are pruned only past a higher bound.

## Out of scope

- Diff view between versions.

## Acceptance

- Restore of any checkpoint is itself undoable through the history.
- Storage growth is bounded and visible in the privacy inventory.
