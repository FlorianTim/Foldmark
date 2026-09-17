import type { Millimetres } from '@/domain/common/Units';
import type { DocumentAsset } from '@/domain/asset/DocumentAsset';
import {
  DEFAULT_DOCUMENT_THEME,
  ptToMm,
  type DocumentTheme,
  type FontFamily,
} from '@/domain/document/DocumentTheme';
import {
  blockSources,
  inlineText,
  parseMarkdown,
  type MarkdownBlock,
  type MarkdownInline,
} from '@/domain/markdown/parseMarkdown';
import type { RenderTextStyle } from '@/application/render/RenderPlan';

/**
 * Text metrics for layout.
 *
 * Foldmark places content into fixed physical boxes, so it has to answer "how
 * tall will this text be?" *before* a browser has laid it out. The estimate
 * here is what makes that possible without a DOM — and therefore what makes
 * pagination testable and identical in the preview, in print and in any future
 * PDF adapter.
 *
 * It is an **estimate**, and deliberately a slightly pessimistic one: assuming
 * text is a little wider than it is means the last line falls onto the next
 * page rather than off the bottom of this one. The renderer applies the same
 * numbers as CSS lengths, so the two agree by construction rather than by luck;
 * what remains is font substitution, which is why the layout also reports an
 * overflow warning instead of trusting itself.
 *
 * Since change 0017 the body size, leading and font family come from the
 * document theme, so a letter set in 12 pt paginates as a 12 pt letter.
 */

/** Font size and leading for one kind of text, in millimetres. */
export interface TextMetrics {
  readonly fontSizeMm: Millimetres;
  readonly lineHeightMm: Millimetres;
  /**
   * Average glyph advance as a fraction of the font size.
   *
   * 0.52 is a little wider than a typical humanist sans at mixed case, which is
   * the pessimism described above.
   */
  readonly averageAdvance: number;
}

/** Average advance per font family: serif faces run a little narrower, monospace much wider. */
const ADVANCE_BY_FAMILY: Readonly<Record<FontFamily, number>> = Object.freeze({
  serif: 0.5,
  sans: 0.52,
  mono: 0.62,
});

/** The metrics Foldmark lays out with, per text style, for a document theme. */
export function textMetricsFor(
  theme: DocumentTheme,
): Readonly<Record<RenderTextStyle, TextMetrics>> {
  const advance = ADVANCE_BY_FAMILY[theme.fontFamily];
  const body = ptToMm(theme.fontSizePt);
  return Object.freeze({
    body: { fontSizeMm: body, lineHeightMm: body * theme.lineHeight, averageAdvance: advance },
    subject: {
      fontSizeMm: body,
      lineHeightMm: body * theme.lineHeight,
      averageAdvance: advance + 0.04,
    },
    address: { fontSizeMm: ptToMm(10), lineHeightMm: ptToMm(10) * 1.3, averageAdvance: 0.52 },
    meta: { fontSizeMm: ptToMm(9), lineHeightMm: ptToMm(9) * 1.35, averageAdvance: 0.52 },
    footer: { fontSizeMm: ptToMm(8), lineHeightMm: ptToMm(8) * 1.3, averageAdvance: 0.52 },
    caption: { fontSizeMm: ptToMm(10), lineHeightMm: ptToMm(10) * 1.35, averageAdvance: 0.52 },
  });
}

/** The metrics of the default theme — today's rendering. */
export const TEXT_METRICS: Readonly<Record<RenderTextStyle, TextMetrics>> =
  textMetricsFor(DEFAULT_DOCUMENT_THEME);

/** What the estimate needs beyond the source: the theme, and the assets for image heights. */
export interface MetricsContext {
  readonly theme?: DocumentTheme;
  readonly assets?: readonly DocumentAsset[];
}

function metricsOf(style: RenderTextStyle, theme: DocumentTheme | undefined): TextMetrics {
  return theme ? textMetricsFor(theme)[style] : TEXT_METRICS[style];
}

/** How many characters of the given style fit on one line of the given width. */
export function charactersPerLine(
  style: RenderTextStyle,
  widthMm: Millimetres,
  theme?: DocumentTheme,
): number {
  const metrics = metricsOf(style, theme);
  const advance = metrics.fontSizeMm * metrics.averageAdvance;
  return Math.max(1, Math.floor(widthMm / advance));
}

/** How many lines a paragraph of the given text occupies at the given width. */
export function lineCount(
  text: string,
  style: RenderTextStyle,
  widthMm: Millimetres,
  theme?: DocumentTheme,
): number {
  if (!text.trim()) return 1;
  return Math.max(1, Math.ceil(text.length / charactersPerLine(style, widthMm, theme)));
}

/** The height a run of already-broken lines occupies. */
export function linesHeightMm(
  lines: number,
  style: RenderTextStyle,
  theme?: DocumentTheme,
): Millimetres {
  return lines * metricsOf(style, theme).lineHeightMm;
}

/** Indent per list depth and per `:::indent` level, in millimetres. */
export const INDENT_STEP_MM = 8;

/** Vertical room a note box adds around its content, in lines. */
const NOTE_PADDING_LINES = 1.2;

/** Room above the name line of a signature block, in lines per requested line. */
const SIGNATURE_LINE_FACTOR = 1;

/** Aspect ratio assumed for an image whose asset is not resolvable: a landscape photo. */
const FALLBACK_IMAGE_ASPECT = 3 / 4;

/** Height of every image in a token list; text is measured separately. */
function imagesHeightMm(
  tokens: readonly MarkdownInline[],
  widthMm: number,
  context: MetricsContext,
) {
  let height = 0;
  for (const token of tokens) {
    if (token.kind !== 'image') continue;
    const asset = context.assets?.find((candidate) => candidate.id === token.assetId);
    const requested = token.widthPercent
      ? (widthMm * token.widthPercent) / 100
      : (token.widthMm ?? widthMm);
    const width = Math.min(requested, widthMm);
    const aspect = asset ? asset.heightPx / asset.widthPx : FALLBACK_IMAGE_ASPECT;
    height += width * aspect;
  }
  return height;
}

/** Text of a token list without its images, for the line count. */
function textOf(tokens: readonly MarkdownInline[]): string {
  return inlineText(tokens.filter((token) => token.kind !== 'image'));
}

function blockHeightMm(
  block: MarkdownBlock,
  style: RenderTextStyle,
  widthMm: Millimetres,
  context: MetricsContext,
): Millimetres {
  const theme = context.theme ?? DEFAULT_DOCUMENT_THEME;
  const lines = (count: number): Millimetres => linesHeightMm(count, style, theme);
  switch (block.kind) {
    case 'heading': {
      const factor = [1.5, 1.25, 1.1, 1, 1, 1][block.level - 1] ?? 1;
      return (
        lines(lineCount(textOf(block.content), style, widthMm / factor, theme)) * factor +
        imagesHeightMm(block.content, widthMm, context)
      );
    }
    case 'paragraph':
      return (
        lines(lineCount(textOf(block.content), style, widthMm, theme)) +
        imagesHeightMm(block.content, widthMm, context)
      );
    case 'list':
      return block.items.reduce(
        (total, item) =>
          total +
          lines(
            lineCount(
              textOf(item.content),
              style,
              Math.max(10, widthMm - (item.depth + 1) * INDENT_STEP_MM),
              theme,
            ),
          ),
        0,
      );
    case 'blockquote':
      return blocksHeightMm(block.blocks, style, Math.max(10, widthMm - INDENT_STEP_MM), context);
    case 'table': {
      const columns = Math.max(1, block.header.length);
      const columnWidth = Math.max(5, widthMm / columns);
      const rowLines = (row: readonly (readonly MarkdownInline[])[]): number =>
        Math.max(1, ...row.map((cell) => lineCount(textOf(cell), style, columnWidth, theme)));
      return lines(
        rowLines(block.header) + block.rows.reduce((sum, row) => sum + rowLines(row), 0),
      );
    }
    case 'rule':
      return lines(1);
    case 'pageBreak':
      return 0;
    case 'qr':
      // Drawn square at its size, quiet zone included, never wider than the box.
      return Math.min(block.sizeMm, widthMm);
    case 'directive': {
      if (!block.known) return blocksHeightMm(block.blocks, style, widthMm, context);
      switch (block.name) {
        case 'indent':
          return blocksHeightMm(
            block.blocks,
            style,
            Math.max(10, widthMm - Number(block.attributes.level) * INDENT_STEP_MM),
            context,
          );
        case 'small': {
          const small: DocumentTheme = { ...theme, fontSizePt: theme.smallSizePt };
          return blocksHeightMm(block.blocks, style, widthMm, { ...context, theme: small });
        }
        case 'note':
          return (
            blocksHeightMm(block.blocks, style, Math.max(10, widthMm - INDENT_STEP_MM), context) +
            lines(NOTE_PADDING_LINES)
          );
        case 'signature':
          return (
            lines(Number(block.attributes.lines) * SIGNATURE_LINE_FACTOR + 1) +
            blocksHeightMm(block.blocks, style, widthMm, context)
          );
        default:
          return blocksHeightMm(block.blocks, style, widthMm, context);
      }
    }
    default:
      return lines(1);
  }
}

function blocksHeightMm(
  blocks: readonly MarkdownBlock[],
  style: RenderTextStyle,
  widthMm: Millimetres,
  context: MetricsContext,
): Millimetres {
  const theme = context.theme ?? DEFAULT_DOCUMENT_THEME;
  if (blocks.length === 0) return 0;
  const content = blocks.reduce(
    (total, block) => total + blockHeightMm(block, style, widthMm, context),
    0,
  );
  const gaps = (blocks.length - 1) * theme.paragraphSpacing;
  return content + linesHeightMm(gaps, style, theme);
}

/**
 * The height a Markdown source occupies in a box of the given width.
 *
 * Counts wrapped lines per block and adds the theme's paragraph spacing
 * between blocks — the same shape the renderer produces. The blocks come from
 * the same parser the renderer uses, so the estimate measures the document that
 * is on screen, not a different reading of it.
 */
export function markdownHeightMm(
  source: string,
  style: RenderTextStyle,
  widthMm: Millimetres,
  context: MetricsContext = {},
): Millimetres {
  return blocksHeightMm(parseMarkdown(source), style, widthMm, context);
}

/**
 * Splits Markdown source into the blocks the renderer will produce, as source
 * slices. Kept under its old name for the render plan; the work is done by the
 * parser (`blockSources`), which is what guarantees the two agree.
 */
export function splitParagraphs(source: string): readonly string[] {
  return blockSources(source);
}
