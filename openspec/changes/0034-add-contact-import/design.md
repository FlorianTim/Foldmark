# Design: Contact import

| Decision                                                               | Alternative rejected            | Why                                                                                                                                                                                            |
| ---------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Own vCard and CSV readers in the domain (`src/domain/address/import/`) | A vCard library                 | The subset Foldmark needs (N, FN, ORG, ADR, EMAIL, TEL, URL, NOTE, CATEGORIES, UID) is small; every candidate library pulls in more surface than that and none is a licence-vetted dependency. |
| Readers return `ImportedContact[]` plus issues, never throw            | Exceptions for bad files        | Same rule as the Markdown codec: a bad file is a report, not a crash.                                                                                                                          |
| Duplicate detection is a pure function over the existing directory     | Detection inside the repository | Testable with fixtures; the service only stores what the user chose.                                                                                                                           |
| Merge adds, never overwrites                                           | Field-by-field pick             | A13's dialog shows three buttons; a field picker is a later refinement if asked.                                                                                                               |

## Domain

```ts
export interface ImportedContact {
  readonly externalId?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly displayName: string;
  readonly organisation?: string;
  readonly addresses: readonly PostalAddressDraft[];
  readonly emails: readonly string[];
  readonly phones: readonly string[];
  readonly websites: readonly string[];
  readonly notes?: string;
  readonly tags: readonly string[];
}
export function parseVCard(text: string, limits?: ImportLimits): ContactImportResult;
export function parseContactCsv(text: string, limits?: ImportLimits): ContactImportResult;
export function detectContactFile(text: string): 'vcard' | 'csv' | 'unknown';
export function reviewImport(
  contacts: readonly ImportedContact[],
  existing: readonly Address[],
): ImportReview; // groups + signals
export function mergeContact(existing: Address, incoming: ImportedContact, now: string): Address;
```

Normalisation helpers: `normalizeEmail` (lower-case, trim), `normalizePhone` (digits, leading `+`),
`normalizeName` (case-fold, collapse whitespace, strip diacritics).

## Application

`AddressBookService.importContacts(decisions: readonly ImportDecision[])` stores in one pass (`add`
/ `update`) and returns counts. Provenance is set here.

## Presentation

`ContactImportDialog.vue`: drop/choose file → parse → review list (three sections, each row with its
choice) → Import → summary toast. The directory panel gets the button and a `dragover`/`drop`
handler that hands the file to the dialog. i18n for both languages; fixtures under
`tests/fixtures/contacts/`.
