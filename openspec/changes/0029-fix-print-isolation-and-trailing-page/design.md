# Design: Print isolation and page normalisation

| Decision                                                                       | Alternative rejected                             | Why                                                                                                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Print root teleported to `body`; print medium hides `body > :not(.print-root)` | Keep the blacklist and add `.app-menu`           | A blacklist is complete only until the next component. Inverting it — one whitelisted subtree — cannot regress when chrome is added.    |
| The teleport lives in `WorkspacePanel.vue`                                     | A separate `PrintRoot.vue` mounted in `App.vue`  | The paper-mode plan and its asset URLs are the workspace's; moving them to the shell would re-derive state the workspace already holds. |
| `html, body { min-height: 0; height: auto }` on paper                          | Rely on the sheet size alone                     | `min-height: 100vh` on paper is one page tall by definition; with any offset it guarantees a spill.                                     |
| A trailing `::page-break` opens no page                                        | Keep R13-006's "cursor lands on the next sheet"  | Teil A wins over Teil B by the owner's rule; a blank sheet needs an explicit command later, not a side effect of a break.               |
| Normalisation inside `paginateBody`                                            | A `normalizePages()` pass over the finished plan | The plan has one producer; filtering there keeps page indexes, numbers and totals consistent without a second walk.                     |

## Print CSS after the change

```css
@media print {
  html,
  body {
    min-height: 0;
    height: auto;
    margin: 0;
    background: #fff;
  }
  body > :not(.print-root),
  .no-print {
    display: none !important;
  }
  .print-root {
    display: block;
  }
  .print-root .paper {
    box-shadow: none;
    break-after: page;
  }
  .print-root .paper:last-child {
    break-after: auto;
  }
}
```

The Vue `<Teleport to="body">` keeps the print copy reactive; `aria-hidden="true"` stays so the copy
is not read twice by assistive technology. `usePrintPageSize` is unchanged.

## Pagination

`paginateBody` records whether the last emitted block was a break only to decide _not_ to emit a
page. Pages are emitted only for non-empty sources; `buildLetterPages` keeps its `['']` fallback so
a document without a body still has its first sheet with the letterhead blocks.

## Tests

- `tests/renderPlan.test.ts`: the three page-count cases above, plus "break at the very start opens
  nothing".
- `tests/e2e/foldmark.spec.ts`: `page.emulateMedia({ media: 'print' })` — with the Format menu open
  and with the print dialog open, `document.querySelectorAll('body > *')` visible set equals
  `{ .print-root }`, `.print-root .paper` count equals the preview page count.
