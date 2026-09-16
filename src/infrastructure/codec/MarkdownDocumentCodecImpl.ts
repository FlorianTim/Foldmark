import type {
  DecodeResult,
  EncodeGeometry,
  MarkdownDocumentCodec,
} from '@/application/ports/MarkdownDocumentCodec';
import { deriveDisplayName } from '@/domain/address/Address';
import type { SenderSnapshot } from '@/domain/address/SenderProfile';
import { isSafeRecordKey, PRESERVED_ENTRIES_MAX } from '@/domain/common/Schemas';
import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import {
  DEFAULT_EXPORT_PREFERENCES,
  DATE_FORMATS,
  DEFAULT_PRINT_OPTIONS,
  DOCUMENT_SCHEMA_VERSION,
  PRESERVED_KEYS_MAX_COUNT,
  type DateFormat,
  type DocumentKind,
  type ExportPreferences,
  type FoldmarkDocument,
  type PageNumberOptions,
  type PostalAddress,
  type PreservedScalar,
  type PreservedValue,
  type PrintOptions,
  type SurfaceContent,
} from '@/domain/document/FoldmarkDocument';
import {
  DocumentThemeSettingsSchema,
  FoldmarkDocumentSchema,
} from '@/domain/document/DocumentSchema';
import { themeDeviations } from '@/domain/document/DocumentTheme';
import { migrateDateTokens } from '@/domain/markdown/dateToken';
import {
  emitFrontMatter,
  FrontMatterError,
  parseFrontMatter,
  splitFrontMatter,
  type FrontMatterValue,
} from '@/infrastructure/codec/frontMatter';

/**
 * The canonical portable format: Markdown with YAML front matter.
 *
 * The design goal is that a Foldmark document is still a document without
 * Foldmark. Someone who opens the file in a text editor sees their letter, and
 * the metadata above it reads like a form. That is why the body stays Markdown
 * source and the metadata stays flat and named rather than being a serialized
 * object graph.
 *
 * ## What travels and what does not
 *
 * Content, addresses, dates, subject and export preferences travel. **Free
 * asset placements do not**: they position bytes that live in one browser's
 * IndexedDB, and a file that references them on another machine describes
 * artwork that is not there. Ids that name a single well-known asset —
 * `signatureId`, a surface background — are kept, because the draft format uses
 * them and a missing one is reported rather than silently dropped. The complete
 * copy of everything, artwork included, is the backup package.
 *
 * ## Unknown keys
 *
 * Unrecognized top-level scalars, lists of scalars and one-level mappings of
 * scalars are **preserved** and written back out, so a round trip through
 * Foldmark does not delete what a newer version, or another tool, put there.
 * Deeper structures are not: keeping them would mean carrying arbitrary
 * untrusted trees through the app, and the risk outweighs the convenience.
 *
 * ## Pandoc
 *
 * Where Foldmark and Pandoc mean the same thing the Pandoc name is canonical
 * (`lang`, `keywords`, `subject`, `author`), the old Foldmark name is read as
 * an alias, and `papersize`/`geometry` are *derived* from the print profile on
 * export — never read, because the profile is the source (change 0017). A
 * header Pandoc understands is thus also a header Foldmark understands, and a
 * Foldmark file runs through `pandoc file.md -o file.pdf` with the same page.
 *
 * ## Failure
 *
 * Decoding never throws for bad content. A file that cannot be understood comes
 * back as a failure carrying the issues **and the original source**, so the
 * workspace can hand the user their text back instead of swallowing it.
 */
export class MarkdownDocumentCodecImpl implements MarkdownDocumentCodec {
  /** The `foldmarkVersion` this codec reads and writes. */
  public static readonly FORMAT_VERSION = 1;

  /** Longest file accepted, in characters. */
  public static readonly MAX_SOURCE_LENGTH = 2 * 1024 * 1024;

  /** Parses untrusted Markdown with YAML front matter. */
  public decode(
    source: string,
    defaults: { id: string; locale: string; printProfileId: string; now?: Date },
  ): DecodeResult {
    const issues: ValidationIssue[] = [];

    if (source.length > MarkdownDocumentCodecImpl.MAX_SOURCE_LENGTH) {
      return fail(issues, source, 'import.fileTooLarge');
    }

    let front: Record<string, FrontMatterValue>;
    let body: string;
    const flowDropped: string[] = [];
    try {
      const split = splitFrontMatter(source);
      body = split.body;
      front = split.frontMatter
        ? parseFrontMatter(split.frontMatter, {
            // A Pandoc header may carry `[a, b]`; the key is lost and reported,
            // the letter is not (ADR 0010 keeps the subset, change 0017 keeps the file).
            onDropped: (key) => flowDropped.push(key),
          })
        : emptyRecord();
      if (!split.frontMatter) {
        issues.push({ severity: 'info', code: 'import.noFrontMatter' });
      }
    } catch (error) {
      const detail = error instanceof FrontMatterError ? error : null;
      return fail(issues, source, 'import.frontMatterInvalid', {
        reason: detail?.code ?? 'unknown',
        line: detail?.line ?? 0,
      });
    }

    const version = front.foldmarkVersion;
    if (version !== undefined && version !== MarkdownDocumentCodecImpl.FORMAT_VERSION) {
      return fail(issues, source, 'import.unsupportedFormatVersion', {
        version: String(version),
      });
    }

    for (const key of flowDropped) {
      issues.push({ severity: 'warning', code: 'import.flowCollectionDropped', params: { key } });
    }

    const timestamp = (defaults.now ?? new Date()).toISOString();
    const sender = readSender(front.sender, front.senderFooter);
    const candidate = {
      id: defaults.id,
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
      kind: readKind(front.kind, issues),
      title: asText(front.title) || asText(front.subject) || 'Foldmark',
      // `lang` is Pandoc's name for the document language; `locale` is Foldmark 1.x's.
      locale: asText(front.lang) || asText(front.locale) || defaults.locale,
      bodyMarkdown: migrateDateTokens(body),
      metadata: {
        recipient: readAddress(front.recipient),
        recipientContactId: optionalText(front.recipientContactId),
        sender,
        senderProfileId: optionalText(front.senderProfileId),
        date: optionalText(front.date),
        subject: optionalText(front.subject),
        reference: optionalText(front.reference),
        salutation: optionalText(front.salutation),
        closing: optionalText(front.closing),
        signerName: optionalText(front.signerName),
        signatureId: optionalText(front.signatureId),
        emailTo: optionalText(front.emailTo),
      },
      surfaces: readSurfaces(front.surfaces),
      assetPlacements: [],
      printProfileId: asText(front.printProfile) || defaults.printProfileId,
      exportPreferences: readExportPreferences(front.export),
      printOptions: readPrintOptions(
        front.pageNumbers,
        front.theme,
        front.show,
        front.dateFormat,
        issues,
        front.subjectWeight,
      ),
      tags: readTags(front.keywords ?? front.tags),
      preserved: readPreserved(front, Boolean(sender), issues),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const parsed = FoldmarkDocumentSchema.safeParse(stripUndefined(candidate));
    if (!parsed.success) {
      for (const issue of parsed.error.issues.slice(0, 10)) {
        issues.push({
          severity: 'error',
          code: 'import.fieldInvalid',
          path: issue.path.join('.'),
          params: { reason: issue.message.slice(0, 120) },
        });
      }
      return { ok: false, issues, source };
    }

    return { ok: true, document: parsed.data as FoldmarkDocument, issues };
  }

  /** Serializes a document to its canonical portable form. */
  public encode(document: FoldmarkDocument, geometry?: EncodeGeometry): string {
    const front: Record<string, FrontMatterValue> = {
      foldmarkVersion: MarkdownDocumentCodecImpl.FORMAT_VERSION,
      kind: document.kind,
      title: document.title,
      lang: document.locale,
      printProfile: document.printProfileId,
      ...omitEmpty({
        // Pandoc's `author`: the sender's display name, derived from the snapshot.
        author: document.metadata.sender?.name ?? scalarPreserved(document.preserved.author),
        senderProfileId: document.metadata.senderProfileId,
        recipientContactId: document.metadata.recipientContactId,
        subject: document.metadata.subject,
        reference: document.metadata.reference,
        date: document.metadata.date,
        emailTo: document.metadata.emailTo,
        salutation: document.metadata.salutation,
        closing: document.metadata.closing,
        signerName: document.metadata.signerName,
        signatureId: document.metadata.signatureId,
      }),
    };

    if (document.metadata.recipient) {
      const recipient = omitEmpty(document.metadata.recipient);
      if (Object.keys(recipient).length) front.recipient = recipient;
    }

    if (document.printOptions.pageNumbers.format !== 'none') {
      front.pageNumbers = { ...document.printOptions.pageNumbers };
    }
    const hidden: Record<string, FrontMatterValue> = {};
    if (document.printOptions.showSubject === false) hidden.subject = false;
    if (document.printOptions.showDate === false) hidden.date = false;
    if (Object.keys(hidden).length) front.show = hidden;
    // Only the deviation is written: a bold subject is the default and says nothing.
    if (document.printOptions.subjectBold === false) front.subjectWeight = 'regular';
    if (document.printOptions.dateFormat && document.printOptions.dateFormat !== 'long') {
      front.dateFormat = document.printOptions.dateFormat;
    }

    // The document theme: only what deviates from the defaults, so a plain
    // letter carries no theme block at all.
    const theme = themeDeviations(document.printOptions.theme);
    if (Object.keys(theme).length) front.theme = theme as unknown as FrontMatterValue;

    // Pandoc's page: derived from the profile so `pandoc file.md -o file.pdf`
    // lays out the same sheet; carried over unchanged when no profile is known.
    if (geometry) {
      Object.assign(front, pandocGeometry(geometry));
    } else {
      for (const key of ['papersize', 'geometry'] as const) {
        const carried = document.preserved[key];
        if (carried !== undefined) front[key] = carried as FrontMatterValue;
      }
    }

    // The sender snapshot is written flat — name, contact and postal fields in
    // one map — so the file reads like an address, not like a data structure.
    if (document.metadata.sender) {
      const { footerLines, postal, ...contact } = document.metadata.sender;
      front.sender = omitEmpty({ ...contact, ...postal });
      if (footerLines.length) front.senderFooter = [...footerLines];
    }

    const surfaces = omitEmptyObjects({
      front: document.surfaces.front ? omitEmpty(document.surfaces.front) : undefined,
      back: document.surfaces.back ? omitEmpty(document.surfaces.back) : undefined,
    });
    if (Object.keys(surfaces).length) front.surfaces = surfaces;

    if (document.tags.length) front.keywords = [...document.tags];

    front.export = {
      pdf: { includePhysicalMarks: document.exportPreferences.pdfIncludesPhysicalMarks },
      emailPdf: {
        includePhysicalMarks: document.exportPreferences.emailPdfIncludesPhysicalMarks,
      },
      email: {
        mode: document.exportPreferences.emailMode,
        includeSignature: document.exportPreferences.emailIncludesSignature,
      },
    };

    // Preserved keys go last so a key Foldmark understands can never be shadowed
    // by one it merely carried along.
    for (const [key, value] of Object.entries(document.preserved)) {
      if (!Object.hasOwn(front, key)) front[key] = value as FrontMatterValue;
    }

    const body = document.bodyMarkdown.replace(/^\n+/u, '');
    return `---\n${emitFrontMatter(front)}---\n\n${body}${body.endsWith('\n') ? '' : '\n'}`;
  }
}

function emptyRecord(): Record<string, FrontMatterValue> {
  return Object.create(null) as Record<string, FrontMatterValue>;
}

function fail(
  issues: ValidationIssue[],
  source: string,
  code: string,
  params?: Record<string, string | number>,
): DecodeResult {
  return { ok: false, issues: [...issues, { severity: 'error', code, params }], source };
}

/** A scalar as display text; objects and arrays become empty. */
function asText(value: FrontMatterValue | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return '';
  return String(value).trim();
}

function optionalText(value: FrontMatterValue | undefined): string | undefined {
  const text = asText(value);
  return text === '' ? undefined : text;
}

const KINDS: readonly DocumentKind[] = [
  'letter',
  'postcard',
  'card',
  'photo-card',
  'email',
  'custom',
];

function readKind(value: FrontMatterValue | undefined, issues: ValidationIssue[]): DocumentKind {
  const text = asText(value);
  if (!text) return 'letter';
  const match = KINDS.find((kind) => kind === text);
  if (match) return match;
  issues.push({ severity: 'warning', code: 'import.unknownKind', params: { kind: text } });
  return 'custom';
}

const ADDRESS_FIELDS = [
  'person',
  'organization',
  'department',
  'street',
  'addressLine2',
  'postalCode',
  'city',
  'region',
  'countryCode',
] as const;

/**
 * The sender snapshot from its flat front-matter form. Absent when the file
 * has no `sender` map; a pre-0006 file then still resolves through
 * `senderProfileId` on open.
 */
function readSender(
  value: FrontMatterValue | undefined,
  footer: FrontMatterValue | undefined,
): SenderSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, FrontMatterValue>;
  const postal = readAddress(value);
  const name = asText(source.name) || (postal ? deriveDisplayName(postal) : '');
  if (!name) return undefined;
  return {
    name,
    postal: postal ?? {},
    email: optionalText(source.email),
    phone: optionalText(source.phone),
    website: optionalText(source.website),
    footerLines: Array.isArray(footer)
      ? footer
          .map((line) => asText(line))
          .filter(Boolean)
          .slice(0, 8)
      : [],
  };
}

function readAddress(value: FrontMatterValue | undefined): PostalAddress | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, FrontMatterValue>;
  const address: Record<string, string> = {};
  for (const field of ADDRESS_FIELDS) {
    const text = asText(source[field]);
    if (text) address[field] = field === 'countryCode' ? text.toUpperCase() : text;
  }
  return Object.keys(address).length ? (address as PostalAddress) : undefined;
}

function readSurfaces(
  value: FrontMatterValue | undefined,
): Partial<Record<'front' | 'back', SurfaceContent>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, FrontMatterValue>;
  const surfaces: Partial<Record<'front' | 'back', SurfaceContent>> = {};
  for (const side of ['front', 'back'] as const) {
    const entry = source[side];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const record = entry as Record<string, FrontMatterValue>;
    const content: SurfaceContent = stripUndefined({
      backgroundAssetId: optionalText(record.backgroundAssetId),
      caption: optionalText(record.caption),
      text: optionalText(record.text),
    }) as SurfaceContent;
    if (Object.keys(content).length) surfaces[side] = content;
  }
  return surfaces;
}

function readBoolean(value: FrontMatterValue | undefined, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readExportPreferences(value: FrontMatterValue | undefined): ExportPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_EXPORT_PREFERENCES;
  }
  const source = value as Record<string, FrontMatterValue>;
  const pdf = asRecord(source.pdf);
  const emailPdf = asRecord(source.emailPdf);
  const email = asRecord(source.email);
  const mode = asText(email.mode);

  return {
    pdfIncludesPhysicalMarks: readBoolean(
      pdf.includePhysicalMarks,
      DEFAULT_EXPORT_PREFERENCES.pdfIncludesPhysicalMarks,
    ),
    emailPdfIncludesPhysicalMarks: readBoolean(
      emailPdf.includePhysicalMarks,
      DEFAULT_EXPORT_PREFERENCES.emailPdfIncludesPhysicalMarks,
    ),
    emailMode:
      mode === 'plain-text' || mode === 'html' || mode === 'pdf-attachment' || mode === 'eml'
        ? mode
        : DEFAULT_EXPORT_PREFERENCES.emailMode,
    emailIncludesSignature: readBoolean(
      email.includeSignature,
      DEFAULT_EXPORT_PREFERENCES.emailIncludesSignature,
    ),
  };
}

function asRecord(value: FrontMatterValue | undefined): Record<string, FrontMatterValue> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, FrontMatterValue>)
    : emptyRecord();
}

function readTags(value: FrontMatterValue | undefined): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asText(entry as FrontMatterValue))
    .filter(Boolean)
    .slice(0, 24);
}

const PAGE_NUMBER_FORMATS = new Set(['none', 'number', 'page', 'page-of', 'slash', 'of']);
const PAGE_NUMBER_POSITIONS = new Set([
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]);

/** Page numbering and theme from their front-matter maps; anything unrecognised falls back. */
function readPrintOptions(
  numbers: FrontMatterValue | undefined,
  theme: FrontMatterValue | undefined,
  show: FrontMatterValue | undefined,
  dateFormat: FrontMatterValue | undefined,
  issues: ValidationIssue[],
  subjectWeight?: FrontMatterValue,
): PrintOptions {
  const pageNumbers = readPageNumbers(numbers);
  const settings = readTheme(theme, issues);
  const options: { -readonly [K in keyof PrintOptions]?: PrintOptions[K] } = { pageNumbers };
  if (settings) options.theme = settings;
  // `show: { subject: false, date: false }` — only ever written when off (R13-018).
  if (show && typeof show === 'object' && !Array.isArray(show)) {
    const map = show as Record<string, FrontMatterValue>;
    if (map.subject === false) options.showSubject = false;
    if (map.date === false) options.showDate = false;
  }
  if (subjectWeight === 'regular') options.subjectBold = false;
  if (typeof dateFormat === 'string' && DATE_FORMATS.includes(dateFormat as DateFormat)) {
    if (dateFormat !== 'long') options.dateFormat = dateFormat as DateFormat;
  }
  return options as PrintOptions;
}

function readPageNumbers(value: FrontMatterValue | undefined): PageNumberOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_PRINT_OPTIONS.pageNumbers;
  }
  const source = value as Record<string, FrontMatterValue>;
  const format = asText(source.format);
  const position = asText(source.position);
  return {
    format: PAGE_NUMBER_FORMATS.has(format)
      ? (format as PageNumberOptions['format'])
      : DEFAULT_PRINT_OPTIONS.pageNumbers.format,
    position: PAGE_NUMBER_POSITIONS.has(position)
      ? (position as PageNumberOptions['position'])
      : DEFAULT_PRINT_OPTIONS.pageNumbers.position,
    hideOnFirstPage: source.hideOnFirstPage === true,
  };
}

/**
 * The theme map, validated as a whole: a file that names a colour outside the
 * palette or a size outside the bounds gets the default theme and a report,
 * not half of what it asked for.
 */
function readTheme(
  value: FrontMatterValue | undefined,
  issues: ValidationIssue[],
): PrintOptions['theme'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const parsed = DocumentThemeSettingsSchema.safeParse(stripUndefined(value));
  if (!parsed.success) {
    issues.push({
      severity: 'warning',
      code: 'import.fieldInvalid',
      path: 'theme',
      params: { reason: parsed.error.issues[0]?.message.slice(0, 120) ?? 'invalid' },
    });
    return undefined;
  }
  const deviations = themeDeviations(parsed.data);
  return Object.keys(deviations).length ? deviations : undefined;
}

/** Sizes Pandoc's `papersize` names, matched against the profile's page in millimetres. */
const PAPER_SIZES: readonly {
  readonly name: string;
  readonly widthMm: number;
  readonly heightMm: number;
}[] = [
  { name: 'a3', widthMm: 297, heightMm: 420 },
  { name: 'a4', widthMm: 210, heightMm: 297 },
  { name: 'a5', widthMm: 148, heightMm: 210 },
  { name: 'a6', widthMm: 105, heightMm: 148 },
  { name: 'b5', widthMm: 176, heightMm: 250 },
  { name: 'letter', widthMm: 215.9, heightMm: 279.4 },
  { name: 'legal', widthMm: 215.9, heightMm: 355.6 },
];

const mm = (value: number): string => `${Math.round(value * 100) / 100}mm`;

/**
 * `papersize` and `geometry` for a sheet, as Pandoc's LaTeX route reads them.
 * A named size when the sheet is one; otherwise the exact paper dimensions go
 * into `geometry`, which the `geometry` package accepts as well.
 */
export function pandocGeometry(geometry: EncodeGeometry): Record<string, FrontMatterValue> {
  const { page, margins } = geometry;
  const short = Math.min(page.widthMm, page.heightMm);
  const long = Math.max(page.widthMm, page.heightMm);
  const named = PAPER_SIZES.find(
    (size) => Math.abs(size.widthMm - short) < 0.5 && Math.abs(size.heightMm - long) < 0.5,
  );
  const entries: string[] = [];
  if (!named) entries.push(`paperwidth=${mm(page.widthMm)}`, `paperheight=${mm(page.heightMm)}`);
  if (named && page.widthMm > page.heightMm) entries.push('landscape');
  const uniform =
    margins.topMm === margins.rightMm &&
    margins.topMm === margins.bottomMm &&
    margins.topMm === margins.leftMm;
  if (uniform) {
    entries.push(`margin=${mm(margins.topMm)}`);
  } else {
    entries.push(
      `top=${mm(margins.topMm)}`,
      `right=${mm(margins.rightMm)}`,
      `bottom=${mm(margins.bottomMm)}`,
      `left=${mm(margins.leftMm)}`,
    );
  }
  const result: Record<string, FrontMatterValue> = { geometry: entries };
  if (named) result.papersize = named.name;
  return result;
}

/** A preserved value as one scalar, for keys Foldmark writes itself. */
function scalarPreserved(value: PreservedValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Keys Foldmark maps itself, and therefore never carries as preserved metadata.
 * `locale` and `tags` are the 1.x spellings of `lang` and `keywords`.
 */
const KNOWN_KEYS = new Set([
  'foldmarkVersion',
  'kind',
  'title',
  'lang',
  'locale',
  'theme',
  'keywords',
  'printProfile',
  'senderProfileId',
  'recipientContactId',
  'sender',
  'senderFooter',
  'pageNumbers',
  'show',
  'subjectWeight',
  'dateFormat',
  'recipient',
  'date',
  'subject',
  'reference',
  'salutation',
  'closing',
  'signerName',
  'signatureId',
  'emailTo',
  'surfaces',
  'export',
  'tags',
]);

/** Longest preserved scalar. */
const PRESERVED_VALUE_MAX = 2_000;

/**
 * A front-matter value in the shape `preserved` may hold: a scalar, a list of
 * scalars or a one-level mapping of scalars, every leaf as bounded text.
 * `null` for anything deeper.
 */
function preservable(value: FrontMatterValue): PreservedValue | null {
  const scalar = (entry: FrontMatterValue): PreservedScalar | null => {
    if (entry === null) return '';
    if (typeof entry === 'string') return entry.slice(0, PRESERVED_VALUE_MAX);
    if (typeof entry === 'number' || typeof entry === 'boolean') return entry;
    return null;
  };
  if (value === null || typeof value !== 'object') return scalar(value);
  if (Array.isArray(value)) {
    if (value.length > PRESERVED_ENTRIES_MAX) return null;
    const items = value.map((entry) => scalar(entry as FrontMatterValue));
    return items.every((item): item is PreservedScalar => item !== null) ? items : null;
  }
  const entries = Object.entries(value as Record<string, FrontMatterValue>);
  if (entries.length > PRESERVED_ENTRIES_MAX) return null;
  const mapping: Record<string, PreservedScalar> = {};
  for (const [key, entry] of entries) {
    const text = scalar(entry);
    if (text === null || !isSafeRecordKey(key)) return null;
    mapping[key] = text;
  }
  return mapping;
}

/**
 * Unknown keys, kept for the round trip. `author` is kept only while the
 * document has no sender snapshot — with one, it is derived on export and a
 * carried value would shadow the truth. `papersize` and `geometry` are kept
 * but never read: the profile is the source of the page.
 */
function readPreserved(
  front: Record<string, FrontMatterValue>,
  hasSender: boolean,
  issues: ValidationIssue[],
): Record<string, PreservedValue> {
  const preserved: Record<string, PreservedValue> = {};
  let dropped = 0;

  for (const [key, value] of Object.entries(front)) {
    if (KNOWN_KEYS.has(key)) continue;
    if (key === 'author' && hasSender) continue;
    const kept = preservable(value);
    if (
      kept === null ||
      !isSafeRecordKey(key) ||
      Object.keys(preserved).length >= PRESERVED_KEYS_MAX_COUNT
    ) {
      dropped += 1;
      continue;
    }
    preserved[key] = kept;
  }

  if (dropped > 0) {
    issues.push({ severity: 'info', code: 'import.metadataDropped', params: { count: dropped } });
  }
  return preserved;
}

/** Removes `undefined` entries so a strict schema does not see absent optional keys. */
function stripUndefined<T extends object>(value: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) continue;
    result[key] =
      entry !== null && typeof entry === 'object' && !Array.isArray(entry)
        ? stripUndefined(entry as object)
        : entry;
  }
  return result as T;
}

/** Drops absent and empty fields so the emitted front matter has no blank keys. */
function omitEmpty(value: object): Record<string, FrontMatterValue> {
  const result: Record<string, FrontMatterValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' && entry !== '') result[key] = entry;
  }
  return result;
}

function omitEmptyObjects(
  value: Record<string, Record<string, FrontMatterValue> | undefined>,
): Record<string, FrontMatterValue> {
  const result: Record<string, FrontMatterValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry && Object.keys(entry).length) result[key] = entry;
  }
  return result;
}
