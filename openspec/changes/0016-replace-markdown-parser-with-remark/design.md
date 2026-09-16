# Design: one dialect, two consumers

```
Markdown source
   │  normalizeSource()          CRLF, `::: name` → `:::name`, `{{date:…}}` → `:date[…]`
   ▼
remark-parse + remark-gfm{singleTilde:false} + remark-directive + remarkFoldmarkSyntax
   │  (remarkPipeline.ts — the same plugin list the Milkdown adapter registers)
   ▼
mdast ──── mdastAdapter.ts ────▶ MarkdownBlock[] / MarkdownInline[]
              │ registry: BLOCK_DIRECTIVES, isKnownInlineDirective (directives.ts)
              │ refusals: html → text, unsafe link → text, non-asset image → text
              ▼
   SafeMarkdown.vue · SafeInline.ts · DefaultEmailRenderer.ts · textMetrics.ts
```

| Decision                                                              | Alternative rejected                     | Why                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep the flat block/inline model as the renderer interface            | Render mdast directly                    | The model is the security boundary of ADR 0011: a closed set of kinds the templates enumerate. mdast is open (any `type`), so a renderer would have to refuse instead of enumerate. |
| `children` on inline containers only when the content is formatted    | Always nested tokens                     | Keeps the existing fixtures and the plain-text consumers untouched; `value` stays the plain text in every case.                                                                     |
| Flatten nested lists into `depth`, keep `start` for ordered lists     | Real nesting in the model                | The renderers already indent by depth; the one thing lost before was the start number of a sliced list, which pagination needs.                                                     |
| Soft line breaks become a space in the adapter                        | Keep remark's `\n`                       | Identical to browser rendering and to the 1.1 parser; the plain-text mail must not break lines mid-paragraph.                                                                       |
| Pagination slices by mdast offsets (`blockSources`), items separately | Keep the line-based `splitParagraphs`    | Same parser, same blocks — by construction. A numbered item sliced alone keeps its number (`3. drei`).                                                                              |
| `remark-directive` is a direct dependency of the app                  | Only inside the editor chunk             | The renderer must read what the editor writes; the parser is now shared code in the main bundle (sizes in `tasks.md`).                                                              |
| The processor has no compiler                                         | `remark-html`/`rehype` for the mail body | No code path from text to markup exists (ADR 0011); the email renderer walks the block model and escapes every text node.                                                           |

## Documented remark deviations from the 1.1 parser

- A table cell without content is one empty text token (unchanged contract, restored in the
  adapter).
- `~single~` tilde is **not** strikethrough (`singleTilde: false`) — it is reserved for subscript.
- Fenced code blocks render as a code-styled paragraph (the 1.1 parser had no notion of them).
- `Betreff:Antrag` is a text directive named `Antrag` to remark; the adapter renders it as the text
  it was typed as.
