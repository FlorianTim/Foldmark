# Tasks: Responsive workspace

- [x] Mode state persisted as a UI setting (`workspaceMode`, `workspaceLayout`).
- [x] Mode tablist in the workspace bar with arrow-key navigation (WAI-ARIA tabs pattern).
- [x] Split `MetadataForm.vue` into Document-mode sections; sender/recipient accordions.
- [x] Per-field "show in document" switch on contact details; codec and snapshot carry it —
      implemented with the address model in change 0006.
- [x] Pane count from the workspace element width (`ResizeObserver`), pure decision in
      `workspaceLayout.ts`.
- [x] Move export controls behind the dialog action (change 0013).
- [ ] Theme review: calmer surfaces, document-oriented spacing, contrast check per theme — deferred
      with R10-005 until the owner reports a concrete case.
- [x] e2e journeys updated for the three modes; screenshots regenerated for all three devices.
- [x] `openspec/specs/app-shell.md` describes the modes; arc42 §5 building blocks: no new block; the
      workspace component set is unchanged in kind.
