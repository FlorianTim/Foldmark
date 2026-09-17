# Design: Drawn signatures

| Decision                                                    | Alternative rejected                     | Why                                                                                                                                                  |
| ----------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strokes as geometry in the domain, the canvas only draws    | Draw straight into the canvas and export | Undo, crop and bounds become unit tests; the pad and the stored image are the same function of the same points at two scales.                        |
| Through `AssetService.import`, as a PNG blob                | A new "create asset" path                | One set of import rules; the asset is indistinguishable from an imported one, in the library, the backup and the deletion inventory.                 |
| PNG with a transparent background, cropped to the ink       | JPEG, or the pad's full rectangle        | A signature sits over the closing on paper; a white box would cover the signature line, a JPEG has no transparency.                                  |
| Three-fold raster scale                                     | The pad's pixels                         | A 200 px high pad signature printed 15 mm high would be about 340 dpi at 3×, and blurry at 1×.                                                       |
| Pointer events with capture and coalesced samples           | Mouse and touch events                   | One handler for pen, finger and mouse; capture keeps a stroke that leaves the pad; coalesced events keep a fast pen from turning into line segments. |
| A dashed writing line drawn on the pad but not in the image | No line                                  | People sign on a line; the image must not carry it.                                                                                                  |

## Domain

`signatureStrokes.ts`: `StrokePoint`, `Stroke`, the bounds, `appendPoint`, `hasInk`, `inkBounds`,
`cropToInk`, `smoothPath`.

## Presentation

`signatureRaster.ts`: `drawStrokes(context, strokes, {scale, color, penWidth})`,
`rasterizeSignature(strokes, scale)` → PNG blob. `SignatureDialog.vue`: the pad, undo, clear, name,
save. `AssetLibraryPanel`: the button, `onSignatureDrawn` → import as `signature`, the success line.
i18n de/en `assets.signaturePad`; styles `.signature-*`; eslint globals `HTMLCanvasElement`,
`CanvasRenderingContext2D`.
