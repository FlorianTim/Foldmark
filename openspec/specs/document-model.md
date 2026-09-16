# Document Model

## Requirement

A document carries semantic content and never physical geometry. It has a kind (`letter`,
`postcard`, `card`, `photo-card`, `email`, `custom`), a title, its own locale, a Markdown body,
structured metadata, optional per-surface content, asset placements, a preferred print profile and
per-document export preferences.

Recipient addresses are **embedded** in the document, not referenced: correspondence is a record of
what was sent, so editing an address-book entry must not rewrite a letter that has already gone out.
The sender is embedded the same way, as a **snapshot** — name, postal fields, the contact details
the address releases, footer lines — beside the id of the address-book entry it came from (ADR
0017). The renderer uses the snapshot; the source id only resolves letterhead and signature while
the entry exists, and lets the UI offer "update from address book" as an explicit action. In the
portable file the snapshot is a flat `sender` map plus a `senderFooter` list; a file without one
still resolves through `senderProfileId` on open.

### Canonical portable format

The exchange format is Markdown with YAML front matter, readable and editable without Foldmark:

- `foldmarkVersion: 1` identifies the format; an unknown version is refused, not guessed.
- Content, addresses, dates, subject, keywords, the document theme and export preferences round-trip
  without loss.
- The body is edited either visually — a ProseMirror editor behind `RichTextEditorPort` that reads
  and writes Markdown — or as source; both are views of the same string (ADR 0016). Both are parsed
  by **one dialect** (change 0016): CommonMark, GFM tables and double-tilde strikethrough, and
  `remark-directive`. The rendered subset covers headings, paragraphs, bullet and numbered lists
  with nesting, block quotes, tables, rules, hard breaks, strong, emphasis, code, strikethrough,
  `http(s)`/`mailto` links, local `asset:` images, and the directive catalogue and palette of
  `document-formatting.md`; raw HTML, any other link scheme and any other image source stay inert
  text in every renderer.
- A date inserted by the editor is stored as the directive `:date[YYYY-MM-DD]` and rendered in the
  document's language by every renderer; to any other reader it is the ISO date. The 1.1 token
  `{{date:YYYY-MM-DD}}` is read and migrated when a document is loaded.
- Unrecognized top-level **scalars, lists of scalars and one-level mappings of scalars** are
  preserved with their scalar types and written back; deeper structures are dropped and reported,
  because carrying arbitrary untrusted trees is not worth the convenience. A YAML flow collection
  (`[a, b]`, `{a: b}`) drops the affected key with a report instead of refusing the file; nothing
  inside the brackets is interpreted (ADR 0010 holds).

### Pandoc-compatible header (change 0017)

The front matter is usable by `pandoc file.md -o file.pdf` without giving up Foldmark's semantics:

| Key                                                                                                                                                                                                                     | On read                                                                                    | On write                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`, `date`, `subject`                                                                                                                                                                                              | taken over                                                                                 | written                                                                                                                                                         |
| `lang` (canonical), `locale` (1.x alias)                                                                                                                                                                                | the document language                                                                      | `lang`                                                                                                                                                          |
| `keywords` (canonical), `tags` (1.x alias)                                                                                                                                                                              | the tags                                                                                   | `keywords`                                                                                                                                                      |
| `author`                                                                                                                                                                                                                | ignored while a `sender` snapshot exists (the snapshot is the source); preserved otherwise | the sender's display name, else the preserved value                                                                                                             |
| `papersize`, `geometry`                                                                                                                                                                                                 | never read — the print profile is the page — but preserved                                 | **derived** from the profile's sheet (named size or `paperwidth`/`paperheight`, `margin=` or four margins, `landscape`) when the profile is known, else carried |
| `theme`                                                                                                                                                                                                                 | validated as a whole; invalid → defaults with a report                                     | deviations from the default theme only                                                                                                                          |
| Foldmark-own keys (`foldmarkVersion`, `kind`, `printProfile`, `sender`, `senderFooter`, `recipient`, `pageNumbers`, `surfaces`, `export`, `salutation`, `closing`, `reference`, `signerName`, `signatureId`, `emailTo`) | taken over                                                                                 | written; Pandoc ignores them — no namespace prefix is needed                                                                                                    |
| `subtitle`, `titlepage`, `toc`, `lot`, `lof`, `subparagraph`, `links-as-notes`, `header-*`, `footer-*` (Pandoc / Eisvogel)                                                                                              | preserved, not interpreted — a letter has no title page                                    | written back unchanged                                                                                                                                          |

`tests/fixtures/pandoc-example.md` is the reference header; `tests/pandocFrontMatter.test.ts` proves
that its import loses nothing preservable and its export writes it back.

- Free asset placements are not written to the file — they position bytes that exist only in one
  browser. The backup package is the complete copy.
- A file that cannot be parsed is returned as a failure carrying the issues **and the original
  source**, so the user gets their text back.

### Print options

Print options carry the page-number format and position, whether subject and date print, the
document theme and, since change 0028, the **date format** (`long`, `medium`, `numeric`; absent
means `long`), which the render formats in the document's own language. The front matter writes
`dateFormat` only when it deviates from `long`. Since change 0030 they also carry whether the
subject line is **bold** (`subjectBold`; absent means yes, the letter convention), written as
`subjectWeight: regular` only when it is not — the subject is a structured line and never rich text.

### Templates (change 0039)

A **document template** is a document with the parts of one letter taken out: no recipient, no date,
no folder, no archive flag, no history. It keeps kind, print profile, document language, print
options (theme, colours, page numbers, date format, subject weight), export preferences, letterhead
placements, tags, and the metadata that describes the sender side — sender snapshot and its source
id, salutation, closing, signer, signature, hand-off address; the body and the subject are taken
along on request. `createTemplateFromDocument` and `documentFromTemplate` are pure: a document made
from a template has its own id, today's date for a letter, and shares nothing with the template
afterwards. Templates are their own record type (`DocumentTemplateSchema`, strict, bounded like a
document; at most 200), never a flagged document, and never part of the portable Markdown file.

### Contact snapshots

The recipient, like the sender, is a snapshot copied into the document (ADR 0017). Since change 0033
the document also records `recipientContactId`, the directory entry the snapshot came from, next to
`senderProfileId`; both are written to the front matter and let the workspace show when the snapshot
differs from the directory and reset it from there. Neither id is needed to render.

## Verification

- `tests/markdownCodec.test.ts` covers the round trip, preservation and every refusal;
  `tests/pandocFrontMatter.test.ts` the Pandoc header and the dropped flow syntax.
- `tests/frontMatter.test.ts` covers the parser subset and its bounds.
- `tests/markdown.test.ts` is the contract of the parsed subset; `tests/editor/roundtrip.test.ts`
  the editor's round trip through the same dialect.
