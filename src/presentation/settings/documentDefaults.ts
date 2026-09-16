import {
  COLOR_ALIASES,
  COLOR_TONES,
  DEFAULT_ALIASES,
  DEFAULT_DOCUMENT_THEME,
  FONT_FAMILIES,
  THEME_BOUNDS,
  type ColorAlias,
  type ColorTone,
  type FontFamily,
} from '@/domain/document/DocumentTheme';
import {
  DATE_FORMATS,
  PAGE_NUMBER_FORMATS,
  PAGE_NUMBER_POSITIONS,
  type DateFormat,
  type PageNumberFormat,
  type PageNumberPosition,
  type PrintOptions,
} from '@/domain/document/FoldmarkDocument';

/**
 * What a new document starts with (change 0028, R13-032): its language, the
 * date format, the typography and the page numbers. Stored as one preference
 * so the settings page edits one object and `workspace.create` reads one.
 *
 * Only deviations from Foldmark's own defaults are written into the document,
 * the same way the document theme is stored — a person who never touched the
 * defaults gets a document that carries no theme block at all.
 */

/** The document languages offered; the render formats dates in them. */
export const DOCUMENT_LOCALES = ['de-DE', 'de-AT', 'de-CH', 'en-GB', 'en-US'] as const;
/** One of the offered document languages. */
export type DocumentLocale = (typeof DOCUMENT_LOCALES)[number];

/** What a new document starts with. */
export interface DocumentDefaults {
  readonly locale: DocumentLocale;
  readonly dateFormat: DateFormat;
  readonly fontFamily: FontFamily;
  readonly fontSizePt: number;
  readonly lineHeight: number;
  readonly paragraphSpacing: number;
  readonly pageNumberFormat: PageNumberFormat;
  readonly pageNumberPosition: PageNumberPosition;
  /**
   * Where the semantic colours point (R14-009): `:warning[…]` is amber unless
   * the person says otherwise. Global defaults, copied into a new document's
   * theme only where they deviate; a stored document keeps its own.
   */
  readonly aliases: Readonly<Record<ColorAlias, ColorTone>>;
}

/** Foldmark's own defaults: a German letter in the default theme, no page numbers. */
export const FACTORY_DOCUMENT_DEFAULTS: DocumentDefaults = Object.freeze({
  locale: 'de-DE',
  dateFormat: 'long',
  fontFamily: DEFAULT_DOCUMENT_THEME.fontFamily,
  fontSizePt: DEFAULT_DOCUMENT_THEME.fontSizePt,
  lineHeight: DEFAULT_DOCUMENT_THEME.lineHeight,
  paragraphSpacing: DEFAULT_DOCUMENT_THEME.paragraphSpacing,
  pageNumberFormat: 'none',
  pageNumberPosition: 'bottom-center',
  aliases: DEFAULT_ALIASES as Readonly<Record<ColorAlias, ColorTone>>,
});

/** A stored JSON string as defaults; anything unreadable falls back field by field. */
export function decodeDocumentDefaults(raw: string): DocumentDefaults | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const pick = <T extends string>(key: string, options: readonly T[], fallback: T): T => {
    const value = record[key];
    return typeof value === 'string' && options.includes(value as T) ? (value as T) : fallback;
  };
  const number = (key: string, bounds: { min: number; max: number }, fallback: number): number => {
    const value = record[key];
    return typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= bounds.min &&
      value <= bounds.max
      ? value
      : fallback;
  };
  const factory = FACTORY_DOCUMENT_DEFAULTS;
  return {
    locale: pick('locale', DOCUMENT_LOCALES, factory.locale),
    dateFormat: pick('dateFormat', DATE_FORMATS, factory.dateFormat),
    fontFamily: pick('fontFamily', FONT_FAMILIES, factory.fontFamily),
    fontSizePt: number('fontSizePt', THEME_BOUNDS.fontSizePt, factory.fontSizePt),
    lineHeight: number('lineHeight', THEME_BOUNDS.lineHeight, factory.lineHeight),
    paragraphSpacing: number(
      'paragraphSpacing',
      THEME_BOUNDS.paragraphSpacing,
      factory.paragraphSpacing,
    ),
    pageNumberFormat: pick('pageNumberFormat', PAGE_NUMBER_FORMATS, factory.pageNumberFormat),
    pageNumberPosition: pick(
      'pageNumberPosition',
      PAGE_NUMBER_POSITIONS,
      factory.pageNumberPosition,
    ),
    aliases: readAliases(record.aliases),
  };
}

/** The alias map from storage; an unknown alias or tone falls back to the factory value. */
function readAliases(value: unknown): Readonly<Record<ColorAlias, ColorTone>> {
  const source =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const factory = FACTORY_DOCUMENT_DEFAULTS.aliases;
  return Object.fromEntries(
    COLOR_ALIASES.map((alias) => {
      const tone = source[alias];
      return [
        alias,
        typeof tone === 'string' && COLOR_TONES.includes(tone as ColorTone)
          ? (tone as ColorTone)
          : factory[alias],
      ];
    }),
  ) as Record<ColorAlias, ColorTone>;
}

/** The defaults as the stored JSON string. */
export function encodeDocumentDefaults(defaults: DocumentDefaults): string {
  return JSON.stringify(defaults);
}

/** Only the aliases that differ from the palette's own, as a theme `aliases` block. */
function aliasDeviations(aliases: Readonly<Record<ColorAlias, ColorTone>>): {
  aliases?: Partial<Record<ColorAlias, ColorTone>>;
} {
  const factory = FACTORY_DOCUMENT_DEFAULTS.aliases;
  const changed = Object.fromEntries(
    COLOR_ALIASES.filter((alias) => aliases[alias] !== factory[alias]).map((alias) => [
      alias,
      aliases[alias],
    ]),
  ) as Partial<Record<ColorAlias, ColorTone>>;
  return Object.keys(changed).length ? { aliases: changed } : {};
}

/**
 * The print options a new document starts with: the defaults as deviations
 * from the factory values, so an untouched preference writes nothing.
 */
export function printOptionsFromDefaults(defaults: DocumentDefaults): PrintOptions {
  const factory = FACTORY_DOCUMENT_DEFAULTS;
  const theme = {
    ...(defaults.fontFamily !== factory.fontFamily ? { fontFamily: defaults.fontFamily } : {}),
    ...(defaults.fontSizePt !== factory.fontSizePt ? { fontSizePt: defaults.fontSizePt } : {}),
    ...(defaults.lineHeight !== factory.lineHeight ? { lineHeight: defaults.lineHeight } : {}),
    ...(defaults.paragraphSpacing !== factory.paragraphSpacing
      ? { paragraphSpacing: defaults.paragraphSpacing }
      : {}),
    ...aliasDeviations(defaults.aliases),
  };
  return {
    pageNumbers: {
      format: defaults.pageNumberFormat,
      position: defaults.pageNumberPosition,
      hideOnFirstPage: false,
    },
    ...(defaults.dateFormat !== factory.dateFormat ? { dateFormat: defaults.dateFormat } : {}),
    ...(Object.keys(theme).length ? { theme } : {}),
  };
}
