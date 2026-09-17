# Proposal: Document types

Status: Proposed (2026-09-18) — the owner's next feature. Source: owner request 2026-09-18
(`drafts/notes/processed.md`). Roadmap R17-001…R17-006. Priority: Should.

## Problem

A document has a **kind** (letter, postcard, card, photo card, e-mail, custom): the physical form,
which picks the print profile. It has no notion of **what the letter is for**. An invoice, a
cancellation, a letter to the pension insurance or the tax office all carry the same handful of
structured details — a number, a date, an amount, an account — that today go into the body as prose
or into the one `reference` field, and that the renderer therefore cannot place, label or turn into
a payment code.

## Scope

- **A type next to the kind.** A document may carry a `type` from a built-in catalogue. `plain` (no
  extra fields) is the default and what every existing document has. The type is chosen when a
  document is created ("+ New → Letter as… → Invoice") and can be changed later in Document settings
  → Document, next to the profile and the name. Kind and type are independent: an invoice may be a
  letter or an e-mail.
- **The catalogue.** Seven built-in types, each a declarative list of fields (key, value kind,
  bounds, printed by default or not): `plain`, `invoice`, `reminder`, `cancellation`, `objection`,
  `authority`, `application`. The fields are listed in the design. Adding a type is adding data, not
  code; own types stay open for a later change (R15-010 template packs).
- **The type shapes the left-hand form.** Document settings gain an accordion group named after the
  type ("Invoice details") between Letter details and Page numbers, showing exactly the type's
  fields with the right input (text, identifier, date, money, IBAN, BIC, choice). `plain` shows no
  group.
- **The fields print.** Printed fields join the info block (where the reference and the date print
  today) as label/value lines in the document's language, in the catalogue's order; an empty field
  is not printed; every field has a "show in document" switch. Where a profile has no info block
  they print as a compact block above the salutation. The e-mail renderer writes them as "Label:
  value" lines before the body.
- **Bank details in the contact directory.** A contact may carry bank accounts (holder, IBAN, BIC,
  label, one primary). The IBAN is checked (length per country, mod-97) and stored without spaces;
  the BIC is 8 or 11 characters. The invoice's account defaults to the sender contact's primary
  account and can be swapped for another account of that contact or typed in; a typed account is a
  snapshot in the document, like sender and recipient (ADR 0017).
- **Payment code.** For `invoice` and `reminder`, Insert → "Payment QR code" (and a button beside
  the account field) inserts `::pay{…}` into the body: an EPC QR code ("GiroCode") for a SEPA credit
  transfer with beneficiary name, IBAN, BIC, amount in EUR, and the remittance text — invoice number
  and purpose. Attributes left out are taken from the invoice fields when the code is drawn, so the
  code follows the amount; attributes given win. Drawn with the same encoder and print checks as
  `::qr` (change 0040); counted against the same quota.
- **Changing the type.** Switching the type of a document with values in the old type's fields asks
  first — the same discard-style confirmation the profile switch uses — and says what happens: the
  old values stay in the file under their keys but are no longer shown or printed; switching back
  brings them back. Nothing is deleted by a type change.
- **Round trip.** The file carries `documentType: invoice` and a `details` map of the filled fields
  (`invoiceNumber`, `amount`, `iban`, …); a file without them is `plain`; an unknown type or an
  invalid value is reported and dropped, never repaired (validation.md). Bank details in the contact
  go into the backup, not into the vCard or CSV export (neither has a field for them).
- **Templates and copies.** A template keeps the type and its fields except those the catalogue
  marks per-document (invoice number, reminder date), which start empty in a new document from it.
  Duplicate and "Save as" (change 0050) copy everything.
- **Not in scope:** own field catalogues, a Swiss QR-bill, ZUGFeRD/XRechnung, tax or interest
  calculation, a line-item table (a Markdown table does that), sending anything.

## Acceptance

- "+ New → Letter as… → Invoice" opens a letter with the Invoice group; number `2026-017`, amount
  `149,90`, the sender contact's primary IBAN prefilled; the preview's info block reads
  "Rechnungsnummer 2026-017 · Fällig am 2026-10-02 · Betrag 149,90 €"; the file has
  `documentType: invoice` and `details: { invoiceNumber: "2026-017", amount: "149.90", … }`.
- Insert → Payment QR code puts `::pay{}` at the caret; the preview draws a code whose payload is
  `BCD\n002\n1\nSCT\n<BIC>\n<holder>\n<IBAN>\nEUR149.90\n\n\nRechnung 2026-017`; changing the amount
  to `150,00` changes the code without touching the body.
- Changing the type to Cancellation asks "Change the document type?" naming the three filled invoice
  fields; after confirming, the group shows the cancellation fields, the info block prints none of
  the invoice values, the file still carries them; changing back shows them again.
- A contact with IBAN `DE89 3704 0044 0532 0130 00` stores `DE89370400440532013000`; `DE89 … 01` is
  refused with "This IBAN does not check out"; the backup round-trips the account; the vCard export
  has no trace of it.
- Every existing document opens as `plain` with no new group and no change to its print.
