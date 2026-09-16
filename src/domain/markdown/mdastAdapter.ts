import type {
  BlockContent,
  DefinitionContent,
  List,
  ListItem,
  Parent,
  PhrasingContent,
  Root,
  RootContent,
  Table,
} from 'mdast';
import {
  BLOCK_DIRECTIVES,
  ISO_DATE,
  assetIdFromUrl,
  isKnownInlineDirective,
  parseImageLayout,
  resolveBlockAttributes,
  type BlockDirectiveDefinition,
  type ImageAlignment,
} from '@/domain/markdown/directives';
import type { ImageDirectiveData, TextDirectiveNode } from '@/domain/markdown/remarkPipeline';

/**
 * mdast → Foldmark's bounded block model (change 0016).
 *
 * This module is the adapter between what remark parses and what the
 * renderers draw. It is deliberately framework-free and configured by data —
 * the directive registry and the palette predicate — so it can be lifted into
 * a shared baseline module unchanged.
 *
 * The block model is the security boundary of ADR 0011: every renderer walks
 * these blocks through static templates or a fixed tag set. So the adapter's
 * job is as much *refusal* as translation: HTML nodes become text, links keep
 * only vetted schemes, images keep only `asset:` ids, heading levels stop at
 * three, quotes stop at depth three, and an unknown directive becomes a marked
 * container of its plain content — never an error, never dropped.
 */

/** Inline token kinds. */
export type MarkdownInlineKind =
  | 'text'
  | 'strong'
  | 'emphasis'
  | 'code'
  | 'strikethrough'
  | 'link'
  | 'break'
  | 'image'
  | 'color'
  | 'highlight'
  | 'underline'
  | 'small'
  | 'sup'
  | 'sub'
  | 'date'
  | 'directive';

/**
 * One inline token. No token contains generated HTML.
 *
 * `value` is always the plain text of the token, so plain-text consumers and
 * the height estimate never need to recurse. `children` is present only when a
 * container holds formatted content of its own (bold inside a colour, say);
 * a container of plain text has just its `value`, which keeps the common case
 * flat and the fixtures readable.
 */
export interface MarkdownInline {
  readonly kind: MarkdownInlineKind;
  readonly value: string;
  /** Only for `link`, and only ever `http:`, `https:` or `mailto:`. */
  readonly href?: string;
  /** Formatted content inside a container token; absent when it is plain text. */
  readonly children?: readonly MarkdownInline[];
  /** For `color`: the palette name as written, e.g. `light-green` or `danger`. */
  readonly color?: string;
  /** For `directive` (unknown inline directive): its name, kept for the editor and the file. */
  readonly name?: string;
  /** For `image`: the local asset id. */
  readonly assetId?: string;
  /** For `image`: the requested width in millimetres, when the file gives one. */
  readonly widthMm?: number;
  /** For `image`: the requested width as a share of the text box, 1–100 (R14-015). */
  readonly widthPercent?: number;
  /** For `image`: where it sits in the text box; absent means left. */
  readonly align?: ImageAlignment;
}

/** Heading levels the subset renders: the six of Markdown (change 0022). */
export type MarkdownHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** One list item with its nesting depth (0 = top level). */
export interface MarkdownListItem {
  readonly content: readonly MarkdownInline[];
  readonly depth: number;
}

/** One block of the rendered document. */
export type MarkdownBlock =
  | {
      readonly kind: 'heading';
      readonly level: MarkdownHeadingLevel;
      readonly content: readonly MarkdownInline[];
    }
  | { readonly kind: 'paragraph'; readonly content: readonly MarkdownInline[] }
  | {
      readonly kind: 'list';
      readonly ordered: boolean;
      readonly items: readonly MarkdownListItem[];
      /** First number of an ordered list when it is not 1. */
      readonly start?: number;
    }
  | { readonly kind: 'blockquote'; readonly blocks: readonly MarkdownBlock[] }
  | {
      readonly kind: 'table';
      readonly header: readonly (readonly MarkdownInline[])[];
      readonly rows: readonly (readonly MarkdownInline[])[][];
    }
  | { readonly kind: 'rule' }
  | {
      /**
       * A block directive. `known` says whether the name is in the catalogue;
       * an unknown one carries its name and empty attributes and renders as
       * its plain content. `attributes` are validated for known names.
       */
      readonly kind: 'directive';
      readonly name: string;
      readonly known: boolean;
      readonly attributes: Readonly<Record<string, string>>;
      readonly blocks: readonly MarkdownBlock[];
    }
  | { readonly kind: 'pageBreak' };

/** What the adapter needs to know about the dialect it serves. */
export interface AdapterConfig {
  /** Whether an inline directive name is rendered (colour, underline, …) or kept as unknown. */
  readonly isKnownInline: (name: string) => boolean;
  /** The block directives and their attribute rules. */
  readonly blockDirectives: Readonly<Record<string, BlockDirectiveDefinition>>;
}

/** Foldmark's own dialect. */
export const FOLDMARK_ADAPTER_CONFIG: AdapterConfig = Object.freeze({
  isKnownInline: isKnownInlineDirective,
  blockDirectives: BLOCK_DIRECTIVES,
});

/** Link schemes the renderer will emit; everything else stays text. */
const SAFE_LINK = /^(?:https?:|mailto:)/iu;

/** Recursion is bounded: a quote inside a quote inside a quote is text. */
const MAX_QUOTE_DEPTH = 3;

/** Deepest list nesting the renderer distinguishes. */
const MAX_LIST_DEPTH = 4;

/** Most columns a table may have; wider tables do not fit on paper anyway. */
const TABLE_MAX_COLUMNS = 12;

/** How deep directive containers may nest before the content is rendered plainly. */
const MAX_DIRECTIVE_DEPTH = 4;

/** Plain text of any mdast subtree, for `value` fields and refused nodes. */
export function plainText(node: { value?: string; children?: readonly unknown[] }): string {
  if (typeof node.value === 'string' && !('children' in node && node.children)) return node.value;
  return ((node.children ?? []) as readonly { value?: string; children?: readonly unknown[] }[])
    .map((child) => plainText(child))
    .join('');
}

/** Plain text of a token list. */
export function inlineText(tokens: readonly MarkdownInline[]): string {
  return tokens.map((token) => (token.kind === 'break' ? '\n' : token.value)).join('');
}

/** Adjacent text tokens become one, so soft breaks do not fragment a sentence. */
function mergeText(tokens: readonly MarkdownInline[]): MarkdownInline[] {
  const merged: MarkdownInline[] = [];
  for (const token of tokens) {
    const last = merged.at(-1);
    if (token.kind === 'text' && last?.kind === 'text') {
      merged[merged.length - 1] = { kind: 'text', value: last.value + token.value };
    } else {
      merged.push(token);
    }
  }
  return merged;
}

/** A container token: flat when its content is plain text, nested otherwise. */
function container(
  kind: MarkdownInlineKind,
  children: readonly MarkdownInline[],
  extra: Partial<MarkdownInline> = {},
): MarkdownInline {
  const value = inlineText(children);
  const plain = children.every((child) => child.kind === 'text');
  return plain ? { kind, value, ...extra } : { kind, value, children, ...extra };
}

/** Attribute maps from remark-directive may carry `null` for valueless attributes. */
type RawAttributes = Readonly<Record<string, string | null | undefined>> | null | undefined;

function inlineDirective(node: TextDirectiveNode, config: AdapterConfig): MarkdownInline {
  const children = phrasing(node.children, config);
  const name = node.name;
  const attributes: RawAttributes = node.attributes;

  // `:color[x]{name=red}` is the long spelling of `:red[x]`.
  if (name === 'color') {
    const target = attributes?.name ?? '';
    return config.isKnownInline(target) && target !== 'color'
      ? container('color', children, { color: target })
      : container('directive', children, { name });
  }
  // `Betreff:Antrag` is a text directive named `Antrag` with no content to
  // remark; on paper it is the text it was typed as.
  if (children.length === 0) return { kind: 'text', value: `:${name}` };
  if (!config.isKnownInline(name)) return container('directive', children, { name });

  switch (name) {
    case 'highlight':
      return container('highlight', children);
    case 'u':
      return container('underline', children);
    case 'small':
      return container('small', children);
    case 'sup':
      return container('sup', children);
    case 'sub':
      return container('sub', children);
    case 'date': {
      const iso = inlineText(children).trim();
      // A date directive whose content is not a date is shown as what it says.
      return ISO_DATE.test(iso) ? { kind: 'date', value: iso } : { kind: 'text', value: iso };
    }
    default:
      return container('color', children, { color: name });
  }
}

function phrasing(nodes: readonly PhrasingContent[], config: AdapterConfig): MarkdownInline[] {
  const tokens: MarkdownInline[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        // A soft line break is a space, the way a browser renders it and the
        // way the hand-written parser joined wrapped prose.
        tokens.push({ kind: 'text', value: node.value.replaceAll('\n', ' ') });
        break;
      case 'strong':
        tokens.push(container('strong', phrasing(node.children, config)));
        break;
      case 'emphasis':
        tokens.push(container('emphasis', phrasing(node.children, config)));
        break;
      case 'delete':
        tokens.push(container('strikethrough', phrasing(node.children, config)));
        break;
      case 'inlineCode':
        tokens.push({ kind: 'code', value: node.value });
        break;
      case 'break':
        tokens.push({ kind: 'break', value: '' });
        break;
      case 'link': {
        const children = phrasing(node.children, config);
        if (SAFE_LINK.test(node.url)) {
          tokens.push(container('link', children, { href: node.url }));
        } else {
          // An unsafe scheme is shown as the text it was, address included.
          tokens.push({ kind: 'text', value: `[${inlineText(children)}](${node.url})` });
        }
        break;
      }
      case 'image': {
        const assetId = assetIdFromUrl(node.url);
        const layout = parseImageLayout((node as { data?: ImageDirectiveData }).data?.attributes);
        if (assetId) {
          tokens.push({
            kind: 'image',
            value: node.alt ?? '',
            assetId,
            ...(layout.widthMm === undefined ? {} : { widthMm: layout.widthMm }),
            ...(layout.widthPercent === undefined ? {} : { widthPercent: layout.widthPercent }),
            ...(layout.align === undefined ? {} : { align: layout.align }),
          });
        } else {
          // Any other image — a URL, a data URI — is text: Foldmark loads nothing from outside.
          tokens.push({ kind: 'text', value: `![${node.alt ?? ''}](${node.url})` });
        }
        break;
      }
      case 'textDirective':
        tokens.push(inlineDirective(node as unknown as TextDirectiveNode, config));
        break;
      case 'html':
        // Raw HTML has no meaning here: it is the text it was typed as.
        tokens.push({ kind: 'text', value: node.value });
        break;
      default:
        // Footnote references, link references without definitions and the
        // like collapse to their text — nothing is dropped, nothing is markup.
        tokens.push({ kind: 'text', value: plainText(node as { value?: string }) });
        break;
    }
  }
  return mergeText(tokens);
}

/** Every phrasing node inside a list item, flattening its paragraphs with a soft break. */
function listItemContent(item: ListItem, config: AdapterConfig): MarkdownInline[] {
  const tokens: MarkdownInline[] = [];
  for (const child of item.children) {
    if (child.type === 'list') continue;
    if (child.type === 'paragraph' || child.type === 'heading') {
      if (tokens.length) tokens.push({ kind: 'text', value: ' ' });
      tokens.push(...phrasing(child.children, config));
    } else {
      if (tokens.length) tokens.push({ kind: 'text', value: ' ' });
      tokens.push({ kind: 'text', value: plainText(child as { value?: string }) });
    }
  }
  return mergeText(tokens);
}

/** Nested lists are flattened into items with a depth — the renderer indents by depth. */
function listItems(list: List, depth: number, config: AdapterConfig): MarkdownListItem[] {
  const items: MarkdownListItem[] = [];
  for (const item of list.children) {
    items.push({ content: listItemContent(item, config), depth });
    for (const child of item.children) {
      if (child.type === 'list') {
        items.push(...listItems(child, Math.min(depth + 1, MAX_LIST_DEPTH), config));
      }
    }
  }
  return items;
}

function table(node: Table, config: AdapterConfig): MarkdownBlock | null {
  const [headerRow, ...bodyRows] = node.children;
  if (!headerRow) return null;
  // An empty cell is one empty text token, so every cell has something to render.
  const cellOf = (tokens: MarkdownInline[]): MarkdownInline[] =>
    tokens.length ? tokens : [{ kind: 'text', value: '' }];
  const header = headerRow.children
    .slice(0, TABLE_MAX_COLUMNS)
    .map((cell) => cellOf(phrasing(cell.children, config)));
  if (header.length === 0) return null;
  const rows = bodyRows.map((row) => {
    const cells = row.children
      .slice(0, header.length)
      .map((cell) => cellOf(phrasing(cell.children, config)));
    while (cells.length < header.length) cells.push(cellOf([]));
    return cells;
  });
  return { kind: 'table', header, rows };
}

interface Depths {
  readonly quote: number;
  readonly directive: number;
}

function blockDirective(
  node: Parent & { name: string; attributes?: RawAttributes },
  form: 'container' | 'leaf',
  depths: Depths,
  config: AdapterConfig,
): MarkdownBlock[] {
  const name = node.name;
  const definition = config.blockDirectives[name];
  // A leaf may also arrive as an empty three-colon container (`:::page-break` … `:::`).
  const known =
    definition?.form === form ||
    (definition?.form === 'leaf' && form === 'container' && node.children.length === 0);
  if (known && name === 'page-break') return [{ kind: 'pageBreak' }];

  const inner =
    depths.directive < MAX_DIRECTIVE_DEPTH
      ? blocks(
          node.children as RootContent[],
          { ...depths, directive: depths.directive + 1 },
          config,
        )
      : [
          {
            kind: 'paragraph' as const,
            content: [{ kind: 'text' as const, value: plainText(node as { value?: string }) }],
          },
        ];

  return [
    {
      kind: 'directive',
      name,
      known,
      attributes: known ? resolveBlockAttributes(name, node.attributes ?? {}) : {},
      blocks: inner,
    },
  ];
}

function blocks(
  nodes: readonly (RootContent | BlockContent | DefinitionContent)[],
  depths: Depths,
  config: AdapterConfig,
): MarkdownBlock[] {
  const result: MarkdownBlock[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case 'heading':
        result.push({
          kind: 'heading',
          level: Math.min(Math.max(node.depth, 1), 6) as MarkdownHeadingLevel,
          content: phrasing(node.children, config),
        });
        break;
      case 'paragraph': {
        const content = phrasing(node.children, config);
        // A paragraph made of a directive-only text such as `::: fancy` that
        // remark could not read is still a paragraph; that is what "unknown
        // renders as text" means at block level.
        result.push({ kind: 'paragraph', content });
        break;
      }
      case 'list': {
        const start = node.ordered && node.start && node.start !== 1 ? node.start : undefined;
        result.push({
          kind: 'list',
          ordered: Boolean(node.ordered),
          items: listItems(node, 0, config),
          ...(start === undefined ? {} : { start }),
        });
        break;
      }
      case 'blockquote':
        result.push(
          depths.quote < MAX_QUOTE_DEPTH
            ? {
                kind: 'blockquote',
                blocks: blocks(node.children, { ...depths, quote: depths.quote + 1 }, config),
              }
            : {
                kind: 'paragraph',
                content: [{ kind: 'text', value: plainText(node as { value?: string }) }],
              },
        );
        break;
      case 'table': {
        const block = table(node, config);
        if (block) result.push(block);
        break;
      }
      case 'thematicBreak':
        result.push({ kind: 'rule' });
        break;
      case 'code':
        // Fenced code is not part of the subset: it renders as a code-styled
        // paragraph, which keeps the text and keeps it inert.
        result.push({ kind: 'paragraph', content: [{ kind: 'code', value: node.value }] });
        break;
      case 'html':
        result.push({ kind: 'paragraph', content: [{ kind: 'text', value: node.value }] });
        break;
      case 'containerDirective':
        result.push(
          ...blockDirective(
            node as unknown as Parent & { name: string; attributes?: RawAttributes },
            'container',
            depths,
            config,
          ),
        );
        break;
      case 'leafDirective':
        result.push(
          ...blockDirective(
            node as unknown as Parent & { name: string; attributes?: RawAttributes },
            'leaf',
            depths,
            config,
          ),
        );
        break;
      case 'definition':
      case 'footnoteDefinition':
      case 'yaml':
        // Metadata-like nodes carry nothing the paper should show.
        break;
      default: {
        const text = plainText(node as { value?: string });
        if (text.trim())
          result.push({ kind: 'paragraph', content: [{ kind: 'text', value: text }] });
        break;
      }
    }
  }
  return result;
}

/** Turns an mdast tree into the bounded block model. */
export function mdastToBlocks(
  root: Root,
  config: AdapterConfig = FOLDMARK_ADAPTER_CONFIG,
): MarkdownBlock[] {
  return blocks(root.children, { quote: 0, directive: 0 }, config);
}
