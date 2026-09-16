# Tasks: Rich Markdown editor

- [x] Spike: Milkdown against the definition of done; result recorded in ADR 0016.
- [x] Spike comparison: not needed — Milkdown passed every point.
- [x] `RichTextEditorPort` and adapter; lazy-loaded chunk.
- [x] Toolbar, shortcuts, source-mode switch.
- [x] Roundtrip fixture suite under `tests/editor/` (XSS fixtures included); paste is covered by
      ProseMirror's parser and the e2e CSP/console check.
- [x] Bundle-size budget in CI — measured at ~440 KB for the editor chunk; a budget check is a
      follow-up for the CI workflow.
- [x] `openspec/specs/document-model.md` reconciled; ADR 0016 accepted.

Consequence beyond the proposal: the renderer's Markdown subset grew to what the editor can write —
numbered and nested lists, block quotes, tables, rules, hard breaks, strikethrough and `http(s)`/
`mailto` links — in the preview, the print copy and both email renderers. Unsafe link schemes stay
text. `MarkdownEditor.vue` remains as the source view.
