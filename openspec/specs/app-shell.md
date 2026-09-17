# App Shell

## Requirement

Responsive Vue application shell with localized navigation, safe error handling, keyboard-visible
focus, accessible landmarks, persisted language/theme preferences and runtime-safe public
configuration.

The primary navigation exposes Documents, the Contact directory, Print profiles and Images; Settings
and About complete the bar. The brand mark returns to the document list.

The settings are categories (change 0028) — General, Documents, Appearance, Fonts, Colours, Storage
& history, Privacy, Data & backup, Development (development and test builds only), About — as a side
navigation on a wide screen and a row of tabs on a phone, one category on screen at a time. General
holds the German/English language and the intro; Documents the defaults a new document starts with
(document language, date format, print profile, page numbers), Fonts its typography and Colours
where the six semantic colours (success, warning, danger, info, muted, highlight) point (change
0033), stored as one `document-defaults` preference and written into a new document only as
deviations from the factory values — the document pane offers no colour mapping of its own, a
document that carries one keeps it; Storage the automatic-version bound; Privacy the route to the
privacy view; Data & backup the per-collection deletions — documents (with folders and history),
contacts, images, history, everything — and the settings reset, each behind its own confirmation
dialog. The privacy view keeps the inventory, the backup and the two original confirmed actions. The
Development category carries diagnostics and the demo data (change 0026): "insert" writes twenty
contacts, two folders, nine documents and one image with fixed ids and `demoData: true`,
idempotently; "remove" deletes exactly the marked records. The actions exist in development builds
and in builds made with `VITE_DEMO_DATA=true` (the Playwright build), never in a shipped one.

The About view is a rendering of validated configuration and nothing else: application name and a
localized product description, version, an optional build id (`VITE_BUILD_ID`), the organization,
the licence, a repository link derived from the configured owner and name, a route to the in-app
privacy view, the third-party notices and the public app website. No shipped UI string mentions the
template the application was generated from; a test guards both catalogues.

The document list is a file manager (change 0024): a "+ New" menu with every document kind and a
folder, import, export/backup and an archive toggle; a breadcrumb down the folders; a sortable table
(name, type, folder, changed, last opened, size, status) with folders first; a row menu with open,
rename, duplicate, move, archive/restore, export and delete — rename and move in dialogs, delete
behind a confirmation. Folders nest to eight levels and cannot be moved into themselves; deleting a
folder moves its content up one level. Archived documents and folders leave the ordinary lists and
appear in the archive view. Opening stamps `lastOpenedAt` without counting as an edit. Folder,
archive and opening stamps are local organisation and never enter the portable Markdown file.

While no contact carries the `primary` role the file manager offers, once the directory is loaded,
to store the own sender details (change 0044, R15-006): "Set up now" opens the contact dialog with
the sender switch on and stores the contact as `primary` and `sender`; "Later" hides the offer for
the session; "Don't ask again" writes the preference `sender-onboarding-v1`. The offer blocks
nothing and requires no e-mail address.

The document workspace occupies the full window width and names its three areas **Document
settings**, **Writing area** and **Preview** (change 0020). Above 1180 px all three stand side by
side, between 980 px and 1180 px two, below one as a tablist; a layout preference (automatic, any
single area, any pair, all three) overrides the width and is persisted, as are collapsed rails and
the pane widths. An area folds to a rail with its icon and unfolds from it; a focus button gives one
area the whole workspace and Escape leaves it; a keyboard-operable splitter between areas never
folds a pane below its minimum. Above the areas a menubar (File, Edit, Insert, Format, View, Help)
issues the same commands as the toolbar. Since 2026-09-17 the document settings are **four** groups
— Document (profile, name, then the paper's typeface and spacing and the page numbers and printed
marks as subsections), Sender, Recipient, Letter details; the former Page numbers, Document theme
and Advanced groups are folded in, and the recipient's e-mail address is no field of the document
pane: it comes from the contact (on pick and on "Reset from contact") and is edited in the e-mail
dialog. Menu, toolbar and keyboard go through one command dispatcher with a **target** — the rich
editor, the Markdown source, the subject field, or none (change 0030). The target is the editing
surface the writer was last in; a click on a menu does not change it. Entries the target cannot
serve are disabled; with no surface touched yet every Format entry is disabled. Format → Bold over
the subject toggles the whole line's weight. Format → Document font… unfolds the theme group and
focuses the size (change 0033).

Keyboard shortcuts come from one registry (change 0032) that drives the key handling, the menu
labels, the toolbar tooltips and Help → Shortcuts, spelled for the platform (`Ctrl+B` / `⌘B`).
`workspace` shortcuts (save, print) work anywhere in the open document; `editor` shortcuts (undo,
redo, bold, italic, underline, link, select all, page break `Ctrl+Enter`, clear formatting `Ctrl+\`,
paragraph and headings `Ctrl+Alt+0…6`) only inside an editing surface, so `Ctrl+U` outside the
editor stays the browser's. Browser and window keys (`Ctrl+N`, `O`, `W`, `T`, `R`, `F`) are never
claimed. Inside the rich editor the keys are caught before ProseMirror's own keymap, so a key fires
once.

Find and replace (change 0048, R12-002): Edit → "Find and replace…" (`Ctrl+H` inside an editing
surface) opens a bar above the writing area with find, previous/next, a counter, Match case, Whole
word, Replace and Replace all. Matching is plain text, never a pattern, and the same in the visual
editor — where a match may span marks and is marked with a highlight while the bar has the focus —
and in the Markdown source. Replace acts on the selected match and steps on; Replace all is one undo
step.

The Visual / Markdown views are one labelled switch (`role="switch"`, change 0031) with undo and
redo in the same row; the view's explanation is its tooltip. Toolbar controls share one size (38 px
hit area, 20 px icon) with the workspace bar and the preview controls; every icon-only control has a
tooltip and an ARIA name; an active toggle is a filled pill. The document settings are accordion
groups with stored open state — Document (profile first, then the internal name), Sender, Recipient,
Letter details (subject, date, reference, salutation, closing with show toggles), Page numbers,
Document theme, Advanced (change 0021); the title follows the subject while it was never edited, and
the other way round. Sender and recipient are chosen through an editable WAI-ARIA combobox over the
contact directory, the country through a searchable combobox over the local ISO list. Field
visibility has three kinds (change 0033): an empty optional field (reference, phone) is not rendered
and has no switch; a filled field that may be hidden (subject, date) keeps its "show in document"
switch; sender and recipient are never hidden by folding — the accordion changes the editing surface
only, folded it shows a one-line summary and the directory action, unfolded the editable snapshot, a
"changed against the contact directory" status when the snapshot differs from its source, and "Reset
from contact", which takes the contact's current data again and discards local edits.

File → "Save as template…" (change 0039) takes a template from the open document: name, description,
and whether the sender, the body and the subject come along. The "+ New" menu lists the templates by
name after the kinds (the first eight; "Manage templates…" opens a dialog with every template, its
kind, profile and date, and the actions use, rename/describe and delete). A new document from a
template starts in the current folder with the kind's usual title and today's date for a letter; a
profile the template names but the catalogue no longer has falls back to the kind's default.

Premium appears here for the first time, in **beta-free** mode (C10–C12): the first template is
free, every further one is marked "Premium — free during the test phase" in the save dialog. The
state comes from the domain registry `premiumFeatures.ts` and is asked in the use case
(`TemplateService.saveFromDocument`), not only in the dialog; no purchase button exists, and the
local counters are what they are — this browser's, editable by its owner. The second gate is the QR
code (change 0040, Insert → QR code and the toolbar): five codes are free, further ones are marked
in the dialog; `QrCodeService.generate` decides and counts, and a counter with a free allowance is a
`FeatureUsageStore` port backed by the `premium-usage` preference.

The file manager imports Markdown through its button and by dropping files on it (change 0035): both
paths decode the file and show a preview — title, kind, profile, unknown front-matter keys kept,
referenced images missing from the library, the codec's findings — before "Import" stores it; a file
that cannot be read shows its original text and cannot be imported; anything that is not Markdown is
refused unread. Several dropped files are previewed one after the other.

Output actions are three (change 0019): Print, Export and E-mail, each its own dialog on the shared
`AppDialog` (title, close button, Escape, backdrop for non-destructive dialogs, focus return to the
opener, sheet on a phone). A "Check document" action shows the findings for every target; a missing
recipient is a warning, never a block. Every dialog is hidden in the print medium, so Chrome prints
the paper only.

The workspace bar shows a save status with five states — new, unsaved, saving, saved with the time
of the last write, error — each as a glyph plus text, with colour only added on top. "Saved" reads
"draft saved" while the time refers to the automatic working copy rather than the record. The Save
button is always enabled: saving a clean document re-confirms the state and refreshes the time, and
a manual save takes a checkpoint. A failed save keeps the working copy dirty and shows the error
state until the next edit or save. A "History" action opens the document's checkpoints grouped by
day, with a rendered preview and the actions restore, open as copy and export. When a newer working
copy exists on open, a banner offers to continue from it or discard it.

Document text renders only through the documented non-HTML Markdown subset.

## Verification

- `tests/e2e/foldmark.spec.ts` covers navigation, landmarks, locale and theme persistence, the save
  status before and after a save, the three areas with folding, focus and splitter, the output
  dialogs, the file manager (folder, move, archive, restore, delete, drop import with preview), the
  contact directory (including the vCard import review and the snapshot reset), the Format menu on a
  selection and on the subject, the keys, the demo data through the settings and the document
  defaults on a new letter.
- `tests/shortcuts.test.ts` covers the registry (chords, platforms, browser keys left alone) and the
  dispatcher's target rules; `tests/documentDefaults.test.ts` the colour defaults.
- `tests/templates.test.ts` covers what a template keeps and drops, the switches, the fresh
  document, the beta-free gate, the service and the backup; the e2e suite saves two templates,
  starts a letter from one, renames and deletes.
- `tests/workspaceLayout.test.ts` covers the pane sets, slots and width clamping;
  `tests/folders.test.ts` the folder tree, the list sorting and the folder service;
  `tests/demoData.test.ts` the demo set; `tests/documentDefaults.test.ts` the defaults, the date
  format and the per-collection deletions.
- `tests/saveStatus.test.ts` covers the five save states; `tests/i18n.test.ts` guards against
  template wording.
- Automated tests and repository policy checks cover the requirement.
