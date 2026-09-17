/**
 * The one list of keyboard shortcuts (R14-008).
 *
 * Key handling, the menu bar's `Ctrl+S` labels, the toolbar tooltips and
 * Help → Shortcuts all read this table, so they cannot disagree. A shortcut
 * names the dispatcher command it runs (`commandDispatcher.ts`), the keys per
 * platform, and the scope it lives in:
 *
 * - `workspace` keys work with the focus anywhere in the open document;
 * - `editor` keys only inside an editing surface — the rich editor, the
 *   Markdown source, the subject field — so `Ctrl+U` outside the editor still
 *   opens the browser's page source, as the feedback asks.
 *
 * Browser and window shortcuts (`Ctrl+N`, `O`, `W`, `T`, `R`, `F`) are not in
 * the table on purpose: an app that takes the browser's keys away is an app
 * people close.
 */

/** Where a shortcut applies: anywhere in the open document, or inside an editing surface only. */
export type ShortcutScope = 'workspace' | 'editor';

/** One shortcut: its command, its keys per platform, its scope and its description. */
export interface ShortcutDefinition {
  /** Stable id, e.g. `bold` or `heading1`. */
  readonly id: string;
  /** The dispatcher command id, e.g. `save` or `editor:bold`. */
  readonly command: string;
  /** Key chords on Windows and Linux, e.g. `Ctrl+Shift+Z`. */
  readonly windowsLinux: readonly string[];
  /** Key chords on macOS, spelled with `Meta` for ⌘ and `Alt` for ⌥. */
  readonly mac: readonly string[];
  readonly scope: ShortcutScope;
  /** Whether the browser's own reaction is suppressed when the chord matches. */
  readonly preventBrowserDefault: boolean;
  /** i18n key of the description shown in the shortcuts dialog. */
  readonly descriptionKey: string;
}

/** How modifiers are spelled and which chord list applies. */
export type ShortcutPlatform = 'windows-linux' | 'mac';

function both(keys: string): { windowsLinux: readonly string[]; mac: readonly string[] } {
  return { windowsLinux: [keys], mac: [keys.replace(/^Ctrl/u, 'Meta')] };
}

/** The base set (A10). Order is the order the dialog lists them in. */
export const SHORTCUTS: readonly ShortcutDefinition[] = [
  {
    id: 'save',
    command: 'save',
    ...both('Ctrl+S'),
    scope: 'workspace',
    preventBrowserDefault: true,
    descriptionKey: 'shortcuts.save',
  },
  {
    id: 'print',
    command: 'print',
    ...both('Ctrl+P'),
    scope: 'workspace',
    preventBrowserDefault: true,
    descriptionKey: 'shortcuts.print',
  },
  {
    id: 'undo',
    command: 'editor:undo',
    ...both('Ctrl+Z'),
    scope: 'editor',
    preventBrowserDefault: true,
    descriptionKey: 'shortcuts.undo',
  },
  {
    id: 'redo',
    command: 'editor:redo',
    windowsLinux: ['Ctrl+Y', 'Ctrl+Shift+Z'],
    mac: ['Meta+Shift+Z'],
    scope: 'editor',
    preventBrowserDefault: true,
    descriptionKey: 'shortcuts.redo',
  },
  {
    id: 'bold',
    command: 'editor:bold',
    ...both('Ctrl+B'),
    scope: 'editor',
    preventBrowserDefault: true,
    descriptionKey: 'shortcuts.bold',
  },
  {
    id: 'italic',
    command: 'editor:italic',
    ...both('Ctrl+I'),
    scope: 'editor',
    preventBrowserDefault: true,
    descriptionKey: 'shortcuts.italic',
  },
  {
    id: 'underline',
    command: 'editor:underline',
    ...both('Ctrl+U'),
    scope: 'editor',
    preventBrowserDefault: true,
    descriptionKey: 'shortcuts.underline',
  },
  {
    id: 'link',
    command: 'editor:link',
    ...both('Ctrl+K'),
    scope: 'editor',
    preventBrowserDefault: true,
    descriptionKey: 'shortcuts.link',
  },
  {
    id: 'selectAll',
    command: 'editor:selectAll',
    ...both('Ctrl+A'),
    scope: 'editor',
    preventBrowserDefault: true,
    descriptionKey: 'shortcuts.selectAll',
  },
  {
    // `Ctrl+H` is the replace key of every word processor; caught only inside
    // an editing surface, like `Ctrl+U`, so the browser keeps it elsewhere.
    id: 'find',
    command: 'editor:find',
    windowsLinux: ['Ctrl+H'],
    mac: ['Meta+Alt+F'],
    scope: 'editor',
    preventBrowserDefault: true,
    descriptionKey: 'shortcuts.find',
  },
  {
    id: 'pageBreak',
    command: 'editor:pageBreak',
    ...both('Ctrl+Enter'),
    scope: 'editor',
    preventBrowserDefault: true,
    descriptionKey: 'shortcuts.pageBreak',
  },
  {
    id: 'clearFormatting',
    command: 'editor:clearFormatting',
    ...both('Ctrl+\\'),
    scope: 'editor',
    preventBrowserDefault: true,
    descriptionKey: 'shortcuts.clearFormatting',
  },
  {
    id: 'paragraph',
    command: 'editor:paragraph',
    ...both('Ctrl+Alt+0'),
    scope: 'editor',
    preventBrowserDefault: true,
    descriptionKey: 'shortcuts.paragraph',
  },
  ...([1, 2, 3, 4, 5, 6] as const).map((level): ShortcutDefinition => ({
    id: `heading${level}`,
    command: `editor:heading${level}`,
    ...both(`Ctrl+Alt+${level}`),
    scope: 'editor',
    preventBrowserDefault: true,
    descriptionKey: `shortcuts.heading${level}`,
  })),
];

/** The definition behind a dispatcher command, or `undefined` when it has no key. */
export function shortcutFor(command: string): ShortcutDefinition | undefined {
  return SHORTCUTS.find((definition) => definition.command === command);
}

/** Whether this machine spells modifiers the macOS way. */
export function detectPlatform(
  nav: { platform?: string; userAgentData?: { platform?: string } } = globalThis.navigator ?? {},
): ShortcutPlatform {
  const platform = nav.userAgentData?.platform ?? nav.platform ?? '';
  return /mac|iphone|ipad|ipod/iu.test(platform) ? 'mac' : 'windows-linux';
}

/** A parsed chord: modifiers plus the key the writer presses. */
interface Chord {
  readonly ctrl: boolean;
  readonly meta: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
  readonly key: string;
}

function parseChord(chord: string): Chord {
  const parts = chord.split('+');
  // The key itself is the last part; a literal `+` would need escaping, and
  // no shortcut here uses it.
  const key = parts.pop() ?? '';
  const modifiers = new Set(parts.map((part) => part.toLowerCase()));
  return {
    ctrl: modifiers.has('ctrl'),
    meta: modifiers.has('meta'),
    alt: modifiers.has('alt'),
    shift: modifiers.has('shift'),
    key: key.length === 1 ? key.toLowerCase() : key,
  };
}

/** The keys a definition uses on a platform. */
export function chordsFor(
  definition: ShortcutDefinition,
  platform: ShortcutPlatform,
): readonly string[] {
  return platform === 'mac' ? definition.mac : definition.windowsLinux;
}

/**
 * Whether a keyboard event is one of a definition's chords on the platform.
 *
 * Digits are matched by physical key (`Digit1`) as well, because `Alt`
 * combinations produce other characters on some layouts.
 */
export function matchShortcut(
  event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
  definition: ShortcutDefinition,
  platform: ShortcutPlatform,
): boolean {
  return chordsFor(definition, platform).some((chord) => {
    const wanted = parseChord(chord);
    if (
      wanted.ctrl !== event.ctrlKey ||
      wanted.meta !== event.metaKey ||
      wanted.alt !== event.altKey ||
      wanted.shift !== event.shiftKey
    ) {
      return false;
    }
    const pressed = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (pressed === wanted.key) return true;
    return /^\d$/u.test(wanted.key) && event.code === `Digit${wanted.key}`;
  });
}

/** The first matching definition for an event, within a scope. */
export function findShortcut(
  event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
  platform: ShortcutPlatform,
  scope?: ShortcutScope,
): ShortcutDefinition | undefined {
  return SHORTCUTS.find(
    (definition) =>
      (scope === undefined || definition.scope === scope) &&
      matchShortcut(event, definition, platform),
  );
}

const MAC_GLYPHS: Readonly<Record<string, string>> = {
  Meta: '⌘',
  Alt: '⌥',
  Shift: '⇧',
  Ctrl: '⌃',
  Enter: '↩',
};

/** One chord as people read it: `Ctrl+Shift+Z` here, `⌘⇧Z` on a Mac. */
export function formatChord(chord: string, platform: ShortcutPlatform): string {
  if (platform !== 'mac') return chord;
  return chord
    .split('+')
    .map((part) => MAC_GLYPHS[part] ?? part.toUpperCase())
    .join('');
}

/** Every chord of a definition, formatted and joined for a label. */
export function formatShortcut(definition: ShortcutDefinition, platform: ShortcutPlatform): string {
  return chordsFor(definition, platform)
    .map((chord) => formatChord(chord, platform))
    .join(' / ');
}

/** The label a menu entry or tooltip shows for a command, or `''` without a key. */
export function shortcutLabel(command: string, platform: ShortcutPlatform): string {
  const definition = shortcutFor(command);
  return definition ? formatShortcut(definition, platform) : '';
}
