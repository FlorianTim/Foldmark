# ADR 0019: Formatting through directives and a document theme

Date: 2026-09-13

## Status

Accepted

## Context

A letter needs formatting that Markdown does not define — colour, underline, indentation, a note
box, a signature line, a page break, a local image — and a printed document needs a theme of its own
(font, sizes, palette) that is separate from the app theme (R11-019). The constraints are
non-negotiable: Markdown with YAML front matter stays the canonical format (ADR 0016), no HTML is
ever generated from document text (ADR 0011), nothing is loaded from outside, and a file should
still be useful to `pandoc` without Foldmark.

Two syntax families were compared:

| Level  | `remark-directive` (CommonMark proposal) | Pandoc (`fenced_divs`, `bracketed_spans`)     |
| ------ | ---------------------------------------- | --------------------------------------------- |
| Block  | `:::name{key=value}` … `:::`             | `::: name` or `::: {.name key=value}` … `:::` |
| Leaf   | `::name`                                 | none (`::: {.name}` … `:::`)                  |
| Inline | `:name[text]`, `:name[text]{key=value}`  | `[text]{.name key=value}`                     |

The only maintained remark extension for Pandoc's bracketed spans
(`micromark-extension-bracketed-spans`, `mdast-util-bracketed-spans`, `remark-bracketed-spans-2`,
v1.0.1, 2025) is licensed AGPL-3.0-only and has a single maintainer.
`compliance/license-policy.json` forbids AGPL. `remark-directive` 4 is MIT, maintained by the
unified collective, and already parses the block form Pandoc users write, save for a space after the
fence.

Two things in the draft turned out not to hold: `remark-directive` does not parse `::: name` with a
space, and `:::page-break` without a closing fence is a container that swallows the rest of the
document.

## Decision

1. **`remark-directive` is the canonical syntax.** Inline `:name[text]`, block `:::name{…}` … `:::`
   written without a space after the fence, and `::page-break` (two colons) as the one leaf. The
   parser **reads** the Pandoc spellings too — `[text]{.name}`, `^x^`, `~x~`, `::: name` and the
   closed empty `:::page-break` — and writes only the canonical form. Names are lowercase English
   words joined by hyphens; parameters are attributes (`{key=value}`), never content.
2. **A registry, not a parser change.** `src/domain/markdown/directives.ts` lists every known
   directive with its attribute rules; the editor, the adapter and the renderers consult it. Adding
   a directive is a registry entry, one renderer case per output and three tests. The catalogue is
   deliberately small: `indent`, `align`, `page-break`, `small`, `note`, `signature`; inline colour,
   `highlight`, `u`, `small`, `sup`, `sub`, `date`. Columns, table styling, fonts per span and free
   sizes are not in it.
3. **Unknown never breaks.** An unknown directive is kept in the file unchanged, rendered as its
   plain content without the syntax showing, marked discreetly in the editor, and written back as it
   came. Unknown attributes are ignored, not discarded. An empty text directive (`Betreff:Antrag`)
   is the text it was typed as.
4. **Colours are names; values live in the document theme.** Nineteen base tones with `light-` and
   `dark-` modifiers plus six semantic aliases, each with a screen value and a print value of at
   least 4.5:1 on white. There is no `{rgb=…}`: a colour in a file can therefore never carry CSS,
   the printed result is guaranteed legible, and a letter does not become a word processor.
5. **The document theme travels with the document** (`printOptions.theme`, front matter `theme:`,
   deviations only): local font stacks, body size, leading, paragraph spacing, small size, palette
   overrides and alias targets. The render plan paginates with it; the preview draws screen values,
   the print copy draws print values.
6. **Images are local.** `![alt](asset:<id>){width=60mm}` references the asset library; any other
   image source is inert text in every renderer and in the editor.
7. **Dates are directives.** `:date[YYYY-MM-DD]` replaces the 1.1 `{{date:…}}` token, which is read
   and migrated on load.

## Consequences

- Every output — editor, preview, print copy, HTML and plain-text mail — reads the same registry and
  the same theme, so a directive cannot render in one and vanish in another.
- Foldmark files run through `pandoc` with the block form and the header understood; the inline form
  needs a small Lua filter, which the convention document provides. That is the price of the licence
  decision, and it is a filter, not a fork.
- The strict CSP shapes the implementation: colours are applied through CSSOM variable references
  and data attributes, never through `style` attributes.
- Deviations from the draft brief: `::page-break` instead of `:::page-break`, and fences written
  without a space. Both drafted forms are read.
