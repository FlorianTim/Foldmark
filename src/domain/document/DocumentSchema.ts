import { z } from 'zod';
import {
  boundedText,
  CalendarDateSchema,
  CountryCodeSchema,
  IdSchema,
  LocaleTagSchema,
  MillimetresSchema,
  NonNegativeMillimetresSchema,
  preservedRecordSchema,
  TimestampSchema,
} from '@/domain/common/Schemas';
import {
  COLOR_ALIASES,
  COLOR_MODIFIERS,
  COLOR_TONES,
  FONT_FAMILIES,
  THEME_BOUNDS,
  isColorName,
} from '@/domain/document/DocumentTheme';
import {
  TEMPLATE_DESCRIPTION_MAX_LENGTH,
  TEMPLATE_NAME_MAX_LENGTH,
} from '@/domain/document/DocumentTemplate';
import { FOLDER_NAME_MAX_LENGTH } from '@/domain/document/Folder';
import {
  BODY_MAX_LENGTH,
  DOCUMENT_SCHEMA_VERSION,
  PRESERVED_KEYS_MAX_COUNT,
  TAGS_MAX_COUNT,
  TITLE_MAX_LENGTH,
} from '@/domain/document/FoldmarkDocument';

/**
 * Runtime schemas for documents.
 *
 * A document arrives from two untrusted places — IndexedDB, which a script on
 * the same origin can rewrite, and a `.md` file a person was handed. Both cross
 * this boundary, so both are parsed rather than cast. The alternative is a
 * `NaN` coordinate reaching the renderer and a page that silently prints blank.
 */

/** Longest single postal field. */
const POSTAL_FIELD_MAX = 120;

/** A postal address as it is embedded in a document. */
export const PostalAddressSchema = z
  .object({
    person: boundedText(POSTAL_FIELD_MAX).optional(),
    organization: boundedText(POSTAL_FIELD_MAX).optional(),
    department: boundedText(POSTAL_FIELD_MAX).optional(),
    street: boundedText(POSTAL_FIELD_MAX).optional(),
    addressLine2: boundedText(POSTAL_FIELD_MAX).optional(),
    postalCode: boundedText(16).optional(),
    city: boundedText(POSTAL_FIELD_MAX).optional(),
    region: boundedText(POSTAL_FIELD_MAX).optional(),
    countryCode: CountryCodeSchema.optional(),
  })
  .strict();

/** How a document is handed to a mail client. */
export const EmailHandoffModeSchema = z.enum(['plain-text', 'html', 'pdf-attachment', 'eml']);

/** Per-document export defaults. */
export const ExportPreferencesSchema = z
  .object({
    pdfIncludesPhysicalMarks: z.boolean(),
    emailPdfIncludesPhysicalMarks: z.boolean(),
    emailMode: EmailHandoffModeSchema,
    emailIncludesSignature: z.boolean(),
  })
  .strict();

/**
 * A document's sender snapshot (ADR 0017). Defined here rather than beside the
 * address schemas because the metadata schema needs it and the address schema
 * needs the postal schema — one direction only.
 */
export const SenderSnapshotSchema = z
  .object({
    name: boundedText(200).min(1),
    postal: PostalAddressSchema,
    email: boundedText(254).optional(),
    phone: boundedText(40).optional(),
    website: boundedText(300).optional(),
    footerLines: z.array(boundedText(200)).max(8),
  })
  .strict();

/** Page numbering; defaults so documents stored before change 0012 still parse. */
export const PageNumberOptionsSchema = z
  .object({
    format: z.enum(['none', 'number', 'page', 'page-of', 'slash', 'of']),
    position: z.enum([
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ]),
    hideOnFirstPage: z.boolean(),
  })
  .strict();

/** A `#rrggbb` colour, the only form a theme accepts. */
const HexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/iu);

/** Screen and print values of one shade, either or both. */
const ColorPairSchema = z
  .object({ screen: HexColorSchema.optional(), print: HexColorSchema.optional() })
  .strict();

const bounded = (bounds: { min: number; max: number }) =>
  z.number().finite().min(bounds.min).max(bounds.max);

/**
 * The document theme as stored: only deviations from the default, every value
 * bounded, colours by name only. A theme from a file that names a colour
 * outside the palette is rejected here rather than half-applied.
 */
export const DocumentThemeSettingsSchema = z
  .object({
    fontFamily: z.enum(FONT_FAMILIES).optional(),
    fontSizePt: bounded(THEME_BOUNDS.fontSizePt).optional(),
    lineHeight: bounded(THEME_BOUNDS.lineHeight).optional(),
    paragraphSpacing: bounded(THEME_BOUNDS.paragraphSpacing).optional(),
    smallSizePt: bounded(THEME_BOUNDS.smallSizePt).optional(),
    colors: z
      .object(
        Object.fromEntries(
          COLOR_TONES.flatMap((tone) => [
            [tone, ColorPairSchema.optional()],
            ...COLOR_MODIFIERS.map((modifier) => [
              `${modifier}-${tone}`,
              ColorPairSchema.optional(),
            ]),
          ]),
        ),
      )
      .strict()
      .optional(),
    aliases: z
      .object(
        Object.fromEntries(
          COLOR_ALIASES.map((alias) => [alias, z.string().refine(isColorName).optional()]),
        ),
      )
      .strict()
      .optional(),
    highlight: ColorPairSchema.optional(),
  })
  .strict();

/** Options that shape the printed pages. */
export const PrintOptionsSchema = z
  .object({
    pageNumbers: PageNumberOptionsSchema.default({
      format: 'none',
      position: 'bottom-center',
      hideOnFirstPage: false,
    }),
    theme: DocumentThemeSettingsSchema.optional(),
    showSubject: z.boolean().optional(),
    subjectBold: z.boolean().optional(),
    showDate: z.boolean().optional(),
    dateFormat: z.enum(['long', 'medium', 'numeric']).optional(),
  })
  .strict()
  .default({
    pageNumbers: { format: 'none', position: 'bottom-center', hideOnFirstPage: false },
  });

/** Everything about a document except its body. */
export const DocumentMetadataSchema = z
  .object({
    recipient: PostalAddressSchema.optional(),
    recipientContactId: IdSchema.optional(),
    sender: SenderSnapshotSchema.optional(),
    senderProfileId: IdSchema.optional(),
    date: CalendarDateSchema.optional(),
    subject: boundedText(200).optional(),
    reference: boundedText(120).optional(),
    salutation: boundedText(200).optional(),
    closing: boundedText(200).optional(),
    signerName: boundedText(120).optional(),
    signatureId: IdSchema.optional(),
    emailTo: boundedText(254).optional(),
  })
  .strict();

/** Content belonging to one physical side. */
export const SurfaceContentSchema = z
  .object({
    backgroundAssetId: IdSchema.optional(),
    caption: boundedText(300).optional(),
    text: z.string().max(5_000).optional(),
  })
  .strict();

/** Where an asset sits on a surface. */
export const AssetPlacementSchema = z
  .object({
    id: IdSchema,
    assetId: IdSchema,
    surface: z.enum(['all', 'front', 'back']),
    xMm: MillimetresSchema,
    yMm: MillimetresSchema,
    widthMm: NonNegativeMillimetresSchema,
    heightMm: NonNegativeMillimetresSchema.optional(),
    rotationDeg: z.number().finite().min(-360).max(360),
    opacity: z.number().finite().min(0).max(1),
    layer: z.enum(['background', 'content', 'foreground']),
    fit: z.enum(['contain', 'cover', 'stretch']),
  })
  .strict();

/** Document kinds Foldmark renders. */
export const DocumentKindSchema = z.enum([
  'letter',
  'postcard',
  'card',
  'photo-card',
  'email',
  'custom',
]);

/** One complete document, as stored and as reconstructed from a file. */
export const FoldmarkDocumentSchema = z
  .object({
    id: IdSchema,
    schemaVersion: z.literal(DOCUMENT_SCHEMA_VERSION),
    kind: DocumentKindSchema,
    title: boundedText(TITLE_MAX_LENGTH),
    locale: LocaleTagSchema,
    bodyMarkdown: z.string().max(BODY_MAX_LENGTH),
    metadata: DocumentMetadataSchema,
    surfaces: z
      .object({ front: SurfaceContentSchema.optional(), back: SurfaceContentSchema.optional() })
      .strict(),
    assetPlacements: z.array(AssetPlacementSchema).max(64),
    printProfileId: IdSchema,
    exportPreferences: ExportPreferencesSchema,
    printOptions: PrintOptionsSchema,
    tags: z.array(boundedText(40)).max(TAGS_MAX_COUNT),
    preserved: preservedRecordSchema(PRESERVED_KEYS_MAX_COUNT, 2_000),
    folderId: IdSchema.optional(),
    archived: z.boolean().optional(),
    lastOpenedAt: TimestampSchema.optional(),
    demoData: z.boolean().optional(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

/** A document template (change 0039): a document without recipient, date, folder and history. */
export const DocumentTemplateSchema = z
  .object({
    id: IdSchema,
    name: boundedText(TEMPLATE_NAME_MAX_LENGTH).min(1),
    description: boundedText(TEMPLATE_DESCRIPTION_MAX_LENGTH).optional(),
    kind: DocumentKindSchema,
    locale: LocaleTagSchema,
    printProfileId: IdSchema,
    bodyMarkdown: z.string().max(BODY_MAX_LENGTH),
    metadata: DocumentMetadataSchema.omit({
      recipient: true,
      recipientContactId: true,
      date: true,
    }),
    assetPlacements: z.array(AssetPlacementSchema).max(64),
    exportPreferences: ExportPreferencesSchema,
    printOptions: PrintOptionsSchema,
    tags: z.array(boundedText(40)).max(TAGS_MAX_COUNT),
    demoData: z.boolean().optional(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

/** One folder of the workspace (change 0024). */
export const FolderSchema = z
  .object({
    id: IdSchema,
    name: boundedText(FOLDER_NAME_MAX_LENGTH).min(1),
    parentId: IdSchema.optional(),
    archived: z.boolean(),
    demoData: z.boolean().optional(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

/** A whole collection loaded from IndexedDB. */
export const FoldmarkDocumentListSchema = z.array(FoldmarkDocumentSchema);

/** One durable version of a document. */
export const CheckpointSchema = z
  .object({
    id: IdSchema,
    documentId: IdSchema,
    createdAt: TimestampSchema,
    origin: z.enum(['manual', 'automatic', 'imported', 'restore']),
    document: FoldmarkDocumentSchema,
  })
  .strict();

/** The automatically written state of an open document. */
export const WorkingCopySchema = z
  .object({
    documentId: IdSchema,
    savedAt: TimestampSchema,
    document: FoldmarkDocumentSchema,
  })
  .strict();
