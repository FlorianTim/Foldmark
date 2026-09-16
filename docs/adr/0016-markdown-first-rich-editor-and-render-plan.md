# ADR 0016: Markdown-first rich editor; the render plan stays the only renderer input

Date: 2026-09-11

## Status

Accepted (2026-09-11). The spike in change 0010 evaluated Milkdown 7.22 (`@milkdown/kit`, MIT)
against the definition of done: Vue 3 integration, local assets, no telemetry and no request at
runtime (privacy check and e2e), clean under the production CSP (`style-src 'self'`), undo/redo, GFM
tables, toolbar and keymaps, Markdown read/write through the port, a source view, 15 round-trip
fixtures with two documented normalisations (rule as `***`, hard break as `\`), raw HTML rendered as
text, paste through ProseMirror's parser, a lazily loaded chunk of about 440 KB, keyboard and
screen-reader basics (contenteditable, labelled toolbar). Tiptap was not needed as a fallback.

## Context

Foldmark 1.0 edits the body in a plain Markdown textarea and renders it through a bounded, non-HTML
Markdown subset (ADR 0011) into a pure render plan (ADR 0009). The post-1.0 feedback asks for a
visual editor with toolbar, undo/redo and tables, and for a paginated preview with page numbers,
fold marks and guides that matches print and PDF page for page.

Two pressures pull in opposite directions: a rich editor wants a structured document model in the
browser, while the product's portability promise is that a document is a Markdown file with YAML
front matter that opens anywhere.

## Decision

Foldmark stays Markdown-first. The visual editor is a Markdown-capable, ProseMirror-based editor
behind a `RichTextEditorPort`; source and visual editing are two views of the same logical document,
and the Markdown string is what is stored, exported, checkpointed and rendered. The print preview is
a separate renderer fed by the render plan — never the rich-text editor's DOM.

```
Document data
      │
      ├── Rich editor          (ProseMirror model, exists only while editing)
      ├── Markdown source      (CodeMirror or textarea)
      └── Document codec
              │
              ▼
          RenderPlan   ← PrintProfile + PageNumberOptions + marker visibility
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
   Preview   Print    PDF
```

The candidate order for the editor library is Milkdown, then Tiptap; TOAST UI and BlockNote are not
preferred (telemetry default, lossy Markdown); a move to AsciiDoc is out without a new decision.

## Consequences

- ADR 0011 keeps holding: the editor's HTML never reaches a renderer, so the preview is not a new
  HTML trust boundary. The editor's paste and HTML input handling is a new boundary and gets
  security tests of its own.
- Roundtrip fidelity becomes a tested property with fixtures, not a hope; Markdown normalisation by
  the editor (list markers, emphasis style) is documented where it is accepted.
- Pagination, page numbers and marker visibility are plan concerns, which is what lets the preview,
  the print copy and the PDF agree — Foldmark owns the page break, not the browser.
- The editor dependency is loaded lazily; the document list and address book do not pay for it.
