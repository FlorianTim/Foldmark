/**
 * The Markdown subset, re-exported for presentation code.
 *
 * The parser itself moved to `@/domain/markdown/parseMarkdown` when Foldmark
 * gained a second consumer: the email renderer, which turns the same blocks
 * into restricted HTML and lives in infrastructure. A parser that decides what
 * a document *means* is domain knowledge, and having two copies of it — one for
 * the screen, one for the mail body — is how the preview and the sent message
 * end up disagreeing.
 *
 * This module stays so existing imports and the shell tests keep working.
 */
export {
  parseInlineMarkdown,
  parseMarkdown,
  type MarkdownBlock,
  type MarkdownHeadingLevel,
  type MarkdownInline,
  type MarkdownInlineKind,
  type MarkdownListItem,
} from '@/domain/markdown/parseMarkdown';
