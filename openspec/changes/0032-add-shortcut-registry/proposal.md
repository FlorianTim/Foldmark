# Proposal: A central shortcut registry

Status: Implemented (2026-09-16). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Korrekturen_Roadmap_Premium_2026-09-16.md` Teil A, A10.
Roadmap R14-008. Priority P1.

## Problem

Shortcuts are spread over the code: `Ctrl+S`/`Ctrl+P` in `WorkspacePanel.onShortcut`, the editor's
own keymap for bold/italic/undo, hard-coded `shortcut: 'Ctrl+S'` strings in the menu definition, and
a hand-written table in `ShortcutsDialog.vue`. They cannot disagree today only because there are few
of them; A10 asks for one source before more arrive (`Ctrl+\`, `Ctrl+Alt+1…6`, `Ctrl+Enter`).

## Scope

- **Registry** (`src/presentation/shortcuts/shortcutRegistry.ts`): a typed list of
  `{ id, command, windowsLinux, mac, scope, preventBrowserDefault, descriptionKey }`. Scopes:
  `workspace` (save, print, check), `editor` (formatting, headings, page break, clear formatting,
  undo/redo, select all, link).
- **One handler.** A `useShortcuts(dispatcher)` composable installs one `keydown` listener for the
  workspace scope and hands the editor scope to the rich editor as a ProseMirror keymap built from
  the same table; in the Markdown view the editor-scope keys run the source text transforms.
- **Display.** `formatShortcut(definition, platform)` renders `Ctrl+B` / `⌘B` for the menu bar, the
  toolbar tooltips and Help → Shortcuts — all three read the registry, the dialog lists it grouped
  by scope with the platform's spelling.
- **Browser respect.** `Ctrl/Cmd+N`, `O`, `W`, `T`, `R` are never registered; `Ctrl+U` is in the
  editor scope only (the browser's view-source stays outside the editor); `Ctrl+F` is left to the
  browser until the editor has its own find (R12-002).
- **Base set:** save, print, undo, redo (`Ctrl+Y` and `Ctrl+Shift+Z`; `⌘⇧Z`), bold, italic,
  underline, link, select all, page break `Ctrl+Enter`, clear formatting `Ctrl+\`, headings
  `Ctrl+Alt+1…6`, paragraph `Ctrl+Alt+0`.

## Acceptance

- Every key in the table works in the visual editor; the workspace keys work with focus anywhere in
  the workspace; `Ctrl+U` outside the editor opens the browser's source as before.
- The menu, the toolbar tooltips and the shortcuts dialog show the same strings; a unit test derives
  all three from the registry and diffs them.
- On macOS (navigator platform) the strings use `⌘`, `⌥`, `⇧`.
