/**
 * The Markdown subset Foldmark renders — on screen, on paper and in email.
 *
 * Since change 0016 the parsing is done by remark (`remarkPipeline.ts`) and
 * the result is adapted into the bounded block model (`mdastAdapter.ts`).
 * The model is still deliberately a subset, and still rendered through static
 * Vue templates or a fixed HTML tag set, safe by construction rather than by
 * sanitizing (ADR 0011): remark hands over a syntax tree, never markup, and the
 * adapter refuses everything the renderers have not vetted.
 *
 * What the subset covers: headings, paragraphs, bullet and numbered lists with
 * nesting, block quotes, tables, rules, hard line breaks, strong, emphasis,
 * code, strikethrough, `http(s)`/`mailto` links, local `asset:` images, the
 * directive catalogue (`directives.ts`) and the colour palette
 * (`DocumentTheme.ts`). Anything else stays inert text.
 */

import type { Root } from 'mdast';
import {
  FOLDMARK_ADAPTER_CONFIG,
  mdastToBlocks,
  type AdapterConfig,
  type MarkdownBlock,
  type MarkdownInline,
} from '@/domain/markdown/mdastAdapter';
import { migrateDateTokens } from '@/domain/markdown/dateToken';
import { normalizeDirectiveFences, parseToMdast } from '@/domain/markdown/remarkPipeline';

export {
  inlineText,
  plainText,
  type AdapterConfig,
  type MarkdownBlock,
  type MarkdownHeadingLevel,
  type MarkdownInline,
  type MarkdownInlineKind,
  type MarkdownListItem,
} from '@/domain/markdown/mdastAdapter';

/** Parses a Markdown source into the bounded, non-HTML block model. */
export function parseMarkdown(
  source: string,
  config: AdapterConfig = FOLDMARK_ADAPTER_CONFIG,
): MarkdownBlock[] {
  return mdastToBlocks(parseToMdast(normalizeSource(source)), config);
}

/**
 * Line endings, directive fences and the 1.1 date token in the form the
 * parser reads. Pure text work, so the editor applies the same function
 * before handing a body to its own parser.
 */
export function normalizeSource(source: string): string {
  return migrateDateTokens(normalizeDirectiveFences(source.replaceAll('\r\n', '\n')));
}

/**
 * Every local asset a body refers to through `![…](asset:id)`, in order of
 * first appearance. The preview and the print copy resolve object URLs for
 * exactly these ids — a body image that is not listed here is one that shows
 * "image missing" on paper (R13-002).
 */
export function inlineAssetIds(source: string): readonly string[] {
  const ids = new Set<string>();
  const walkInline = (tokens: readonly MarkdownInline[]): void => {
    for (const token of tokens) {
      if (token.kind === 'image' && token.assetId) ids.add(token.assetId);
      if (token.children) walkInline(token.children);
    }
  };
  const walkBlocks = (blocks: readonly MarkdownBlock[]): void => {
    for (const block of blocks) {
      switch (block.kind) {
        case 'heading':
        case 'paragraph':
          walkInline(block.content);
          break;
        case 'list':
          for (const item of block.items) walkInline(item.content);
          break;
        case 'table':
          for (const row of [block.header, ...block.rows]) for (const cell of row) walkInline(cell);
          break;
        case 'blockquote':
        case 'directive':
          walkBlocks(block.blocks);
          break;
        default:
          break;
      }
    }
  };
  walkBlocks(parseMarkdown(source));
  return [...ids];
}

/** Parses one line of inline Markdown, for callers that hold a single paragraph. */
export function parseInlineMarkdown(source: string, config?: AdapterConfig) {
  const [first] = parseMarkdown(source, config);
  return first && first.kind === 'paragraph' ? [...first.content] : [];
}

/**
 * The source of every top-level block, in order, as the pagination unit.
 *
 * Pagination places whole blocks; the slices come from the same parse that the
 * renderer uses, so the two cannot disagree about where a block starts. Lists
 * are split into their items — a long list may cross a page — and everything
 * else (a table, a note box, a quote) moves as one. A page break is its own
 * slice so the layout can see it.
 */
export function blockSources(source: string): readonly string[] {
  const normalized = normalizeSource(source);
  const root: Root = parseToMdast(normalized);
  const slices: string[] = [];
  for (const node of root.children) {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) continue;
    if (node.type === 'list') {
      const marker = node.ordered ? (node.start ?? 1) : null;
      for (const [index, item] of node.children.entries()) {
        const itemStart = item.position?.start.offset;
        const itemEnd = item.position?.end.offset;
        if (itemStart === undefined || itemEnd === undefined) continue;
        const text = normalized.slice(itemStart, itemEnd);
        // A numbered item sliced out on its own must keep its number, or the
        // continuation page would restart at one.
        slices.push(
          marker === null || index === 0
            ? text
            : text.replace(/^(\s*)\d+([.)])/u, `$1${marker + index}$2`),
        );
      }
      continue;
    }
    slices.push(normalized.slice(start, end));
  }
  return slices;
}

/** Whether a block source is exactly a page break (`::page-break`, or an empty `:::page-break` container). */
export function isPageBreakSource(source: string): boolean {
  return (
    /^\s*::page-break\s*$/u.test(source) || /^\s*:{3,}page-break\s*\n\s*:{3,}\s*$/u.test(source)
  );
}
