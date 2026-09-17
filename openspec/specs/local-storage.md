# Local Storage

## Requirement

Local-first persistence is exposed through application ports. IndexedDB/Dexie is the default
adapter. Database and UI-preference keys are namespaced by application slug.

Foldmark stores documents, address-book entries, user-owned print profiles and image assets. Asset
metadata and asset bytes live in separate tables so listing artwork does not load it. Address
entries carry a derived multi-entry token index so search is an indexed seek.

Senders and recipients are one contact directory. A contact (record type `Address`, change 0025) has
first and last name, any number of postal addresses (label, fields, one primary, favourites), e-mail
addresses, phone numbers and websites (one primary per kind); the scalar fields `postal`, `email`,
`phone`, `website` are projections of the primary entries, recomputed on every read and write, so
every 1.0 consumer, the snapshot and the search keep reading the same fields. A 1.0 record has only
the scalars; the schema derives the lists from them on read, and nothing is rewritten until the
contact is saved. A contact carries **roles** — `primary` (at most one), `home` (at most one),
`sender`, `favorite`, `normal` — a per-field switch for which contact details print, and, when it
can send, its stationery (footer lines, default signature, letterhead). Database version 2 folds the
former sender-identity table into the directory, preserving ids; the first migrated sender becomes
primary when none is. Backups written before that still import: their sender identities become
sender-capable addresses. Country is chosen from a local, complete ISO 3166-1 list named by the
browser's locale data through a searchable combobox that folds case and diacritics. The directory
search is fuzzy over name, every address, e-mail, tags and notes, runs over the whole set and pages
afterwards, 25 per page.

Contacts import from files (change 0034): vCard 3.0/4.0 (`.vcf`, several cards, folded lines,
quoted-printable 2.1 read leniently) and Google-compatible CSV (other CSVs by header name), through
a button and by dropping the file on the directory. The file is untrusted: 5 MB, 5 000 entries and
64 KiB per entry at most, every field plain text, trimmed and bounded, photos and unknown properties
dropped, country names resolved to ISO codes locally. Before anything is stored a review lists the
contacts in three groups — new, probably existing, needs review — from the signals external id
(vCard `UID` seen before as the provenance origin), normalised e-mail, normalised phone, same name
at the same postal code; a name alone is a suggestion. Each row is skipped, merged or imported as
new; a probable duplicate is skipped unless the person decides otherwise; a merge only adds —
addresses not there yet, new e-mails, phones, websites, tags, a missing name or note — and never
overwrites. Imported contacts carry provenance `imported-file` with the file's id.

Contacts export to files (change 0042, R03-004): the whole directory, alphabetically, as vCard 4.0
(one card per contact, lines folded at 75 characters) or as a CSV in Google Contacts column spelling
(UTF-8 with byte-order mark, every cell quoted, as many address/e-mail/phone/website column groups
as the widest contact needs), from an Export menu next to the import. What travels is who the person
is — names, organisation, every postal address, e-mail, phone and website with its label and the
primary marked, notes, tags, last change — plus the contact's id as `UID:urn:foldmark:contact:<id>`;
roles, stationery, visibility and provenance stay. Foldmark's own import reads both files back and
recognises a UID that names an existing entry as "probably existing". A CSV cell that a spreadsheet
would read as a formula gets a leading space, which every reader trims.

**Templates** (database version 5, change 0039) live in their own table, travel in the backup as
`templates` (absent in older backups, ignored by older importers), are counted in the inventory and
deleted on their own under Data & backup or with everything. Every record is re-validated on read.

Documents may be filed in **folders** (database version 4, change 0024) and archived; folders nest
to eight levels. `folderId`, `archived` and `lastOpenedAt` are local organisation: they live in the
record and the backup, never in the portable Markdown file. Demo records (change 0026) carry
`demoData: true` on documents, contacts, folders and the demo image, so they can be removed without
touching anything a person wrote.

Persisted records are validated with Zod both when written and when read back: IndexedDB is
reachable by any script on the origin and is therefore treated as a trust boundary. A record that
fails validation on read is dropped from the result rather than propagated or thrown, so one damaged
row cannot make a screen unopenable.

Two history tables sit beside the documents. A **working copy** (one row per document) is written
automatically two seconds after the last change and whenever the tab goes into the background or the
document is closed; it is overwritten, never versioned, and offered on open when it is newer than
and different from the stored record. A **checkpoint** is a durable version with an origin — manual
save, import, restore, or the automatic rule that fires at most once per ten minutes of editing —
holding the structured document. Per document at most 50 checkpoints are kept, automatic ones pruned
oldest first; manual, import and restore checkpoints are pruned only past 100. Restore first takes a
checkpoint of the current version (unless the newest already equals it), so restoring is itself
undoable. Deleting a document removes its history; the privacy inventory counts checkpoints and
working copies; backups carry checkpoints, working copies are transient.

Collections are bounded (documents, addresses, folders, checkpoints, asset size and dimensions).
Users can export every stored record as one portable backup, restore it, and delete all of it — or
one collection at a time: documents with folders and history, contacts, images, history.

## Verification

- `tests/contactImport.test.ts` covers the vCard and CSV readers on fixtures, the limits, the review
  signals, the merge and the service's decisions; the e2e suite imports a vCard with a merge.

- `tests/services.test.ts` covers bounds, validation and the backup round trip (folders included).
- `tests/contacts.test.ts` covers the 1.0 record migration, the projections, the fuzzy search, the
  pagination and the country search; `tests/folders.test.ts` the folders and the archive.
- `tests/security/untrustedInput.test.ts` covers records that must be rejected.
- Automated tests and repository policy checks cover the requirement.
