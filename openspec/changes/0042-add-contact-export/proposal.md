# Proposal: Contact export as vCard and CSV

Status: Implemented (2026-09-17). Source: roadmap R03-004 ("Addresses import and export as CSV and
JSON"), the export half; the import half shipped as change 0034. Priority: Could. Picked because the
directory could be filled from a phone or Google but not handed back — a one-way door in a
local-first app is a lock-in by omission.

## Scope

- **Formats.** vCard 4.0 (`.vcf`, one card per contact, CRLF, lines folded at 75 characters) and a
  CSV in Google Contacts column spelling (`Name`, `Given Name`, `Family Name`,
  `Organization 1 - Name`, `Address 1 - Street` …, `E-mail 1 - Value`, `Phone 1 - Value`,
  `Website 1 - Value`, `Notes`, `Labels`), UTF-8 with byte-order mark, every cell quoted. JSON is
  not added: the backup already is the JSON export of the directory, and no address book reads a
  bespoke JSON.
- **Entry point.** An **Export** menu next to **Import contacts** in the contact directory, with the
  two formats; disabled while the directory is empty. Always the whole directory in alphabetical
  order — never the current page or the search result, so what the file holds is not a question of
  what was on screen.
- **What travels.** Display name, first and last name, organisation and department (of the primary
  postal address), every postal address with its label, every e-mail, phone and website with its
  label and the primary marked (`PREF=1`), notes, tags, the last change (`REV`), and the contact's
  own id as `UID` (`urn:foldmark:contact:<id>`). What stays: roles, stationery, contact visibility,
  provenance, timestamps, demo flag — how this browser uses an entry, not who the person is.
- **Round trip.** Foldmark's own import reads both files back without loss of the fields above (the
  CSV import reads the first address group only, as before); a re-import into the same directory
  recognises every entry by its UID as "probably existing", so the default is skip, not a double.
- **Spreadsheet safety.** A CSV cell that starts with `=`, `+`, `-`, `@` or a tab gets a leading
  space so a spreadsheet keeps it as text; the import trims it away.
- **Not in scope:** a per-contact export, a selection, Outlook column spelling, photos.

## Acceptance

- A directory with two contacts exports a `.vcf` with two cards and a `.csv` with three lines; both
  are named `foldmark-kontakte-<date>` in German and `foldmark-contacts-<date>` in English.
- Importing the `.vcf` back shows both as "probably existing"; the CSV shows the same.
- A contact named `=SUM(1)` is exported as `" =SUM(1)"` and imported back as `=SUM(1)`.
- With no contact the menu items are disabled.
