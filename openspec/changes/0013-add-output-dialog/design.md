# Design: Output dialog

`ExportDialog.vue` already exists; it grows into the tabbed dialog and takes over the print controls
from `PaperPreview.vue`. Target selection drives `validateForTarget`, so the findings panel moves in
with it.

| Decision                   | Alternative rejected | Why                                                   |
| -------------------------- | -------------------- | ----------------------------------------------------- |
| Findings inside the dialog | Keep the checks pane | The checks are per target; the target is chosen here. |
