# Design: QR codes

| Decision                                                                      | Alternative rejected                               | Why                                                                                                                                                                       |
| ----------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A leaf directive whose **label** is the payload                               | A generated PNG in the asset library               | A code is a function of its text: no bytes to store, back up or lose; vector on paper; readable in any Markdown viewer as the address it encodes.                         |
| The label is read **literally from the source** (positions), escapes resolved | Escape every Markdown-special character on write   | `mailto:info@…` would parse as a directive and `a*b*` as emphasis, silently changing the code; a literal reader keeps the file clean and the payload exact.               |
| Encoder in the domain (`src/domain/qr/qrCode.ts`) around `uqr`                | An application port with an infrastructure adapter | Encoding is pure arithmetic the renderer needs synchronously while drawing; remark already lives in the domain under the same rule. The wrapper keeps `uqr` out of views. |
| The SVG is built from a path string of digits and letters                     | `uqr`'s `renderSVG` string via `innerHTML`         | ADR 0011: no generated markup. `createElementNS` in the editor, a template in Vue; the payload reaches no attribute but its own `data-` copy and the accessible name.     |
| `size` includes the quiet zone                                                | Quiet zone as margin outside the box               | What the writer sets is what the ruler measures; the next paragraph cannot eat the zone a scanner needs.                                                                  |
| Black on white regardless of theme                                            | `currentColor`                                     | Contrast is a scanning requirement, not a style; a coloured document text would print a coloured code.                                                                    |
| The gate and the counter in `QrCodeService.generate`                          | A count in the dialog                              | C12: a disabled button is not a control; the counter moves after every check passed, so a refused payload never uses an allowance.                                        |
| Counters behind a `FeatureUsageStore` port, backed by a preference            | A Dexie table                                      | A counter is a preference of this browser (stated as editable, C11); the settings registry already has reset, diagnostics and the entitlement cache next to it.           |

## Domain

`directives.ts`: attribute kind `length` (millimetres, `30mm` or `30`), `QR_SIZE_MM`, the `qr`
entry, `parseLengthMm`, `unescapeDirectiveLabel`. `mdastAdapter.ts`: block kind `qr`
`{ payload, sizeMm, align, errorCorrection }`. `remarkPipeline.ts`: `literalQrLabel` — the leaf's
children are replaced by one text node sliced from the source (the file value), so both parsers
(renderer, editor) see the same payload; `parseToMdast` passes the source as the file.

`src/domain/qr/qrCode.ts`: `validateQrPayload` (empty, too long, line breaks, control characters),
`encodeQrMatrix` (never throws), `qrModulePath` (runs merged per row), `qrViewBoxSize`,
`qrModuleSizeMm`, `qrPrintQuality` (0.5 mm), `composeQrPayload` / `decomposeQrPayload` (url, email,
phone, text), `serializeQrDirective` (escapes `\`, `[`, `]`).

## Application

`FeatureUsageStore` port (`read`, `increment`); `QrCodeService` (`state`, `prepare`, `generate`).
`textMetrics.ts`: a `qr` block is `min(size, width)` high.

## Infrastructure

`foldmarkSyntax.ts`: `qrNode` (`fmQr`, block atom, selectable, draggable), `qrView` (SVG by
`createElementNS`, redrawn on update), `insertQrCommand` (after the current top-level block, like
the page break), `setQrCommand` (selected node only). The leaf-directive node no longer matches
`qr`. `MilkdownEditorAdapter`: commands `qr` / `qrUpdate`, `selectionState().qr`, `selectQr`.
`DefaultEmailRenderer`: payload as text / escaped `<p>`.

## Presentation

`QrCodeFigure.vue` (shared by preview and print copy through `SafeMarkdown`), `QrCodeDialog.vue`,
`QrToolbar.vue`; `RichTextEditor.vue` wires the toolbar button, the Insert menu (`editor:qr`, which
replaces the disabled placeholder), the strip and the source-view insertion. Settings registry:
`premiumUsage`. Styles in `print.css` (`.md-qr`, alignment, placeholder) and `foldmark.css` (editor
node, dialog layout). i18n de/en under `editor.qr*`, `render.qrCode`, `premium.qr.*`.
