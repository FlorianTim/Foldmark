# Proposal: Directives, colour palette, document theme, images and a Pandoc-compatible header

Status: Implemented (2026-09-13, uncommitted on `main`); the format decisions are recorded in
ADR 0019.

## Motivation

A letter needs a few things Markdown cannot say: a coloured or underlined word, an indented
paragraph, a note box, a signature line, a page break, a picture from the local library. The 1.1
editor offered none of them, and the only way to get a date rendered per locale was a private
`{{date:…}}` token that no other reader understands. At the same time the printed document has no
theme of its own — font, size and leading are hard-coded — although roadmap R11-019 promised the
split from the app theme.

All of this has to stay inside the portable format: Markdown with YAML front matter, readable and
editable without Foldmark, and ideally usable by `pandoc` unchanged.

## Scope

- **Directive syntax** (`remark-directive`): `:name[…]` inline, `:::name{…}` … `:::` around blocks,
  `::page-break` as the one leaf. The Pandoc inline spelling `[…]{.name}`, `^x^`, `~x~` and the
  fence-with-space `::: name` are **read**; only the canonical spelling is written.
- **Catalogue** (registry in `src/domain/markdown/directives.ts`): block `indent{level}`,
  `align{to}`, `page-break`, `small`, `note{type}`, `signature{lines}`; inline colour names,
  `highlight`, `u`, `small`, `sup`, `sub`, `date`. Unknown directives are kept, marked and rendered
  as their content — never an error.
- **Palette**: 19 base tones (`red` … `rose`, `gray`, `brown`) × `light-`/`dark-` modifiers, six
  semantic aliases (`success`, `warning`, `danger`, `info`, `muted`, `highlight`), each with a
  screen and a print value (≥ 4.5:1 on white). No free colour values.
- **Document theme** (`printOptions.theme`, front matter `theme:`): font family (local stacks), body
  size, line height, paragraph spacing, small size, palette overrides and alias targets. Defaults
  equal today's rendering; only deviations are written. Pagination follows the theme.
- **Images**: `![alt](asset:<id>){width=60mm}` — local assets only; editor picker from the asset
  library; missing assets are reported inline; the height counts in the estimate.
- **`:date[YYYY-MM-DD]`** replaces `{{date:…}}`; the old token is read and migrated on load.
- **Pandoc header**: `lang`, `keywords`, `subject`, `author` canonical; `locale`/`tags` read as
  aliases; `papersize`/`geometry` derived from the print profile on export and carried, never read;
  unknown lists of scalars and one-level mappings preserved; flow collections drop the affected key
  with a report instead of refusing the file.
- **Editor**: Milkdown nodes/marks for every directive, colour picker, layout menu, page break,
  image picker; theme section in the Document mode.
- **Convention** for all LumbreCode apps:
  `docs/template-feedback/2026-09-13-markdown-directive-convention.md` and a draft standard in the
  engineering repository.

## Out of scope (ADR 0019)

- Free colour values (`{rgb=…}`), fonts per text span, free sizes, columns, table styling.
- Signature _images_ inside the body (the signature block is a line for a handwritten signature; the
  stored signature image keeps its own placement).
- A Pandoc filter shipped with Foldmark (an example lives in the convention document).

## Acceptance

- Every directive has its three places (editor node/mark, parser, renderers) and three tests
  (`tests/editor/roundtrip.test.ts`, `tests/markdown.test.ts`, renderer tests) plus a security
  fixture in `tests/security/`.
- `tests/documentTheme.test.ts`: every print value ≥ 4.5:1; page count changes with the font size.
- `tests/pandocFrontMatter.test.ts`: the fixture `tests/fixtures/pandoc-example.md` loses nothing
  preservable and is written back with the page derived from the profile.
- `npm run verify`, `npx playwright test --project=chromium`, `npm run screenshots:capture` green.
