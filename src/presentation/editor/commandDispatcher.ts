/**
 * One command path for the menu bar, the toolbar and the keyboard (R14-003).
 *
 * The classic menu, the toolbar and the shortcuts used to route to the editor
 * on their own, and the menu's route was broken without anyone noticing.
 * Everything now asks this object: `canExecute` decides whether an entry is
 * enabled, `execute` runs it. Both look at the **target** — the editing
 * surface the writer was last in — because "Format → Bold" means something
 * different over a rich-text selection, over the Markdown source and over the
 * subject field, and nothing at all when no surface has been touched yet.
 */

/** The editing surface a command applies to. */
export type CommandTarget = 'rich-editor' | 'markdown-editor' | 'subject' | 'none';

/** What the workspace hands the dispatcher: the surfaces and the rest of its actions. */
export interface DispatcherHost {
  /** The surface the writer was last in. */
  readonly target: () => CommandTarget;
  /** The body editor component, when the document has one (a two-sided card has none). */
  readonly editor: () => EditorHandle | null;
  /** Toggles the subject's weight; the subject is a block, never rich text (A5). */
  readonly toggleSubjectBold: () => void;
  /** Every id that is not an editor command: file, view, help. */
  readonly workspace: (id: string) => void | Promise<void>;
}

/** The part of the body editor the dispatcher talks to. */
export interface EditorHandle {
  /** Whether the toolbar would enable this command right now. */
  canRun(id: string): boolean;
  /** Runs a menu command id (`bold`, `heading2`, `align:center`, …). */
  menuCommand(id: string): void;
}

/** The menu, the toolbar and the keys all speak to this. */
export interface EditorCommandDispatcher {
  canExecute(id: string): boolean;
  execute(id: string): void | Promise<void>;
}

const EDITOR_PREFIX = 'editor:';

/** The `canRun` key a menu command id maps onto; most ids are their own key. */
function availabilityKey(command: string): string {
  if (command.startsWith('heading') || command === 'paragraph') return 'heading';
  if (command.startsWith('align:')) return 'align';
  return command;
}

/** Commands that make sense on the subject field: it can only be bold or not. */
const SUBJECT_COMMANDS = new Set(['bold']);

/** Builds the dispatcher over the host's current state; nothing is cached. */
export function createCommandDispatcher(host: DispatcherHost): EditorCommandDispatcher {
  const canExecute = (id: string): boolean => {
    if (!id.startsWith(EDITOR_PREFIX)) return true;
    const command = id.slice(EDITOR_PREFIX.length);
    switch (host.target()) {
      case 'subject':
        return SUBJECT_COMMANDS.has(command);
      case 'rich-editor':
      case 'markdown-editor': {
        const editor = host.editor();
        return editor ? editor.canRun(availabilityKey(command)) : false;
      }
      default:
        return false;
    }
  };

  const execute = (id: string): void | Promise<void> => {
    if (!id.startsWith(EDITOR_PREFIX)) return host.workspace(id);
    if (!canExecute(id)) return undefined;
    const command = id.slice(EDITOR_PREFIX.length);
    if (host.target() === 'subject') {
      if (command === 'bold') host.toggleSubjectBold();
      return undefined;
    }
    host.editor()?.menuCommand(command);
    return undefined;
  };

  return { canExecute, execute };
}
