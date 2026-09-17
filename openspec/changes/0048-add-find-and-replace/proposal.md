# Proposal: Find and replace

Status: Implemented (2026-09-18). Source: roadmap R12-002 ("Editor extensions: … find and replace —
only after the editor is stable"), the last open item of that row after images, page break and
signature line (change 0017) and templates (change 0039). Priority: Could.

## Scope

- **The bar.** Edit → "Find and replace…" (`Ctrl+H`, `⌥⌘F` on macOS, inside an editing surface only)
  opens a bar above the writing area — never a modal, so the text stays visible. Find, previous/next
  (`Enter`, `Shift+Enter`), a counter "2 of 3" or "No match", Match case, Whole word, Replace with,
  Replace, Replace all, Close (`Escape`).
- **Both views.** In the visual editor a match is selected and marked with a highlight (the editor's
  own selection is invisible while the bar has the focus); in the Markdown source it is the
  textarea's selection. Replace acts on the selected match and moves to the next; a first Replace
  without a selected match only selects. Replace all is one step, one undo.
- **Matching.** Plain text, never a pattern: a `(` finds a `(`. Case-insensitive by default; Whole
  word looks at letters, digits and `_` on both sides. Queries are cut at 200 characters. In the
  visual editor a match may span marks (`**Ver**trag` is found by `Vertrag`); it never spans blocks
  or an image.
- **Not in scope:** regular expressions, searching subject, sender or recipient fields, search
  across documents, a search-only shortcut (`Ctrl+F` stays the browser's).

## Acceptance

- Body "Der Vertrag endet. Ein Vertrag beginnt, vertraglich.": `vertrag` counts 3, Whole word 2;
  Replace with "Abo" replaces the selected one and Replace all the remaining; the count says "No
  match" afterwards.
- The same bar over the Markdown source replaces the two "Abo" back; `Escape` closes it, `Ctrl+H` in
  the textarea reopens it.
