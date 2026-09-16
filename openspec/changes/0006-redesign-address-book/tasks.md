# Tasks: Address book redesign

- [x] Domain: `AddressRole`, `contactVisibility`, `AddressSnapshot`; ADR 0017 accepted.
- [x] Dexie migration for sender identities → addresses; document sender snapshot.
- [x] Codec: sender snapshot in front matter, backward-compatible import of 1.0 files.
- [x] Address book view: sections, search, actions, country picker with local list.
- [x] Sender ordering function with unit tests.
- [x] Privacy inventory and backup include the merged table.
- [x] `openspec/specs/document-model.md` and `local-storage.md` reconciled.

Notes: sender identities were not a second table to keep but a projection to remove —
`SenderProfile` is now what the renderer sees of an address (`senderProfileFrom`) or of a document's
snapshot. The picker itself is change 0007; the accordion still uses a select.
