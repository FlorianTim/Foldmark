# Feature log

One line per feature and per bugfix, newest version first. **What shipped when**, scannable —
`CHANGELOG.md` explains _why_ and _how_, this answers _when_.

Maintained continuously, not written at release time: every change that adds or fixes something
user-visible or developer-visible adds its row in the same pull request. See "Feature log" in
`AGENTS.md`.

## Legend

| Type | Meaning                                                         |
| ---- | --------------------------------------------------------------- |
| ✨   | Feature — something new you can use                             |
| 🐛   | Bugfix — something that was broken                              |
| ♻️   | Change — existing behaviour works differently                   |
| 🧱   | Foundation — structure, rules, tooling; no user-visible surface |

Status is `shipped` unless the version is still in progress.

---

## Unreleased

### Iteration 1.5 — premium features

| Type | Area     | What                                                                                                                                                                                                                  | Reference                     |
| ---- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| ✨   | Editor   | QR codes in the body: Insert → QR code or the toolbar; web address, e-mail, phone or text; size, alignment, error correction; live preview with the module size and print check                                       | R15-011, change 0040          |
| 🧱   | Format   | `::qr[payload]{size=30mm align=center ec=M}` in the directive catalogue; the label is read literally from the source, so a payload is never re-read as Markdown                                                       | R15-011, change 0040          |
| 🧱   | Premium  | Second gate, with the first counter: `qr.generate` (five free, then beta-free) counted in the use case behind a `FeatureUsageStore` port and the `premium-usage` preference                                           | R15-007, R15-011, change 0040 |
| ✨   | Print    | Page numbers: a first page number for a letter that continues another, left/right swapped on even sheets for double-sided printing, and an own wording with `{page}` and `{pages}`                                    | R12-003, change 0041          |
| ✨   | Contacts | Export the directory as vCard 4.0 or Google-compatible CSV from an Export menu; both read back through the import, which recognises the entries by their UID                                                          | R03-004, change 0042          |
| ✨   | Profiles | Calibration sheet per print profile: a frame 10 mm from every edge, ticks every 10 mm, a centre cross and the profile's printed marks, with instructions — printed through the same print copy as a letter            | R02-002, change 0043          |
| ✨   | Contacts | Own-sender onboarding: while no primary contact exists the file manager offers to store the sender details once — set up now, later, or never again; no e-mail required                                               | R15-006, change 0044          |
| 🐛   | Files    | A row menu near the bottom edge of the window opens upward; before, it hung below the viewport and could not be clicked                                                                                               | R13-024, change 0044          |
| ✨   | Profiles | Landscape: A4, A5 and US Letter landscape ship as profiles; an own profile turns between portrait and landscape in the editor, refused when a mark would leave the sheet                                              | R16-001, change 0045          |
| 🐛   | Profiles | A copy of US Letter never let its body follow the margins because of float drift in the margin box check; the check now tolerates 0.01 mm                                                                             | R13-031, change 0045          |
| ✨   | Images   | Draw a signature: a pad under Images takes pen, finger or mouse; the drawing is cropped to the ink and stored as a transparent signature image through the ordinary import rules                                      | R02-003, change 0046          |
| ✨   | Profiles | Marker editor: the marks of an own profile are edited by number — kind, label, position, length or size, direction, line, stroke, printed/preview — added, reordered and removed, with the checks shown while editing | R02-001, change 0047          |
| ✨   | Editor   | Find and replace: a bar above the writing area (Edit menu, `Ctrl+H`) with previous/next, counter, match case, whole word, replace and replace all — in the visual editor and the Markdown source alike                | R12-002, change 0048          |

## Foldmark 1.0.0 — released 2026-09-17

Everything below, from the MVP to iteration 1.4, ships as `1.0.0`; the iteration headings are the
roadmap's, kept so a row still says which round brought it.

### Iteration 1.4 — second correction round and templates

| Type | Area      | What                                                                                                                                                                  | Reference                     |
| ---- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 🐛   | Printing  | The menu bar and the editor chrome printed above the sheet; the print copy now lives next to the app shell and the print medium hides everything else                 | R14-001, change 0029          |
| 🐛   | Printing  | A blank second sheet: the shell's minimum height spilled the page, and a trailing page break opened an empty page — neither prints any more                           | R14-002, change 0029          |
| 🐛   | Editor    | The Format, Edit, Insert and View menus did nothing (a `ref` inside `v-for`); menu, toolbar and keys now go through one dispatcher with a target                      | R14-003, change 0030          |
| ✨   | Documents | Format → Bold over the subject field sets the whole subject line regular or bold on paper (`subjectWeight`)                                                           | R14-003, change 0030          |
| 🐛   | Editor    | `:highlight[…]` came back as yellow text instead of a highlight after reopening: the colour parser no longer claims inline-directive names                            | R14-004, change 0030          |
| ✨   | Editor    | "Clear formatting" removes every character mark (toolbar, Format menu, `Ctrl+\`), in the Markdown view by rewriting the selection through the parser                  | R14-005, change 0031          |
| ♻️   | Editor    | Visual / Markdown is one labelled switch with undo and redo in its row; the explanation is a tooltip                                                                  | R14-006, change 0031          |
| ♻️   | Editor    | Toolbar, workspace bar and preview controls share one size (38 px hit area, 20 px icon); active toggles are filled pills; every icon-only control has a tooltip       | R14-007, change 0031          |
| ✨   | Shortcuts | One shortcut registry drives keys, menu labels, tooltips and Help → Shortcuts, spelled per platform; headings `Ctrl+Alt+1…6`, page break `Ctrl+Enter`, link `Ctrl+K`  | R14-008, change 0032          |
| ♻️   | Settings  | The semantic colours moved out of the document pane into Settings → Colours as defaults for new documents                                                             | R14-009, change 0033          |
| ✨   | Editor    | Format → Document font… opens the theme group with the size focused                                                                                                   | R14-010, change 0033          |
| ✨   | Documents | Sender and recipient show "changed against the contact directory" with "Reset from contact"; the recipient records its source contact                                 | R14-011, R14-012, change 0033 |
| ✨   | Contacts  | Import from vCard (`.vcf`) and Google-compatible CSV, by button or drop, with a review of new / probably existing / needs review and skip / merge / new per row       | R14-013, change 0034          |
| ✨   | Documents | Markdown files can be dropped on the file manager; button and drop share one preview (title, kind, profile, kept keys, missing images) before anything is stored      | R14-014, change 0035          |
| ✨   | Images    | Body images align left, centre or right and size in mm, as a share of the text width or to the full width — from a toolbar on the selected image and the image dialog | R14-015, change 0036          |
| 🧱   | Roadmap   | Teil C (package format, share links, premium) recorded as research changes 0037 and 0038 and roadmap 1.5; landscape documents planned for 1.6                         | R15-001…R15-014, R16-001      |
| ✨   | Documents | Own document templates: File → Save as template…, "+ New" from a template, a Templates dialog to use, rename and delete; templates in backup and inventory            | R15-009, change 0039          |
| ♻️   | Documents | The document pane is four groups: typeface/spacing and page numbers moved into Document, the Advanced group is gone, the recipient e-mail follows the contact         | owner feedback 2026-09-17     |
| 🐛   | Editor    | With three areas the toolbar rows had the pane's free height spread between them                                                                                      | owner feedback 2026-09-17     |
| 🐛   | Printing  | Table rules are 0.3 mm (they dropped out at 70 % and on some printers); highlights and note boxes keep their ink when the browser omits backgrounds                   | owner feedback 2026-09-17     |
| 🐛   | Settings  | The "automatic versions kept" options showed a raw translation key                                                                                                    | owner feedback 2026-09-17     |
| 🧱   | Premium   | First premium gate in beta-free mode: feature ids and states in `premiumFeatures.ts`, checked in the use case; the second template is marked, never blocked           | R15-007, change 0039          |

### Iteration 1.3 — post-release correction round

| Type | Area      | What                                                                                                                                                                                          | Reference                      |
| ---- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 🐛   | Printing  | Chrome printed the open output dialog: dialogs now close before `print()` and are hidden in the print medium                                                                                  | R13-001, change 0018           |
| 🐛   | Images    | Body images from the library were not resolved in the preview and the print copy ("image missing"); the editor showed no frame while loading                                                  | R13-002, change 0018           |
| 🐛   | Email     | Plain-text mail carried Markdown syntax (`*` bullets, `> ` quotes, `                                                                                                                          | `tables,`---` rules)           | R13-003, change 0018 |
| ♻️   | Preview   | Guides and printed marks are two switches: hiding guides keeps the ink; the printed-marks switch drives preview and print                                                                     | R13-004, change 0018           |
| 🐛   | i18n      | `metadata.field.region` was missing in both catalogues; a test now covers keys built from field lists                                                                                         | R13-005, change 0018           |
| 🐛   | Rendering | A page break at the end of the body did not open the next page                                                                                                                                | R13-006, change 0018           |
| 🐛   | Preview   | Scroll jumps: page selection scrolls only from the navigator, the viewport is re-measured only when its size changes                                                                          | R13-007, change 0018           |
| ✨   | Output    | Print, Export and E-mail as three actions with their own dialogs on a shared `AppDialog`; "Check document" without blocking                                                                   | R13-010 … R13-012, change 0019 |
| ✨   | Workspace | Three named areas with layout selector, collapse rails, focus mode, keyboard splitters and a menubar; icon sprite from the redesign pack                                                      | R13-014 … R13-017, change 0020 |
| ✨   | Document  | Accordion groups with stored state, profile first, title/subject one-time sync, letter details with show toggles, `salutation`/`closing` directives, page-number formats `slash`/`of`         | R13-018 … R13-020, change 0021 |
| ✨   | Editor    | One toolbar for both views, headings to six, colour/highlight popovers with reset, table size picker, link dialog with text, image dialog with library and import                             | R13-021, R13-022, change 0022  |
| ✨   | History   | History dialog on `AppDialog`, durable versions highlighted, retention of automatic versions configurable                                                                                     | R13-023, change 0023           |
| ✨   | Documents | Document list as a file manager: "+ New" menu, folders, sortable table, breadcrumb, archive, row actions, rename/move dialogs; Dexie v4                                                       | R13-024, R13-025, change 0024  |
| ✨   | Contacts  | Contact model with names, several postal addresses and contact points (one primary each), searchable country combobox, contact dialog with unsaved-changes guard, fuzzy search, pagination    | R13-026 … R13-028, change 0025 |
| ✨   | Settings  | Demo data inserted and removed through Settings → Development (20 contacts, 2 folders, 9 documents, 1 image, marked `demoData`)                                                               | R13-029, change 0026           |
| ✨   | Assets    | Title and description edited in place with the file facts; `qr-code` kind prepared                                                                                                            | R13-030, change 0027           |
| ✨   | Profiles  | Built-ins renamed and grouped, six new built-ins (A5 letter, A6 card, photo 13 × 18 / 15 × 20, DL envelope, A7 index card), custom profiles renamed and margins edited, built-ins undeletable | R13-031, change 0027           |
| ✨   | Settings  | Nine categories with side navigation; document defaults (language, date format, profile, fonts, page numbers) applied to new documents; per-collection deletions with confirmations           | R13-032, change 0028           |
| ✨   | About     | Structured open-source view (library, version, licence, link; runtime and development), About reorganised                                                                                     | R13-008, change 0018           |

### Iterations 1.1 / 1.2 — workspace, editor and formatting (2026-09-11 … 2026-09-13)

| Type | Area      | What                                                                                                                   | Reference                |
| ---- | --------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 🐛   | Preview   | Hiding guides hid every mark on screen; the print plan never saw the toggle                                            | R10-001, change 0002     |
| 🐛   | About     | Template wording removed from the About view; version set to 1.0.0                                                     | R10-002, change 0003     |
| ✨   | Workspace | Save status and a permanent Save button                                                                                | R10-003/004, change 0004 |
| ✨   | Printing  | The document title becomes the PDF filename and Title                                                                  | R10-007, change 0015     |
| ✨   | Workspace | Three modes (Document, Write, Preview) as tabs, pair or three columns; output in a dialog                              | R11-001/002, 0005, 0013  |
| ✨   | Addresses | One address book with roles (primary, home, sender, favourite), contact visibility, snapshots in documents             | R11-004…009, 0006, 0007  |
| ✨   | Documents | Automatic working copy, manual checkpoints, document history with restore and open-as-copy                             | R11-010…013, 0008, 0009  |
| ✨   | Editor    | Rich-text editor (Milkdown) with Markdown source view, undo/redo, convenience commands                                 | R11-012…016, 0010, 0011  |
| ✨   | Rendering | Page numbers in six positions and four formats; the preview shows every page                                           | R11-017/018, 0012        |
| ✨   | Editor    | One remark dialect for editor and renderers; directive catalogue, palette, document theme, local images, Pandoc header | R12-006…008, 0016, 0017  |

### Iteration 0.1 — the MVP

| Type | Area           | What                                                                                                                                                  | Reference                                     |
| ---- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 🧱   | Initialization | Foldmark generated from the LumbreCode Web App Template; Todo demo replaced                                                                           | `docs/development/GENERATED_FROM_TEMPLATE.md` |
| ✨   | Documents      | Letter, postcard and card documents with structured metadata and a Markdown body                                                                      | `openspec/specs/document-model.md`            |
| ✨   | Documents      | Canonical Markdown + YAML front-matter format with lossless round trip and preserved unknown scalars                                                  | ADR 0010                                      |
| ✨   | Print profiles | Eight built-in profiles: DIN-style Form A and B, blank A4, A4 letterhead, A5 card, A6 duplex postcard, 10 × 15 photo, US Letter                       | `builtInProfiles.ts`                          |
| ✨   | Print profiles | Marker engine: fold, hole, cut, bleed, safe area, separator, address window, stamp area, grid, custom — with independent preview and print visibility | `openspec/specs/print-profiles.md`            |
| ✨   | Print profiles | Profile catalogue showing every marker coordinate in millimetres, with cloning                                                                        | `PrintProfilePanel.vue`                       |
| ✨   | Rendering      | Deterministic render plan in millimetres, shared by preview and print                                                                                 | ADR 0012                                      |
| ✨   | Rendering      | Paper preview at true physical size; zoom is a transform and cannot alter an export                                                                   | `PaperPreview.vue`                            |
| ✨   | Rendering      | Pagination decided in the plan, with an overflow warning instead of silent clipping                                                                   | `buildRenderPlan.ts`                          |
| ✨   | Printing       | Print-only copy built in `paper` mode plus a runtime `@page` size rule                                                                                | ADR 0013                                      |
| ✨   | Validation     | Target-aware checks graded into errors, warnings and notes, all returned at once                                                                      | `openspec/specs/validation.md`                |
| ✨   | Addresses      | Local address book with token-indexed search, plus sender identities                                                                                  | `AddressBookPanel.vue`                        |
| ✨   | Addresses      | Duplicate detection that reports and never merges                                                                                                     | `Address.ts`                                  |
| ✨   | Postcards      | Front/back editing, per-surface regions, two-page print order with a flip-edge note                                                                   | `SurfaceEditor.vue`                           |
| ✨   | Images         | Local image library with byte-sniffing import validation and usage-aware deletion                                                                     | `AssetService.ts`                             |
| ✨   | Email          | Plain-text and restricted-HTML bodies, length-guarded `mailto:`, RFC 5322 `.eml` builder                                                              | `openspec/specs/email-handoff.md`             |
| ✨   | Privacy        | Counted data inventory, complete backup export and import, content deletion separate from preference reset                                            | `PrivacyPanel.vue`                            |
| ✨   | Branding       | Foldmark identity, palette, favicon and social assets; daisyUI mapped onto the app tokens                                                             | `themes.css`                                  |
| 🧱   | Security       | No HTML generated from document text anywhere; the Markdown parser moved to the domain and is shared by preview and email                             | ADR 0011                                      |
| 🧱   | Security       | Bounded YAML subset parser with named refusals for anchors, aliases, tags, flow collections and depth                                                 | ADR 0010                                      |
| 🧱   | Security       | Mail header values refused rather than repaired, validated before whitespace normalization                                                            | `EmailHeaders.ts`                             |
| 🐛   | Security       | `suggestSubject` collapsed whitespace before the header check, quietly repairing a `\r\n` injection attempt                                           | `EmailHandoffService.ts`                      |
| 🐛   | Documents      | A new postcard was created on the default _letter_ profile, so it had one side and no address region                                                  | `workspaceStore.ts`                           |
| 🐛   | i18n           | Validation keys were stored with dots inside the key, so vue-i18n rendered raw keys instead of messages                                               | `messages/*.json`                             |
| 🐛   | Development    | The strict style policy blocked the dev server's injected stylesheets, leaving the development app unstyled                                           | `vite.config.ts`                              |
| ♻️   | Settings       | The theme now defaults to the application's configured theme instead of `system`                                                                      | `settingsRegistry.ts`                         |
| 🧱   | Testing        | 208 unit and integration tests plus 18 end-to-end journeys, including a security suite of negative cases                                              | `tests/`                                      |
| 🧱   | Documentation  | OpenSpec specs and first change, arc42 1–4 and 9, ADRs 0009–0015, six diagram sources, data inventory, external request register, threat model        | `docs/`                                       |
