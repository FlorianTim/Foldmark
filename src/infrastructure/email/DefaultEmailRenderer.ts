import type { EmailRenderer, EmailRenderInput } from '@/application/ports/EmailPorts';
import {
  ptToMm,
  resolveColor,
  resolveTheme,
  type DocumentTheme,
} from '@/domain/document/DocumentTheme';
import { formatIsoDate } from '@/domain/markdown/dateToken';
import { hasLetterBlock } from '@/domain/markdown/letterBlocks';
import {
  parseMarkdown,
  type MarkdownBlock,
  type MarkdownInline,
} from '@/domain/markdown/parseMarkdown';

/**
 * Turning a document into message bodies.
 *
 * Both renderers work from the same parsed blocks the preview uses, so the mail
 * and the paper cannot drift apart in what they consider a paragraph.
 *
 * The HTML renderer is **safe by construction, not by sanitizing**. It walks a
 * bounded syntax tree that has no notion of HTML, escapes every text node, and
 * emits a fixed set of tags with no attributes except a handful of inline
 * styles this file writes itself — and the colour values come from the
 * document's palette, never from the text. There is no path by which document
 * text becomes markup, so there is nothing for a sanitizer to catch — which is
 * also why Foldmark needs no HTML sanitizer dependency.
 *
 * The styling is inline and minimal on purpose: mail clients strip `<style>`
 * blocks, and anything more elaborate degrades differently in every one of them.
 */
export class DefaultEmailRenderer implements EmailRenderer {
  /** Column at which the plain-text body is wrapped. */
  public static readonly WRAP_COLUMN = 72;

  /** A plain-text body, hard-wrapped, safe to place in a `mailto:` URL. */
  public renderPlainText(input: EmailRenderInput): string {
    const { document } = input;
    const parts: string[] = [];
    const context: RenderContext = { locale: document.locale, theme: themeOf(document) };

    // The salutation and the closing live in the body as blocks since change
    // 0021; the metadata copy is only prepended for a body that has none.
    if (document.metadata.salutation && !hasLetterBlock(document.bodyMarkdown, 'salutation')) {
      parts.push(document.metadata.salutation);
    }

    const body = parseMarkdown(document.bodyMarkdown)
      .map((block) => blockToText(block, context))
      .filter(Boolean)
      .join('\n\n');
    if (body) parts.push(body);

    if (document.metadata.closing && !hasLetterBlock(document.bodyMarkdown, 'closing')) {
      parts.push(document.metadata.closing);
    }
    const signer = input.senderName ?? document.metadata.signerName;
    if (signer) parts.push(signer);

    const footer = (input.footerLines ?? []).filter(Boolean);
    // `-- ` is the RFC-blessed signature separator; clients use it to collapse
    // what follows, which is exactly what a footer of register numbers is for.
    if (footer.length) parts.push(`-- \n${footer.join('\n')}`);

    return parts
      .map((part) => wrap(part, DefaultEmailRenderer.WRAP_COLUMN))
      .join('\n\n')
      .trim();
  }

  /** A restricted HTML body: escaped text, a fixed tag set, no external references. */
  public renderHtml(input: EmailRenderInput): string {
    const { document } = input;
    const parts: string[] = [];
    const context: RenderContext = { locale: document.locale, theme: themeOf(document) };

    if (document.metadata.salutation && !hasLetterBlock(document.bodyMarkdown, 'salutation')) {
      parts.push(`<p>${escapeHtml(document.metadata.salutation)}</p>`);
    }
    for (const block of parseMarkdown(document.bodyMarkdown)) {
      const html = blockToHtml(block, context);
      if (html) parts.push(html);
    }
    if (document.metadata.closing && !hasLetterBlock(document.bodyMarkdown, 'closing')) {
      parts.push(`<p>${escapeHtml(document.metadata.closing)}</p>`);
    }
    const signer = input.senderName ?? document.metadata.signerName;
    if (signer) parts.push(`<p>${escapeHtml(signer)}</p>`);

    const footer = (input.footerLines ?? []).filter(Boolean);
    if (footer.length) {
      parts.push(
        `<p style="color:#59666c;font-size:12px">${footer.map(escapeHtml).join('<br />')}</p>`,
      );
    }

    return [
      '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.5;color:#182126">',
      ...parts,
      '</div>',
    ].join('\n');
  }
}

/** What every renderer needs beside the blocks: the language for dates and the palette. */
interface RenderContext {
  readonly locale: string;
  readonly theme: DocumentTheme;
}

function themeOf(document: EmailRenderInput['document']): DocumentTheme {
  return resolveTheme(document.printOptions.theme);
}

/**
 * Escapes text for HTML.
 *
 * All five characters, including the quotes: the renderer only ever emits text
 * into element content today, but an escape helper that is only correct in one
 * position is a trap for the next person who reaches for it.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function inlineToText(tokens: readonly MarkdownInline[], context: RenderContext): string {
  return tokens
    .map((token) => {
      switch (token.kind) {
        case 'break':
          return '\n';
        case 'date':
          return formatIsoDate(token.value, context.locale);
        case 'image':
          // A mail body cannot carry the bytes; the alt text stands in.
          return token.value ? `[${token.value}]` : '';
        case 'link':
          // Plain text cannot carry a link; the address follows the text.
          return token.href && token.href !== token.value
            ? `${token.value} (${token.href})`
            : token.value;
        default:
          return token.children ? inlineToText(token.children, context) : token.value;
      }
    })
    .join('');
}

/** The content of a container token as HTML: its children when nested, its text otherwise. */
function innerHtml(token: MarkdownInline, context: RenderContext): string {
  return token.children ? inlineToHtml(token.children, context) : escapeHtml(token.value);
}

function inlineToHtml(tokens: readonly MarkdownInline[], context: RenderContext): string {
  return tokens
    .map((token) => {
      switch (token.kind) {
        case 'strong':
          return `<strong>${innerHtml(token, context)}</strong>`;
        case 'emphasis':
          return `<em>${innerHtml(token, context)}</em>`;
        case 'code':
          return `<code>${escapeHtml(token.value)}</code>`;
        case 'strikethrough':
          return `<s>${innerHtml(token, context)}</s>`;
        case 'break':
          return '<br />';
        case 'link':
          // The parser only ever yields http(s) and mailto hrefs.
          return `<a href="${escapeHtml(token.href ?? '')}">${innerHtml(token, context)}</a>`;
        case 'date':
          return escapeHtml(formatIsoDate(token.value, context.locale));
        case 'image':
          // No `<img>` in mail: the bytes live in this browser only.
          return token.value ? `<em>[${escapeHtml(token.value)}]</em>` : '';
        case 'color': {
          // The value comes from the palette — a fixed table — never from the text.
          const color = resolveColor(token.color ?? '', context.theme);
          return color
            ? `<span style="color:${color.screen}">${innerHtml(token, context)}</span>`
            : innerHtml(token, context);
        }
        case 'highlight':
          return `<mark style="background:${context.theme.highlight.screen}">${innerHtml(token, context)}</mark>`;
        case 'underline':
          return `<u>${innerHtml(token, context)}</u>`;
        case 'small':
          return `<small>${innerHtml(token, context)}</small>`;
        case 'sup':
          return `<sup>${innerHtml(token, context)}</sup>`;
        case 'sub':
          return `<sub>${innerHtml(token, context)}</sub>`;
        case 'directive':
          // Unknown inline directive: its content, plainly.
          return innerHtml(token, context);
        default:
          return escapeHtml(token.value);
      }
    })
    .join('');
}

function blockToText(block: MarkdownBlock, context: RenderContext): string {
  switch (block.kind) {
    case 'heading':
    case 'paragraph':
      return inlineToText(block.content, context);
    case 'list':
      // `-` rather than `*`: a star reads as Markdown emphasis, a dash reads
      // as a bullet to everyone (R13-003).
      return block.items
        .map(
          (item, index) =>
            `${'  '.repeat(item.depth)}${block.ordered ? `${(block.start ?? 1) + index}.` : '-'} ${inlineToText(item.content, context)}`,
        )
        .join('\n');
    case 'blockquote':
      // Indented, not `> `-prefixed: the prefix is Markdown syntax, and the
      // plain text must carry none.
      return block.blocks
        .map((inner) => blockToText(inner, context))
        .join('\n\n')
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n');
    case 'table':
      // Tab-separated rows read as columns in a monospaced client and paste
      // into a spreadsheet; pipes would read as a Markdown table.
      return [block.header, ...block.rows]
        .map((row) => row.map((cell) => inlineToText(cell, context)).join('\t'))
        .join('\n');
    case 'pageBreak':
      return '';
    case 'directive': {
      const inner = block.blocks
        .map((child) => blockToText(child, context))
        .filter(Boolean)
        .join('\n\n');
      if (!block.known) return inner;
      switch (block.name) {
        case 'indent':
          return inner
            .split('\n')
            .map((line) => `${'  '.repeat(Number(block.attributes.level))}${line}`)
            .join('\n');
        case 'signature':
          return `${inner}\n${'\n'.repeat(Number(block.attributes.lines))}____________________`;
        default:
          return inner;
      }
    }
    default:
      // A rule. Three dashes would be a Markdown rule again; em dashes are only a line.
      return '———';
  }
}

function blocksToHtml(blocks: readonly MarkdownBlock[], context: RenderContext): string {
  return blocks.map((inner) => blockToHtml(inner, context)).join('');
}

function blockToHtml(block: MarkdownBlock, context: RenderContext): string {
  switch (block.kind) {
    case 'heading': {
      const tag = `h${Math.min(block.level + 1, 6)}`;
      return `<${tag}>${inlineToHtml(block.content, context)}</${tag}>`;
    }
    case 'paragraph':
      return `<p>${inlineToHtml(block.content, context)}</p>`;
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const start = block.start ? ` start="${block.start}"` : '';
      // Nesting is flattened into indentation; email clients disagree on nested lists.
      return `<${tag}${start}>${block.items
        .map(
          (item) =>
            `<li${item.depth ? ` style="margin-left:${item.depth * 16}px"` : ''}>${inlineToHtml(item.content, context)}</li>`,
        )
        .join('')}</${tag}>`;
    }
    case 'blockquote':
      return `<blockquote>${blocksToHtml(block.blocks, context)}</blockquote>`;
    case 'table':
      return `<table><thead><tr>${block.header
        .map((cell) => `<th>${inlineToHtml(cell, context)}</th>`)
        .join('')}</tr></thead><tbody>${block.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${inlineToHtml(cell, context)}</td>`).join('')}</tr>`,
        )
        .join('')}</tbody></table>`;
    case 'pageBreak':
      return '';
    case 'directive': {
      const inner = blocksToHtml(block.blocks, context);
      if (!block.known) return inner;
      switch (block.name) {
        case 'indent':
          return `<div style="margin-left:${Number(block.attributes.level) * 24}px">${inner}</div>`;
        case 'align':
          return `<div style="text-align:${block.attributes.to}">${inner}</div>`;
        case 'small':
          return `<div style="font-size:${Math.round((ptToMm(context.theme.smallSizePt) / ptToMm(context.theme.fontSizePt)) * 100)}%">${inner}</div>`;
        case 'note':
          return `<div style="border:1px solid #59666c;padding:8px 12px;margin:8px 0">${inner}</div>`;
        case 'signature':
          return `<div style="margin-top:${Number(block.attributes.lines) * 24}px;border-top:1px solid #182126;padding-top:4px">${inner}</div>`;
        default:
          return inner;
      }
    }
    default:
      return '<hr />';
  }
}

/** Wraps text at a column without breaking words, preserving existing line breaks. */
export function wrap(text: string, column: number): string {
  return text
    .split('\n')
    .map((line) => wrapLine(line, column))
    .join('\n');
}

function wrapLine(line: string, column: number): string {
  if (line.length <= column) return line;
  const words = line.split(' ');
  const output: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (current.length + 1 + word.length > column) {
      output.push(current);
      current = word;
      continue;
    }
    current += ` ${word}`;
  }
  if (current) output.push(current);
  return output.join('\n');
}
