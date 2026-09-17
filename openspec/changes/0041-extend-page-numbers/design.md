# Design: Page-number extensions

| Decision                                                                      | Alternative rejected                          | Why                                                                                                                                                    |
| ----------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Three optional fields on `PageNumberOptions`, absent = default                | A new options object or a schema version bump | Every stored document and every file parses as before; the codec writes nothing for a default, so an unchanged document encodes byte-identically.      |
| The render plan resolves start, mirroring and the usable wording              | The presentation layer                        | Preview, print copy and PDF read one block: `page`/`total` are already the printed numbers, `align` is already swapped, `pattern` is already vetted.   |
| Mirroring follows the sheet index, the number follows the start offset        | Mirror by the printed number                  | Double-sided printing is a property of the sheets in the printer, not of the numbering; a letter starting at 2 still has its first sheet on the right. |
| `custom` is a format value, the wording a separate field                      | A free-text format that replaces the enum     | The six fixed formats stay translated per UI language; the wording is the writer's text and is not translated.                                         |
| `custom` is excluded from the global defaults (`DEFAULT_PAGE_NUMBER_FORMATS`) | Offer it with an empty wording                | A default without a wording would create documents that print the fallback; the wording belongs to a document.                                         |
| The wording is validated by `isValidPageNumberPattern`, not sanitised         | Strip or repair on read                       | Plain text with two placeholders needs no escaping — no HTML is generated from it (R01-012); a wording without `{page}` is refused, not guessed.       |

## Domain

`FoldmarkDocument.ts`: `PageNumberFormat` gains `custom`; `PAGE_NUMBER_PATTERN_MAX_LENGTH`,
`PAGE_NUMBER_START_MAX`, `PAGE_NUMBER_PAGE_TOKEN`, `PAGE_NUMBER_TOTAL_TOKEN`,
`isValidPageNumberPattern`, `applyPageNumberPattern`; `PageNumberOptions.startAt`,
`mirrorOnEvenPages`, `pattern`. `DocumentSchema.ts` bounds the three.

## Application

`buildRenderPlan.pageNumberBlock`: offset from `startAt`, swap for even sheets, `pattern` only when
usable (`custom` without a usable wording renders as `page-of`). `RenderPlan` block carries
`pattern?`.

## Infrastructure

`MarkdownDocumentCodecImpl`: `writePageNumbers` (deviations only), `readPageNumberExtensions`
(guarded).

## Presentation

`PaperSurface.pageNumberText`: `custom` → `applyPageNumberPattern`. `MetadataForm`: own wording
(only for `custom`, with `aria-invalid` and a hint), first page number, mirroring switch.
`SettingsPanel` uses `DEFAULT_PAGE_NUMBER_FORMATS`. i18n de/en.
