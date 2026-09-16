# A string `ref` inside `v-for` hands back an array, and nothing warns

- **Date:** 2026-09-16
- **Area:** Web app template — lint rules / component guidance
- **Template version:** 1.0.0
- **Concrete app:** Foldmark 1.0.0 (change 0030)
- **Severity:** `defect`
- **Status:** fixed here with function refs; proposed as a lint rule for the template

## Observed

The workspace rendered its panes in a `<template v-for>` and gave two child components a string
`ref` (`ref="editor"`, `ref="preview"`). Vue collects refs declared inside `v-for` into an array, so
`editor.value` was `[componentInstance]` and every menu command that called
`editor.value?.menuCommand(...)` threw `menuCommand is not a function` — as an unhandled promise
rejection, invisible unless the console was open. The classic Format, Edit, Insert and View menus
had done nothing since they were built (change 0020) and two test rounds later the owner reported
"Format → Bold does not work reliably".

## Root cause

`vue-tsc` types a string ref inside `v-for` as the single instance, not as an array, so the type
checker saw nothing wrong; the runtime behaviour differs. No e2e test exercised the menubar.

## Resolution here

Function refs (`:ref="setEditorRef"`) assign the instance directly; an e2e journey drives the Format
menu on a selection and on the subject field.

## Proposed template change

- Add `vue/no-ref-as-operand`-style guidance to `docs/development/SOURCE_CODE.md`: _a string `ref`
  inside `v-for` is an array; use a function ref when the loop renders at most one instance._
- Consider the `eslint-plugin-vue` rule `vue/no-v-for-template-key-on-child` companion checks and,
  if the plugin ever ships one, a rule for string refs inside `v-for`.
- The template's Todo demo could carry one function ref inside a loop as the worked example.

## Security and privacy implications

None. The failure is silent loss of function, not exposure.

## Verification

`tests/e2e/foldmark.spec.ts` — "runs Format menu commands on the selection, the subject and through
the keys (R14-003)".
