# Design: Document templates

| Decision                                                                        | Alternative rejected                           | Why                                                                                                                                |
| ------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| A template is its own record type, derived from a document                      | A document flagged `template: true`            | Templates have no recipient, date, folder or history and are listed elsewhere; one flag would leak them into every document query. |
| `createTemplateFromDocument` / `documentFromTemplate` are pure domain functions | Copy logic in the store                        | What a template keeps is a rule of the model and is tested as one; the store only wires storage and navigation.                    |
| Premium ids and the beta-free state live in a small domain registry             | Extend the template's `Entitlement` levels now | C25 asks for provider-swappable states; the registry is the seam, the template's level model stays untouched until 0038 decides.   |
| The gate is checked in the use case                                             | Only a disabled button                         | C12: a disabled button is not a control.                                                                                           |
| Templates in the backup as their own list                                       | Inside `documents`                             | Same reason as the record type; an older importer ignores an unknown key and loses nothing it understood.                          |

## Domain

`src/domain/document/DocumentTemplate.ts`:

```ts
export interface DocumentTemplate {
  readonly id: string;
  readonly name: string; // ≤ 80
  readonly description?: string; // ≤ 300
  readonly kind: DocumentKind;
  readonly locale: string;
  readonly printProfileId: string;
  readonly bodyMarkdown: string;
  readonly metadata: TemplateMetadata; // DocumentMetadata minus recipient, recipientContactId, date
  readonly assetPlacements: readonly AssetPlacement[];
  readonly exportPreferences: ExportPreferences;
  readonly printOptions: PrintOptions;
  readonly tags: readonly string[];
  readonly demoData?: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export function createTemplateFromDocument(
  document,
  options: { name; description?; includeSender; includeBody; includeSubject },
  now?,
): DocumentTemplate;
export function documentFromTemplate(
  template,
  options: { title; date?; printProfileId? },
  now?,
): FoldmarkDocument;
```

`DocumentTemplateSchema` in `DocumentSchema.ts` (strict, bounded like the document).
`TEMPLATES_MAX_COUNT = 200`.

`src/domain/entitlement/premiumFeatures.ts`:

```ts
export type PremiumFeatureId = 'template.custom.save' | 'template.custom.multiple' | …;
export interface FeatureEntitlement { mode: 'free' | 'beta-free' | 'quota' | 'licensed' | 'locked'; used?; limit?; }
export const PREMIUM_FEATURES: Record<PremiumFeatureId, { freeLimit?: number }>;
export function featureState(id, used, phase: 'beta' | 'live' = 'beta'): FeatureEntitlement;
```

During the beta phase every feature above its free limit is `beta-free`; `live` is what a later
provider returns (`locked` without a licence). Nothing reads `live` yet.

## Application

`TemplateRepository` port (`get`, `list`, `save`, `delete`, `clear`); `TemplateService` (`list`,
`get`, `saveFromDocument(document, options)`, `update(id, { name, description })`, `remove(id)`).
`saveFromDocument` asks `featureState('template.custom.multiple', count)` and refuses `locked` with
`LimitReachedError`; the collection bound is checked the same way. `BackupService` gains `templates`
in inventory, export, import (`DocumentTemplateSchema` per record) and `deleteTemplates()` /
`deleteAll()`.

## Presentation

- `workspaceStore.createFromTemplate(templateId)`: `documentFromTemplate` →
  `documents.importDocument` → open; the sender snapshot comes from the template as saved (not
  re-resolved), so a template keeps working when the contact was deleted; the profile falls back to
  the kind's default when the template's profile is gone.
- `SaveTemplateDialog.vue` (File menu): name, description, three checkboxes, the beta-free note when
  a template exists already.
- `TemplatesDialog.vue` (from "+ New → Manage templates…"): list, use, rename/describe, delete with
  confirmation.
- `DocumentListPanel` "+ New" menu: template entries after a divider (≤ 8), then "Manage
  templates…". `libraryStore.templates` + `refreshTemplates`.
- Settings → Data & backup: "Delete templates". Privacy inventory: templates count.
- i18n de/en; e2e: save, new from template, rename, delete, backup round trip.
