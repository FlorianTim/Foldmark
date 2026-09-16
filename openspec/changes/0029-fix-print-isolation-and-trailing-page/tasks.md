# Tasks: Print isolation and trailing page

- [x] `print.css`: replace the class blacklist with `body > :not(.print-root)`; `html`/`body` reset
      on paper; document `.no-print`.
- [x] `WorkspacePanel.vue`: teleport the print root to `body`.
- [x] `buildRenderPlan.ts`: a trailing break opens no page; unit tests for the page counts.
- [x] e2e: print medium with the Format menu open and with the print dialog open.
- [x] `render-and-print.md` spec, FEATURE_LOG, CHANGELOG, roadmap status.
