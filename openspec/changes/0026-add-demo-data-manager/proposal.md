# Proposal: Demo data for development and tests

Status: Implemented (2026-09-15). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Postrelease_Anforderungen_2026-09-13.md` §12. Roadmap
R13-029.

## Scope

- Settings → Development (dev builds only): "Insert demo data" and "Remove demo data".
- `DemoDataService` seeds 20 contacts (countries, cities, primary, home, favourites, several
  emails/phones/websites, PO box, organisations, tags) and documents (letters, postcards, a free
  document, a multi-page letter, a document with an image, one with a table, one with a page break,
  an archived one, documents in two folders) with deterministic ids (`demo-contact-001`,
  `demo-document-001`) and `demoData: true`; removal deletes exactly the marked records, including
  the demo asset and folders.
- E2E and screenshot tests enable the data through the settings action (a `?demo` query is not
  offered; the action is the only entry).

## Acceptance

AC-CONTACT-001/002. Unit test: seeding is idempotent and removal leaves user records untouched.
