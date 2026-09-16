# ADR 0012: Make millimetres the domain unit and emit CSS millimetres

Date: 2026-09-11

## Status

Accepted

## Context

Every promise Foldmark makes is physical. Any conversion the app performs itself — to pixels, via an
assumed DPI — introduces an error exactly where the product is judged, and a rounding difference
between the preview and the export would be invisible until the paper came out.

## Decision

Millimetres are the canonical unit in the domain, validated finite and bounded. The renderer emits
CSS `mm` lengths and a runtime `@page { size }` rule, so the _browser_ performs the physical
mapping. Points exist only inside a hypothetical PDF adapter. Screen zoom is a CSS `transform`
applied to a parent of the sheet, never a recomputation of the layout.

## Consequences

Accuracy depends on the browser and on the user's print dialog being at 100 %, which the app states
on every print path and in the preview. In return, the geometry the domain calculated is the
geometry the printer receives, and a unit test comparing millimetre values is a meaningful test of
physical output.
