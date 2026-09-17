# Design: Calibration sheet

| Decision                                                              | Alternative rejected                       | Why                                                                                                                                               |
| --------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A `RenderPage` built in the application layer (`calibrationSheet.ts`) | A dedicated Vue component with its own CSS | The same `PaperSurface`, the same millimetre positioning and the same print copy: a frame that prints true here proves the fold marks print true. |
| The frame and ticks as `custom` markers                               | An SVG ruler                               | Markers are what the profile editor lists and what the print copy already draws; nothing new to isolate or to keep out of the app theme.          |
| Wording handed in by the caller                                       | i18n in the application layer              | The application layer has no language (architecture rule); the panel words the sheet and the sheet carries plain text and Markdown only.          |
| Print root mounted only while printing                                | Always mounted, hidden                     | The profile view is the only view without a document print root, but a second `.print-root` on the page would print twice; a scoped one cannot.   |
| Ticks measured from the frame corner, not the paper edge              | From the paper edge                        | A ruler is laid along the printed line, not the paper edge; "0 at the corner, 100 at the label" is what a person actually does.                   |

## Application

`calibrationSheet.ts`: `CALIBRATION_INSET_MM`, `CalibrationWording`,
`calibrationMarkers(width, height)`, `buildCalibrationPage(profile, wording)`. The profile's marks
come from `markersFor(profile, 'front', 'print')` — the print copy's filter.

## Presentation

`PrintProfilePanel`: `calibrationPage` (computed from the selected profile and the UI language), a
scaled on-screen preview (`.calibration-preview`, transform-scaled so the millimetres are the real
ones), `printCalibrationSheet` → `printPage` with a pseudo document for the title, a teleported
`.print-root` while `printingCalibration` is set, `usePrintPageSize` bound to the same flag. i18n
de/en under `profiles.calibration`.
