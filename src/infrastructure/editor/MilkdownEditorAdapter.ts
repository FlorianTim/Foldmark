import '@milkdown/kit/prose/view/style/prosemirror.css';
import '@milkdown/kit/prose/tables/style/tables.css';
import { defaultValueCtx, Editor, editorViewCtx, rootCtx } from '@milkdown/kit/core';
import { clipboard } from '@milkdown/kit/plugin/clipboard';
import { history, redoCommand, undoCommand } from '@milkdown/kit/plugin/history';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import {
  commonmark,
  emphasisSchema,
  insertHrCommand,
  linkSchema,
  strongSchema,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleLinkCommand,
  toggleStrongCommand,
  turnIntoTextCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from '@milkdown/kit/preset/commonmark';
import {
  gfm,
  insertTableCommand,
  remarkGFMPlugin,
  strikethroughSchema,
  toggleStrikethroughCommand,
} from '@milkdown/kit/preset/gfm';
import { selectAll } from '@milkdown/kit/prose/commands';
import { NodeSelection } from '@milkdown/kit/prose/state';
import { redoDepth, undoDepth } from '@milkdown/kit/prose/history';
import type { MarkType } from '@milkdown/kit/prose/model';
import { callCommand, getMarkdown, replaceAll } from '@milkdown/kit/utils';
import type {
  EditorCommand,
  EditorCommandArgument,
  EditorSelectionState,
  RichTextEditorFactory,
  RichTextEditorOptions,
  RichTextEditorPort,
} from '@/application/ports/RichTextEditorPort';
import { normalizeSource } from '@/domain/markdown/parseMarkdown';
import {
  clearFormattingCommand,
  colorMark,
  editorEnvironmentCtx,
  enclosingDirective,
  foldmarkSyntax,
  highlightMark,
  imageLayoutOf,
  insertAssetImageCommand,
  insertDateCommand,
  insertLinkCommand,
  insertPageBreakCommand,
  setColorCommand,
  setImageLayoutCommand,
  smallMark,
  subMark,
  supMark,
  toggleBlockDirectiveCommand,
  toggleInlineCommand,
  underlineMark,
} from '@/infrastructure/editor/foldmarkSyntax';

/**
 * Milkdown behind the rich-text port (ADR 0016; change 0010).
 *
 * Milkdown was chosen because Markdown is its native format: the ProseMirror
 * document is parsed from and serialised to Markdown by remark, so what the
 * port hands back is the same dialect the codec reads — since change 0017 the
 * very same remark plugins the renderer's parser uses (`foldmarkSyntax.ts`).
 * Raw HTML in a document is rendered by the commonmark preset as *text* in a
 * span, never injected — which is what keeps ADR 0011 true inside the editor.
 *
 * Everything the workspace needs is expressed through commands, so a later
 * library swap is a new adapter, not a new toolbar.
 */
class MilkdownEditor implements RichTextEditorPort {
  private constructor(
    private readonly editor: Editor,
    private readonly onStateChange: (() => void) | undefined,
  ) {}

  /** Mounts an editor into the element and resolves when it is ready. */
  public static async mount(options: RichTextEditorOptions): Promise<MilkdownEditor> {
    let instance: MilkdownEditor | null = null;
    const editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, options.element);
        ctx.set(defaultValueCtx, normalizeSource(options.initialMarkdown));
        // Double tilde only: `~2~` is subscript in the dialect, not strikethrough.
        ctx.set(remarkGFMPlugin.options.key, { singleTilde: false });
        ctx.set(editorEnvironmentCtx.key, {
          locale: options.locale ?? 'en',
          resolveAssetUrl: options.resolveAssetUrl ?? (async () => null),
          labels: options.labels ?? { pageBreak: 'Page break', missingAsset: 'Image missing' },
        });
        ctx
          .get(listenerCtx)
          // The listener reports 200 ms after the last transaction, so a
          // programmatic load would arrive here too: content the adapter
          // already knows is not a user change.
          .markdownUpdated((_ctx, markdown) => {
            if (!instance) return;
            const clean = tidy(markdown);
            if (clean === instance.lastKnown) return;
            instance.lastKnown = clean;
            options.onChange(clean);
            options.onStateChange?.();
          })
          .selectionUpdated(() => options.onStateChange?.());
      })
      .use(commonmark)
      .use(gfm)
      .use(foldmarkSyntax)
      .use(history)
      .use(listener)
      .use(clipboard)
      .create();
    instance = new MilkdownEditor(editor, options.onStateChange);
    instance.lastKnown = await instance.getMarkdown();
    return instance;
  }

  /** The Markdown the adapter last loaded or reported; anything else is a change. */
  private lastKnown = '';

  public async loadMarkdown(markdown: string): Promise<void> {
    this.editor.action(replaceAll(normalizeSource(markdown), true));
    this.lastKnown = await this.getMarkdown();
    this.onStateChange?.();
  }

  public async getMarkdown(): Promise<string> {
    return tidy(this.editor.action(getMarkdown()));
  }

  public undo(): void {
    this.editor.action(callCommand(undoCommand.key));
    this.onStateChange?.();
  }

  public redo(): void {
    this.editor.action(callCommand(redoCommand.key));
    this.onStateChange?.();
  }

  public canUndo(): boolean {
    return this.editor.action((ctx) => undoDepth(ctx.get(editorViewCtx).state) > 0);
  }

  public canRedo(): boolean {
    return this.editor.action((ctx) => redoDepth(ctx.get(editorViewCtx).state) > 0);
  }

  public run(command: EditorCommand, argument?: EditorCommandArgument): void {
    const text = typeof argument === 'string' ? argument : undefined;
    switch (command) {
      case 'paragraph':
        this.editor.action(callCommand(turnIntoTextCommand.key));
        break;
      case 'heading1':
      case 'heading2':
      case 'heading3':
      case 'heading4':
      case 'heading5':
      case 'heading6':
        this.editor.action(callCommand(wrapInHeadingCommand.key, Number(command.slice(-1))));
        break;
      case 'bold':
        this.editor.action(callCommand(toggleStrongCommand.key));
        break;
      case 'italic':
        this.editor.action(callCommand(toggleEmphasisCommand.key));
        break;
      case 'strikethrough':
        this.editor.action(callCommand(toggleStrikethroughCommand.key));
        break;
      case 'code':
        this.editor.action(callCommand(toggleInlineCodeCommand.key));
        break;
      case 'bulletList':
        this.editor.action(callCommand(wrapInBulletListCommand.key));
        break;
      case 'orderedList':
        this.editor.action(callCommand(wrapInOrderedListCommand.key));
        break;
      case 'blockquote':
        this.editor.action(callCommand(wrapInBlockquoteCommand.key));
        break;
      case 'link':
        this.editor.action(callCommand(toggleLinkCommand.key, { href: text ?? '' }));
        break;
      case 'linkWithText':
        this.editor.action(
          callCommand(
            insertLinkCommand.key,
            typeof argument === 'object' && 'href' in argument
              ? argument
              : { href: text ?? '', text: text ?? '' },
          ),
        );
        break;
      case 'horizontalRule':
        this.editor.action(callCommand(insertHrCommand.key));
        break;
      case 'table': {
        const size =
          typeof argument === 'object' && 'rows' in argument ? argument : { rows: 3, cols: 3 };
        this.editor.action(
          callCommand(insertTableCommand.key, {
            row: Math.min(Math.max(size.rows, 1), 20),
            col: Math.min(Math.max(size.cols, 1), 12),
          }),
        );
        break;
      }
      case 'color':
        this.editor.action(callCommand(setColorCommand.key, text ?? ''));
        break;
      case 'highlight':
      case 'underline':
      case 'small':
      case 'superscript':
      case 'subscript':
        this.editor.action(callCommand(toggleInlineCommand.key, command));
        break;
      case 'date':
        this.editor.action(callCommand(insertDateCommand.key, text ?? ''));
        break;
      case 'image':
        this.editor.action(
          callCommand(
            insertAssetImageCommand.key,
            typeof argument === 'object' && 'assetId' in argument
              ? argument
              : { assetId: text ?? '' },
          ),
        );
        break;
      case 'indent':
        this.editor.action(
          callCommand(toggleBlockDirectiveCommand.key, {
            name: 'indent',
            attributes: { level: text ?? '1' },
          }),
        );
        break;
      case 'align':
        this.editor.action(
          callCommand(toggleBlockDirectiveCommand.key, {
            name: 'align',
            attributes: { to: text ?? 'left' },
          }),
        );
        break;
      case 'smallBlock':
        this.editor.action(callCommand(toggleBlockDirectiveCommand.key, { name: 'small' }));
        break;
      case 'note':
        this.editor.action(
          callCommand(toggleBlockDirectiveCommand.key, {
            name: 'note',
            attributes: { type: text ?? 'info' },
          }),
        );
        break;
      case 'signature':
        this.editor.action(
          callCommand(toggleBlockDirectiveCommand.key, {
            name: 'signature',
            attributes: { lines: text ?? '3' },
          }),
        );
        break;
      case 'pageBreak':
        this.editor.action(callCommand(insertPageBreakCommand.key));
        break;
      case 'clearFormatting':
        this.editor.action(callCommand(clearFormattingCommand.key));
        break;
      case 'imageLayout':
        if (typeof argument === 'object' && 'layout' in argument) {
          this.editor.action(callCommand(setImageLayoutCommand.key, argument.layout));
        }
        break;
      default:
        break;
    }
    this.focus();
    this.onStateChange?.();
  }

  public insertText(text: string): void {
    this.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      view.dispatch(view.state.tr.insertText(text).scrollIntoView());
    });
    this.focus();
    this.onStateChange?.();
  }

  public selectAll(): void {
    this.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      selectAll(view.state, view.dispatch);
    });
    this.onStateChange?.();
  }

  public selectImage(assetId: string): boolean {
    return this.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      let position = -1;
      view.state.doc.descendants((node, pos) => {
        if (position >= 0) return false;
        if (node.type.name === 'image' && String(node.attrs.src) === `asset:${assetId}`) {
          position = pos;
        }
        return position < 0;
      });
      if (position < 0) return false;
      view.dispatch(
        view.state.tr.setSelection(NodeSelection.create(view.state.doc, position)).scrollIntoView(),
      );
      this.onStateChange?.();
      return true;
    });
  }

  public selectionState(): EditorSelectionState {
    return this.editor.action((ctx) => {
      const { state } = ctx.get(editorViewCtx);
      const { from, $from, to, empty } = state.selection;
      const marksHere = state.storedMarks ?? $from.marks();
      const active = (type: MarkType): boolean => {
        if (empty) return Boolean(type.isInSet(marksHere));
        return state.doc.rangeHasMark(from, to, type);
      };
      const colorType = colorMark.type(ctx);
      const colorHere = empty
        ? colorType.isInSet(marksHere)
        : firstMark(state.doc, from, to, colorType);
      const linkType = linkSchema.type(ctx);
      const linkHere = empty
        ? linkType.isInSet(marksHere)
        : firstMark(state.doc, from, to, linkType);
      // Context (change 0022): what encloses the cursor decides what the toolbar may offer.
      let heading = 0;
      let inTable = false;
      let inList = false;
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const name = $from.node(depth).type.name;
        if (name === 'heading') heading = Number($from.node(depth).attrs.level) || 0;
        if (name === 'table_cell' || name === 'table_header') inTable = true;
        if (name === 'list_item') inList = true;
      }
      // A selected image node reports its layout for the image toolbar (R14-015).
      const selectedNode = (
        state.selection as { node?: { type: { name: string }; attrs: Record<string, unknown> } }
      ).node;
      const image =
        selectedNode?.type.name === 'image'
          ? {
              assetId: String(selectedNode.attrs.src ?? '').replace(/^asset:/u, ''),
              ...imageLayoutOf(selectedNode.attrs),
            }
          : null;
      return {
        heading,
        inTable,
        inList,
        image,
        selectedText: empty ? '' : state.doc.textBetween(from, to, ' '),
        linkHref: linkHere ? String(linkHere.attrs.href ?? '') : null,
        bold: active(strongSchema.type(ctx)),
        italic: active(emphasisSchema.type(ctx)),
        strikethrough: active(strikethroughSchema.type(ctx)),
        link: active(linkSchema.type(ctx)),
        color: colorHere ? String(colorHere.attrs.name) : null,
        highlight: active(highlightMark.type(ctx)),
        underline: active(underlineMark.type(ctx)),
        small: active(smallMark.type(ctx)),
        superscript: active(supMark.type(ctx)),
        subscript: active(subMark.type(ctx)),
        block: enclosingDirective(ctx, state),
      };
    });
  }

  public focus(): void {
    this.editor.action((ctx) => ctx.get(editorViewCtx).focus());
  }

  public async destroy(): Promise<void> {
    await this.editor.destroy();
  }
}

/** The first mark of a type in a range, for reporting the colour of a selection. */
function firstMark(
  doc: {
    nodesBetween: (
      from: number,
      to: number,
      f: (node: { marks: readonly unknown[] }) => boolean | void,
    ) => void;
  },
  from: number,
  to: number,
  type: MarkType,
) {
  let found: ReturnType<MarkType['isInSet']> = undefined;
  doc.nodesBetween(from, to, (node) => {
    if (found) return false;
    found = type.isInSet(node.marks as never);
    return true;
  });
  return found;
}

/**
 * Accepted normalisation of remark's output: `remark-directive` escapes a
 * colon before a letter, which turns `asset:id` in an image destination into
 * `asset\:id`. CommonMark reads both; the file should carry the plain form.
 */
function tidy(markdown: string): string {
  return (
    markdown
      .replaceAll('](asset\\:', '](asset:')
      // An empty table cell is serialised as `<br />`, which the renderers
      // would print as text (they interpret no HTML). An empty cell is empty.
      .split('\n')
      .map((line) => (line.startsWith('|') ? line.replaceAll('<br />', '') : line))
      .join('\n')
  );
}

/** The factory the composition root exposes. */
export const milkdownEditorFactory: RichTextEditorFactory = {
  create: (options) => MilkdownEditor.mount(options),
};
