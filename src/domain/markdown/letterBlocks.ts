import type { Root } from 'mdast';
import type { LetterBlockName } from '@/domain/markdown/directives';
import { plainText } from '@/domain/markdown/mdastAdapter';
import { normalizeSource } from '@/domain/markdown/parseMarkdown';
import { parseToMdast } from '@/domain/markdown/remarkPipeline';

/**
 * The salutation and the closing as blocks of the body (R13-019).
 *
 * The letter details in the document settings hold the words; the body holds
 * them too, inside `:::salutation` … `:::` and `:::closing` … `:::`, so the
 * writer sees them as ordinary text in the editor and the preview draws them
 * where they belong. These functions are the only bridge between the two:
 * pure text work over the parsed tree, so a replacement touches exactly the
 * block and nothing else the writer typed — no search for "Dear …" that
 * breaks the first time a letter opens with a quotation.
 */

/** Where a top-level letter block sits in the (normalised) source. */
function locate(source: string, name: LetterBlockName): { start: number; end: number } | null {
  const root: Root = parseToMdast(source);
  for (const node of root.children) {
    if (node.type !== 'containerDirective' || node.name !== name) continue;
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) return { start, end };
  }
  return null;
}

/** The block's source text for a salutation or closing. */
function blockSource(name: LetterBlockName, text: string): string {
  return `:::${name}\n${text.trim()}\n:::`;
}

/** Whether the body carries the block at top level. */
export function hasLetterBlock(body: string, name: LetterBlockName): boolean {
  return locate(normalizeSource(body), name) !== null;
}

/** The words inside the block, or `null` when the body has none. */
export function letterBlockText(body: string, name: LetterBlockName): string | null {
  const root: Root = parseToMdast(normalizeSource(body));
  for (const node of root.children) {
    if (node.type === 'containerDirective' && node.name === name) {
      return plainText(node as { children?: readonly unknown[] }).trim();
    }
  }
  return null;
}

/**
 * The body with the block set to `text`: replaced in place when present,
 * inserted at the top (salutation) or the end (closing) when absent, removed
 * when `text` is empty. Blank lines around the block are kept tidy so the
 * file reads as a person would have written it.
 */
export function replaceLetterBlock(body: string, name: LetterBlockName, text: string): string {
  const source = normalizeSource(body);
  const found = locate(source, name);
  const trimmed = text.trim();

  if (found) {
    const before = source.slice(0, found.start).replace(/\n+$/u, '');
    const after = source.slice(found.end).replace(/^\n+/u, '');
    if (!trimmed) return joinParts(before, after);
    return joinParts(before, blockSource(name, trimmed), after);
  }
  if (!trimmed) return body;
  const rest = source.trim();
  return name === 'salutation'
    ? joinParts(blockSource(name, trimmed), rest)
    : joinParts(rest, blockSource(name, trimmed));
}

/** Joins non-empty parts with one blank line between them. */
function joinParts(...parts: readonly string[]): string {
  return parts.filter((part) => part.trim() !== '').join('\n\n');
}
