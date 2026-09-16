# "Replace the demo" has no guidance for its CSS, and renaming leaves wrong rules behind

- **Date:** 2026-09-11
- **Area:** Web app template
- **Template version:** 1.0.0
- **Concrete app:** Foldmark 0.1.0
- **Severity:** `friction`
- **Status:** resolved here by splitting the stylesheet

## Observed

`docs/development/TEMPLATE_INITIALIZATION.md` classifies every path under `src/` as keep, adapt or
replace, which is genuinely useful. `src/styles/app.css` is classified **keep**.

But `app.css` is not uniformly shell: it mixes shell rules (`.topbar`, `.panel`, `.privacy-card`,
`.sr-only`) with demo layout (`.todo-form`, `.todo-list`, `.todo-row`, `.todo-label`). Following
"keep", the demo rules stay as dead CSS. Renaming them to the new app's class names — the seemingly
tidier option, and the one taken here first — is worse: `.todo-form` is
`display: grid; grid-template-columns: 1fr auto`, correct for an input plus a button and wrong for a
row of buttons. The result was a button row where every other button was stretched, and the cause
was a rule nobody had written for that element.

## Root cause

The keep/adapt/replace table works at file granularity. One file in `src/styles/` contains both
categories, and the table has no way to say so.

## Resolution here

- Shell rules stay in `app.css` unchanged.
- Demo-specific layout rules were deleted by name.
- Foldmark's own screens live in a new `src/styles/foldmark.css`, with `print.css` for the sheet.

Splitting rather than editing also means a later template update to `app.css` merges cleanly,
because the app never touched the parts it inherited.

## Proposed template change

Either:

1. Split the template's own `app.css` into `app.css` (shell) and `demo.css` (Todo), classify the
   second as **replace**, and let a derived app delete one file; or
2. Add a row to the initialization table stating that `src/styles/app.css` is keep-with-exceptions
   and naming the demo selectors, with the advice to add a new stylesheet rather than edit the
   inherited one.

Option 1 is cleaner and matches how the table treats every other demo file.
