# The template's Markdown parser should be a remark adapter, not a hand-written subset

- **Date:** 2026-09-13
- **Area:** Web app template (library)
- **Severity:** `improvement`
- **Template version:** 1.0.0
- **Concrete app:** Foldmark 1.2 (change 0016)
- **Status:** implemented in Foldmark; proposed for the template

## Observed

The template ships `src/presentation/markdown/parseMarkdown.ts`, a hand-written parser of a small
Markdown subset rendered through static Vue templates (the approach ADR 0011 keeps). Foldmark grew
it through three changes (0010, 0011, 0017) and each time had to mirror by hand what the rich
editor's remark parser already knew — soft breaks, nested lists, tables, hard breaks, and finally
directives. Two parsers that must agree agree only by test.

## Proposal

Replace the parser with an **adapter from mdast to the same bounded block model**:

- `remarkPipeline.ts`: `unified().use(remarkParse).use(remarkGfm, { singleTilde: false })` plus
  optional plugins, **no compiler** — the processor cannot produce HTML, which keeps ADR 0011
  intact.
- `mdastAdapter.ts`: mdast → `MarkdownBlock[]`/`MarkdownInline[]`, framework-free, configured by
  data (`AdapterConfig`: which directives are known, which inline names are colours). Refusals live
  here: `html` → text, links keep only vetted schemes, images keep only local ids, heading levels
  and quote depth bounded.
- The block model keeps `value` as plain text on every inline token and adds `children` only for
  nested formatting, so existing fixtures and plain-text consumers stay valid.

Cost: `remark-parse` 11 + `remark-gfm` 4 + `unified` 11 ≈ 118 kB minified / 31 kB gzip in the main
bundle (a Todo demo without a rich editor pays this newly; an app with the Milkdown editor already
ships it and merely moves it out of the lazy chunk). Foldmark's numbers are in
`openspec/changes/0016-replace-markdown-parser-with-remark/tasks.md`.

Dependencies to pin: `remark-parse` 11.0.0, `remark-gfm` 4.0.1, `unified` 11.0.5, `@types/mdast`
4.0.4 (all MIT). Optional: `remark-directive` 4.0.0 when the app adopts the directive convention
(companion note `2026-09-13-markdown-directive-convention.md`).

## Security implications

None negative: the adapter is the new trust boundary and enumerates what it emits; the tests in
`tests/security/untrustedInput.test.ts` (HTML, unsafe links, remote images, hostile attributes)
transfer unchanged. `eslint-plugin-no-unsanitized` still finds no sink.

## Verification

Foldmark's `tests/markdown.test.ts` kept its contract with three documented deviations (soft breaks,
empty cells, list slices); `npm run verify` and the e2e suite are green.
