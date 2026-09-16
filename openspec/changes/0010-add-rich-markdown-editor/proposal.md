# Proposal: Rich Markdown editor

Status: Implemented (1.1) — spike passed, see ADR 0016

## Motivation

The plain Markdown textarea was the right MVP choice; it is not the product. Letter writers expect a
visual editor with a toolbar, undo/redo and tables, and they expect the source to remain Markdown so
files stay portable.

## Scope

- Replace `MarkdownEditor.vue` with a ProseMirror-based Markdown editor behind a
  `RichTextEditorPort` (ADR 0016), with a switchable Markdown source view (CodeMirror allowed).
- Toolbar: undo, redo, paragraph/heading 1–3, bold, italic, underline (only if it roundtrips
  cleanly), strikethrough, bullet list, numbered list, block quote, link, table, horizontal rule.
- Keyboard shortcuts on both platforms.
- Roundtrip fixtures: paragraphs, blank lines, bold/italic, links, Unicode, lists, nested lists,
  tables, block quotes, rule, line breaks, dangerous HTML, YAML front matter, unknown metadata
  fields.
- Canonical format stays Markdown + YAML front matter; the ProseMirror document exists only while
  editing.

## Spike (definition of done before adoption)

Vue 3 integration; local assets only; no telemetry; no external requests; CSP-clean; compatible
licence; undo/redo; tables; toolbar; shortcuts; Markdown read/write; source mode; roundtrip tests;
XSS tests; safe paste handling; bundle size measured; narrow-screen UX; keyboard and screen-reader
basics.

First candidate **Milkdown**; comparison candidate **Tiptap**. Not preferred: TOAST UI (usage
statistics to Google Analytics unless disabled), BlockNote (Markdown documented as lossy). No move
to AsciiDoc without a new decision.

## Out of scope

- Images, signature, text blocks, templates, table context menus, page break, find/replace (1.2).

## Acceptance

- Every roundtrip fixture is byte-identical or documented as a normalisation.
- ADR 0011 holds: no generated HTML reaches the renderer; the editor's DOM is not the preview.
- The privacy check passes: no new request on first load.
