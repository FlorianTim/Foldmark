# Proposal: Contact directory — contact model, country combobox, modal editor, fuzzy search, pagination

Status: Implemented (2026-09-15). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Postrelease_Anforderungen_2026-09-13.md` §6–§11, §13, Phase
F. Roadmap R13-026…R13-028.

## Scope

- **Model**: an `Address` (kept as the record type for compatibility) gains `firstName`, `lastName`,
  `addresses: PostalEntry[]` (label, postal fields, primary, favourite), `emails`, `phones`,
  `websites` (`{ value, label?, primary }`[]); `postal`, `email`, `phone`, `website` stay as the
  **primary projections** so every existing consumer (snapshot, render plan, search, email hand-off)
  keeps working. The projections are recomputed on save.
- **Migration**: Dexie v4 reads 1.0 records; `AddressSchema` defaults the new lists from the scalar
  fields, so nothing is rewritten until a contact is saved.
- **Country**: `CountryCombobox.vue` — one searchable combobox, fuzzy over the local list in the UI
  language, keyboard, ISO code stored. Used in the contact editor and the recipient form.
- **Editor**: `ContactDialog.vue` on `AppDialog`: name, organisation, tags, favourite, several
  postal addresses (add / remove / primary), emails, phones, websites, notes, sender options;
  unsaved-changes warning on close; delete with confirmation.
- **List**: alphabetical, grouped by initial, fuzzy search (`fuzzyMatches` in the domain:
  case/diacritic-insensitive subsequence over name, organisation, city, street, email, tags, notes)
  over the whole set, then pagination (25 per page, `‹ 1 2 3 ›`).
- **Wording**: "Kontaktverzeichnis" / "Contact directory" in the navigation and the document.

## Acceptance

AC-CONTACT-003…008. Unit tests: migration defaults, projections, fuzzy search, pagination; component
tests `CountryCombobox`, `ContactDialog`; e2e: create a contact with two emails, search "Berlin".
