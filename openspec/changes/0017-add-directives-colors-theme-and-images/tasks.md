# Tasks: Directives, colour palette, document theme, images, Pandoc header

Order followed: a (decision) → b → c → d → e → g → f, `verify` and e2e after each part.

## a) Syntax decision

- [x] Research: `micromark-extension-bracketed-spans` / `mdast-util-bracketed-spans` /
      `remark-bracketed-spans-2` exist (v1.0.1, 2025-06) but are AGPL-3.0-only and single-maintainer
      — forbidden by `compliance/license-policy.json`. `remark-directive` 4.0.0 (MIT, unified
      collective) is canonical. ADR 0019 written.
- [x] Deviation from the draft: `::page-break` (two colons) instead of `:::page-break`, and written
      fences without a space. Both drafted forms are read (`normalizeDirectiveFences`).

## b) Catalogue

- [x] `src/domain/markdown/directives.ts` registry (block: indent, align, page-break, small, note,
      signature; inline: highlight, u, small, sup, sub, date; colours from the palette).
- [x] Editor: `src/infrastructure/editor/foldmarkSyntax.ts` (nodes, marks, views, commands),
      `MilkdownEditorAdapter.ts` (commands, selection state, `selectAll`, tidy).
- [x] Parser: `mdastAdapter.ts`; renderers: `SafeMarkdown.vue`, `SafeInline.ts`,
      `DefaultEmailRenderer.ts` (HTML and plain text); paper CSS in `print.css`, editor CSS in
      `foldmark.css`.
- [x] Tests: `tests/editor/roundtrip.test.ts` (fixtures + command tests), `tests/markdown.test.ts`,
      `tests/email.test.ts`, `tests/security/untrustedInput.test.ts`.
- [x] `:date[…]` replaces `{{date:…}}`; migration in `normalizeSource`, the codec and
      `DocumentService`; `tests/dateToken.test.ts`.

## c) Palette

- [x] `src/domain/document/DocumentTheme.ts`: 19 tones × 3 shades from the Tailwind reference (brown
      from Material), print shades derived by WCAG contrast (≥ 4.5:1, tested), six aliases.
- [x] Toolbar colour panel (swatches per tone, aliases), `--md-color-*` variables on the editor host
      and on each paper surface (`themeVariables.ts`), print copy uses print values (e2e).

## d) Document theme

- [x] `printOptions.theme` (`DocumentThemeSettings`, deviations only), Zod schema, codec `theme:`
      map, `resolveTheme`, `themeDeviations`.
- [x] `textMetricsFor(theme)`; body size, leading, family advance and paragraph gap drive the
      estimate; `RenderPlan.theme`; `PaperSurface` sets font family and sizes from it.
- [x] "Dokumentthema" section in the Document mode (family, sizes, aliases, reset).
- [x] Tests: `tests/documentTheme.test.ts` (page count changes with the font size), e2e.
- [x] Bundled fonts: not shipped — the three local stacks cost nothing; a bundled face would need
      its licence and size justified here first.

## e) Images

- [x] `![alt](asset:<id>){width=60mm}`: adapter (`asset:` only), `remarkFoldmarkSyntax` folds the
      width attribute, `SafeInline` renders from `assetUrls`, missing asset →
      `render.assetMissingInline`, height in `markdownHeightMm` from the asset's aspect ratio.
- [x] Editor image node with node view (object URL from the app, revoked on destroy), picker from
      the asset library with width in mm; remote/data images stay text in the editor too.

## g) Pandoc header

- [x] `lang`/`keywords`/`subject`/`author` canonical, `locale`/`tags` read as aliases; `author`
      derived from the sender snapshot; `papersize`/`geometry` derived from the profile on export
      (`OutputDialog` passes the sheet), carried otherwise.
- [x] Preserved lists of scalars and one-level mappings with typed scalars (`PreservedValue`); flow
      collections drop the key and report `import.flowCollectionDropped`.
- [x] `tests/fixtures/pandoc-example.md`, `tests/pandocFrontMatter.test.ts`; `document-model.md`
      spells out taken over / derived / carried.

## f) Convention

- [x] `docs/template-feedback/2026-09-13-markdown-directive-convention.md` (Foldmark side) and
      `docs/MARKDOWN_DIRECTIVE_CONVENTION.md` drafted in `lumbrecode-engineering` (uncommitted),
      including the Pandoc Lua filter example.
- [x] `docs/template-feedback/2026-09-13-remark-adapter-as-baseline-module.md` for the web-app
      template (library-level improvement).

## Closing

- [x] ADR 0019; ADR 0011 amended; arc42 §5 and §8; specs `document-model.md`, `render-and-print.md`,
      `document-formatting.md`; CHANGELOG; roadmap (R11-019 done, R12-002 part 1 done,
      R12-006…R12-008 new); `drafts/notes/processed.md`.
- [x] Screenshots regenerated; the workspace shot shows the visual editor with a colour and a note
      box.
- [x] `npm run verify`, `npx playwright test --project=chromium`, `npm run screenshots:capture`.
