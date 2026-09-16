# Proposal: Asset metadata and image preview; print-profile catalogue

Status: Implemented (2026-09-15). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Postrelease_Anforderungen_2026-09-13.md` §14–§16, §64, Phase
G 1–2. Roadmap R13-030, R13-031.

## Scope

- **Assets**: `title` (editable, independent of the filename), `description`; kinds gain `qr-code`
  (prepared, no generator); the library card edits title and description inline and shows filename,
  MIME type, dimensions, size, date; the image picker shows a thumbnail with title, dimensions and
  size; the import limit and rejection reasons are worded plainly.
- **Profiles**: built-ins renamed ("DIN A4 Brief – Form B", no "(Entwurf)"; the unverified status
  stays as data and as a note); grouped by category in the panel and the document select; new
  built-ins: A5 letter, A6 card, photo 13 × 18, photo 15 × 20, DL envelope, A7 index card; system
  profiles cannot be deleted; custom profiles are created from any profile, renamed, have margins
  edited numerically, duplicated and deleted.

## Acceptance

AC-ASSET-001…005. Unit tests: schema defaults for `title`/`description`, new profiles validate; e2e:
rename an asset title.
