import { describe, expect, it } from 'vitest';
import {
  createCommandDispatcher,
  type CommandTarget,
  type EditorHandle,
} from '@/presentation/editor/commandDispatcher';
import { stripInlineMarks } from '@/domain/markdown/clearFormatting';
import {
  detectPlatform,
  findShortcut,
  formatShortcut,
  matchShortcut,
  SHORTCUTS,
  shortcutFor,
  shortcutLabel,
} from '@/presentation/shortcuts/shortcutRegistry';

/** A keyboard event with only what the registry reads. */
function key(
  value: string,
  modifiers: Partial<Record<'ctrl' | 'meta' | 'alt' | 'shift', boolean>> = {},
  code = '',
) {
  return {
    key: value,
    code,
    ctrlKey: modifiers.ctrl ?? false,
    metaKey: modifiers.meta ?? false,
    altKey: modifiers.alt ?? false,
    shiftKey: modifiers.shift ?? false,
  };
}

describe('the shortcut registry (R14-008)', () => {
  it('never claims a browser or window shortcut', () => {
    for (const forbidden of ['n', 'o', 'w', 't', 'r', 'f']) {
      expect(findShortcut(key(forbidden, { ctrl: true }), 'windows-linux')).toBeUndefined();
      expect(findShortcut(key(forbidden, { meta: true }), 'mac')).toBeUndefined();
    }
  });

  it('matches chords per platform, including both redo spellings', () => {
    const redo = shortcutFor('editor:redo');
    expect(redo).toBeDefined();
    if (!redo) return;
    expect(matchShortcut(key('y', { ctrl: true }), redo, 'windows-linux')).toBe(true);
    expect(matchShortcut(key('Z', { ctrl: true, shift: true }), redo, 'windows-linux')).toBe(true);
    expect(matchShortcut(key('y', { ctrl: true }), redo, 'mac')).toBe(false);
    expect(matchShortcut(key('z', { meta: true, shift: true }), redo, 'mac')).toBe(true);
    // A modifier too many is a different chord.
    expect(matchShortcut(key('y', { ctrl: true, alt: true }), redo, 'windows-linux')).toBe(false);
  });

  it('matches headings by the physical digit key as well', () => {
    const heading = findShortcut(key('¹', { ctrl: true, alt: true }, 'Digit1'), 'windows-linux');
    expect(heading?.command).toBe('editor:heading1');
    expect(findShortcut(key('\\', { ctrl: true }), 'windows-linux')?.command).toBe(
      'editor:clearFormatting',
    );
    expect(findShortcut(key('Enter', { ctrl: true }), 'windows-linux')?.command).toBe(
      'editor:pageBreak',
    );
  });

  it('keeps Ctrl+U in the editor scope only', () => {
    expect(findShortcut(key('u', { ctrl: true }), 'windows-linux', 'workspace')).toBeUndefined();
    expect(findShortcut(key('u', { ctrl: true }), 'windows-linux', 'editor')?.command).toBe(
      'editor:underline',
    );
  });

  it('formats for the platform: Ctrl+Shift+Z here, ⌘⇧Z on a Mac', () => {
    const redo = shortcutFor('editor:redo');
    if (!redo) throw new Error('redo missing');
    expect(formatShortcut(redo, 'windows-linux')).toBe('Ctrl+Y / Ctrl+Shift+Z');
    expect(formatShortcut(redo, 'mac')).toBe('⌘⇧Z');
    expect(shortcutLabel('editor:heading2', 'mac')).toBe('⌘⌥2');
    expect(shortcutLabel('editor:table', 'mac')).toBe('');
  });

  it('detects the platform from the navigator', () => {
    expect(detectPlatform({ platform: 'MacIntel' })).toBe('mac');
    expect(detectPlatform({ userAgentData: { platform: 'macOS' } })).toBe('mac');
    expect(detectPlatform({ platform: 'Win32' })).toBe('windows-linux');
    expect(detectPlatform({})).toBe('windows-linux');
  });

  it('has a description key and at least one chord per platform for every entry', () => {
    for (const definition of SHORTCUTS) {
      expect(definition.windowsLinux.length, definition.id).toBeGreaterThan(0);
      expect(definition.mac.length, definition.id).toBeGreaterThan(0);
      expect(definition.descriptionKey).toMatch(/^shortcuts\./u);
    }
  });
});

describe('the command dispatcher (R14-003)', () => {
  function host(target: CommandTarget, editor: EditorHandle | null = null) {
    const calls: string[] = [];
    const dispatcher = createCommandDispatcher({
      target: () => target,
      editor: () => editor,
      toggleSubjectBold: () => calls.push('subject-bold'),
      workspace: (id) => {
        calls.push(`workspace:${id}`);
      },
    });
    return { dispatcher, calls };
  }

  const editor: EditorHandle & { ran: string[] } = {
    ran: [],
    canRun: (id) => id !== 'undo',
    menuCommand(id) {
      this.ran.push(id);
    },
  };

  it('disables every editor command without a target', () => {
    const { dispatcher } = host('none', editor);
    expect(dispatcher.canExecute('editor:bold')).toBe(false);
    expect(dispatcher.canExecute('save')).toBe(true);
  });

  it('routes editor commands to the editor and asks it first', () => {
    const { dispatcher } = host('rich-editor', editor);
    expect(dispatcher.canExecute('editor:heading3')).toBe(true);
    expect(dispatcher.canExecute('editor:undo')).toBe(false);
    void dispatcher.execute('editor:align:center');
    void dispatcher.execute('editor:undo');
    expect(editor.ran).toEqual(['align:center']);
  });

  it('turns Format → Bold over the subject into the subject weight, nothing else', () => {
    const { dispatcher, calls } = host('subject', editor);
    expect(dispatcher.canExecute('editor:bold')).toBe(true);
    expect(dispatcher.canExecute('editor:italic')).toBe(false);
    void dispatcher.execute('editor:bold');
    void dispatcher.execute('editor:italic');
    expect(calls).toEqual(['subject-bold']);
  });

  it('hands everything else to the workspace', () => {
    const { dispatcher, calls } = host('none');
    void dispatcher.execute('print');
    expect(calls).toEqual(['workspace:print']);
  });
});

describe('clear formatting in the source view (R14-005)', () => {
  it('strips character marks and keeps links, dates and images', () => {
    expect(stripInlineMarks('Ein **fettes** *kursives* :red[rotes] :highlight[Wort]')).toBe(
      'Ein fettes kursives rotes Wort',
    );
    expect(stripInlineMarks('Siehe [Foldmark](https://example.org) am :date[2026-09-16].')).toBe(
      'Siehe [Foldmark](https://example.org) am :date[2026-09-16].',
    );
    expect(stripInlineMarks('`code` und ~~weg~~ und :u[unter]')).toBe('code und weg und unter');
  });
});
