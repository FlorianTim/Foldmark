import type { Ctx } from '@milkdown/kit/ctx';
import { toggleMark, wrapIn } from '@milkdown/kit/prose/commands';
import { liftTarget } from '@milkdown/kit/prose/transform';
import type { Attrs, Mark, MarkType, Node as ProseNode } from '@milkdown/kit/prose/model';
import { NodeSelection, TextSelection, type EditorState } from '@milkdown/kit/prose/state';
import { $command, $ctx, $mark, $node, $remark, $view } from '@milkdown/kit/utils';
import { linkSchema } from '@milkdown/kit/preset/commonmark';
import remarkDirective from 'remark-directive';
import { isColorName } from '@/domain/document/DocumentTheme';
import {
  assetIdFromUrl,
  BLOCK_DIRECTIVES,
  IMAGE_ALIGNMENTS,
  IMAGE_WIDTH_BOUNDS,
  INLINE_DIRECTIVES,
  ISO_DATE,
  parseImageLayout,
  resolveBlockAttributes,
  serializeImageLayout,
  type ImageAlignment,
  type ImageLayout,
} from '@/domain/markdown/directives';
import { formatIsoDate } from '@/domain/markdown/dateToken';
import { plainText } from '@/domain/markdown/parseMarkdown';
import { remarkFoldmarkSyntax } from '@/domain/markdown/remarkPipeline';

/**
 * Foldmark's syntax in the editor (change 0017): the directive catalogue, the
 * colour palette, dates and local images as ProseMirror nodes and marks.
 *
 * The parse and serialise halves mirror `mdastAdapter.ts` — the same mdast
 * node types, the same registry deciding what is known — so what the editor
 * shows is what the preview draws. Everything unknown is kept: an unknown
 * inline directive is a mark that remembers its name, an unknown block
 * directive is a container that remembers its name and attributes, and both
 * are written back exactly as they came in.
 *
 * Nothing here produces markup from text: `toDOM` builds elements from fixed
 * tag names and attribute values the domain already validated, and a colour is
 * a CSS variable reference, never a value from the file.
 */

/** The mdast node types `remark-directive` produces, typed loosely as Milkdown hands them over. */
interface DirectiveMdast {
  readonly type: string;
  readonly name?: string;
  readonly attributes?: Record<string, string | null | undefined> | null;
  readonly children?: readonly unknown[];
  readonly url?: string;
  readonly alt?: string | null;
  readonly title?: string | null;
  readonly data?: { readonly attributes?: Readonly<Record<string, string>> };
}

/** What the editor needs from the app: the document language and a way to see local images. */
export interface EditorEnvironment {
  readonly locale: string;
  /** Object URL for a local asset, or `null` when it does not exist. */
  readonly resolveAssetUrl: (assetId: string) => Promise<string | null>;
  /** Wording for the page-break marker and a missing image. */
  readonly labels: { readonly pageBreak: string; readonly missingAsset: string };
}

/** The environment as a Milkdown context slice, set by the adapter before the editor is created. */
export const editorEnvironmentCtx = $ctx<EditorEnvironment, 'foldmarkEnvironment'>(
  {
    locale: 'en',
    resolveAssetUrl: async () => null,
    labels: { pageBreak: 'Page break', missingAsset: 'Image missing' },
  },
  'foldmarkEnvironment',
);

/** `remark-directive`, so the editor's remark reads and writes `:name[…]` and `:::name`. */
export const remarkDirectivePlugin = $remark('remarkDirective', () => remarkDirective);

/** The Pandoc spellings and image attributes, read the same way the renderer reads them. */
export const remarkFoldmarkPlugin = $remark('remarkFoldmarkSyntax', () => remarkFoldmarkSyntax);

const isTextDirective = (node: DirectiveMdast, name?: string): boolean =>
  node.type === 'textDirective' && (name === undefined || node.name === name);

/** The palette name a text directive asks for, in either spelling; `null` when it is not a colour. */
/** Every inline directive the marks above and the date node claim; the rest is unknown. */
const KNOWN_INLINE = new Set<string>(INLINE_DIRECTIVES);

function colorOf(node: DirectiveMdast): string | null {
  if (!isTextDirective(node)) return null;
  if (node.name === 'color') {
    const name = node.attributes?.name ?? '';
    return name !== 'color' && isColorName(name) ? name : null;
  }
  // `highlight` is both an inline directive and a semantic colour alias: the
  // bare form `:highlight[…]` is the mark, only `:color[…]{name=highlight}`
  // is the text colour (R14-004). The catalogue decides, as in the renderer.
  if (!node.name || KNOWN_INLINE.has(node.name)) return null;
  return isColorName(node.name) ? node.name : null;
}

/** `:red[word]` — the colour mark, its name validated against the palette. */
export const colorMark = $mark('fmColor', (ctx) => {
  void ctx;
  return {
    attrs: { name: { default: 'red', validate: 'string' } },
    parseDOM: [
      {
        tag: 'span[data-color]',
        getAttrs: (dom: HTMLElement) => {
          const name = dom.dataset.color ?? '';
          return isColorName(name) ? { name } : false;
        },
      },
    ],
    // The colour itself is applied by `colorView` through CSSOM; a `style`
    // attribute here would be an inline style the strict CSP refuses.
    toDOM: (mark: Mark) => [
      'span',
      { class: 'md-color', 'data-color': String(mark.attrs.name) },
      0,
    ],
    parseMarkdown: {
      match: (node: DirectiveMdast) => colorOf(node) !== null,
      runner: (state, node: DirectiveMdast, type) => {
        state.openMark(type, { name: colorOf(node) ?? 'red' });
        state.next(node.children as never);
        state.closeMark(type);
      },
    },
    toMarkdown: {
      match: (mark: Mark) => mark.type.name === 'fmColor',
      runner: (state, mark: Mark) => {
        state.withMark(mark, 'textDirective', undefined, {
          name: String(mark.attrs.name),
          attributes: {},
        });
      },
    },
  };
});

/** The colour mark's view: the variable reference set through CSSOM, which the CSP allows. */
export const colorView = $view(colorMark, () => (mark: Mark) => {
  const dom = document.createElement('span');
  dom.className = 'md-color';
  const name = String(mark.attrs.name);
  dom.dataset.color = name;
  dom.style.color = `var(--md-color-${name})`;
  return { dom };
});

/** One fixed inline directive (`highlight`, `u`, `small`, `sup`, `sub`) as a mark on a fixed element. */
function fixedInlineMark(
  id: string,
  directive: string,
  element: string,
  className: string | undefined,
) {
  return $mark(id, () => ({
    parseDOM: [{ tag: className ? `${element}.${className}` : element }],
    toDOM: () => [element, className ? { class: className } : {}, 0],
    parseMarkdown: {
      match: (node: DirectiveMdast) => isTextDirective(node, directive),
      runner: (state, node: DirectiveMdast, type) => {
        state.openMark(type);
        state.next(node.children as never);
        state.closeMark(type);
      },
    },
    toMarkdown: {
      match: (mark: Mark) => mark.type.name === id,
      runner: (state, mark: Mark) => {
        state.withMark(mark, 'textDirective', undefined, { name: directive, attributes: {} });
      },
    },
  }));
}

/** `:highlight[…]`. */
export const highlightMark = fixedInlineMark('fmHighlight', 'highlight', 'mark', 'md-highlight');
/** `:u[…]`. */
export const underlineMark = fixedInlineMark('fmUnderline', 'u', 'u', undefined);
/** `:small[…]`. */
export const smallMark = fixedInlineMark('fmSmall', 'small', 'small', 'md-small');
/** `:sup[…]`. */
export const supMark = fixedInlineMark('fmSup', 'sup', 'sup', undefined);
/** `:sub[…]`. */
export const subMark = fixedInlineMark('fmSub', 'sub', 'sub', undefined);

/**
 * An unknown inline directive: kept as a mark that remembers its name and
 * attributes, rendered as plain content with a dotted underline so the writer
 * can see there is something there, and written back unchanged.
 */
export const unknownInlineMark = $mark('fmDirective', () => ({
  attrs: {
    name: { default: 'unknown', validate: 'string' },
    attributes: { default: '{}', validate: 'string' },
  },
  parseDOM: [
    {
      tag: 'span[data-directive]',
      getAttrs: (dom: HTMLElement) => ({
        name: dom.dataset.directive ?? 'unknown',
        attributes: dom.dataset.attributes ?? '{}',
      }),
    },
  ],
  toDOM: (mark: Mark) => [
    'span',
    {
      class: 'md-unknown',
      'data-directive': String(mark.attrs.name),
      'data-attributes': String(mark.attrs.attributes),
    },
    0,
  ],
  parseMarkdown: {
    match: (node: DirectiveMdast) =>
      isTextDirective(node) &&
      !KNOWN_INLINE.has(node.name ?? '') &&
      colorOf(node) === null &&
      (node.children?.length ?? 0) > 0,
    runner: (state, node: DirectiveMdast, type) => {
      state.openMark(type, {
        name: node.name ?? 'unknown',
        attributes: JSON.stringify(node.attributes ?? {}),
      });
      state.next(node.children as never);
      state.closeMark(type);
    },
  },
  toMarkdown: {
    match: (mark: Mark) => mark.type.name === 'fmDirective',
    runner: (state, mark: Mark) => {
      state.withMark(mark, 'textDirective', undefined, {
        name: String(mark.attrs.name),
        attributes: safeAttributes(String(mark.attrs.attributes)),
      });
    },
  },
}));

/** Attributes stored as JSON on a node, back as a flat string map; anything odd is dropped. */
function safeAttributes(json: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        /^[A-Za-z][A-Za-z0-9_-]{0,63}$/u.test(key) &&
        (typeof value === 'string' || value === null)
      ) {
        result[key] = value ?? '';
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * `:date[2026-09-11]` — an inline atom that shows the date in the document's
 * language and stores only the ISO value.
 */
export const dateNode = $node('fmDate', (ctx) => ({
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  draggable: false,
  marks: '',
  attrs: { iso: { default: '', validate: 'string' } },
  parseDOM: [
    {
      tag: 'time[data-date]',
      getAttrs: (dom: HTMLElement) => {
        const iso = dom.dataset.date ?? '';
        return ISO_DATE.test(iso) ? { iso } : false;
      },
    },
  ],
  toDOM: (node: ProseNode) => {
    const iso = String(node.attrs.iso);
    return [
      'time',
      { class: 'md-date', 'data-date': iso, datetime: iso, contenteditable: 'false' },
      formatIsoDate(iso, ctx.get(editorEnvironmentCtx.key).locale),
    ];
  },
  parseMarkdown: {
    match: (node: DirectiveMdast) =>
      isTextDirective(node, 'date') && ISO_DATE.test(plainText(node as never).trim()),
    runner: (state, node: DirectiveMdast, type) => {
      state.addNode(type, { iso: plainText(node as never).trim() });
    },
  },
  toMarkdown: {
    match: (node: ProseNode) => node.type.name === 'fmDate',
    runner: (state, node: ProseNode) => {
      state.addNode('textDirective', [{ type: 'text', value: String(node.attrs.iso) }], undefined, {
        name: 'date',
        attributes: {},
      });
    },
  },
}));

/**
 * `:name` with no content — what remark makes of `Betreff:Antrag` — as an
 * inline atom that shows and writes back exactly that text.
 */
export const emptyDirectiveNode = $node('fmEmptyDirective', () => ({
  inline: true,
  group: 'inline',
  atom: true,
  marks: '',
  attrs: {
    name: { default: 'x', validate: 'string' },
    attributes: { default: '{}', validate: 'string' },
  },
  parseDOM: [
    {
      tag: 'span[data-empty-directive]',
      getAttrs: (dom: HTMLElement) => ({
        name: dom.dataset.emptyDirective ?? 'x',
        attributes: dom.dataset.attributes ?? '{}',
      }),
    },
  ],
  toDOM: (node: ProseNode) => [
    'span',
    {
      class: 'md-empty-directive',
      'data-empty-directive': String(node.attrs.name),
      'data-attributes': String(node.attrs.attributes),
    },
    `:${String(node.attrs.name)}`,
  ],
  parseMarkdown: {
    match: (node: DirectiveMdast) => isTextDirective(node) && (node.children?.length ?? 0) === 0,
    runner: (state, node: DirectiveMdast, type) => {
      state.addNode(type, {
        name: node.name ?? 'x',
        attributes: JSON.stringify(node.attributes ?? {}),
      });
    },
  },
  toMarkdown: {
    match: (node: ProseNode) => node.type.name === 'fmEmptyDirective',
    runner: (state, node: ProseNode) => {
      state.addNode('textDirective', [], undefined, {
        name: String(node.attrs.name),
        attributes: safeAttributes(String(node.attrs.attributes)),
      });
    },
  },
}));

/** Whether an mdast container is really the page break, spelled with three colons and nothing inside. */
function isEmptyLeafContainer(node: DirectiveMdast): boolean {
  return (
    node.type === 'containerDirective' &&
    BLOCK_DIRECTIVES[node.name ?? '']?.form === 'leaf' &&
    (node.children?.length ?? 0) === 0
  );
}

/** Class names that make the editor draw a block directive the way the paper does. */
function blockClasses(name: string, attributes: Record<string, string>, known: boolean): string {
  if (!known) return 'md-unknown-block';
  const classes = [`md-${name}`];
  if (name === 'align') classes.push(`md-align-${attributes.to}`);
  if (name === 'note') classes.push(`md-note-${attributes.type}`);
  return classes.join(' ');
}

/**
 * `:::name{…}` … `:::` — every container directive, known or not, as one
 * block node that remembers its name and attributes. The name decides how it
 * is drawn; the catalogue decides whether the attributes are validated.
 */
export const directiveBlockNode = $node('fmBlock', () => ({
  content: 'block+',
  group: 'block',
  defining: true,
  attrs: {
    name: { default: 'note', validate: 'string' },
    attributes: { default: '{}', validate: 'string' },
  },
  parseDOM: [
    {
      tag: 'div[data-directive-block]',
      getAttrs: (dom: HTMLElement) => ({
        name: dom.dataset.directiveBlock ?? 'note',
        attributes: dom.dataset.attributes ?? '{}',
      }),
    },
  ],
  toDOM: (node: ProseNode) => {
    const name = String(node.attrs.name);
    const known = BLOCK_DIRECTIVES[name]?.form === 'container';
    const raw = safeAttributes(String(node.attrs.attributes));
    const attributes = known ? resolveBlockAttributes(name, raw) : {};
    const level =
      name === 'indent' ? attributes.level : name === 'signature' ? attributes.lines : undefined;
    return [
      'div',
      {
        class: blockClasses(name, attributes, known),
        'data-directive-block': name,
        'data-attributes': String(node.attrs.attributes),
        ...(level && known ? { 'data-level': level } : {}),
      },
      0,
    ];
  },
  parseMarkdown: {
    match: (node: DirectiveMdast) =>
      node.type === 'containerDirective' && !isEmptyLeafContainer(node),
    runner: (state, node: DirectiveMdast, type) => {
      state
        .openNode(type, {
          name: node.name ?? 'unknown',
          attributes: JSON.stringify(node.attributes ?? {}),
        })
        .next(node.children as never)
        .closeNode();
    },
  },
  toMarkdown: {
    match: (node: ProseNode) => node.type.name === 'fmBlock',
    runner: (state, node: ProseNode) => {
      state
        .openNode('containerDirective', undefined, {
          name: String(node.attrs.name),
          attributes: safeAttributes(String(node.attrs.attributes)),
        })
        .next(node.content)
        .closeNode();
    },
  },
}));

/**
 * `::page-break` and any other leaf directive: a block atom that draws a
 * labelled line for the known page break and a dotted placeholder otherwise.
 */
export const leafDirectiveNode = $node('fmLeaf', (ctx) => ({
  group: 'block',
  atom: true,
  selectable: true,
  attrs: {
    name: { default: 'page-break', validate: 'string' },
    attributes: { default: '{}', validate: 'string' },
  },
  parseDOM: [
    {
      tag: 'div[data-directive-leaf]',
      getAttrs: (dom: HTMLElement) => ({
        name: dom.dataset.directiveLeaf ?? 'page-break',
        attributes: dom.dataset.attributes ?? '{}',
      }),
    },
  ],
  toDOM: (node: ProseNode) => {
    const name = String(node.attrs.name);
    const known = BLOCK_DIRECTIVES[name]?.form === 'leaf';
    return [
      'div',
      {
        class: known ? `md-${name}` : 'md-unknown-block md-unknown-leaf',
        'data-directive-leaf': name,
        'data-attributes': String(node.attrs.attributes),
        'data-label': known ? ctx.get(editorEnvironmentCtx.key).labels.pageBreak : `::${name}`,
        contenteditable: 'false',
      },
    ];
  },
  parseMarkdown: {
    match: (node: DirectiveMdast) => node.type === 'leafDirective' || isEmptyLeafContainer(node),
    runner: (state, node: DirectiveMdast, type) => {
      state.addNode(type, {
        name: node.name ?? 'unknown',
        attributes: JSON.stringify(node.attributes ?? {}),
      });
    },
  },
  toMarkdown: {
    match: (node: ProseNode) => node.type.name === 'fmLeaf',
    runner: (state, node: ProseNode) => {
      state.addNode('leafDirective', [], undefined, {
        name: String(node.attrs.name),
        attributes: safeAttributes(String(node.attrs.attributes)),
      });
    },
  },
}));

/** The layout an image node carries, from its attributes. */
export function imageLayoutOf(attrs: Readonly<Record<string, unknown>>): ImageLayout {
  const widthMm = Number(attrs.width) || 0;
  const widthPercent = Number(attrs.widthPercent) || 0;
  const align = String(attrs.align ?? 'left');
  return {
    ...(widthMm > 0 ? { widthMm } : {}),
    ...(widthPercent > 0 ? { widthPercent } : {}),
    ...(align !== 'left' && IMAGE_ALIGNMENTS.includes(align as ImageAlignment)
      ? { align: align as ImageAlignment }
      : {}),
  };
}

/**
 * `![alt](asset:id){width=60mm align=center}` — replaces the CommonMark
 * preset's image node (same id, so the preset's commands keep resolving).
 * Only local assets: a URL image from a file stays the text it was, exactly
 * as in the renderer. The layout attributes (R14-015) round-trip through the
 * attribute block the renderer reads.
 */
export const imageNode = $node('image', () => ({
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  draggable: true,
  marks: '',
  attrs: {
    src: { default: '', validate: 'string' },
    alt: { default: '', validate: 'string' },
    title: { default: '', validate: 'string' },
    /** Width in millimetres, or 0 for "natural" or a percentage. */
    width: { default: 0, validate: 'number' },
    /** Width as a share of the text box, 1–100, or 0 when not used. */
    widthPercent: { default: 0, validate: 'number' },
    /** `left`, `center` or `right`. */
    align: { default: 'left', validate: 'string' },
  },
  parseDOM: [
    {
      tag: 'img[data-asset-id]',
      getAttrs: (dom: HTMLElement) => ({
        src: `asset:${dom.dataset.assetId ?? ''}`,
        alt: dom.getAttribute('alt') ?? '',
        title: '',
        width: Number(dom.dataset.width ?? 0) || 0,
        widthPercent: Number(dom.dataset.widthPercent ?? 0) || 0,
        align: dom.dataset.align ?? 'left',
      }),
    },
  ],
  toDOM: (node: ProseNode) => [
    'img',
    {
      class: 'md-image',
      'data-asset-id': assetIdFromUrl(String(node.attrs.src)) ?? '',
      'data-width': String(node.attrs.width),
      'data-width-percent': String(node.attrs.widthPercent),
      'data-align': String(node.attrs.align),
      alt: String(node.attrs.alt),
    },
  ],
  parseMarkdown: {
    match: (node: DirectiveMdast) =>
      node.type === 'image' && assetIdFromUrl(node.url ?? '') !== null,
    runner: (state, node: DirectiveMdast, type) => {
      const layout = parseImageLayout(node.data?.attributes);
      state.addNode(type, {
        src: `asset:${assetIdFromUrl(node.url ?? '') ?? ''}`,
        alt: node.alt ?? '',
        title: node.title ?? '',
        width: layout.widthMm ?? 0,
        widthPercent: layout.widthPercent ?? 0,
        align: layout.align ?? 'left',
      });
    },
  },
  toMarkdown: {
    match: (node: ProseNode) => node.type.name === 'image',
    runner: (state, node: ProseNode) => {
      state.addNode('image', undefined, undefined, {
        url: String(node.attrs.src),
        alt: String(node.attrs.alt),
        title: node.attrs.title ? String(node.attrs.title) : null,
      });
      const block = serializeImageLayout(imageLayoutOf(node.attrs));
      if (block) state.addNode('text', undefined, block);
    },
  },
}));

/**
 * Any other image — a remote URL, a data URI — is shown as its Markdown text:
 * the editor loads nothing from outside, and the file keeps what it said.
 */
export const foreignImageText = $node('fmForeignImage', () => ({
  inline: true,
  group: 'inline',
  atom: true,
  marks: '',
  attrs: {
    url: { default: '', validate: 'string' },
    alt: { default: '', validate: 'string' },
  },
  parseDOM: [
    {
      tag: 'span[data-foreign-image]',
      getAttrs: (dom: HTMLElement) => ({
        url: dom.dataset.foreignImage ?? '',
        alt: dom.dataset.alt ?? '',
      }),
    },
  ],
  toDOM: (node: ProseNode) => [
    'span',
    {
      class: 'md-foreign-image',
      'data-foreign-image': String(node.attrs.url),
      'data-alt': String(node.attrs.alt),
    },
    `![${String(node.attrs.alt)}](${String(node.attrs.url)})`,
  ],
  parseMarkdown: {
    match: (node: DirectiveMdast) => node.type === 'image',
    runner: (state, node: DirectiveMdast, type) => {
      state.addNode(type, { url: node.url ?? '', alt: node.alt ?? '' });
    },
  },
  toMarkdown: {
    match: (node: ProseNode) => node.type.name === 'fmForeignImage',
    runner: (state, node: ProseNode) => {
      state.addNode('image', undefined, undefined, {
        url: String(node.attrs.url),
        alt: String(node.attrs.alt),
        title: null,
      });
    },
  },
}));

/** The image node view: an `<img>` whose source is an object URL the app resolves for the asset id. */
export const imageView = $view(imageNode, (ctx) => (node: ProseNode) => {
  const environment = ctx.get(editorEnvironmentCtx.key);
  const dom = document.createElement('img');
  dom.className = 'md-image';
  dom.alt = String(node.attrs.alt);
  const assetId = assetIdFromUrl(String(node.attrs.src)) ?? '';
  dom.dataset.assetId = assetId;
  dom.dataset.width = String(node.attrs.width);
  dom.dataset.widthPercent = String(node.attrs.widthPercent);
  dom.dataset.align = String(node.attrs.align);
  const width = Number(node.attrs.width);
  const percent = Number(node.attrs.widthPercent);
  // CSSOM, not a `style` attribute: the strict CSP allows the former only.
  if (percent > 0) dom.style.width = `${percent}%`;
  else if (width > 0) dom.style.width = `${width}mm`;
  // Until the bytes are resolved the element has no `src`, which Chrome lays
  // out as a zero-height box — the insertion looked like nothing had happened
  // (R13-002). The loading class reserves a visible frame at the requested width.
  dom.classList.add('md-image-loading');
  let url: string | null = null;
  let alive = true;
  void environment.resolveAssetUrl(assetId).then((resolved) => {
    if (!alive) return;
    dom.classList.remove('md-image-loading');
    if (resolved) {
      url = resolved;
      dom.src = resolved;
    } else {
      dom.classList.add('md-image-missing');
      dom.alt = environment.labels.missingAsset;
    }
  });
  return {
    dom,
    destroy: () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    },
  };
});

/** Marks that cannot coexist: setting one colour removes another. */
function setExclusiveMark(type: MarkType, attrs: Attrs | null) {
  return (
    state: Parameters<ReturnType<typeof toggleMark>>[0],
    dispatch?: Parameters<ReturnType<typeof toggleMark>>[1],
  ): boolean => {
    const { from, to, empty, $from } = state.selection;
    const current = empty
      ? type.isInSet(state.storedMarks ?? $from.marks())
      : rangeMark(state.doc, from, to, type);
    const same =
      current && attrs && Object.entries(attrs).every(([k, v]) => current.attrs[k] === v);
    if (!dispatch) return true;
    let tr = state.tr;
    if (empty) {
      tr = same || !attrs ? tr.removeStoredMark(type) : tr.addStoredMark(type.create(attrs));
    } else {
      tr = tr.removeMark(from, to, type);
      if (!same && attrs) tr = tr.addMark(from, to, type.create(attrs));
    }
    dispatch(tr.scrollIntoView());
    return true;
  };
}

/** The first mark of a type inside a range, if any. */
function rangeMark(doc: ProseNode, from: number, to: number, type: MarkType): Mark | null {
  let found: Mark | null = null;
  doc.nodesBetween(from, to, (node) => {
    if (found) return false;
    const mark = type.isInSet(node.marks);
    if (mark) found = mark;
    return true;
  });
  return found;
}

/** Sets or clears the colour of the selection; an empty name clears. */
export const setColorCommand = $command('SetColor', (ctx) => (name: string = '') => {
  const type = colorMark.type(ctx);
  return setExclusiveMark(type, name && isColorName(name) ? { name } : null);
});

/** Toggles one of the fixed inline marks. */
export const toggleInlineCommand = $command(
  'ToggleFoldmarkInline',
  (ctx) =>
    (which: string = 'highlight') => {
      const type = {
        highlight: highlightMark,
        underline: underlineMark,
        small: smallMark,
        superscript: supMark,
        subscript: subMark,
      }[which];
      return type ? toggleMark(type.type(ctx)) : () => false;
    },
);

/** Inserts a date atom at the cursor. */
export const insertDateCommand = $command('InsertDate', (ctx) => (iso: string = '') => {
  return (state, dispatch) => {
    if (!ISO_DATE.test(iso)) return false;
    if (dispatch) {
      const node = dateNode.type(ctx).create({ iso });
      dispatch(state.tr.replaceSelectionWith(node, false).scrollIntoView());
    }
    return true;
  };
});

/**
 * A link with its own text (change 0022): replaces the selection, or inserts
 * at the cursor, with the text carrying the link mark. Only vetted schemes;
 * anything else inserts nothing rather than a link the renderer would refuse.
 */
export const insertLinkCommand = $command(
  'InsertLinkWithText',
  (ctx) =>
    (payload: { href: string; text: string } = { href: '', text: '' }) => {
      return (state, dispatch) => {
        const href = payload.href.trim();
        if (!/^(https?:|mailto:)/iu.test(href)) return false;
        const text = payload.text.trim() || href;
        if (dispatch) {
          const linkType = linkSchema.type(ctx);
          const node = state.schema.text(text, [linkType.create({ href })]);
          dispatch(state.tr.replaceSelectionWith(node, false).scrollIntoView());
        }
        return true;
      };
    },
);

/** Inserts a local image at the cursor, with its layout (R14-015). */
export const insertAssetImageCommand = $command(
  'InsertAssetImage',
  (ctx) =>
    (
      payload: {
        assetId: string;
        alt?: string;
        widthMm?: number;
        widthPercent?: number;
        align?: ImageAlignment;
      } = { assetId: '' },
    ) => {
      return (state, dispatch) => {
        if (!payload.assetId) return false;
        if (dispatch) {
          const layout = parseImageLayout({
            width: payload.widthPercent
              ? `${payload.widthPercent}%`
              : payload.widthMm
                ? `${payload.widthMm}mm`
                : undefined,
            align: payload.align,
          });
          const node = imageNode.type(ctx).create({
            src: `asset:${payload.assetId}`,
            alt: payload.alt ?? '',
            title: '',
            width: layout.widthMm ?? 0,
            widthPercent: layout.widthPercent ?? 0,
            align: layout.align ?? 'left',
          });
          dispatch(state.tr.replaceSelectionWith(node, false).scrollIntoView());
        }
        return true;
      };
    },
);

/**
 * Changes the selected image's layout (R14-015): width in millimetres or as
 * a share of the text box — one clears the other — and the alignment. `null`
 * clears a field. Nothing happens unless an image node is selected.
 */
export const setImageLayoutCommand = $command(
  'SetImageLayout',
  () =>
    (
      change: {
        widthMm?: number | null;
        widthPercent?: number | null;
        align?: ImageAlignment | null;
      } = {},
    ) => {
      return (state, dispatch) => {
        const selection = state.selection as { node?: ProseNode; from: number };
        const node = selection.node;
        if (!node || node.type.name !== 'image') return false;
        const next: Record<string, unknown> = { ...node.attrs };
        if (change.widthMm !== undefined) {
          next.width =
            change.widthMm === null
              ? 0
              : Math.min(Math.max(change.widthMm, IMAGE_WIDTH_BOUNDS.min), IMAGE_WIDTH_BOUNDS.max);
          if (change.widthMm !== null) next.widthPercent = 0;
        }
        if (change.widthPercent !== undefined) {
          next.widthPercent =
            change.widthPercent === null ? 0 : Math.min(Math.max(change.widthPercent, 1), 100);
          if (change.widthPercent !== null) next.width = 0;
        }
        if (change.align !== undefined) next.align = change.align ?? 'left';
        if (dispatch) {
          // The replaced node is selected again, so the toolbar stays on it.
          const tr = state.tr.setNodeMarkup(selection.from, undefined, next);
          dispatch(tr.setSelection(NodeSelection.create(tr.doc, selection.from)).scrollIntoView());
        }
        return true;
      };
    },
);

/**
 * Wraps the selection in a block directive, or lifts it out again when it is
 * already inside a directive of that name — a toggle, the way a quote works.
 */
export const toggleBlockDirectiveCommand = $command(
  'ToggleBlockDirective',
  (ctx) =>
    (payload: { name: string; attributes?: Record<string, string> } = { name: 'note' }) => {
      return (state, dispatch) => {
        const type = directiveBlockNode.type(ctx);
        if (enclosingDirective(ctx, state) === payload.name) {
          // Lift the content out of the directive of that name — also when
          // the whole document is selected, where ProseMirror's own `lift`
          // finds no block range.
          const { $from, $to } = insideSelection(state);
          const range = $from.blockRange(
            $to,
            (node) => node.type === type && node.attrs.name === payload.name,
          );
          const target = range ? liftTarget(range) : null;
          if (!range || target === null) return false;
          if (dispatch) dispatch(state.tr.lift(range, target).scrollIntoView());
          return true;
        }
        const attributes = JSON.stringify(
          BLOCK_DIRECTIVES[payload.name]
            ? resolveBlockAttributes(payload.name, payload.attributes ?? {})
            : (payload.attributes ?? {}),
        );
        return wrapIn(type, { name: payload.name, attributes })(state, dispatch);
      };
    },
);

/**
 * Inserts a page break after the current top-level block and puts the cursor
 * on the next page — in the block that follows, or in a fresh paragraph when
 * the break ends the document — so the writer can keep typing.
 */
export const insertPageBreakCommand = $command('InsertPageBreak', (ctx) => () => {
  return (state, dispatch) => {
    if (dispatch) {
      const node = leafDirectiveNode.type(ctx).create({ name: 'page-break', attributes: '{}' });
      // After the top-level block: a break inside a note box would not paginate.
      const position = insideSelection(state).$to.after(1);
      const tr = state.tr.insert(position, node);
      const after = position + node.nodeSize;
      if (after >= tr.doc.content.size) {
        const paragraph = state.schema.nodes.paragraph?.createAndFill();
        if (paragraph) tr.insert(after, paragraph);
      }
      dispatch(tr.setSelection(TextSelection.near(tr.doc.resolve(after + 1), 1)).scrollIntoView());
    }
    return true;
  };
});

/** Every plugin of the syntax, in the order Milkdown must see them: nodes, marks, views, commands. */
/**
 * Clears every character mark from the selection (R14-005): bold, italic,
 * strikethrough, code, link, colour, highlight, underline, small, super- and
 * subscript, unknown inline directives — one transaction, no per-mark toggle.
 * With an empty selection the stored marks are dropped, so the next character
 * typed is plain.
 */
export const clearFormattingCommand = $command('ClearFormatting', () => () => {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection;
    if (dispatch) {
      const tr = empty ? state.tr : state.tr.removeMark(from, to);
      dispatch(tr.setStoredMarks([]).scrollIntoView());
    }
    return true;
  };
});

/** Every node, mark, view and command of the Foldmark dialect, in the order Milkdown loads them. */
export const foldmarkSyntax = [
  editorEnvironmentCtx,
  remarkDirectivePlugin,
  remarkFoldmarkPlugin,
  dateNode,
  emptyDirectiveNode,
  imageNode,
  foreignImageText,
  directiveBlockNode,
  leafDirectiveNode,
  colorMark,
  highlightMark,
  underlineMark,
  smallMark,
  supMark,
  subMark,
  unknownInlineMark,
  colorView,
  imageView,
  setColorCommand,
  toggleInlineCommand,
  insertDateCommand,
  insertLinkCommand,
  insertAssetImageCommand,
  setImageLayoutCommand,
  toggleBlockDirectiveCommand,
  insertPageBreakCommand,
  clearFormattingCommand,
].flat();

/**
 * The selection's ends, moved just inside the document when the whole
 * document is selected: an all-selection resolves at depth 0 and would see no
 * parent block.
 */
function insideSelection(state: EditorState) {
  const { $from, $to } = state.selection;
  const size = state.doc.content.size;
  return {
    $from: $from.depth > 0 ? $from : state.doc.resolve(Math.min(1, size)),
    $to: $to.depth > 0 ? $to : state.doc.resolve(Math.max(0, size - 1)),
  };
}

/** The directive block enclosing the selection, by name, for toolbar state and for toggling. */
export function enclosingDirective(ctx: Ctx, state: EditorState): string | null {
  const type = directiveBlockNode.type(ctx);
  const { $from } = insideSelection(state);
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type === type) return String(node.attrs.name);
  }
  return null;
}
