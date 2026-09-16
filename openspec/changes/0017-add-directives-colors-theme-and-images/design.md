# Design: formatting as data, in three places

```
                      directives.ts (registry)   DocumentTheme.ts (palette, theme)
                                │                         │
        ┌───────────────────────┼─────────────────────────┼────────────────────┐
        ▼                       ▼                         ▼                    ▼
 foldmarkSyntax.ts        mdastAdapter.ts          textMetrics.ts        themeVariables.ts
 (Milkdown nodes/marks)   (block model)            (heights, theme)      (--md-color-*, font)
        │                       │                         │                    │
   editor DOM          SafeMarkdown / SafeInline    buildRenderPlan       PaperSurface / editor host
                       DefaultEmailRenderer         (pagination)          (screen vs. print values)
```

## The three places, and how they stay one

| Concern            | Editor (`foldmarkSyntax.ts`)                                               | Parser (`mdastAdapter.ts`)                               | Renderers                                                                                     |
| ------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Colour             | mark `fmColor{name}`; view sets `color: var(--md-color-name)`              | inline `color{color}` when `isColorName`                 | `<span class="md-color" style="color: var(--md-color-…)">`; mail: inline hex from the palette |
| Fixed inline       | marks `fmHighlight/Underline/Small/Sup/Sub`                                | `highlight/underline/small/sup/sub`                      | `mark/u/small/sup/sub`                                                                        |
| Date               | atom `fmDate{iso}`, shows `formatIsoDate(iso, locale)`                     | `date{value}` (ISO only; else text)                      | `<time datetime>`; mail: formatted text                                                       |
| Block directive    | node `fmBlock{name, attributes JSON}`, classes as on paper                 | `directive{name, known, attributes (validated), blocks}` | `<div class="md-<name> …" data-level>`; mail: fixed inline styles                             |
| Page break         | atom `fmLeaf{page-break}`; cursor moves to the next page                   | `pageBreak`                                              | invisible; `paginateBody` ends the page                                                       |
| Unknown inline     | mark `fmDirective{name, attributes}` — dotted underline                    | `directive{name}` — content only                         | `<span class="md-unknown">` content                                                           |
| Unknown block/leaf | `fmBlock`/`fmLeaf` with the name — dotted border and label                 | `directive{known:false}` — content only                  | `<div class="md-unknown-block">` content                                                      |
| Image              | node `image{src: asset:id, alt, width}`; node view resolves the object URL | `image{assetId, widthMm}` (`asset:` only)                | `<img>` from `assetUrls`, alt text when missing; mail: `[alt]`                                |

The registry is consulted on every side: the editor and the adapter agree on what is _known_ because
both ask `BLOCK_DIRECTIVES` and `isKnownInlineDirective`, and attributes are validated once in
`resolveBlockAttributes`.

## Decisions

| Decision                                                                                        | Alternative rejected                    | Why                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `remark-directive` inline syntax is canonical; Pandoc spellings are read                        | Pandoc bracketed spans canonical        | The only maintained remark extension for `[x]{.cls}` is AGPL-3.0-only (forbidden by `compliance/license-policy.json`) and single-maintainer. ADR 0019.                        |
| `::page-break` (two colons) is the leaf spelling; `:::page-break` and `::: page-break` are read | `:::page-break` alone, as first drafted | In `remark-directive` a three-colon fence without a closing fence swallows the rest of the document. Verified with a probe; the reader rewrites both forms to `::page-break`. |
| Written block fences have no space (`:::note{type="warning"}`)                                  | `::: note{…}` as first drafted          | `remark-directive` parses only the spaceless form; the spaced form is normalised on read. Attribute values are quoted by the serialiser.                                      |
| Colours are palette names; the value lives in the theme, split screen/print                     | `{rgb=…}` attributes                    | Theme binding, guaranteed print contrast, "no Word" (ADR 0019). A colour in a file can therefore never carry CSS.                                                             |
| Colour applied through CSSOM (`el.style.color = var(--md-color-…)`) and data attributes         | `style` attributes in `toDOM`           | The strict CSP (`style-src 'self'`) blocks inline style attributes; CSSOM assignments are allowed. Indent level and signature lines are `data-level` + stylesheet rules.      |
| Theme variables set per surface: screen values on the preview, print values on the print copy   | One value per colour                    | A light yellow that reads on screen vanishes on paper; the print value is derived by contrast (`DocumentTheme.ts`, ≥ 4.5:1).                                                  |
| `theme:` in the front matter keyed by shaded name (`light-red:`)                                | `colors.red.light.print` nesting        | Keeps the map inside the front-matter depth bound of 4.                                                                                                                       |
| Preserved metadata grows to lists of scalars and one-level mappings, scalars keep their type    | Strings only                            | `geometry:` is a list and `lot: true` is a boolean in a Pandoc header; writing them back as strings would change their meaning for Pandoc.                                    |
| Flow collections drop the key and report it (codec passes `onDropped`)                          | Refuse the file (1.1)                   | A Pandoc header with `[a, b]` is common; losing one key beats losing the letter. The parser still refuses by default (ADR 0010); nothing inside the brackets is interpreted.  |
| `papersize`/`geometry` derived from the profile on export, carried but never read               | Read them into a profile                | The profile is the source of the page (ADR 0009); the file only describes it for Pandoc.                                                                                      |
| `author` = sender snapshot name; a file author is kept only while there is no sender            | Always carry the file author            | With a snapshot the carried value would shadow the truth on the next export.                                                                                                  |
| `asset\:id` from the serialiser is tidied to `asset:id`                                         | Accept the escape                       | `remark-directive` escapes a colon before a letter; both spellings parse, the file should carry the plain one. Documented normalisation, unit-tested.                         |
| Legacy `{{date:…}}` migrated on load (`DocumentService`, codec) and in `normalizeSource`        | Read forever                            | A stored 1.1 body renders at once; the next save writes the directive; nothing writes the old token again.                                                                    |
| No image bytes in mail                                                                          | Inline base64 `<img>`                   | The mail renderer has no asset access by design; the alt text stands in, the PDF attachment carries the picture.                                                              |

## Height estimate for the catalogue

`markdownHeightMm` walks the parsed blocks: indent narrows the box by `8 mm × level`, a note box
adds 1.2 lines, a signature adds `lines + 1` lines, `small` measures at the theme's small size, an
image adds `width × (heightPx / widthPx)` when the asset is known and `width × 0.75` otherwise, a
page break is 0. The paragraph gap is the theme's `paragraphSpacing` in lines and is set on the
paper as `--md-paragraph-gap` in millimetres, so the browser draws the gap the estimate assumed.
