# Tasks: Document version history

- [x] `CheckpointRepository` port, Dexie table, retention rule with tests.
- [x] Checkpoint on manual save (content-changed), import, and the automatic rule.
- [x] History panel: day groups, preview (read-only render plan), restore, open as copy, export.
- [x] Privacy inventory, backup and deletion include checkpoints.
- [x] `openspec/specs/local-storage.md` reconciled.

Deviation from the design: a checkpoint holds the **structured** document, not its portable text.
The portable form drops asset placements (they reference bytes local to one browser), and a restore
that silently loses placements is the kind of surprise a history exists to prevent. Export still
runs a checkpoint through the codec. Documents are cloned through JSON on the way in, because the
workspace hands over a reactive proxy that structured clone refuses.
