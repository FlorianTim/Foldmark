# Design: Editor convenience commands

Commands are functions over the `RichTextEditorPort` plus the document metadata; they do not know
the editor library. The date command inserts an inline token the codec understands
(`{{date:2026-09-11}}`) rather than formatted text, so locale changes re-render it.

| Decision              | Alternative rejected | Why                                                        |
| --------------------- | -------------------- | ---------------------------------------------------------- |
| ISO token in Markdown | Formatted text       | Locale is a render-time decision; the file stays portable. |
