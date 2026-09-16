# Tasks: 1.0 post-release regressions

- [x] Chrome print: close the dialog before `print()`, restore it after; `@media print` hides
      dialogs and popovers; e2e asserts the dialog is hidden in the print medium.
- [x] Image insertion: placeholder while resolving, own paragraph at the cursor, asset list refresh
      after import, thumbnail with title, dimensions and size in the image dialog
      (`ImageDialog.vue`, change 0022); e2e from library to preview.
- [x] Plain-text mail: `-` bullets, tab-separated tables, no directive syntax; fixtures.
- [x] Guides: printed marks stay visible with guides hidden; second control for printed marks.
- [x] i18n: `metadata.field.region`; test over field lists.
- [x] Page break: leaf + trailing paragraph; render-plan test; e2e two pages.
- [x] Preview scroll: page selection scrolls only from the navigator; resize measurement only on
      size change; constant stage gap.
- [x] About: structured library list from `licenses:generate`; no template wording.
- [x] FEATURE_LOG rows. Specs reconciled and `npm run verify` at the end of the round (all phases).
