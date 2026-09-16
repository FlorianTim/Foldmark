# Changelog

All notable changes to Foldmark are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Foldmark was generated from the LumbreCode Web App Template `1.0.0`; see
`docs/development/GENERATED_FROM_TEMPLATE.md`. The template's own history is not this application's.

## [1.0.0] — 2026-09-17

The first release of Foldmark: everything from the MVP through the two post-release correction
rounds (iterations 1.1–1.4 in the roadmap and the feature log) ships as `1.0.0`.

### Added

- **Document templates.** File → "Save as template…" keeps what you set up once — print profile,
  language, theme and colours, page numbers, salutation, closing, signer, optionally the sender, the
  body and the subject — without recipient and date. "+ New" lists your templates; "Manage
  templates…" renames and deletes them. Templates are part of the backup and of Data & backup.
  Premium shows up here for the first time, in test-phase mode: the first template is free, every
  further one says "Premium — free during the test phase" and works (change 0039).
- **Clear formatting.** One command takes every character mark off the selection — from the toolbar,
  the Format menu or `Ctrl+\`; in the Markdown view the selection is rewritten through the parser so
  links and dates survive (change 0031).
- **Shortcut registry.** Keys, menu labels, toolbar tooltips and Help → Shortcuts come from one
  table, spelled for the platform (`Ctrl+B` / `⌘B`): headings `Ctrl+Alt+1…6`, paragraph
  `Ctrl+Alt+0`, page break `Ctrl+Enter`, link `Ctrl+K`, both redo spellings. Browser keys are never
  claimed; `Ctrl+U` works only inside the editor (change 0032).
- **Contact import.** vCard (`.vcf`, 3.0/4.0, 2.1 leniently) and Google-compatible CSV files import
  through a button or by dropping them on the contact directory. A review lists new, probably
  existing and needs-review contacts — by file id, e-mail, phone, or name and postal code — and each
  row is skipped, merged or imported as new; a merge only adds (change 0034).
- **Drop to import.** Markdown files dropped on the file manager, like files chosen with the button,
  show a preview — title, kind, profile, kept front-matter keys, missing images, findings — before
  "Import" stores them; other files are refused unread (change 0035).
- **Image layout.** A body image can be aligned left, centre or right and sized in millimetres, as a
  share of the text width or to the full width. A toolbar appears on the selected image; the image
  dialog offers the same; the file spells it `{width=50% align=center}`, which Pandoc reads too
  (change 0036).
- **Subject weight.** Format → Bold with the subject field focused sets the whole subject line bold
  or regular on paper; the file carries `subjectWeight: regular` only when it deviates (change
  0030).
- **Reset from contact.** Sender and recipient say when their snapshot differs from the contact
  directory and take the contact's data again on request; the recipient now records the contact it
  came from (change 0033).
- **Roadmap.** Teil C of the 2026-09-16 revision — the `.foldmark` package, protected export, share
  links, premium gating, licences, DOCX/ODT, QR codes, templates — is recorded as roadmap 1.5 with
  two research changes (0037, 0038); landscape documents are planned for 1.6.
- **File manager.** The document list has folders (nested, renamed, moved, deleted with their
  content moving up), an archive, a sortable table with type, folder, changed, last-opened, size and
  status, a "+ New" menu for every document kind, and row actions in one menu (change 0024).
- **Contact directory.** A contact has first and last name, several postal addresses and several
  e-mail addresses, phone numbers and websites — one primary each — edited in a dialog that warns
  before discarding changes; the country is one searchable combobox; the list is grouped by initial,
  searched fuzzily over the whole set and paged (change 0025). 1.0 addresses are read as they are.
- **Demo data.** Settings → Development inserts and removes a deterministic set of twenty contacts,
  two folders, nine documents and one image, marked so removal never touches your own records
  (change 0026; development and test builds only).
- **Print profiles.** Six new built-ins — A5 letter, A6 card, photo 13 × 18 and 15 × 20 cm, DL
  envelope, A7 index card — grouped as Letters, Cards, Photos and Other; own profiles can be renamed
  and their margins set by number (change 0027).
- **Document defaults.** Settings → Documents and Fonts set what a new document starts with:
  document language, date format (written out, short, numeric), print profile, font, size, line
  height, paragraph spacing and page numbers (change 0028).
- **Data management.** Settings → Data & backup deletes documents, contacts, images or the history
  one at a time, each behind its own confirmation (change 0028).

### Changed

- **Document pane.** Four groups: typeface and spacing and the page numbers are subsections of
  Document, the Advanced group is gone; the recipient's e-mail address follows the contact and is
  edited in the e-mail dialog, not in the pane (owner feedback 2026-09-17).
- **One command path.** The menu bar, the toolbar and the keyboard run the same commands through one
  dispatcher with a target — rich editor, Markdown source, subject, or none; entries the target
  cannot serve are disabled (change 0030).
- **Editor controls.** Visual / Markdown is one labelled switch with undo and redo in its row; the
  toolbar, the workspace bar and the preview controls share one control size (38 px hit area, 20 px
  icon); active toggles are filled pills (change 0031).
- **Colours.** The six semantic colours are defaults under Settings → Colours for new documents and
  no longer sit in the document pane; a document with its own mapping keeps it. Format → Document
  font… opens the document's theme group (change 0033).
- **Workspace.** Print, Export and E-mail are three actions with their own dialogs; "Check document"
  lists the findings without blocking (change 0019). The workspace names its areas Document
  settings, Writing area and Preview, folds them to rails, focuses one, resizes them with a
  keyboard-operable splitter and carries a menubar (change 0020). The document settings are
  accordion groups; the title follows the subject until either is edited; salutation and closing are
  fields with show toggles; page numbers can read `1 / 4` and `1 von 4` (change 0021). The editor
  has one toolbar in both views, headings to six, colour and highlight popovers with reset, a table
  size picker, a link dialog and an image dialog (change 0022). The history dialog highlights
  durable versions and the number of automatic versions kept is configurable (change 0023).
- **Assets.** An image has a title independent of its filename and a description, both edited on its
  card next to the file facts; "QR code" is a prepared kind (change 0027).
- **Settings** are categories with a side navigation: General, Documents, Appearance, Fonts, Storage
  & history, Privacy, Data & backup, Development, About (change 0028).
- **Profiles** are named without development labels — "DIN A4 Brief – Form B" — and built-ins cannot
  be deleted; the unverified-standard note stays on the profile (change 0027).
- **Wording.** "Adressbuch" is "Kontaktverzeichnis" / "Contact directory" (change 0025).

### Fixed

- With three areas the toolbar rows had the pane's free height spread between them; table rules are
  0.3 mm so they survive a 70 % zoom and any printer; highlights and note boxes keep their ink when
  the browser's "print backgrounds" is off; the "automatic versions kept" options showed a raw
  translation key (owner feedback 2026-09-17).
- **Print isolation.** The classic menu bar and the editor chrome printed above the sheet in Chrome
  and Firefox, and a blank second sheet followed: the print copy now lives next to the app shell and
  the print medium hides every other child of `body`; the shell's minimum height no longer spills
  the page (change 0029).
- **Trailing page break.** A `::page-break` as the last thing in the body no longer opens an empty
  page; a one-page letter prints one sheet (change 0029, superseding the 1.3 behaviour).
- **Menus.** The Format, Edit, Insert and View menus had done nothing since the menubar arrived — a
  `ref` inside `v-for` handed back an array (change 0030).
- **Highlight.** `:highlight[…]` came back as yellow text after reopening a document: the editor's
  colour parser claimed the directive because `highlight` is also a colour alias (change 0030).
- Chrome printed the open output dialog; body images from the library were not resolved in the
  preview and the print copy; plain-text mail carried Markdown syntax; hiding the guides hid the
  printed marks; `metadata.field.region` was missing; a trailing page break opened no page; the
  preview jumped while typing (change 0018).

- **One Markdown dialect.** The preview, the print copy and the mail renderers now parse with remark
  — the same parser the visual editor uses — through an adapter into the bounded block model, so the
  editor and the paper cannot disagree about a paragraph (change 0016, ADR 0011 amended). Pagination
  slices at the parser's own block boundaries; a numbered list that crosses a page keeps its
  numbers.
- **Dates as directives.** A date inserted by the editor is written as `:date[YYYY-MM-DD]`; the 1.1
  token `{{date:…}}` is still read and migrated when a document is loaded.
- **Pandoc-compatible header.** `lang`, `keywords`, `subject` and `author` are the canonical front
  matter names (`locale` and `tags` are read as aliases); `papersize` and `geometry` are written
  from the print profile so `pandoc file.md -o file.pdf` lays out the same page; unknown lists and
  one-level mappings are preserved with their types; a YAML flow collection drops the affected key
  with a report instead of refusing the file (change 0017).

- **Workspace modes.** The three-column workspace became three modes — Document, Write, Preview —
  shown as tabs on a phone, as the active mode beside the paper on a laptop, and side by side on a
  wide screen. Sender and recipient are accordions; the active mode and the pane layout are
  remembered.
- **Output dialog.** Print, export and email moved out of the permanent workspace into a dialog with
  the findings for the chosen target next to the action; the workspace bar keeps a ready/error
  badge.

- **One address book.** Sender identities became addresses with roles — primary, home, sender,
  favourite — in one alphabetical, searchable list with edit, duplicate, role and use-in-document
  actions. Creating an address starts with a local country list. Contact details carry a per-field
  "show in document" switch. Existing sender identities are migrated in place; old backups still
  import.
- **Address combobox.** Sender and recipient are chosen through an editable, keyboard-operable
  combobox: primary, home and recent addresses without typing, local search while typing, and a book
  icon that opens the address book with the query.
- **Sender snapshot.** A document now embeds its sender as chosen, next to the address-book id it
  came from, so editing the book never rewrites an old letter; "update from address book" is an
  explicit action.

- **Automatic working copy.** Two seconds after the last change — and when the tab goes into the
  background or the document is closed — the working state is written to local storage. On open, a
  newer copy is offered: continue from it or discard it. The status reads "draft saved · time".
- **Document history.** Every manual save, import and ten minutes of editing keep a version.
  "History" lists them by day with a rendered preview; restore (which first keeps the current
  version), open as copy and export. Bounded per document and counted in the privacy view.

- **Rich-text editor.** The body is edited visually — headings, bold, italic, strikethrough, lists,
  quotes, links, tables, rules, undo/redo, keyboard shortcuts — with a switch to the Markdown
  source; both are views of one Markdown string. The editor loads on first use and never renders raw
  HTML. The preview, print and email renderers grew to the same subset.

- **Editor commands.** Today's date or a chosen date (stored as an ISO token, rendered in the
  document language), a salutation and a closing from a local list, and a table — one click each.

- **Page numbers.** None, number only, "Page X" or "Page X of Y", in one of six margin positions,
  optionally hidden on the first page — drawn by the render plan so preview, print and PDF agree.
  The preview now shows every page in print order.

### Added

- **Formatting directives.** Colour, highlight, underline, small, super- and subscript inline;
  indent, alignment, note box, signature line, small print and page break as blocks — written as
  `remark-directive` syntax (`:red[Wort]`, `:::note{type="warning"}`, `::page-break`), chosen from
  the toolbar, rendered on screen, on paper and in mail. Unknown directives are kept and rendered as
  their content, never an error. The Pandoc spellings are read (change 0017, ADR 0019).
- **Colour palette.** Nineteen named tones with `light-`/`dark-` modifiers and six semantic aliases,
  each with a screen value and a print value of at least 4.5:1 contrast; no free colour values.
- **Document theme.** Font family (local stacks), body size, line height, paragraph spacing, small
  size and palette overrides travel with the document (`theme:` in the front matter), drive
  pagination and are separate from the app theme (roadmap R11-019).
- **Images in the body.** `![alt](asset:<id>){width=60mm}` places a picture from the local asset
  library; picked from the toolbar, sized in millimetres, counted in the pagination, reported when
  missing. Remote images stay text (roadmap R12-002, part 1).
- **Documents.** Letters, postcards and cards with a Markdown body and structured metadata. The
  document carries content only; page geometry belongs to the print profile, which is what lets one
  document be rendered onto several different sheets without being rewritten.
- **Print profiles and markers.** Eight built-in profiles and a marker engine covering fold, hole,
  cut, bleed, safe-area, separator, address-window, stamp-area, grid and custom geometry. Each
  marker has independent preview and print visibility, because "a designer can see it" and "ink
  reaches the paper" are different questions.
- **Millimetre-accurate preview and printing.** A pure render plan feeds both the screen and a
  separate print-only copy. Display zoom is a CSS transform on a parent element, so no zoom level
  can move a mark on paper — asserted in unit tests and again in the browser.
- **Target-aware validation.** The same document is complete for one output and incomplete for
  another, so findings are produced per export target and graded into errors, warnings and notes.
- **Local address book and sender identities.** Recipients are embedded in a document, because
  correspondence is a record of what was sent; sender identities are referenced, because stationery
  is expected to follow the sender.
- **Postcards.** Front and back surfaces with per-surface regions, and a two-page export with the
  flip edge stated — a landscape card turned over the wrong edge comes out upside down.
- **Local image library.** Import validated on the decoded bytes rather than the declared type, with
  usage-aware deletion.
- **Email hand-off.** Plain-text and restricted-HTML bodies, a length-guarded `mailto:` link and an
  `.eml` file. Foldmark prepares and hands over; it never sends.
- **Privacy view.** A data inventory counted from storage, a complete backup that restores, and
  content deletion kept separate from preference reset.

### Fixed

- **Guides toggle.** "Hide guides" now hides every marker on screen, printed fold and hole marks
  included. Previously only preview-only guides disappeared, which read as the toggle not working.
  What prints is still decided solely by the print profile; the toggle never reaches the paper plan.
- **About view.** Says "About Foldmark" and describes the product; the intro no longer mentions the
  template. Shows the repository link, a route to the privacy view and an optional build id. A test
  keeps template wording out of both language catalogues.
- **Save status.** The workspace bar shows new / unsaved / saving / saved · time / error as glyph
  plus text, and the Save button stays enabled instead of greying out on a clean document.
- **Print filename.** The print dialog now suggests the document title (else the subject) as the PDF
  filename and Title instead of "Foldmark".

### Security

- No HTML is generated from document text anywhere in the application, on screen or in email. There
  is no sanitizer because there is nothing to sanitize (ADR 0011). With remark as the parser the
  refusals live in the mdast adapter: HTML nodes, unsafe link schemes and non-local images become
  text; directive attributes are validated against a registry; colours are palette names resolved
  through the theme and reach the DOM only as CSS variable references set through CSSOM, so the
  strict `style-src` policy stays intact (change 0017).
- Front matter is parsed by a bounded subset that refuses anchors, aliases, tags, block scalars and
  flow collections with the offending line number, and bounds depth, size and key shape (ADR 0010).
- Mail header values are refused rather than repaired when they contain a control character, and are
  checked before any whitespace normalization.
- Image imports are validated against the decoded image; SVG is not accepted.

### Changed

- The colour theme now defaults to the application's configured theme rather than `system`.
- The Markdown parser moved from the presentation layer to the domain so the preview and the HTML
  email renderer share one definition of a paragraph.

### Fixed

- A new postcard was created on the default letter profile, leaving it with one side and no address
  region.
- Validation message keys contained dots, so vue-i18n rendered raw keys instead of messages.
- The strict `style-src` policy blocked the Vite dev server's injected stylesheets, leaving the
  development app unstyled. Relaxed for the dev server only; every build keeps the strict policy.

## Template origin — LumbreCode Web App Template 1.0.0 (2026-08-05)

Not a Foldmark release. This entry records the LumbreCode Web App Template version this application
was generated from. The template supplied the application shell, the privacy and security baseline,
the toolchain and the documentation contract; everything under 1.0.0 above is Foldmark's own.
