# Proposal: Contact import from vCard and CSV with duplicate review

Status: Implemented (2026-09-16). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Korrekturen_Roadmap_Premium_2026-09-16.md` Teil A, A13.
Roadmap R14-013 (supersedes the one-at-a-time wording of R09-003 for files; connectors stay
one-at-a-time). Priority P1/P2.

## Scope

- **Formats.** vCard 3.0 and 4.0 (`.vcf`, one or many cards, folded lines,
  `CHARSET`/quoted-printable of 2.1 read leniently) and Google Contacts CSV (the export header set;
  other CSVs are read by header name where the names match). Outlook CSV mapping is a later addition
  to the same table.
- **Entry points.** "Import contacts" button in the contact directory and drag-and-drop of a file
  onto the directory panel (drop zone overlay while dragging).
- **Preview before anything is stored.** A dialog lists the count and the three groups: new,
  probably existing, needs review. Nothing is written until "Import" is pressed.
- **Duplicate signals**, in order: vCard `UID` / CSV id already imported (provenance `origin`);
  identical normalised e-mail; identical normalised phone (E.164-ish digits); same normalised name
  plus postal code. Anything weaker is a suggestion in "needs review", never an automatic merge.
- **Conflict review.** Each probable duplicate shows existing vs. import side by side with the three
  choices skip, merge (add missing addresses/e-mails/phones, keep existing values) and import as
  new. The default is skip.
- **Provenance.** Imported contacts carry
  `provenance: { source: 'imported-file', origin: '<uid or row id>', importedAt }`.
- **Untrusted input.** File ≤ 5 MB, ≤ 5 000 entries, ≤ 64 KiB per card; every field is plain text,
  trimmed, length-bounded; photos, keys and unknown properties are dropped; nothing is interpreted
  as HTML or Markdown.

## Acceptance

- A 37-card vCard file with 8 duplicates shows "37 recognised — 24 new, 8 probably existing, 5 need
  review" (fixture); Import with the defaults adds 24 contacts.
- A Google CSV export of three contacts imports name, organisation, one postal address, two e-mails,
  one phone.
- A malformed file reports "no contacts recognised" and stores nothing.
- Every imported contact appears in the directory with its origin visible in the edit dialog.
