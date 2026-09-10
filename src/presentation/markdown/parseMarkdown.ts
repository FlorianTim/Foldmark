/** Inline token kinds supported by the deliberately small Markdown subset. */
export type MarkdownInlineKind = 'text' | 'strong' | 'emphasis' | 'code';

/** One escaped-by-Vue inline token. No token contains generated HTML. */
export interface MarkdownInline {
  readonly kind: MarkdownInlineKind;
  readonly value: string;
}

/** Heading levels the subset renders. Deeper levels degrade to level 3. */
export type MarkdownHeadingLevel = 1 | 2 | 3;

/** Heading, paragraph or unordered-list block rendered through static Vue templates. */
export type MarkdownBlock =
  | {
      readonly kind: 'heading';
      readonly level: MarkdownHeadingLevel;
      readonly content: readonly MarkdownInline[];
    }
  | { readonly kind: 'paragraph'; readonly content: readonly MarkdownInline[] }
  | { readonly kind: 'list'; readonly items: readonly (readonly MarkdownInline[])[] };

const delimiters = [
  { marker: '**', kind: 'strong' },
  { marker: '__', kind: 'strong' },
  { marker: '`', kind: 'code' },
  { marker: '*', kind: 'emphasis' },
  { marker: '_', kind: 'emphasis' },
] as const;

/** Parses inline emphasis and code without interpreting HTML, URLs or images. */
export function parseInlineMarkdown(source: string): MarkdownInline[] {
  const tokens: MarkdownInline[] = [];
  let cursor = 0;
  let textStart = 0;

  while (cursor < source.length) {
    const delimiter = delimiters.find(({ marker }) => source.startsWith(marker, cursor));
    if (!delimiter) {
      cursor += 1;
      continue;
    }

    const contentStart = cursor + delimiter.marker.length;
    const closing = source.indexOf(delimiter.marker, contentStart);
    if (closing <= contentStart) {
      cursor += delimiter.marker.length;
      continue;
    }

    if (cursor > textStart) {
      tokens.push({ kind: 'text', value: source.slice(textStart, cursor) });
    }
    tokens.push({ kind: delimiter.kind, value: source.slice(contentStart, closing) });
    cursor = closing + delimiter.marker.length;
    textStart = cursor;
  }

  if (textStart < source.length) tokens.push({ kind: 'text', value: source.slice(textStart) });
  return tokens.length ? tokens : [{ kind: 'text', value: source }];
}

/** Matches `#`, `##`, `###` … followed by a space. */
const headingPattern = /^(#{1,6})\s+(.*)$/;

/**
 * Parses headings, paragraphs and `- ` list items into a bounded, non-HTML
 * syntax tree.
 *
 * The subset stays deliberately small — no HTML, no URLs, no images, no
 * tables — because every element here is rendered through a static Vue
 * template and must be safe by construction rather than by sanitizing.
 *
 * Consecutive non-empty lines form **one** paragraph, the way Markdown
 * defines it. Treating every line as its own paragraph looked fine for the
 * demo's one-line strings and falls apart on wrapped prose such as the
 * bundled help documents.
 */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let listItems: MarkdownInline[][] = [];
  let paragraphLines: string[] = [];

  const flushList = (): void => {
    if (listItems.length) blocks.push({ kind: 'list', items: listItems });
    listItems = [];
  };

  const flushParagraph = (): void => {
    if (paragraphLines.length) {
      blocks.push({ kind: 'paragraph', content: parseInlineMarkdown(paragraphLines.join(' ')) });
    }
    paragraphLines = [];
  };

  for (const line of source.replaceAll('\r\n', '\n').split('\n')) {
    const heading = headingPattern.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length, 3) as MarkdownHeadingLevel;
      blocks.push({ kind: 'heading', level, content: parseInlineMarkdown(heading[2]) });
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      listItems.push(parseInlineMarkdown(line.slice(2)));
      continue;
    }

    flushList();
    if (line.trim()) {
      paragraphLines.push(line.trim());
    } else {
      flushParagraph();
    }
  }

  flushParagraph();
  flushList();
  return blocks;
}
