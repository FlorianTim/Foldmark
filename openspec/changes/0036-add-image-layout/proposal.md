# Proposal: Image alignment and size in the body

Status: Implemented (2026-09-16). Source: owner request of 2026-09-16 ("Bilder im Dokument
zentrieren, links, rechts ausrichten, vergrößern oder verkleinern bzw. auf maximale Seitenbreite").
Roadmap R14-015. Priority P1.

## Scope

- **File format.** The image attribute block after `![alt](asset:id)` takes `width` and `align`:
  `{width=60mm}`, `{width=50%}`, `{width=100%}`, `{align=center}`, `{width=80mm align=right}`.
  `width` is millimetres (5–400, as today) or a percentage of the text width (1–100); `align` is
  `left` (default), `center` or `right`. Order is free; unknown attributes are dropped on write and
  ignored on read. Pandoc reads the same block.
- **Rendering.** An image is a block on its own line: `display: block`, `width` from the attribute
  (mm as before, `%` of the containing block), `margin-inline` per alignment, never wider than the
  text box. The height estimate for pagination follows (`%` → fraction of the box width).
- **Editor.** Selecting an image shows a small floating toolbar under it: align left / centre /
  right, size presets 25 % · 50 % · 75 % · full width, smaller / larger (−/+ 10 mm on a mm width,
  −/+ 10 % on a percentage), and "original size" (no width). The image dialog gets the same
  alignment and a width mode (mm / % / full). The Markdown view writes the attribute block.
- **Renderer parity.** Preview, print copy and the HTML mail render the same alignment and width;
  plain text keeps the alt text.

## Acceptance

- `![](asset:x){width=50% align=center}` prints a centred image half the text width in preview and
  print; the editor shows it centred.
- Select the image, click "right" → the Markdown reads `{… align=right}`; click "full width" →
  `{width=100%}`; "original" → no attribute block.
- A width above the text box is clamped in every renderer; the estimate never pages worse than the
  drawn image.
- Round-trip fixtures for every combination.
