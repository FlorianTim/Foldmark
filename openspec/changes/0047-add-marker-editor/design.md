# Design: Numeric marker editor

| Decision                                                    | Alternative rejected                | Why                                                                                                                                                    |
| ----------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pure list operations in the domain (`markerEditing.ts`)     | Mutating the draft in the component | Replace, remove, move, turn and length are unit tests; the component only binds inputs to them.                                                        |
| A draft with live validation of the would-be profile        | Validate on save only               | The person sees "outside the page" while typing 500, not after a refused save; the same `validateProfile` runs on the draft and on the stored profile. |
| `updateMarkers(id, markers)` as one service method          | Extending `update` with `markers`   | Marks are saved as a list, in one write, with the claims derived from them; margins and name have their own form and their own Save.                   |
| Fold and bleed claims follow the marks                      | Checkboxes for the claims           | A claim that disagrees with the marks is exactly the warning the validator raises; deriving it removes the way to produce it.                          |
| A line's length lives on its axis (`widthMm` or `heightMm`) | A separate `lengthMm`               | The marker model and `markerBounds` already read it that way; `withOrientation` moves it across when the line turns.                                   |
| Ids `<kind>-<n>`, never typed                               | A free id field                     | An id is a key, not a label; the label field is for words. `freeMarkerId` keeps them unique per list.                                                  |

## Domain

`markerEditing.ts`: `EDITABLE_MARKER_KINDS`, `MARKERS_MAX`, `isRegionKind`, `freeMarkerId`,
`newMarker`, `withMarker`, `withoutMarker`, `moveMarker`, `withOrientation`, `lineLength`,
`withLineLength`, `capabilitiesFor`.

## Application

`PrintProfileService.updateMarkers(id, markers)`: bound, unlock, derive the claims, `save` (schema
and geometry check).

## Presentation

`MarkerEditor.vue` (draft, rows, add, issues, save/discard) mounted by `PrintProfilePanel` for own
profiles; `saveMarkers` in the panel. i18n de/en `profiles.markerEditor`; styles `.marker-editor-*`;
`data-testid="print-profile"` on the document's profile select for the e2e test.
