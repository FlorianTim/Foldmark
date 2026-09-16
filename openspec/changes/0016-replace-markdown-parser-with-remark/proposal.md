# Proposal: Replace the hand-written Markdown parser with remark

Status: Implemented (2026-09-13, uncommitted on `main`)

## Motivation

Foldmark 1.1 has two Markdown parsers that must agree: the rich editor parses with remark (inside
Milkdown, ADR 0016) and the preview, the print copy and the email renderers parse with the
hand-written subset parser in `src/domain/markdown/parseMarkdown.ts`. They agreed on the 1.1 subset
by test, not by construction, and every addition to the syntax — the directives, colours and images
of change 0017 — would have had to be implemented twice.

## Scope

- `parseMarkdown` becomes an **adapter from mdast to the existing block model**. Parsing is done by
  `remark-parse` 11, `remark-gfm` 4 (double tilde only) and `remark-directive` 4 through `unified`
  11, all of which the editor already ships. The block and inline model stays the interface to
  `SafeMarkdown.vue`, `SafeInline.ts`, `DefaultEmailRenderer.ts` and `textMetrics.ts`.
- The adapter (`mdastAdapter.ts`) is framework-free and configured by data (the directive registry
  and the palette predicate), so it can be lifted into a shared LumbreCode module unchanged.
- Security stays at the adapter: `html` nodes become text, links keep only `http`, `https` and
  `mailto`, any image that is not a local `asset:` id stays text, heading and quote depth stay
  bounded.
- Pagination slices the body at the parser's own block boundaries (`blockSources`), so the height
  estimate and the drawing can no longer disagree about where a block starts.

## Out of scope

- HTML output of any kind (ADR 0011 holds; the processor has no compiler).
- A change of the canonical format: the file stays Markdown with YAML front matter (ADR 0016).

## Acceptance

- `tests/markdown.test.ts` stays the contract; every remark deviation is documented there rather
  than patched around.
- `tests/renderPlan.test.ts` compares the pagination slices with the parser's block count.
- `tests/security/untrustedInput.test.ts` covers the parser's refusals.
- Bundle sizes before and after are recorded in `tasks.md`.
