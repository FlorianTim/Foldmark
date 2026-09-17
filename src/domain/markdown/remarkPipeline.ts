import type { Image, Parent, PhrasingContent, Root, Text } from 'mdast';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified, type Plugin, type Processor } from 'unified';
import { DIRECTIVE_NAME, unescapeDirectiveLabel } from '@/domain/markdown/directives';

/**
 * The one Markdown dialect Foldmark speaks (change 0016).
 *
 * Both the renderer's parser and the rich editor's parser are built from the
 * plugin list below, so a construct the editor writes is a construct the
 * preview understands — the point of replacing the hand-written parser with
 * remark was to have *one* definition of what a paragraph is.
 *
 * The dialect is CommonMark + GFM (tables, strikethrough — double tilde only,
 * so `~2~` is free for subscript) + `remark-directive`, plus two small
 * transforms of our own: the Pandoc spellings of inline attributes and
 * super-/subscript are read into directives, and an image's `{width=60mm}`
 * suffix is folded into the image node.
 *
 * Nothing here produces HTML. The output of the pipeline is an mdast tree that
 * `mdastAdapter.ts` turns into Foldmark's bounded block model (ADR 0011).
 */

/** A `remark-directive` text directive, typed locally so the domain owns its own vocabulary. */
export interface TextDirectiveNode extends Parent {
  readonly type: 'textDirective';
  readonly name: string;
  readonly attributes?: Readonly<Record<string, string | null | undefined>> | null;
  children: PhrasingContent[];
}

/** Data an image carries after the attribute transform. */
export interface ImageDirectiveData {
  /** The raw attribute block (`width`, `align`, …), still unvalidated. */
  readonly attributes?: Readonly<Record<string, string>>;
}

const directiveNode = (name: string, children: PhrasingContent[]): TextDirectiveNode => ({
  type: 'textDirective',
  name,
  attributes: {},
  children,
});

/**
 * `[word]{.red}` → `:red[word]`, `^2^` → `:sup[2]`, `~2~` → `:sub[2]`.
 *
 * Only plain text inside the brackets is recognised — a span whose content
 * carries its own emphasis is already split into several mdast nodes by then.
 * The canonical spelling supports nesting; the Pandoc spelling is read for
 * interchange, not written (ADR 0019).
 */
const PANDOC_INLINE = /\[([^[\]\n]+)\]\{\.([a-z][a-z0-9-]*)\}|\^([^\s^]+)\^|~([^\s~]+)~/gu;

function splitPandocText(node: Text): PhrasingContent[] | null {
  const parts: PhrasingContent[] = [];
  let last = 0;
  for (const match of node.value.matchAll(PANDOC_INLINE)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ type: 'text', value: node.value.slice(last, index) });
    if (match[1] !== undefined && DIRECTIVE_NAME.test(match[2])) {
      parts.push(directiveNode(match[2], [{ type: 'text', value: match[1] }]));
    } else if (match[3] !== undefined) {
      parts.push(directiveNode('sup', [{ type: 'text', value: match[3] }]));
    } else if (match[4] !== undefined) {
      parts.push(directiveNode('sub', [{ type: 'text', value: match[4] }]));
    } else {
      parts.push({ type: 'text', value: match[0] });
    }
    last = index + match[0].length;
  }
  if (parts.length === 0) return null;
  if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) });
  return parts;
}

/** An attribute block written after an image, the way Pandoc reads it: `{width=60mm align=center}`. */
const IMAGE_ATTRIBUTES = /^\{([^{}\n]*)\}/u;
/** One `key=value` inside the block, the value bare or quoted. */
const IMAGE_ATTRIBUTE = /([a-z][a-z0-9-]*)=(?:"([^"]*)"|([^\s"}]+))/giu;

/** The block's pairs as a map, or `null` when the text is not an attribute block at all. */
function readImageAttributes(
  text: string,
): { attributes: Record<string, string>; length: number } | null {
  const match = IMAGE_ATTRIBUTES.exec(text);
  if (!match) return null;
  const attributes: Record<string, string> = {};
  for (const pair of match[1].matchAll(IMAGE_ATTRIBUTE)) {
    attributes[pair[1].toLowerCase()] = pair[2] ?? pair[3] ?? '';
  }
  return { attributes, length: match[0].length };
}

function transformPhrasing(parent: Parent): void {
  const next: typeof parent.children = [];
  const children = parent.children;
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (child.type === 'image') {
      const following = children[index + 1];
      if (following?.type === 'text') {
        const match = readImageAttributes(following.value);
        if (match) {
          const image = child as Image & { data?: ImageDirectiveData };
          image.data = { ...image.data, attributes: match.attributes };
          const rest = following.value.slice(match.length);
          next.push(image);
          if (rest) next.push({ type: 'text', value: rest });
          index += 1;
          continue;
        }
      }
    }
    if (child.type === 'text') {
      const split = splitPandocText(child);
      if (split) {
        next.push(...split);
        continue;
      }
    }
    next.push(child);
  }
  parent.children = next;
}

/** A `remark-directive` leaf, typed locally for the QR label transform. */
interface LeafDirectiveNode extends Parent {
  readonly type: 'leafDirective';
  readonly name: string;
  children: PhrasingContent[];
}

const isQrLeaf = (node: unknown): node is LeafDirectiveNode =>
  typeof node === 'object' &&
  node !== null &&
  (node as { type?: string }).type === 'leafDirective' &&
  (node as { name?: string }).name === 'qr';

/**
 * `::qr[payload]` (change 0040): the label is the payload, and a payload is
 * not prose. `mailto:info@example.org` would otherwise be text plus a
 * directive named `info`, `a*b*c` an emphasis — and the code would open
 * something else. So the label is taken from the source as typed, backslash
 * escapes resolved, and replaces the parsed children with one text node.
 * Both parsers (renderer and editor) run this plugin, so both see the same
 * payload. Without the source (a caller that ran the tree alone) the parsed
 * text stands.
 */
function literalQrLabel(node: LeafDirectiveNode, source: string | undefined): void {
  if (source === undefined || node.children.length === 0) return;
  const start = node.children[0]?.position?.start.offset;
  const end = node.children.at(-1)?.position?.end.offset;
  if (start === undefined || end === undefined) return;
  node.children = [{ type: 'text', value: unescapeDirectiveLabel(source.slice(start, end)) }];
}

function walk(node: Parent, source: string | undefined): void {
  for (const child of node.children) {
    if (isQrLeaf(child)) literalQrLabel(child, source);
    else if ('children' in child && Array.isArray((child as Parent).children)) {
      walk(child as Parent, source);
    }
  }
  if (node.children.some((child) => child.type === 'text' || child.type === 'image')) {
    transformPhrasing(node);
  }
}

/** The remark plugin that reads the Pandoc spellings, image attributes and literal QR labels. */
export const remarkFoldmarkSyntax: Plugin<[], Root> = () => (tree, file) => {
  const source = file?.value;
  walk(tree, typeof source === 'string' ? source : undefined);
};

/**
 * `::: name{…}` → `:::name{…}`, and any `::: page-break` / `:::page-break`
 * line → `::page-break`.
 *
 * `remark-directive` requires the name directly after the colons; Pandoc and
 * hand-written files put a space there. The written form is the one
 * `remark-directive` produces; both are read. The page break is the one leaf
 * directive, and a three-colon spelling of it would open a container that
 * swallows the rest of the document, so it is rewritten to the leaf form.
 */
export function normalizeDirectiveFences(source: string): string {
  return source
    .replaceAll(/^\s{0,3}:{3,}[ \t]*page-break[ \t]*\n\s{0,3}:{3,}[ \t]*$/gmu, '::page-break')
    .replaceAll(/^\s{0,3}:{2,}[ \t]*page-break[ \t]*$/gmu, '::page-break')
    .replaceAll(
      // Linear — the name, the optional braces and the trailing blanks cannot overlap.
      // eslint-disable-next-line security/detect-unsafe-regex
      /^(\s{0,3}:{3,})[ \t]+([a-z][a-z0-9-]*)((?:\{[^\n]*\})?)[ \t]*$/gmu,
      '$1$2$3',
    );
}

/** The plugin list, in order, for anyone building a remark instance of the dialect. */
export const FOLDMARK_REMARK_PLUGINS = Object.freeze([
  [remarkGfm, { singleTilde: false }],
  [remarkDirective],
  [remarkFoldmarkSyntax],
] as const);

/** A parser for the dialect. Parsing only — the processor has no compiler, so it can produce no HTML. */
export function createMarkdownProcessor(): Processor<Root, Root, Root, undefined, undefined> {
  return unified()
    .use(remarkParse)
    .use(remarkGfm, { singleTilde: false })
    .use(remarkDirective)
    .use(remarkFoldmarkSyntax) as unknown as Processor<Root, Root, Root, undefined, undefined>;
}

let shared: Processor<Root, Root, Root, undefined, undefined> | null = null;

/**
 * Parses Markdown into an mdast tree with the shared processor. The caller
 * normalises line endings and fences first (`normalizeSource`), so node
 * offsets refer to the text it holds.
 */
export function parseToMdast(source: string): Root {
  shared ??= createMarkdownProcessor();
  // The source travels as the file so the QR transform can read a label as typed.
  return shared.runSync(shared.parse(source), source) as Root;
}
