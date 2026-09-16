import { inlineText, type MarkdownInline } from '@/domain/markdown/mdastAdapter';
import { parseInlineMarkdown } from '@/domain/markdown/parseMarkdown';

/**
 * "Clear formatting" for the Markdown source view (R14-005).
 *
 * The visual editor removes marks from a ProseMirror range; the source view
 * has only text, so the selected text is parsed and written back without its
 * character marks. What is not a character mark stays: a link keeps its
 * address, a date keeps its directive, an image its reference. The parser is
 * the domain's own, so a `**` inside inline code is not mistaken for bold.
 */
export function stripInlineMarks(source: string): string {
  return parseInlineMarkdown(source).map(unmarked).join('');
}

function unmarked(token: MarkdownInline): string {
  switch (token.kind) {
    case 'link':
      return `[${token.value}](${token.href ?? ''})`;
    case 'date':
      return `:date[${token.value}]`;
    case 'image':
      return `![${token.value}](asset:${token.assetId ?? ''})`;
    case 'break':
      return '\n';
    case 'text':
      return token.value;
    default:
      return token.children ? token.children.map(unmarked).join('') : inlineText([token]);
  }
}
