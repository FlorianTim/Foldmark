# Assets, signatures and letterhead

## Asset types

- image
- logo
- graphical signature
- background/letterhead

## Import rules

- restrict file types and maximum byte size
- decode images and validate dimensions
- protect against decompression bombs
- SVG is high risk: sanitize or rasterize; reject scripts, external references, event handlers and foreign objects
- strip unnecessary metadata where practical

## Placement

Store placement in physical units: surface/page, x, y, width, optional height, rotation, opacity, layer and fit mode.

## Graphical signature

This is not a qualified electronic signature. The UI must label it as a stored signature image. Support drawing on canvas and importing a local file. Store locally; optional password-based encryption can be a later change.

## Letterhead

Sender profiles may define default logo/background placements. Document-specific overrides must not mutate the sender profile.
