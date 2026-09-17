# Proposal: Save as, duplicate from the workspace, leave guard, context menu

Status: Proposed (2026-09-18). Source: owner request 2026-09-18 (`drafts/notes/processed.md`).
Roadmap R17-007…R17-010. Priority: Should (Save as, leave guard), Could (context menu).

## Problem

- The same letter goes to several people. Today the writer duplicates the record in the file
  manager, opens the copy and edits it; from inside the workspace there is no way to keep what is on
  screen under a new name and leave the original as it was.
- The app lives at one URL. A swipe or a mouse-button "back" leaves the site; the working copy is
  written two seconds after the last keystroke and when the tab goes into the background, so the
  last edits are usually there, but the writer lands on a blank browser tab, comes back through
  "forward" and finds the file manager, not the document.
- Cut, copy, paste and the formatting commands are reachable through the menubar and the keyboard
  only; a right-click shows the browser's menu, which knows nothing of the document.

## Scope

- **Save as.** File → "Save as…" (`Ctrl+Shift+S`, `⇧⌘S`) opens a dialog with the title (prefilled
  "Copy of <title>") and the folder. It stores what is on screen — including unsaved edits — as a
  **new** document with its own id, a first checkpoint of origin `manual`, and switches the
  workspace to it. The original keeps its last saved state; its working copy is discarded, and the
  dialog says so in one line. The new document is a full copy: kind, type and details (change 0049),
  profile, sender and recipient snapshots, body, placements, options, tags.
- **Duplicate from the workspace.** File → "Duplicate" saves the open document, duplicates the
  record as the file manager does (change 0024) and opens the copy. The file manager's row action
  stays.
- **Leave guard.** Opening a document pushes one history entry, so the first "back" — gesture, mouse
  button, `Alt+←`, browser button — closes the document to the file manager after writing the
  working copy, and "forward" reopens it with the same working copy offered. Below that entry, while
  the working copy is dirty or the record has unsaved edits, the app registers a `beforeunload`
  guard so the browser asks before the tab is left; a clean state never nags. The working copy is
  also written on `pagehide`, not only on `visibilitychange`. The workspace's mode, open document
  and pane state already survive a reload; the reload lands in the document again with the working
  copy offered.
- **Context menu.** A right-click (and the context-menu key) inside an editing surface opens the
  app's own menu instead of the browser's: Undo, Redo · Cut, Copy, Paste, Paste as plain text ·
  Bold, Italic, Underline, Clear formatting · Link…, Insert date, QR code… Entries go through the
  command dispatcher with the surface as the target, so the same enablement rules apply as in the
  menubar. Paste is offered when the Clipboard API is readable (`navigator.clipboard.readText`
  present and permitted); otherwise the entry reads "Paste — use Ctrl+V" and is disabled, because a
  page cannot read the clipboard on its own in every browser. Outside an editing surface the
  browser's menu stays. On the desktop app (change 0051) the same menu is used; the WebView's
  default menu is suppressed.
- **Not in scope:** a "Save a copy" that stays in the original (that is Duplicate), autosave of the
  record itself, a history stack for the modes, a context menu on the file manager or the contact
  directory (they have row menus).

## Acceptance

- Type into a saved document, File → Save as… "Rechnung Müller": the workspace shows the new
  document with the typed text and status "saved"; the file manager lists both; reopening the
  original shows its last saved text and no working-copy offer.
- File → Duplicate on a dirty document: the original is saved first (status "saved"), a copy "Copy
  of …" opens.
- Open a document, type, press the browser's back button within two seconds: the file manager shows;
  "forward" reopens the document and offers the working copy with the typed text. Press back twice:
  the browser asks whether to leave. With everything saved, back twice leaves without a prompt.
- Right-click in the visual editor on a bold word: the menu shows Bold checked; "Clear formatting"
  removes it; `Escape` closes the menu and returns the focus to the editor; the Markdown source has
  the same menu with the formatting entries disabled, as in the menubar.
