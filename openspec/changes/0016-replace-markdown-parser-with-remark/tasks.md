# Tasks: Replace the hand-written Markdown parser with remark

- [x] `remark-parse` 11.0.0, `remark-gfm` 4.0.1, `unified` 11.0.5, `remark-directive` 4.0.0 pinned
      as direct dependencies (all MIT); `@types/mdast` 4.0.4 as a dev dependency. Licence check and
      third-party notices regenerated; dependency review updated.
- [x] `src/domain/markdown/remarkPipeline.ts`: the plugin list, `normalizeDirectiveFences`,
      `remarkFoldmarkSyntax` (Pandoc spellings, image attributes), `parseToMdast`.
- [x] `src/domain/markdown/mdastAdapter.ts`: mdast → block model, configured by the directive
      registry; refusals for html, unsafe links, non-asset images, depth bounds.
- [x] `src/domain/markdown/parseMarkdown.ts`: public API (`parseMarkdown`, `parseInlineMarkdown`,
      `normalizeSource`, `blockSources`, `isPageBreakSource`).
- [x] `textMetrics.ts`: block-based height estimate on the parsed model; `splitParagraphs` delegates
      to `blockSources`.
- [x] Renderers (`SafeInline.ts`, `SafeMarkdown.vue`, `DefaultEmailRenderer.ts`) walk `children` of
      nested container tokens and honour `start` on ordered lists.
- [x] `tests/markdown.test.ts` kept as the contract (three expectations updated and documented: soft
      breaks, empty cells, list slices); `tests/renderPlan.test.ts` compares slice count and block
      count; parser cases in `tests/security/untrustedInput.test.ts`.
- [x] ADR 0011 amended (an AST library is compatible because nothing compiles to HTML); arc42 §5 and
      §8; `document-model.md`.

## Bundle size

Measured with `npm run build` (Vite 8, minified; gzip in brackets).

| Chunk                              | 1.1 (change 0010, ADR 0016) | After 0016/0017                                                                       |
| ---------------------------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| Editor chunk (`MilkdownEditor…js`) | ≈ 440 kB                    | 357.0 kB (108.5 kB)                                                                   |
| Main bundle (`index-…js`)          | without remark              | 696.7 kB (217.7 kB)                                                                   |
| remark stack, measured standalone  | editor chunk only           | 124.8 kB (37.5 kB) in the main bundle, of which `remark-directive` 6.8 kB gzip is new |

The remark stack moved from the lazily loaded editor chunk into the main bundle because the preview,
the print copy and the email renderers now parse with it; the editor chunk shrank by the same
amount. `remark-directive` is the only code the app did not ship before. The `MilkdownEditorAdapter`
chunk stays lazy.
