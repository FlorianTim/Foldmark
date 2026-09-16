# Design: Foldmark MVP

## The separation the product rests on

```
Document            what is being said, and to whom
PrintProfile        what the paper looks like
RenderPlan          the two, resolved, in millimetres
ExportTarget        where it is going, which decides what "complete" means
```

Nothing in a document knows a page size; nothing in a profile knows a recipient. That is what lets
one document be a DIN-style letter, a blank A4 page and a PDF attachment without being rewritten,
and it is why the render plan exists as a separate, pure structure rather than as component state.

## Decisions worth recording

| Decision                                         | Alternative rejected                  | Why                                                                                                                                                                                  |
| ------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Millimetres are canonical; CSS `mm` is emitted   | Pixel arithmetic with a DPI constant  | The browser owns the physical mapping. Converting ourselves adds an error source at exactly the point the product is judged.                                                         |
| Zoom is a CSS transform on a parent of the sheet | Recomputing layout per zoom level     | A transform cannot change layout, so the guarantee is structural rather than a thing to remember.                                                                                    |
| Pagination is decided in the plan                | Let CSS reflow the body               | Foldmark draws the marks on sheet two; if the layout engine decided the break, the two would disagree at the first font substitution.                                                |
| A separate print-only DOM in `paper` mode        | Hide guides with a print stylesheet   | Then CSS, not the print profile, decides what prints.                                                                                                                                |
| A bounded YAML-subset parser                     | A general YAML library                | Front matter comes from files users were sent. Anchors, tags and implicit typing are a large behaviour surface; the subset is ~250 readable lines with named refusals. See ADR 0010. |
| No HTML is ever generated from document text     | Generate HTML and sanitize it         | Nothing to sanitize is stronger than sanitized, and it removes a dependency from the trust path. See ADR 0011.                                                                       |
| Built-in profiles are deep-frozen data           | Seed them into IndexedDB on first run | Otherwise "the profile the app shipped" depends on when the browser first opened it.                                                                                                 |
| Recipients are embedded, senders referenced      | Reference both                        | A letter is a historical record; stationery is not.                                                                                                                                  |
| `standardsStatus` is data shown in the UI        | Name the profiles after the standard  | An unverified claim of conformance is the one mistake a print app must not make.                                                                                                     |

## Layering

```
domain          units, ids, documents, profiles, markers, addresses, assets, email rules, findings
application     ports, use cases, render plan, target validation
infrastructure  Dexie, codecs, email renderers, image probe
presentation    Vue components, Pinia workspace/library stores, i18n, styles
app             composition root
```

The domain imports no framework; the application declares ports and imports no Vue or Dexie;
`npm run architecture:check` enforces the direction.

## Trust boundaries

Imported Markdown/YAML, imported images, backup files, IndexedDB records, and anything that reaches
a mail header. Each is parsed rather than cast, bounded rather than trusted, and has a negative test
under `tests/security/`.

## Known deviations from the draft material

| Draft                                      | Implemented                                      | Reason                                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Organization "Lambro Code" / lambrocode.de | LumbreCode / lumbrecode.de                       | `config/template.schema.json` fixes the organization; the two names appear to denote the same organization. Recorded as an open question. |
| `vue-router` routes                        | Shell views in `App.vue`                         | The template ships no router and the base dependency set is preserved. Views map 1:1 to the proposed routes. See ADR 0014.                |
| markdown-it + DOMPurify                    | The template's token parser, moved to the domain | See ADR 0011.                                                                                                                             |
| `yaml` as a runtime dependency             | Purpose-built subset parser                      | See ADR 0010.                                                                                                                             |
| Asset placements in the portable file      | Backup only                                      | They reference bytes local to one browser.                                                                                                |
