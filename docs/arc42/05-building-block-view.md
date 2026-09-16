# Building Block View

The source is split into inward-facing layers:

- **Domain** owns immutable entities, bounds, and runtime schemas without framework imports.
- **Application** coordinates use cases and declares persistence ports and stable application
  errors.
- **Infrastructure** implements ports with browser technology and validates persisted data in both
  directions.
- **Presentation** renders Vue components, maintains Pinia screen state, translates errors, and owns
  resilient local UI preferences.
- **Composition root** wires application services to infrastructure adapters in one explicit place.

See `docs/development/SOURCE_CODE.md` for the file-level map and extension workflow.

## Notable blocks after 1.1

- **Workspace modes** (`presentation/workspace/workspaceLayout.ts`, `WorkspacePanel.vue`): Document,
  Write and Preview as a tablist; the pane count is a pure function of width and preference.
- **Address book** (`domain/address`, `AddressBookService`): one repository with roles; senders are
  a projection (`senderProfileFrom`) and documents carry a snapshot (ADR 0017).
- **History** (`domain/document/History.ts`, `HistoryService`, `DexieHistoryRepositories`): working
  copies and checkpoints in their own tables, bounded per document.
- **Rich editor** (`application/ports/RichTextEditorPort.ts`, `infrastructure/editor/`): Milkdown
  behind a port, loaded as a separate chunk; the Markdown subset in `domain/markdown` grew to match.
- **Render plan** additions: date tokens resolved per locale, a page-number block per page.

## Notable blocks after 1.2 (changes 0016 and 0017)

- **One Markdown dialect** (`domain/markdown/remarkPipeline.ts`): remark-parse, remark-gfm (double
  tilde only) and remark-directive plus Foldmark's own transform (Pandoc spellings, image
  attributes). The rich editor registers the same plugins, so what it writes the preview reads.
- **mdast adapter** (`domain/markdown/mdastAdapter.ts`): the syntax tree becomes the bounded block
  model the renderers enumerate; refusals (HTML, unsafe links, non-local images, depth) happen here.
  Framework-free and configured by the directive registry, so it can be lifted into a shared module.
- **Directive registry** (`domain/markdown/directives.ts`) and **document theme**
  (`domain/document/DocumentTheme.ts`): the catalogue, the palette with screen and print values, and
  the theme resolved from the document's deviations. Consulted by the editor
  (`infrastructure/editor/foldmarkSyntax.ts`), the adapter, the height estimate
  (`application/render/textMetrics.ts`) and the surfaces
  (`presentation/markdown/themeVariables.ts`).
- **Codec** (`infrastructure/codec/`): Pandoc-compatible header — canonical Pandoc names, derived
  `papersize`/`geometry`, preserved lists and one-level mappings, dropped-and-reported flow syntax.

## Notable blocks after 1.3 (changes 0018–0028)

- **Dialogs** (`presentation/components/AppDialog.vue`, `ConfirmDialog.vue`, `PromptDialog.vue`):
  one native `<dialog>` wrapper every dialog builds on — output, check, history, contact, move,
  link, image, shortcuts — with focus return and a print-medium rule that hides the top layer.
- **Workspace layout** (`presentation/workspace/workspaceLayout.ts`, `PaneResizer.vue`,
  `AppMenu.vue`): three named panes, layout ids, rails, focus and splitter maths as pure functions;
  the menubar issues the same commands as the toolbar. Icons come from one sprite built by
  `scripts/build-icon-sprite.mjs` from `src/assets/icons/sprite/`.
- **Letter blocks** (`domain/markdown/letterBlocks.ts`, `domain/document/documentSync.ts`): the
  salutation and closing directives and the one-time title/subject coupling.
- **Folders and the list** (`domain/document/Folder.ts`, `documentList.ts`, `FolderService`,
  `DexieFolderRepository`): the file-manager view of the document collection; Dexie version 4.
- **Contacts** (`domain/address/Address.ts` with `normalizeContact`, `CountryCombobox.vue`,
  `ContactDialog.vue`): lists with primary projections (ADR 0020), the fuzzy search and paging.
- **Demo data** (`application/demo/`, `DemoDataService`): a deterministic set with fixed ids and a
  canvas-free PNG, inserted and removed from the settings.
- **Settings** (`presentation/settings/documentDefaults.ts`, `SettingsPanel.vue`): categories,
  document defaults as one preference, per-collection deletions on `BackupService`.

## Notable blocks after 1.4 (changes 0029–0036)

- **Print isolation** (`WorkspacePanel.vue`, `styles/print.css`): the print copy is teleported next
  to the app shell; the print medium shows that one child of `body` and hides every other — no class
  list to maintain. `paginateBody` normalises the page list (no trailing empty page).
- **Command dispatcher** (`presentation/editor/commandDispatcher.ts`): menu, toolbar and keys run
  one table of commands over a target (rich editor, Markdown source, subject, none) reported by the
  editing surfaces; entries the target cannot serve are disabled.
- **Shortcut registry** (`presentation/shortcuts/shortcutRegistry.ts`, `useShortcuts.ts`): one typed
  list drives the key handling (workspace scope on the document, editor scope caught in the capture
  phase of the editor root), the menu labels, the tooltips and the shortcuts dialog, spelled per
  platform.
- **Editor controls** (`EditorModeSwitch.vue`, `ImageToolbar.vue`, `clearFormattingCommand`,
  `setImageLayoutCommand` in `foldmarkSyntax.ts`): the view switch, the strip on a selected image
  and the two new commands; `domain/markdown/clearFormatting.ts` is the source-view variant.
- **Image layout** (`domain/markdown/directives.ts` → `parseImageLayout` / `serializeImageLayout`,
  `remarkPipeline.ts`): a general attribute block after an image (`width` in mm or %, `align`) read
  into the inline token and written back in a fixed order; every renderer and the height estimate
  read the same token.
- **Contact import** (`domain/address/import/contactImport.ts`, `contactReview.ts`,
  `AddressBookService.importContacts`, `ContactImportDialog.vue`): vCard and CSV readers that never
  throw, the four duplicate signals, the merge that only adds, the review dialog with one decision
  per row.
- **Import preview** (`ImportPreviewDialog.vue`): the file manager's button and drop zone share one
  decode-then-preview path; several files queue.
- **Document defaults** (`documentDefaults.ts`): the six semantic colour aliases as global defaults
  (Settings → Colours), written into a new document only as deviations; the document pane no longer
  edits them.
- **Templates** (`domain/document/DocumentTemplate.ts`, `TemplateService`, `templates` table,
  `SaveTemplateDialog.vue`, `TemplatesDialog.vue`): a document snapshot without recipient, date,
  folder and history; new documents from it through the ordinary document store.
- **Premium registry** (`domain/entitlement/premiumFeatures.ts`): stable feature ids, free
  allowances and the `featureState` a use case asks; `beta` phase answers `beta-free` above the
  allowance. The provider seam of research change 0038 plugs in here.
