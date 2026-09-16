# Proposal: The start view as a file manager — list, + New, archive, folders

Status: Implemented (2026-09-15). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Postrelease_Anforderungen_2026-09-13.md` §2–§5, §62, Phase E.
Roadmap R13-024, R13-025.

## Scope

- **Toolbar** `[+ New ▾] [Import] [Export / Backup] [Archive]`; the New menu offers letter,
  postcard, card, photo, free document, folder; later kinds add menu entries, not buttons.
- **List** with columns name, type, folder, changed, size, status (draft/saved/archived), sortable
  by name, changed, opened, type; row actions open, rename, duplicate, move, archive, export, delete
  (confirmed).
- **Folders**: `folders` table (id, name, parentId, archived); documents get `folderId`, `archived`,
  `lastOpenedAt`; breadcrumb navigation; folder rename, move, archive (recursively hides), restore.
- **Archive view**: a toggle "Show archived" and an Archive entry that lists archived documents and
  folders with Restore.
- **Export / Backup** opens the privacy backup section (full ZIP restore stays roadmap R13-033).
- Document kinds `photo` and `free` (`custom` renamed in the UI to "Free document"; a new `photo`
  kind maps to the photo profile category).

## Data

Dexie version 4: `documents` index `folderId, archived, lastOpenedAt`; new table `folders`. Existing
records get `archived: false` on read (schema default), nothing is rewritten in place.

## Acceptance

AC-WORK-001…005. Unit tests: sort comparators, archive filter, folder tree (breadcrumb, cycle guard
on move); e2e: create folder, move a document into it, archive and restore.
