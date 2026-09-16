# Design: Page numbering

`PageNumberOptions` lives on the document's print options (it is content, not sheet geometry) and
the render plan resolves it into a positioned text block per page, in millimetres, inside the
profile's margins. No CSS counters: the plan already knows Y, and browser support for margin boxes
is uneven.

| Decision                                 | Alternative rejected     | Why                                                                  |
| ---------------------------------------- | ------------------------ | -------------------------------------------------------------------- |
| Rendered by the plan as a block          | CSS `@page` margin boxes | Firefox and Chromium differ; the plan is the single source of truth. |
| Options on the document, not the profile | On the profile           | The same profile serves a one-page and a five-page letter.           |
