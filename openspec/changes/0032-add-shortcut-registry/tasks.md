# Tasks: Shortcut registry

- [x] `shortcutRegistry.ts` with the base set, `matchShortcut`, `formatShortcut`, platform
      detection; unit tests.
- [x] `useShortcuts` composable replacing `onShortcut`; editor keys caught in the capture phase of
      the editor root (before ProseMirror's keymap) rather than a Milkdown keymap plugin — one
      listener, no plugin-order dependency.
- [x] Menu shortcut strings and toolbar tooltips from the registry; `ShortcutsDialog` generated.
- [x] Help page "Tastenkürzel" section in `docs/public-site/guides/*` (rendered help).
- [x] FEATURE_LOG, CHANGELOG, `app-shell.md`.
