# Design: Rich Markdown editor

```
Document.body (Markdown)
      │ loadMarkdown
      ▼
RichTextEditorPort ──── ProseMirror model ──── toolbar / shortcuts
      │ getMarkdown
      ▼
Document.body (Markdown) ──► Document codec ──► RenderPlan ──► Preview / Print / PDF
```

```ts
interface RichTextEditorPort {
  loadMarkdown(markdown: string): Promise<void>;
  getMarkdown(): Promise<string>;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}
```

The preview renders from the codec, never from the editor's DOM. Source mode and visual mode are two
views of the same Markdown string; switching serialises through the port.

| Decision                       | Alternative rejected    | Why                                                                        |
| ------------------------------ | ----------------------- | -------------------------------------------------------------------------- |
| Markdown stays canonical       | ProseMirror JSON        | Files must open anywhere; the format is the product's portability promise. |
| Port with two implementations  | Direct library use      | The spike may change the library; the workspace must not notice.           |
| Dependency behind a lazy chunk | In the main bundle      | The document list and address book should not pay for the editor.          |
| Security review of the library | Trust the release notes | Paste handling and HTML input are the widest new input boundary since 1.0. |

## Risks

Bundle size (ProseMirror + Remark), Markdown normalisation surprises (list markers, emphasis style),
and table roundtrip. Each has a fixture before adoption.
