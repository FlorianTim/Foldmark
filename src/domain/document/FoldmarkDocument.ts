import type { SenderSnapshot } from '@/domain/address/SenderProfile';
import { createId } from '@/domain/common/Ids';
import type { DocumentThemeSettings } from '@/domain/document/DocumentTheme';
import type { Millimetres } from '@/domain/common/Units';
import type { SurfaceScope } from '@/domain/print/PrintMarker';

/**
 * The document — the semantic half of Foldmark.
 *
 * A document says *what* is being sent and to whom. It never says how wide the
 * paper is or where the fold goes; that is the print profile's job. The
 * separation is the product: the same document is a DIN-style letter, a blank
 * A4 page and a PDF attachment without being rewritten.
 *
 * The body is Markdown text, kept as source rather than as parsed blocks so a
 * document is still readable and editable outside Foldmark. Everything else is
 * structured, because "Betreff" belongs in a field the renderer can place in a
 * subject region, not in a line of prose the renderer has to guess at.
 */

/** Longest document title Foldmark accepts. */
export const TITLE_MAX_LENGTH = 200;

/** Longest Markdown body Foldmark accepts, in characters. */
export const BODY_MAX_LENGTH = 200_000;

/** Most tags one document may carry. */
export const TAGS_MAX_COUNT = 24;

/** Most unknown front-matter keys preserved through a round trip. */
export const PRESERVED_KEYS_MAX_COUNT = 64;

/** A scalar as the front-matter subset types it. */
export type PreservedScalar = string | number | boolean;

/**
 * What an unknown front-matter key may carry through a round trip: a scalar,
 * a list of scalars or a one-level mapping of scalars. Foldmark never
 * interprets a preserved value; it only writes it back.
 */
export type PreservedValue =
  PreservedScalar | readonly PreservedScalar[] | Readonly<Record<string, PreservedScalar>>;

/** What kind of thing is being produced. Drives which regions and validations apply. */
export type DocumentKind = 'letter' | 'postcard' | 'card' | 'photo-card' | 'email' | 'custom';

/**
 * A postal address.
 *
 * Every field is optional and validation is context-dependent, because what a
 * complete address is depends on where it is going: a postcard needs a
 * recipient line and a city, an email needs neither, and a German authority
 * wants a department. Requiring fields here would mean requiring them
 * everywhere.
 */
export interface PostalAddress {
  readonly person?: string;
  readonly organization?: string;
  readonly department?: string;
  readonly street?: string;
  readonly addressLine2?: string;
  readonly postalCode?: string;
  readonly city?: string;
  readonly region?: string;
  /** ISO 3166-1 alpha-2, uppercase. */
  readonly countryCode?: string;
}

/** How a document is meant to leave the app, stored per document. */
export interface ExportPreferences {
  /** Whether fold, punch and cut marks are printed on the PDF meant for paper. */
  readonly pdfIncludesPhysicalMarks: boolean;
  /** Whether they are printed on the PDF meant to be attached to an email. */
  readonly emailPdfIncludesPhysicalMarks: boolean;
  /** How an email hand-off is prepared by default. */
  readonly emailMode: EmailHandoffMode;
  /** Whether the stored signature image is placed in email output. */
  readonly emailIncludesSignature: boolean;
}

/** How page numbers read: nothing, `2`, `Page 2`, `Page 2 of 5`, `2 / 5`, `2 of 5` (R13-020). */
export type PageNumberFormat = 'none' | 'number' | 'page' | 'page-of' | 'slash' | 'of';

/** Every page-number format, in the order the settings offer them. */
export const PAGE_NUMBER_FORMATS: readonly PageNumberFormat[] = [
  'none',
  'number',
  'page',
  'page-of',
  'slash',
  'of',
];

/** Where the page number sits, in the top or bottom margin. */
export type PageNumberPosition =
  'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

/** Every position, in the order the settings offer them. */
export const PAGE_NUMBER_POSITIONS: readonly PageNumberPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

/**
 * How the letter date is written (change 0028): `long` — "15. September 2026",
 * `medium` — "15.09.2026" in German, "15 Sept 2026" in British English,
 * `numeric` — "15.9.2026" / "9/15/2026". The document's language decides the
 * spelling; the format only decides how much of it is written out.
 */
export type DateFormat = 'long' | 'medium' | 'numeric';

/** Every date format, in the order the settings offer them. */
export const DATE_FORMATS: readonly DateFormat[] = ['long', 'medium', 'numeric'];

/**
 * Page numbering, stored on the document: the same profile serves a one-page
 * and a five-page letter, so this is content, not sheet geometry. The render
 * plan turns it into a positioned block — never a CSS counter — so preview,
 * print and PDF agree.
 */
export interface PageNumberOptions {
  readonly format: PageNumberFormat;
  readonly position: PageNumberPosition;
  readonly hideOnFirstPage: boolean;
}

/** Options that shape the printed pages without belonging to the profile. */
export interface PrintOptions {
  readonly pageNumbers: PageNumberOptions;
  /**
   * Whether the subject line is printed (R13-018). Absent means yes: the
   * subject is part of a letter unless the writer says otherwise.
   */
  readonly showSubject?: boolean;
  /**
   * Whether the subject line is set bold (R14-003). Absent means yes — the
   * subject of a letter is bold by convention; Format → Bold over the subject
   * field toggles the whole line, never a part of it.
   */
  readonly subjectBold?: boolean;
  /** Whether the date is printed in the information block. Absent means yes. */
  readonly showDate?: boolean;
  /** How the date is written. Absent means `long`. */
  readonly dateFormat?: DateFormat;
  /**
   * The document theme (change 0017): font, sizes and palette of the paper,
   * stored as the deviations from the defaults. Absent means the defaults.
   */
  readonly theme?: DocumentThemeSettings;
}

/** What a new document starts with: no numbers, bottom centre once switched on. */
export const DEFAULT_PRINT_OPTIONS: PrintOptions = Object.freeze({
  pageNumbers: Object.freeze({
    format: 'none' as const,
    position: 'bottom-center' as const,
    hideOnFirstPage: false,
  }),
});

/** The ways Foldmark can hand a document to a mail client. */
export type EmailHandoffMode = 'plain-text' | 'html' | 'pdf-attachment' | 'eml';

/** Content that belongs to one physical side rather than to the document as a whole. */
export interface SurfaceContent {
  /** Identifier of a locally stored asset used as this side's background. */
  readonly backgroundAssetId?: string;
  readonly caption?: string;
  /** Free text placed in this side's message region, for cards and postcards. */
  readonly text?: string;
}

/** How an asset is placed on a surface, in physical units. */
export interface AssetPlacement {
  readonly id: string;
  readonly assetId: string;
  readonly surface: SurfaceScope;
  readonly xMm: Millimetres;
  readonly yMm: Millimetres;
  readonly widthMm: Millimetres;
  readonly heightMm?: Millimetres;
  readonly rotationDeg: number;
  /** 0–1. */
  readonly opacity: number;
  readonly layer: 'background' | 'content' | 'foreground';
  readonly fit: 'contain' | 'cover' | 'stretch';
}

/** Everything about a document except its body text. */
export interface DocumentMetadata {
  readonly recipient?: PostalAddress;
  /** The contact the recipient snapshot was taken from, while it exists (R14-012). */
  readonly recipientContactId?: string;
  /**
   * The sender as chosen, copied into the document (ADR 0017). The renderer
   * uses this; `senderProfileId` only says where it came from.
   */
  readonly sender?: SenderSnapshot;
  /** The address-book entry the sender snapshot was taken from, while it exists. */
  readonly senderProfileId?: string;
  /** ISO calendar date, `YYYY-MM-DD`; the date on the letter, not a timestamp. */
  readonly date?: string;
  readonly subject?: string;
  /** Reference or file number shown in the information block. */
  readonly reference?: string;
  readonly salutation?: string;
  readonly closing?: string;
  readonly signerName?: string;
  /** Identifier of a locally stored signature image. */
  readonly signatureId?: string;
  /** Recipient address for the email hand-off, which is not the postal one. */
  readonly emailTo?: string;
}

/** One Foldmark document. */
export interface FoldmarkDocument {
  readonly id: string;
  /** Bumped when the persisted shape changes; migrations key off it. */
  readonly schemaVersion: 1;
  readonly kind: DocumentKind;
  readonly title: string;
  /** BCP-47 tag of the document's own language, independent of the UI language. */
  readonly locale: string;
  readonly bodyMarkdown: string;
  readonly metadata: DocumentMetadata;
  readonly surfaces: Readonly<Partial<Record<'front' | 'back', SurfaceContent>>>;
  readonly assetPlacements: readonly AssetPlacement[];
  /** The profile this document prefers; the workspace may still render another. */
  readonly printProfileId: string;
  readonly exportPreferences: ExportPreferences;
  readonly printOptions: PrintOptions;
  readonly tags: readonly string[];
  /**
   * Front-matter keys Foldmark did not recognize, kept so a round trip through
   * the app does not silently delete something a future version — or another
   * tool — put there. Only scalars, lists of scalars and one-level mappings
   * survive: preserving arbitrary nested structures from an untrusted file is
   * how a parser becomes an attack surface.
   */
  readonly preserved: Readonly<Record<string, PreservedValue>>;
  /**
   * Local organisation (R13-024): the folder it lies in, whether it is
   * archived, when it was last opened. None of this is part of the portable
   * file — a `.md` handed to someone else carries no idea of this workspace.
   */
  readonly folderId?: string;
  readonly archived?: boolean;
  readonly lastOpenedAt?: string;
  /** Set on records the demo-data manager created (change 0026). */
  readonly demoData?: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** The schema version this build reads and writes. */
export const DOCUMENT_SCHEMA_VERSION = 1;

/** Export preferences a new document starts with. */
export const DEFAULT_EXPORT_PREFERENCES: ExportPreferences = Object.freeze({
  pdfIncludesPhysicalMarks: true,
  // The default that matters: a letter mailed as a PDF has no fold to mark, and
  // printing crop guides into an attachment makes it look like a proof sheet.
  emailPdfIncludesPhysicalMarks: false,
  emailMode: 'pdf-attachment',
  emailIncludesSignature: true,
});

/** Creates an empty document of the given kind. */
export function createDocument(
  input: {
    kind: DocumentKind;
    title: string;
    locale: string;
    printProfileId: string;
    bodyMarkdown?: string;
    /** The letter date to start with (`YYYY-MM-DD`); letters get today's (R13-019). */
    date?: string;
    /** The print options to start with; the configured defaults (change 0028). */
    printOptions?: PrintOptions;
  },
  now = new Date(),
): FoldmarkDocument {
  const timestamp = now.toISOString();
  return {
    id: createId(),
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    kind: input.kind,
    title: input.title.trim().slice(0, TITLE_MAX_LENGTH),
    locale: input.locale,
    bodyMarkdown: input.bodyMarkdown ?? '',
    metadata: input.date ? { date: input.date } : {},
    surfaces: {},
    assetPlacements: [],
    printProfileId: input.printProfileId,
    exportPreferences: DEFAULT_EXPORT_PREFERENCES,
    printOptions: input.printOptions ?? DEFAULT_PRINT_OPTIONS,
    tags: [],
    preserved: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** Returns a copy of the document with the given changes and a fresh modification time. */
export function reviseDocument(
  document: FoldmarkDocument,
  changes: Partial<Omit<FoldmarkDocument, 'id' | 'schemaVersion' | 'createdAt' | 'updatedAt'>>,
  now = new Date(),
): FoldmarkDocument {
  return { ...document, ...changes, updatedAt: now.toISOString() };
}

/**
 * Creates an independent copy of a document.
 *
 * The copy is a new document, not a revision: new id, new timestamps, and a
 * title that says so. Asset placements get new ids too, so deleting a placement
 * in the copy cannot reach into the original.
 */
export function duplicateDocument(
  document: FoldmarkDocument,
  title: string,
  now = new Date(),
): FoldmarkDocument {
  const timestamp = now.toISOString();
  return {
    ...document,
    id: createId(),
    title: title.trim().slice(0, TITLE_MAX_LENGTH),
    // A copy is a fresh record: not archived, not yet opened, not demo data.
    archived: false,
    lastOpenedAt: undefined,
    demoData: undefined,
    assetPlacements: document.assetPlacements.map((placement) => ({
      ...placement,
      id: createId(),
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** Whether the document kind has a front and a back rather than one side. */
export function isTwoSided(kind: DocumentKind): boolean {
  return kind === 'postcard' || kind === 'card' || kind === 'photo-card';
}

/** The profile category that fits a document kind, for filtering the profile picker. */
export function categoryForKind(kind: DocumentKind): 'letter' | 'postcard' | 'card' | 'photo' {
  switch (kind) {
    case 'postcard':
      return 'postcard';
    case 'card':
      return 'card';
    case 'photo-card':
      return 'photo';
    default:
      return 'letter';
  }
}

/** A one-line description of a document for lists and pickers. */
export function documentSummary(document: FoldmarkDocument): string {
  const recipient = document.metadata.recipient;
  const who = recipient?.organization ?? recipient?.person ?? '';
  return [document.metadata.subject ?? document.title, who].filter(Boolean).join(' · ');
}
