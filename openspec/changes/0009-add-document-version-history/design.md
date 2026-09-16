# Design: Document version history

Checkpoints are immutable rows `(documentId, createdAt, origin, serializedDocument)` in their own
Dexie table. Serialization reuses the Markdown+YAML codec, so a checkpoint is exactly what export
would have produced — "export" from the history is a file write of the row.

| Decision                                  | Alternative rejected | Why                                                                     |
| ----------------------------------------- | -------------------- | ----------------------------------------------------------------------- |
| Checkpoint = serialized portable document | Structured clone     | One format for files, backups and history; the codec is already tested. |
| Restore snapshots first                   | Confirm dialog only  | The feedback names this; a dialog is not a safety net.                  |
| Bounded retention                         | Unbounded            | Local storage is finite and the inventory must stay honest.             |
