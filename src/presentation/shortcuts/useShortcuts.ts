import { onBeforeUnmount, onMounted } from 'vue';
import type { EditorCommandDispatcher } from '@/presentation/editor/commandDispatcher';
import {
  detectPlatform,
  findShortcut,
  type ShortcutPlatform,
  type ShortcutScope,
} from '@/presentation/shortcuts/shortcutRegistry';

/**
 * One `keydown` listener for the registry (R14-008).
 *
 * `workspace` shortcuts fire with the focus anywhere in the document; `editor`
 * shortcuts only when the key was pressed inside an element marked
 * `data-shortcut-scope="editor"` — the subject field, the Markdown source.
 * The rich editor handles its own keys in the capture phase (it has to beat
 * ProseMirror's keymap), so by the time an event reaches this listener from
 * there it has already been consumed.
 */
export function useShortcuts(
  dispatcher: EditorCommandDispatcher,
  options: { platform?: ShortcutPlatform; target?: EventTarget } = {},
): void {
  const platform = options.platform ?? detectPlatform();
  const target = options.target ?? globalThis.document;

  const onKeydown = (event: Event): void => {
    const keyboard = event as KeyboardEvent;
    if (keyboard.defaultPrevented) return;
    const scope: ShortcutScope | undefined = insideEditorScope(keyboard.target)
      ? undefined
      : 'workspace';
    const definition = scope
      ? findShortcut(keyboard, platform, scope)
      : findShortcut(keyboard, platform);
    if (!definition) return;
    if (!dispatcher.canExecute(definition.command)) return;
    if (definition.preventBrowserDefault) keyboard.preventDefault();
    void dispatcher.execute(definition.command);
  };

  onMounted(() => target.addEventListener('keydown', onKeydown));
  onBeforeUnmount(() => target.removeEventListener('keydown', onKeydown));
}

/** Whether the key was pressed inside an editing surface that owns editor shortcuts. */
function insideEditorScope(node: EventTarget | null): boolean {
  return node instanceof Element && node.closest('[data-shortcut-scope="editor"]') !== null;
}
