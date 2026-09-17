# Design: Document types

| Decision                                                                                   | Alternative rejected                           | Why                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A `type` beside the `kind`, not a new kind per purpose                                     | Kinds `invoice-letter`, `invoice-email`, …     | The kind picks the paper and the regions; the purpose picks the fields. Crossing them would multiply the kind list and break every place that switches on it.                       |
| Types are data: a catalogue of field descriptors                                           | A Vue form and a schema per type               | Seven types today, packs tomorrow (R15-010). One form renders any descriptor list; one Zod schema validates any `details` map against the catalogue.                                |
| Field keys are global, values live in one flat `details` map                               | `details` nested per type                      | `invoiceNumber` means the same on an invoice and a reminder, so switching keeps it. A flat map of scalars is exactly the one-level mapping the front-matter subset already carries. |
| Switching the type keeps the old values                                                    | Clearing the fields the new type does not show | The owner's rule: warn, hide, never discard. The values are small and the file stays honest about what was typed.                                                                   |
| `::pay{…}` as its own leaf directive with a composer that falls back to the invoice fields | Writing the EPC payload into `::qr[…]`         | The EPC payload has line breaks and no place in an inline label; `::qr` refuses line breaks on purpose. Attributes keep the file readable and let the code follow the amount.       |
| Bank details on the contact, snapshotted into the document                                 | Bank details only in the document              | Same reasoning as sender and recipient (ADR 0017): the invoice records what was printed; the directory holds what is current.                                                       |
| Bank details stay out of vCard and CSV                                                     | A vendor field `X-FOLDMARK-IBAN`               | No importer reads it, Google's CSV has no column, and an IBAN in a contacts export that lands in a mail client is a leak waiting to happen. The backup carries them.                |
| Printed fields join the info block                                                         | A directive `::details` in the body            | The info block is where the reference and the date print already; a profile without one gets the same block above the salutation. The body stays prose.                             |

## Domain

`src/domain/document/DocumentType.ts`:

```ts
export type DocumentType =
  'plain' | 'invoice' | 'reminder' | 'cancellation' | 'objection' | 'authority' | 'application';
export const DOCUMENT_TYPES: readonly DocumentType[]; // in menu order, `plain` first

export type DetailValueKind =
  'text' | 'identifier' | 'date' | 'money' | 'iban' | 'bic' | 'choice' | 'boolean';

export interface DetailFieldDescriptor {
  readonly key: DetailKey; // global, camelCase, also the i18n key `details.<key>`
  readonly valueKind: DetailValueKind;
  readonly maxLength?: number; // text 140, identifier 40
  readonly options?: readonly string[]; // choice
  readonly printedByDefault: boolean;
  readonly perDocument?: boolean; // cleared when a document is made from a template
}
export interface DocumentTypeDefinition {
  readonly id: DocumentType;
  readonly fields: readonly DetailFieldDescriptor[];
  readonly payable?: boolean; // offers the payment code
}
export const DOCUMENT_TYPE_CATALOGUE: Readonly<Record<DocumentType, DocumentTypeDefinition>>;

export type DetailValue = string | boolean;
export type DocumentDetails = Readonly<Record<DetailKey, DetailValue>>;

export function fieldsOf(type: DocumentType): readonly DetailFieldDescriptor[];
export function visibleDetails(type, details): readonly { field; value }[]; // filled, in order
export function hiddenOnSwitch(from, to, details): readonly DetailFieldDescriptor[]; // filled fields `to` does not show
export function stripPerDocument(details): DocumentDetails;
```

The catalogue (labels are i18n; German shown for the owner):

| Type           | Fields (key — kind — printed by default)                                                                                                                                                                                                                                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plain`        | —                                                                                                                                                                                                                                                                                                                                                                     |
| `invoice`      | `invoiceNumber` (Rechnungsnummer) — identifier, per-document — ✔; `customerNumber` (Kundennummer) — identifier — ✔; `servicePeriod` (Leistungszeitraum) — text — ✔; `dueDate` (Fällig am) — date — ✔; `amount` (Betrag) — money — ✔; `purpose` (Verwendungszweck) — text ≤ 140 — ✘; `accountHolder`, `iban`, `bic` (Kontoinhaber, IBAN, BIC) — ✔; `bankAccountId` — ✘ |
| `reminder`     | `invoiceNumber` ✔, `invoiceDate` (Rechnung vom) — date ✔, `reminderLevel` (Stufe) — choice `friendly` / `first` / `second` ✔, `dueDate` ✔, `amount` ✔, `customerNumber` ✔, `purpose` ✘, `accountHolder`/`iban`/`bic` ✔, `bankAccountId` ✘                                                                                                                             |
| `cancellation` | `contractNumber` (Vertrags-/Mitgliedsnummer) — identifier ✔; `customerNumber` ✔; `effective` (Kündigung zum) — choice `next-possible` / `date` ✔; `effectiveDate` — date, printed with `effective = date` ✔; `confirmationRequested` (Bestätigung erbeten) — boolean ✘                                                                                                |
| `objection`    | `noticeDate` (Bescheid vom) — date ✔; `fileNumber` (Aktenzeichen) — identifier ✔; `customerNumber` ✔; `deadline` (Frist) — date ✘                                                                                                                                                                                                                                     |
| `authority`    | `fileNumber` ✔; `pensionInsuranceNumber` (Rentenversicherungsnummer) — identifier ✔; `healthInsuranceNumber` (Versichertennummer) — identifier ✔; `taxNumber` (Steuernummer) — identifier ✔; `taxId` (Steuer-ID) — identifier ✔; `customerNumber` ✔                                                                                                                   |
| `application`  | `position` (Stelle) — text ✔; `jobReference` (Kennziffer) — identifier ✔; `earliestStart` (Frühester Eintritt) — date ✔; `source` (Gefunden auf) — text ✘                                                                                                                                                                                                             |

Value rules: `identifier` is trimmed, single-line, ≤ 40; `date` is `YYYY-MM-DD`; `money` is a
canonical decimal string with two places (`149.90`), entered in the document's locale (`149,90`) and
bounded to `0.01 … 999999999.99`; `iban` is stored normalised (upper-case, no separators) and must
pass the check below; `bic` is 8 or 11 characters `[A-Z0-9]`; `taxId` is 11 digits; a value that
breaks its rule is refused in the form and dropped with a report on read.

`src/domain/finance/iban.ts`: `normalizeIban`, `isValidIban` (country length table for the SEPA
countries, alphanumeric fallback 15–34, mod-97 on the rearranged string in 9-digit chunks — no
`BigInt` needed), `formatIban` (groups of four for display), `isValidBic`. Unit-tested with the
usual valid and broken samples.

`src/domain/qr/epcPayload.ts` — the EPC QR code (European Payments Council "Quick Response Code:
Guidelines to Enable Data Capture for the Initiation of a SEPA Credit Transfer", the "GiroCode"):

```ts
export interface EpcPaymentFields {
  readonly name: string; // beneficiary, ≤ 70
  readonly iban: string; // normalised
  readonly bic?: string; // optional since version 002 inside the EEA
  readonly amount?: string; // canonical decimal, EUR only
  readonly purpose?: string; // unstructured remittance, ≤ 140; the structured reference is not used
}
export type EpcIssue = 'name' | 'iban' | 'bic' | 'amount' | 'purpose' | 'too-long';
export function composeEpcPayload(fields): { payload: string } | { issue: EpcIssue };
```

Lines joined with `\n`: `BCD`, `002`, `1` (UTF-8), `SCT`, BIC or empty, name, IBAN, `EUR<amount>` or
empty, empty purpose code, empty structured reference, the unstructured text; total ≤ 331 bytes;
error correction `M` at least (the guideline's minimum). Fixtures compare against a published
GiroCode sample. `validateQrPayload` keeps refusing line breaks for `::qr`; the `::pay` renderer
hands the composed payload to `encodeQrMatrix` directly.

`FoldmarkDocument` gains `type?: DocumentType` (absent = `plain`), `details: DocumentDetails`
(default `{}`) and `detailsHidden: readonly DetailKey[]` (fields the writer switched off).
`DocumentSchema` validates `details` against the catalogue's value rules for the keys it knows and
drops unknown keys with a report. `DocumentTemplate` gains `type` and `details`;
`documentFromTemplate` applies `stripPerDocument`. `TITLE`/`BODY` bounds are untouched; `details` is
bounded to 32 keys, each value ≤ 140 characters.

`Address` gains `bankAccounts: readonly BankAccount[]`
(`{ id, label?, holder?, iban, bic?, primary }`, ≤ 4, one primary, normalised on save through
`normalizeContact`). The vCard and CSV codecs ignore it; the backup carries it; the privacy
inventory counts contacts with bank details.

## Directive `::pay`

`document-formatting.md` catalogue entry: leaf, no label, attributes `iban`, `bic`, `name`,
`amount`, `purpose`, plus `size`, `align`, `ec` as `::qr`. Missing payment attributes are taken from
the document at render time — `iban`, `bic`, `accountHolder`, `amount` and `purpose` (default
`purpose` = "Rechnung <invoiceNumber>" in the document's language) — so `::pay{}` on an invoice is
the common spelling. A `::pay` whose composed payload has an issue draws no code and shows the issue
in the editor and the preview (as a missing image does); the print copy prints nothing there. In the
Markdown source and for any other reader it is the directive text. The QR quota
(`QrCodeService.generate`) counts a payment code like any other.

## Application and codec

- `MarkdownDocumentCodecImpl`: writes `documentType` (only when not `plain`), `details` (only the
  filled keys) and `detailsHidden` (only when non-empty); reads them back with the catalogue check.
  `frontMatter.ts` needs no change — a one-level mapping of scalars is already carried.
- `buildRenderPlan`: the info block's entries become reference, then `visibleDetails` minus
  `detailsHidden` (dates through `formatDocumentDate`, money through `Intl.NumberFormat` with
  `currency: 'EUR'`, IBAN through `formatIban`, choices through their label), then the date. A
  profile without an `infoBlock` region gets the same entries as a `fields` block at the top of the
  body flow with style `meta`. `DefaultEmailRenderer` writes "Label: value" lines before the body.
- `DocumentService.create(kind, { type })`; `workspaceStore.setType(type)` returns the fields that
  will be hidden so the form can ask first.
- `AddressBookService` validates bank accounts on save.

## Presentation

- `DocumentListPanel` "+ New": after the kinds, a group "Letter as…" with the six non-plain types;
  each creates a letter of that type and opens it. The table's type column reads "Letter · Invoice".
- `MetadataForm` → Document group: a "Type" select after the profile. Changing it with values that
  the new type does not show opens the discard-style confirmation naming those fields and stating
  that they are kept in the file; Cancel restores the select.
- `DetailsGroup.vue`: one accordion group titled with the type, rendering the descriptor list —
  identifier/text inputs, the app's date input, a money input that parses the locale, IBAN with live
  check and grouped display, BIC, a select for choices, a switch for booleans, and the per-field
  "show in document" switch (R14-011 pattern). For payable types the account row has "From contact…"
  (the sender contact's accounts, primary preselected) and "Payment QR code" which inserts `::pay{}`
  at the caret or moves to the existing one.
- Insert menu and QR toolbar: "Payment QR code" enabled only on payable types.
- `ContactDialog`: group "Bank details" with up to four accounts (label, holder, IBAN, BIC,
  primary); the IBAN error text is the domain issue.
- i18n de/en: `documents.type.*`, `details.*` labels, choice labels, the confirmation, the pay
  dialog strings. `tests/i18n.test.ts` guards that every catalogue key has both labels.

## Verification

- Unit: catalogue integrity (unique keys, every key labelled), value rules, `hiddenOnSwitch`,
  `stripPerDocument`, IBAN/BIC suite, EPC composer fixtures, codec round trip with `details`, render
  plan with and without an info block, e-mail lines, contact normalisation with accounts.
- e2e: create an invoice from "+ New", fill it, see the info block, insert the payment code and
  check its payload through the SVG's data attribute, switch the type and confirm, backup round trip
  with a contact that has an IBAN.
