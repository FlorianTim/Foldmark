# Design: Drag-and-drop document import

| Decision                                                        | Alternative rejected                         | Why                                                                                                         |
| --------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| One `ImportPreviewDialog` for button and drop                   | Drop imports directly, button keeps its flow | Two paths drift; A14 asks for a preview before persisting either way.                                       |
| The preview is computed from the decoded document, not the file | A second parser for the preview              | `services.documents.decode` already returns the document plus issues; the preview is a view of that result. |
| Drop handling on the panel root with a counter for enter/leave  | `dragover` on the table only                 | Nested elements fire enter/leave pairs; a counter keeps the overlay stable.                                 |
| Type check by extension and by sniffing the first bytes         | Trust `file.type`                            | Browsers report `text/markdown` inconsistently; a UTF-8 text check is cheap.                                |

`DocumentListPanel.vue`: `dragging` counter, `onDrop(files)` → queue; `ImportPreviewDialog.vue`
takes `{ file, result }` and emits `import` / `skip`; the queue advances per decision. The stored
import keeps the `imported` checkpoint from change 0024. i18n keys under `documents.import.*`.
