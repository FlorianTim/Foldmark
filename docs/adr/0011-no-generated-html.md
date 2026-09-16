# ADR 0011: Generate no HTML from document text

Date: 2026-09-11

## Status

Accepted; amended 2026-09-13 (change 0016)

## Context

Document bodies are Markdown from untrusted files. The draft material proposed markdown-it for
rendering and DOMPurify for sanitizing. The template already ships a different approach: a small
parser producing a token tree that Vue renders through static templates, with no HTML anywhere.

## Decision

Keep the template's approach and extend it. The parser moved to `src/domain/markdown/` when a second
consumer appeared — the HTML email renderer — so the preview and the sent message cannot disagree
about what a paragraph is. The email renderer walks the same token tree, escapes every text node,
and emits a fixed tag set with no user-controlled attributes.

## Consequences

No sanitizer dependency, and nothing for a sanitizer bypass to bypass: there is no code path from
document text to markup. The Markdown subset is deliberately small — headings, paragraphs, lists,
bold, italic, code; no images, no links, no tables, no raw HTML. Supporting links will mean
extending the parser and the two renderers together, which is the point.

## Amendment (change 0016)

Since 2026-09-13 the parser is remark (`remark-parse`, `remark-gfm`, `remark-directive` through
`unified`), the same library the rich editor uses. That is compatible with this decision because
nothing compiles to HTML: the processor has no compiler, remark hands over a syntax tree, and
`src/domain/markdown/mdastAdapter.ts` turns it into the same bounded block model the renderers walk
through static templates and a fixed tag set. `html` nodes become text there, links keep only vetted
schemes, images keep only local `asset:` ids. The trust boundary moved from "our own parser" to "our
own adapter"; the property — no code path from document text to markup — is unchanged.
