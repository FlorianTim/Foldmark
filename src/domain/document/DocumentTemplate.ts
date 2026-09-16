import { createId } from '@/domain/common/Ids';
import {
  DOCUMENT_SCHEMA_VERSION,
  TITLE_MAX_LENGTH,
  type AssetPlacement,
  type DocumentKind,
  type DocumentMetadata,
  type ExportPreferences,
  type FoldmarkDocument,
  type PrintOptions,
} from '@/domain/document/FoldmarkDocument';

/**
 * Document templates (change 0039, R15-009).
 *
 * A template is a document with the parts that belong to *one* letter taken
 * out: no recipient, no date, no folder, no archive flag, no history. What
 * stays is what a person sets up once and wants again — the kind and the
 * paper, the sender, the theme and colours, salutation and closing, the signer,
 * page numbers, the hand-off address, and optionally the body as text blocks.
 * A new document from a template is an ordinary document from then on; the
 * template is not referenced, so editing one never changes the other.
 */

/** Longest template name. */
export const TEMPLATE_NAME_MAX_LENGTH = 80;

/** Longest template description. */
export const TEMPLATE_DESCRIPTION_MAX_LENGTH = 300;

/** Most templates one browser profile may hold. */
export const TEMPLATES_MAX_COUNT = 200;

/** The document metadata a template keeps: everything but the recipient and the date. */
export type TemplateMetadata = Omit<DocumentMetadata, 'recipient' | 'recipientContactId' | 'date'>;

/** One template. */
export interface DocumentTemplate {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly kind: DocumentKind;
  readonly locale: string;
  readonly printProfileId: string;
  /** The body a new document starts with; empty when the template carries none. */
  readonly bodyMarkdown: string;
  readonly metadata: TemplateMetadata;
  /** Letterhead artwork placements, when the document had some. */
  readonly assetPlacements: readonly AssetPlacement[];
  readonly exportPreferences: ExportPreferences;
  readonly printOptions: PrintOptions;
  readonly tags: readonly string[];
  /** Set on records the demo-data manager created (change 0026). */
  readonly demoData?: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** What "Save as template" asks for. */
export interface TemplateOptions {
  readonly name: string;
  readonly description?: string;
  /** Keep the sender snapshot (on by default). */
  readonly includeSender?: boolean;
  /** Keep the body text as text blocks (on by default). */
  readonly includeBody?: boolean;
  /** Keep the subject (off by default: a subject is usually the letter's, not the template's). */
  readonly includeSubject?: boolean;
}

/** Takes a template from a document, dropping what belongs to that one letter. */
export function createTemplateFromDocument(
  document: FoldmarkDocument,
  options: TemplateOptions,
  now = new Date(),
): DocumentTemplate {
  const timestamp = now.toISOString();
  const kept: Record<string, unknown> = { ...document.metadata };
  delete kept.recipient;
  delete kept.recipientContactId;
  delete kept.date;
  const metadata = kept as { -readonly [K in keyof TemplateMetadata]?: TemplateMetadata[K] };
  if (options.includeSender === false) {
    delete metadata.sender;
    delete metadata.senderProfileId;
  }
  if (!options.includeSubject) delete metadata.subject;
  const description = options.description?.trim().slice(0, TEMPLATE_DESCRIPTION_MAX_LENGTH);
  return {
    id: createId(),
    name: options.name.trim().slice(0, TEMPLATE_NAME_MAX_LENGTH),
    ...(description ? { description } : {}),
    kind: document.kind,
    locale: document.locale,
    printProfileId: document.printProfileId,
    bodyMarkdown: options.includeBody === false ? '' : document.bodyMarkdown,
    metadata: metadata as TemplateMetadata,
    assetPlacements: [...document.assetPlacements],
    exportPreferences: { ...document.exportPreferences },
    printOptions: { ...document.printOptions },
    tags: [...document.tags],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** A fresh document from a template: its own id, today's date where given, nothing shared. */
export function documentFromTemplate(
  template: DocumentTemplate,
  options: {
    readonly title: string;
    /** The letter date to start with (`YYYY-MM-DD`); absent for kinds without one. */
    readonly date?: string;
    /** Replaces the template's profile when that one no longer exists. */
    readonly printProfileId?: string;
    readonly folderId?: string;
  },
  now = new Date(),
): FoldmarkDocument {
  const timestamp = now.toISOString();
  return {
    id: createId(),
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    kind: template.kind,
    title: options.title.trim().slice(0, TITLE_MAX_LENGTH),
    locale: template.locale,
    bodyMarkdown: template.bodyMarkdown,
    metadata: { ...template.metadata, ...(options.date ? { date: options.date } : {}) },
    surfaces: {},
    assetPlacements: [...template.assetPlacements],
    printProfileId: options.printProfileId ?? template.printProfileId,
    exportPreferences: { ...template.exportPreferences },
    printOptions: { ...template.printOptions },
    tags: [...template.tags],
    preserved: {},
    ...(options.folderId ? { folderId: options.folderId } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** Templates by name, for lists and menus. */
export function compareTemplates(left: DocumentTemplate, right: DocumentTemplate): number {
  return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
}
