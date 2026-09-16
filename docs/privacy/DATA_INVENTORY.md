# Data inventory

Everything Foldmark stores, stored **only in the visitor's own browser**. There is no account, no
server and no upload. The privacy view inside the app counts these categories by reading the tables,
so the numbers a user sees are measured rather than remembered.

## Content, in IndexedDB `foldmark-db`

| Data                                                                                                                                                                                                                                                 | Purpose                                     | Table                          | Retention and deletion                                                                             | Recipient |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------- | --------- |
| Documents: title, kind, locale, Markdown body, subject, date, reference, salutation, closing, **embedded recipient address**, email address, tags, asset placements, export preferences                                                              | The correspondence itself                   | `documents`                    | Until deleted individually, until "delete my local data", or until site data is cleared            | None      |
| Address book: display name, postal fields, email, phone, notes, tags, provenance — since change 0034 also what an imported vCard or CSV carried (several addresses, e-mails, phones, websites, categories, the file's own id as `provenance.origin`) | Reusable recipients                         | `addresses`                    | As above                                                                                           | None      |
| Derived search tokens for each address                                                                                                                                                                                                               | Indexed search without a full scan          | `addresses` (multiEntry index) | Deleted with the address                                                                           | None      |
| Sender identities: name, postal fields, contact fields, footer lines, letterhead placements, default signature                                                                                                                                       | Writing _as_ someone                        | `senderProfiles`               | As above                                                                                           | None      |
| User-owned print profiles                                                                                                                                                                                                                            | Custom paper geometry                       | `printProfiles`                | As above                                                                                           | None      |
| Document templates (change 0039): name, description, kind, profile, sender snapshot, salutation, closing, signer, theme, page numbers, optionally body and subject — no recipient, no date                                                           | Starting a new document the same way again  | `templates`                    | Until deleted individually, until "delete templates" / "everything", or until site data is cleared | None      |
| Image metadata: type, size, SHA-256 checksum, pixel dimensions, original filename                                                                                                                                                                    | Listing artwork without loading it          | `assets`                       | As above                                                                                           | None      |
| Image bytes, including **signature images**                                                                                                                                                                                                          | Letterheads, logos, photographs, signatures | `assetData`                    | As above                                                                                           | None      |

## Preferences, in localStorage, namespaced `foldmark:ui:`

| Key                                     | Purpose                                                                                       | Deletion                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------- |
| `locale`                                | German or English interface                                                                   | "Reset settings", or site-data clearing |
| `theme`                                 | Colour theme                                                                                  | As above                                |
| `privacy-notice-v1`                     | Whether the first-visit intro was completed                                                   | As above                                |
| `entitlement`, `entitlement-checked-at` | Cached entitlement level from the template's purchase seam; no purchase channel is configured | As above                                |
| `default-sender-profile`                | Sender for new documents                                                                      | As above                                |
| `default-print-profile`                 | Profile for new documents                                                                     | As above                                |
| `preview-zoom`, `preview-guides`        | How the preview is displayed                                                                  | As above                                |

## Two deletions, deliberately separate

- **Delete my local data** clears every content table above and keeps preferences.
- **Reset settings** clears every preference and keeps content.

They have different consequences, so they have different buttons and different confirmations.

## Sensitivity

Correspondence contains names, postal addresses and, where a user imports one, an image of their
signature. IndexedDB is **not** secure storage: any script running on this origin can read it, and a
browser extension may be such a script. That is why Foldmark generates no HTML from user text at all
— preventing script execution on this origin is the control that protects this data.

A stored signature image is an image. It is not a qualified electronic signature and carries no
cryptographic meaning.

## Export and portability

"Export all data" writes one JSON file containing every table above plus the preferences, with image
bytes base64-encoded. It restores completely. Individual documents also export as Markdown with YAML
front matter, readable without Foldmark.
