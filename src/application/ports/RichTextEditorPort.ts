/**
 * The rich-text editor boundary (ADR 0016).
 *
 * Foldmark is Markdown-first: the document body *is* a Markdown string, and the
 * visual editor is one view of it. Whatever library renders that view sits
 * behind this port, so the workspace never learns a ProseMirror schema and the
 * library can be swapped after the next evaluation without the workspace
 * noticing.
 *
 * The port is deliberately narrow — load, read back, undo/redo, a fixed set of
 * commands. Anything the editor cannot express as Markdown does not exist for
 * Foldmark, which is the whole guarantee the portable format rests on.
 */

import type { ImageAlignment, ImageLayout } from '@/domain/markdown/directives';

/**
 * Block and inline formatting the toolbar can ask for. The directive commands
 * (change 0017) take an argument: a palette name for `color`, a level, an
 * alignment, a note type or a line count for the block directives, an ISO
 * date for `date`, an asset id for `image`.
 */
export type EditorCommand =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'link'
  /** A link with its own text: inserted, or replacing the selection (change 0022). */
  | 'linkWithText'
  | 'horizontalRule'
  | 'table'
  | 'color'
  | 'highlight'
  | 'underline'
  | 'small'
  | 'superscript'
  | 'subscript'
  | 'date'
  | 'image'
  | 'indent'
  | 'align'
  | 'smallBlock'
  | 'note'
  | 'signature'
  | 'pageBreak'
  /** Removes every character mark from the selection (R14-005). */
  | 'clearFormatting'
  /** Sets the selected image's width and alignment (R14-015). */
  | 'imageLayout';

/**
 * A command's argument: a name, a level, an ISO date — or, for an image, the
 * asset and its width; for a table, its size; for a link, text and address.
 */
export type EditorCommandArgument =
  | string
  | {
      readonly assetId: string;
      readonly widthMm?: number;
      readonly widthPercent?: number;
      readonly align?: ImageAlignment;
      readonly alt?: string;
    }
  | { readonly rows: number; readonly cols: number }
  | { readonly href: string; readonly text: string }
  | ImageLayoutChange;

/**
 * A change to the selected image's layout (R14-015): every field given is
 * set, `null` clears it; a width in one unit clears the other.
 */
export interface ImageLayoutChange {
  readonly layout: {
    readonly widthMm?: number | null;
    readonly widthPercent?: number | null;
    readonly align?: ImageAlignment | null;
  };
}

/** What the editor reports about its selection, for toolbar state. */
export interface EditorSelectionState {
  readonly bold: boolean;
  readonly italic: boolean;
  readonly strikethrough: boolean;
  readonly link: boolean;
  /** The palette name under the cursor, or `null`. */
  readonly color: string | null;
  readonly highlight: boolean;
  readonly underline: boolean;
  readonly small: boolean;
  readonly superscript: boolean;
  readonly subscript: boolean;
  /** The block directive enclosing the cursor (`indent`, `note`, …), or `null`. */
  readonly block: string | null;
  /** The heading level at the cursor, 0 for a paragraph (change 0022). */
  readonly heading: number;
  /** Inside a table cell: no nested tables, images or page breaks there. */
  readonly inTable: boolean;
  /** Inside a list item: no headings there. */
  readonly inList: boolean;
  /** The selected text, for prefilling a link dialog. */
  readonly selectedText: string;
  /** The link under the cursor, or `null`. */
  readonly linkHref: string | null;
  /** The selected image and its layout, when an image node is selected (R14-015). */
  readonly image: (ImageLayout & { readonly assetId: string }) | null;
}

/** A mounted rich-text editor over one Markdown body. */
export interface RichTextEditorPort {
  /** Replaces the whole content. Does not fire the change callback. */
  loadMarkdown(markdown: string): Promise<void>;
  /** The current content as Markdown. */
  getMarkdown(): Promise<string>;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  /** Runs one toolbar command at the current selection. */
  run(command: EditorCommand, argument?: EditorCommandArgument): void;
  /** Inserts plain text at the cursor, e.g. a date or a salutation. */
  insertText(text: string): void;
  /** Selects the whole body, the way Ctrl/Cmd+A does. */
  selectAll(): void;
  /** Selects the first image of this asset, as a click on it would; `false` when there is none. */
  selectImage(assetId: string): boolean;
  /** Formatting under the cursor, for toolbar highlighting. */
  selectionState(): EditorSelectionState;
  focus(): void;
  /** Unmounts the editor and releases every listener. */
  destroy(): Promise<void>;
}

/** What a rich-text editor needs to come to life. */
export interface RichTextEditorOptions {
  /** The element the editor renders into. */
  readonly element: HTMLElement;
  readonly initialMarkdown: string;
  /** Called after every user change with the new Markdown. */
  readonly onChange: (markdown: string) => void;
  /** Called when undo/redo availability or the selection may have changed. */
  readonly onStateChange?: () => void;
  /** The document's language, for showing dates. */
  readonly locale?: string;
  /** Object URL for a local asset the body references, or `null` when it is missing. */
  readonly resolveAssetUrl?: (assetId: string) => Promise<string | null>;
  /** Wording the editor shows for a page break and a missing image. */
  readonly labels?: { readonly pageBreak: string; readonly missingAsset: string };
}

/** Creates editors; the composition root decides which implementation. */
export interface RichTextEditorFactory {
  create(options: RichTextEditorOptions): Promise<RichTextEditorPort>;
}
