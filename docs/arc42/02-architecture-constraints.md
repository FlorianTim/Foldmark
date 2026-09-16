# Architecture Constraints

## Inherited from the template

| Constraint                                        | Consequence for Foldmark                                                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Vue 3, strict TypeScript, Vite                    | No framework alternatives; strict null checks and no `any`.                                  |
| Ports and adapters                                | The domain imports no framework. `npm run architecture:check` enforces it.                   |
| Static build, no backend                          | Everything runs in the browser. There is no place to put a secret.                           |
| Content-Security-Policy without `'unsafe-inline'` | No injected `<style>` elements; runtime CSS goes through CSSOM. See ADR 0013.                |
| Base dependency set preserved                     | New runtime dependencies need a reason strong enough to survive review. Foldmark added none. |
| German and English complete                       | No user-facing prose below the presentation layer.                                           |
| TSDoc on every exported declaration               | `npm run docs:check` fails otherwise.                                                        |

## Imposed by the problem

| Constraint                            | Consequence                                                                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Browsers own the physical mapping     | Foldmark emits CSS millimetres and `@page` rules; it does not compute pixels. Accuracy therefore also depends on the user's print dialog being at 100 %, which the UI says on every print. |
| PDF generation is the browser's       | "Save as PDF" is a destination in the print dialog. Foldmark ships no PDF library and does not claim PDF fidelity.                                                                         |
| Input arrives as files from strangers | Markdown, YAML front matter, images and backups are all parsed defensively and bounded.                                                                                                    |
| Standards texts are licensed          | DIN-style geometry uses commonly cited working values and is marked unverified until checked against an authorized source.                                                                 |
| IndexedDB is not secure storage       | Any script on the origin can read it. XSS prevention is therefore the control that matters, which is why no HTML is generated at all.                                                      |
