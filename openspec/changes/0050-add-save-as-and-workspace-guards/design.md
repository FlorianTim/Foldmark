# Design: Save as, duplicate, leave guard, context menu

| Decision                                                                                | Alternative rejected                   | Why                                                                                                                                                                             |
| --------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Save as moves the on-screen state to a new record and drops the original's working copy | Keeping the edits in both              | That is what "Save as" means in every desktop app; keeping both silently would leave the original dirty with text the writer believes they saved elsewhere. The dialog says it. |
| One history entry per open document, no router                                          | `vue-router` with `/documents/:id`     | The app has three modes in one view and no deep links by design; one entry gives the back gesture a harmless target without inventing routes.                                   |
| `beforeunload` only while dirty                                                         | Always, or a custom dialog             | Browsers show their own text and ignore a custom one; registering it only when there is something to lose keeps a clean tab silent.                                             |
| The app's own context menu, built on the command dispatcher                             | Native menus through the desktop shell | One implementation for browser and desktop, the same enablement as the menubar; the shell only hides its default menu.                                                          |
| Paste through the Clipboard API, disabled with a hint where unreadable                  | Synthesising a paste event             | `document.execCommand('paste')` is dead; a page reads the clipboard only with permission. Saying "use Ctrl+V" is honest.                                                        |

## Application

- `DocumentService.saveAs(source: FoldmarkDocument, options: { title; folderId? }): Promise<FoldmarkDocument>`
  — pure copy through `duplicateDocument(source, title)` (already exists) with `folderId` applied,
  `createdAt`/`updatedAt` now, stored, then a `manual` checkpoint. The source is the workspace's
  in-memory document, not the stored record.
- `workspaceStore.saveAs(options)`: cancel the autosave timer, call `documents.saveAs(document)`,
  delete the original's working copy (`history.workingCopies.delete(originalId)`), open the new id.
  `workspaceStore.duplicate()`: `save()` then `documents.duplicate(id, copyTitle)` then open.
- `workspaceStore` leave guard: `hasUnsavedWork` = `dirty || pendingEdits`. A small
  `presentation/navigation/leaveGuard.ts` owns the two browser hooks:
  - on `open(id)`: `history.pushState({ foldmark: 'document', id }, '')` once per open;
  - `popstate` with no `foldmark` state while a document is open: `await close()` (which flushes the
    working copy) — the file manager shows;
  - `beforeunload`: registered while `hasUnsavedWork`, removed when it turns false; the handler sets
    `event.returnValue` (the only thing browsers honour);
  - `pagehide`: `flushWorkingCopy()` in addition to `visibilitychange`. The workspace's persisted UI
    state (`localStorage`) already holds the open document id; on load with
    `history.state?.foldmark === 'document'` the document is reopened (forward and reload).
- No new ports; the guard is presentation-only and unit-tested with a fake `window`.

## Presentation

- `SaveAsDialog.vue`: title (≤ 200, required), folder select (existing folder picker from the move
  dialog), the sentence "The original keeps its last saved state.", Save / Cancel. Shortcut `saveAs`
  in the registry (`Ctrl+Shift+S`, `Meta+Shift+S`, scope `workspace`); File menu entries "Save as…"
  and "Duplicate" under "Save".
- `ContextMenu.vue`: a `role="menu"` positioned at the pointer (or at the caret for the context-menu
  key), clamped to the viewport, arrow keys, `Home`/`End`, `Escape`, focus return to the surface;
  entries are dispatcher commands with their enabled/checked state, separators between the groups.
  The rich editor and the Markdown textarea call `preventDefault()` on `contextmenu` and open it
  with the surface as the dispatcher target. Cut/Copy use the surface's own selection; Paste reads
  `navigator.clipboard.readText()` and inserts through the port (`insertText` / `insertMarkdown`);
  "Paste as plain text" strips nothing in the source view and inserts text without marks in the
  visual view.
- Desktop shell (change 0051): `window.__TAURI__` present → the WebView's default context menu is
  disabled globally; nothing else differs.
- i18n de/en for the dialog, the menu entries and the hint.

## Verification

- Unit: `saveAs` copy and checkpoint; leave guard state machine (push once, pop closes, guard added
  and removed with `hasUnsavedWork`, `pagehide` flushes); context-menu keyboard model.
- e2e: Save as journey; back-button journey with `page.goBack()` and the working-copy offer after
  `page.goForward()`; `beforeunload` dialog observed with a dirty document and absent with a clean
  one; right-click menu in both views.
