# Design: Landscape profiles

| Decision                                                           | Alternative rejected                 | Why                                                                                                                                                                      |
| ------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `turnProfile` in the domain, pure                                  | Swap in the service only             | The panel needs the turned profile to validate before the person clicks; one function serves both and is unit-tested once.                                               |
| Markers and structured regions keep their millimetres when turning | Rotate them with the sheet           | A fold mark is a statement about a sheet in an envelope; rotated it is a different, unverified claim. Keeping and validating is honest; the DIN copy simply cannot turn. |
| `bodyFollowsMargins` with a 0.01 mm tolerance                      | Strict equality (as the service had) | Inch sheets: `279.4 − 25.4 − 25.4` is `228.59999999999997`; US Letter copies never "followed" their margins before, which was a latent bug.                              |
| The three landscape built-ins in the Letters group                 | A new "Landscape" group, or Other    | A free document may take any profile; a letter may need a wide sheet for a table. A group per orientation would split A4 from A4.                                        |
| Portrait / Landscape as radios in the editor                       | A "Turn" button                      | The draft form is submitted as a whole with Save; a button that writes at once would be the one field that does not wait for Save.                                       |

## Domain

`PrintProfile.ts`: `bodyFollowsMargins(profile)`, `turnProfile(profile, orientation, now)`.
`builtInProfiles.ts`: `a4Landscape`, `a5Landscape`, `usLetterLandscape`.

## Application

`PrintProfileService.update` takes `orientation`; the turn is applied before the margins so a body
that follows them is measured against the turned sheet; `save` validates as before.

## Presentation

`PrintProfilePanel`: `draft.orientation`, `ORIENTATIONS`, `turnBlocked` (validation of the turned
profile has an error), the radios with the disabled hint. i18n de/en `profiles.orientation`.
