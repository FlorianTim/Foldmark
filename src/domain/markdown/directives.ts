/**
 * The directive catalogue (change 0017, ADR 0019).
 *
 * Formatting that Markdown itself cannot express — colour, indentation, a
 * page break, a note box — is written as *directives* in the `remark-directive`
 * syntax: `:red[word]` inline, `:::note{type=warning}` around blocks,
 * `::page-break` as a leaf (two colons: a three-colon fence without a closing
 * fence would swallow the rest of the document). Every directive Foldmark understands is listed
 * here, once, as data. The parser consults this registry to validate names and
 * attributes; the renderers consult it to know what to draw; the editor
 * consults it to build its menus. Adding a directive is a change to this file
 * plus a renderer case per output plus three tests — never a parser change.
 *
 * Anything *not* in the catalogue is still a directive to the parser: it is
 * kept in the file unchanged, marked as unknown, and rendered as its plain
 * content. Unknown never means broken.
 */

import { isValidId } from '@/domain/common/Ids';
import { isColorName } from '@/domain/document/DocumentTheme';

/** How one attribute of a directive is validated. Values are always strings in the file. */
export type DirectiveAttribute =
  | { readonly kind: 'enum'; readonly values: readonly string[]; readonly fallback: string }
  | {
      readonly kind: 'integer';
      readonly min: number;
      readonly max: number;
      readonly fallback: number;
    };

/** One block-level directive: a container (`:::name` … `:::`) or a leaf (`::name` alone). */
export interface BlockDirectiveDefinition {
  readonly form: 'container' | 'leaf';
  readonly attributes: Readonly<Record<string, DirectiveAttribute>>;
}

/** The block directives, by name. */
export const BLOCK_DIRECTIVES: Readonly<Record<string, BlockDirectiveDefinition>> = Object.freeze({
  indent: {
    form: 'container',
    attributes: { level: { kind: 'integer', min: 1, max: 3, fallback: 1 } },
  },
  align: {
    form: 'container',
    attributes: {
      to: { kind: 'enum', values: ['left', 'center', 'right', 'justify'], fallback: 'left' },
    },
  },
  'page-break': { form: 'leaf', attributes: {} },
  small: { form: 'container', attributes: {} },
  note: {
    form: 'container',
    attributes: { type: { kind: 'enum', values: ['info', 'warning'], fallback: 'info' } },
  },
  signature: {
    form: 'container',
    attributes: { lines: { kind: 'integer', min: 1, max: 6, fallback: 3 } },
  },
  /**
   * The salutation and the closing of a letter (R13-019): ordinary text on
   * screen and on paper, but anchored in the file so the letter details can
   * replace them without searching for "Dear …". No attributes; the words are
   * the content, and a foreign Markdown reader shows them as a paragraph.
   */
  salutation: { form: 'container', attributes: {} },
  closing: { form: 'container', attributes: {} },
});

/** The two letter blocks the document settings manage. */
export type LetterBlockName = 'salutation' | 'closing';

/** The inline directives apart from colours, which are the palette's business. */
export const INLINE_DIRECTIVES = ['highlight', 'u', 'small', 'sup', 'sub', 'date'] as const;

/** One of the fixed inline directives. */
export type InlineDirectiveName = (typeof INLINE_DIRECTIVES)[number];

/** Whether a name is a known inline directive or a palette colour. */
export function isKnownInlineDirective(name: string): boolean {
  return (INLINE_DIRECTIVES as readonly string[]).includes(name) || isColorName(name);
}

/** Whether a name is a known block directive of the given form. */
export function isKnownBlockDirective(name: string, form: 'container' | 'leaf'): boolean {
  return BLOCK_DIRECTIVES[name]?.form === form;
}

/**
 * The attributes of a known block directive, validated against the catalogue.
 * Unknown attributes are dropped from the *rendered* result; the file keeps
 * them. An out-of-range value falls back to the default.
 */
export function resolveBlockAttributes(
  name: string,
  raw: Readonly<Record<string, string | null | undefined>>,
): Readonly<Record<string, string>> {
  const definition = BLOCK_DIRECTIVES[name];
  if (!definition) return {};
  const result: Record<string, string> = {};
  for (const [key, rule] of Object.entries(definition.attributes)) {
    const value = raw[key];
    if (rule.kind === 'enum') {
      result[key] = value && rule.values.includes(value) ? value : rule.fallback;
    } else {
      const number = value === undefined || value === null ? Number.NaN : Number(value);
      result[key] =
        Number.isInteger(number) && number >= rule.min && number <= rule.max
          ? String(number)
          : String(rule.fallback);
    }
  }
  return result;
}

// Linear: each character class is disjoint from the hyphen that separates the groups.
// eslint-disable-next-line security/detect-unsafe-regex
const DIRECTIVE_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

/** Directive names are lowercase words joined by hyphens. Anything else is text. */
export const DIRECTIVE_NAME = DIRECTIVE_NAME_PATTERN;

/** ISO calendar date, the only content a `:date[…]` directive accepts. */
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

/** Widths for `![…](asset:…){width=60mm}`, in millimetres, bounded to a sheet. */
export const IMAGE_WIDTH_BOUNDS = Object.freeze({ min: 5, max: 400 });

/** Parses an image width attribute such as `60mm` or `60`; `null` when it is not usable. */
export function parseImageWidth(value: string | null | undefined): number | null {
  if (!value) return null;
  // Linear — the optional fraction cannot overlap the integer part.
  // eslint-disable-next-line security/detect-unsafe-regex
  const match = /^(\d+(?:\.\d+)?)\s*(mm)?$/u.exec(value.trim());
  if (!match) return null;
  const width = Number(match[1]);
  if (width < IMAGE_WIDTH_BOUNDS.min || width > IMAGE_WIDTH_BOUNDS.max) return null;
  return width;
}

/** Where an image sits in the text box (R14-015); `left` is the default and is not written. */
export const IMAGE_ALIGNMENTS = ['left', 'center', 'right'] as const;
/** One image alignment. */
export type ImageAlignment = (typeof IMAGE_ALIGNMENTS)[number];

/**
 * How an image is laid out (R14-015): a width in millimetres *or* as a share
 * of the text box (`100` is the full width), and an alignment. All optional;
 * an image without a layout is drawn at its natural size on the left.
 */
export interface ImageLayout {
  readonly widthMm?: number;
  readonly widthPercent?: number;
  readonly align?: ImageAlignment;
}

/** Parses `50%` into a share of the text box, 1–100; `null` otherwise. */
export function parseImagePercent(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,3})\s*%$/u.exec(value.trim());
  if (!match) return null;
  const percent = Number(match[1]);
  return percent >= 1 && percent <= 100 ? percent : null;
}

/**
 * The layout from an image's attribute block, e.g. `{width=60mm align=center}`
 * or `{width=100%}`. Unknown attributes and unusable values are ignored; the
 * file keeps what it said until the image is written back.
 */
export function parseImageLayout(
  attributes: Readonly<Record<string, string | null | undefined>> | null | undefined,
): ImageLayout {
  if (!attributes) return {};
  const layout: { -readonly [K in keyof ImageLayout]?: ImageLayout[K] } = {};
  const percent = parseImagePercent(attributes.width);
  const mm = percent === null ? parseImageWidth(attributes.width) : null;
  if (percent !== null) layout.widthPercent = percent;
  else if (mm !== null) layout.widthMm = mm;
  const align = attributes.align?.trim().toLowerCase();
  if (align && align !== 'left' && IMAGE_ALIGNMENTS.includes(align as ImageAlignment)) {
    layout.align = align as ImageAlignment;
  }
  return layout;
}

/** The attribute block for a layout — `{width=60mm align=right}` — or `''` when there is none. */
export function serializeImageLayout(layout: ImageLayout): string {
  const parts: string[] = [];
  if (layout.widthPercent) parts.push(`width=${Math.round(layout.widthPercent)}%`);
  else if (layout.widthMm) parts.push(`width=${layout.widthMm}mm`);
  if (layout.align && layout.align !== 'left') parts.push(`align=${layout.align}`);
  return parts.length ? `{${parts.join(' ')}}` : '';
}

/** The `asset:` id of an image URL, or `null` for any other scheme — remote images do not exist. */
export function assetIdFromUrl(url: string): string | null {
  const match = /^asset:(?:\/\/)?(.+)$/u.exec(url.trim());
  return match && isValidId(match[1]) ? match[1] : null;
}
