# Proposal: Drawn signatures

Status: Implemented (2026-09-17). Source: roadmap R02-003 ("Signatures can be drawn on a canvas as
well as imported"), open since iteration 2. Priority: Should. Picked because a signature image has
so far needed a scanner or a phone photo and an image editor to cut it out — the one asset every
letter wants was the hardest to make.

## Scope

- **The pad.** Images → "Draw signature" opens a dialog with a 640 × 220 pad (scaled to the dialog,
  backed at the device pixel ratio), a dashed writing line, Undo stroke, Clear, a name and Save.
  Pen, finger and mouse all draw through pointer events with pointer capture and coalesced samples;
  `touch-action: none` keeps a finger from scrolling the page.
- **Geometry first.** Strokes are kept as points in pad pixels (domain: `signatureStrokes.ts`):
  jitter under 0.75 px is dropped, a stroke stops at 4 000 samples, a signature at 200 strokes. Undo
  drops the last stroke. The path is smoothed through midpoints with the samples as control points.
- **The image.** On Save the strokes are cropped to the ink with a 16 px margin and drawn at three
  times the pad scale into a PNG with a transparent background, then imported through
  `AssetService.import` with kind `signature` — the same size, type and decode rules as a file, so a
  drawn signature is a signature asset like an imported one. A success line says where to use it
  (Insert → Image).
- **Not in scope:** pressure-sensitive width, pen colour, an SVG asset (SVG is refused as an asset
  by the security baseline), placing the signature automatically under the closing (a later change
  around `metadata.signatureId`, which the model carries but nothing places yet).

## Acceptance

- Two mouse strokes on the pad enable Save; Undo removes the second; Save stores an asset titled as
  typed with kind `signature`, wider than tall and far smaller than the pad — cropped, not the whole
  rectangle.
- An empty pad cannot be saved; Clear disables Save again.
- The stored PNG decodes through the ordinary probe and shows in the image dialog with its
  dimensions.
