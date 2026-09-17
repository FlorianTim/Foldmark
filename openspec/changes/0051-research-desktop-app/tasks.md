# Tasks (research): Desktop app

- [ ] Spike: Tauri 2 scaffold on a branch; Windows installer built locally per the design; size,
      start time and the print dialog checked against the calibration sheet.
- [ ] Print-fidelity check on macOS (WKWebView) and Linux (WebKitGTK); note per platform.
- [ ] ADR "Desktop shell"; licence register entries for `@tauri-apps/*` and the Rust crates
      (`npm run licenses:check` covers npm only — decide how crates are recorded).
- [ ] `PlatformPort` + browser adapter merged without behaviour change.
- [ ] ADR "Update channel and signing": `latest.json` on the public site, minisign keys, opt-in
      check, external request register entry; cost decision on Windows signing.
- [ ] Migration rule set written into `document-model.md` and `local-storage.md`;
      `MigrationRegistry` skeleton with fixture tests.
- [ ] Move `build-desktop.draft.yml` to `.github/workflows/` with a tag trigger once the scaffold is
      on `main`.
- [ ] Implementation changes (shell, file access, updates) proposed separately afterwards.
