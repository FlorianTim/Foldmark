# Tasks: Foldmark MVP

Acceptance criteria from the input material, with their current state.

| #   | Criterion                                                                                            | State                                                            |
| --- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | A user can create a letter in German or English                                                      | done                                                             |
| 2   | The document is saved locally and survives reload                                                    | done                                                             |
| 3   | The document exports and re-imports as Markdown/YAML without material loss                           | done                                                             |
| 4   | A built-in A4 letter profile renders configurable fold and hole marks at stored physical coordinates | done                                                             |
| 5   | Preview zoom does not mutate export geometry                                                         | done — asserted in unit and e2e tests                            |
| 6   | Browser printing produces an A4 page and the UI warns about 100 % scaling                            | done — `@page` written at runtime, reminder is an `info` finding |
| 7   | A local sender profile and recipient address can populate the letter                                 | done                                                             |
| 8   | Validation distinguishes errors, warnings and information for the selected target                    | done                                                             |
| 9   | The privacy center exports and deletes local application data                                        | done — plus a counted inventory and backup import                |
| 10  | Startup causes no intentional third-party network request                                            | done — asserted in e2e                                           |
| 11  | German and English strings exist for all MVP UI                                                      | done — key-set parity asserted                                   |
| 12  | Keyboard operation and contrast meet the accessibility baseline                                      | partial — see below                                              |
| 13  | Tests, lint, typecheck, build, security/privacy/license checks and Git hooks pass                    | done                                                             |
| 14  | OpenSpec, arc42, ADRs and diagrams reflect the implemented product                                   | done                                                             |

## Implemented beyond the MVP list

- A6 duplex postcard with front/back editing and two-page print order.
- Local image library with byte-sniffing import validation and usage-aware deletion.
- Restricted-HTML and plain-text email renderers, `mailto:` with a length guard, `.eml` builder.
- Complete backup export and import, with per-record rejection reporting.
- Print-profile catalogue with per-marker measurements and cloning.

## Open work

| Item                         | Note                                                                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Numeric print-profile editor | Profiles can be inspected, cloned and deleted; editing marker coordinates in the UI is the next slice.                                   |
| Signature capture on canvas  | Signature _images_ can be imported and referenced; drawing one is not implemented.                                                       |
| Accessibility audit          | Keyboard operation and focus order are implemented and the themes were built for contrast, but no formal WCAG 2.2 AA audit has been run. |
| Verify DIN-style geometry    | Requires a licensed copy of the current standard. Until then the profiles stay `draft-unverified`.                                       |
| Connector shells             | The capability model is specified; nothing is implemented.                                                                               |
