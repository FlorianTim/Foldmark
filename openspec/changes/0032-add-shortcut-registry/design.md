# Design: Shortcut registry

| Decision                                                        | Alternative rejected       | Why                                                                                                                            |
| --------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Definitions are data in the presentation layer                  | A domain `Shortcut` entity | Keys are UI; nothing in the document model or a use case depends on them.                                                      |
| The editor scope is a capture-phase listener on the editor root | A Milkdown keymap plugin   | The capture listener runs before ProseMirror's keymap without depending on plugin order; one key fires once. (Built this way.) |
| Milkdown's default keys are pre-empted, not replaced            | Keep both                  | The capture listener stops propagation for a matched chord, so Milkdown's `Mod-b` never sees it.                               |
| Platform detection from `navigator.platform` / `userAgentData`  | A setting                  | Nobody wants to choose their keyboard; the display follows the machine, the keys work either way (`ctrlKey                     |     | metaKey`). |

## Data

```ts
export interface ShortcutDefinition {
  readonly id: string; // 'save', 'bold', 'heading1'
  readonly command: string; // dispatcher id: 'save', 'editor:bold'
  readonly windowsLinux: readonly string[]; // ['Ctrl+B']
  readonly mac: readonly string[]; // ['Meta+B']
  readonly scope: 'workspace' | 'editor';
  readonly preventBrowserDefault: boolean;
  readonly descriptionKey: string; // 'shortcuts.bold'
}
```

`matchShortcut(event, definition, platform)` normalises `event.key` (letters lower-case, `Enter`,
`\`) and the modifiers; `formatShortcut` renders `Ctrl+Alt+1` or `⌘⌥1`. Both are pure and tested.

## Wiring

- `useShortcuts(dispatcher, scopeRoot)` — one `keydown` on the workspace root for `workspace`
  entries; it ignores events whose target is inside `.rich-host` for `editor` entries (those the
  keymap handles) but handles them for the Markdown view.
- `MilkdownEditorAdapter` receives `keymap: Record<string, EditorCommand>` in its options and
  registers a `$prose` keymap plugin; the default `Mod-b` / `Mod-i` / `Mod-z` from the presets are
  overridden by registering ours with higher priority.
- The menu definitions read `formatShortcut(byCommand(id))` instead of literals; `ShortcutsDialog`
  iterates the registry.
