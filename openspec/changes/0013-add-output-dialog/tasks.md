# Tasks: Output dialog

- [x] Tabbed dialog with focus trap and Escape.
- [x] Move print controls and target validation into it.
- [x] Remove the permanent output pane from the workspace (change 0005).
- [x] e2e journeys for print, Markdown export and email hand-off through the dialog.

Implemented together with change 0005: `ExportDialog.vue` became `OutputDialog.vue`, a native
`<dialog>` with the tabs Print / Export / Email and the validation panel inside.
