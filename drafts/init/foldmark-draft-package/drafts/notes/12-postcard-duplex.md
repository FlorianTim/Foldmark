# Postcard and duplex printing

## A6 landscape working layout

### Front

- image/background or free layout
- optional safe area and bleed
- optional caption

### Back

- left message region
- vertical separator
- right postal-address region
- top-right stamp region
- optional sender line

## Duplex model

A profile defines front and back surfaces plus recommended flip mode (`long-edge` or `short-edge`). Export should show a print-order explanation and allow a calibration sheet.

## Acceptance ideas

- Preview front and back separately.
- Export exactly two PDF pages in documented order.
- Validate address and stamp regions.
- Do not print preview-only safe areas unless selected.
- Support image cover/contain/crop settings.
- Warn when image resolution is low for target physical size.
