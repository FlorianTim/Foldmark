# Proposal (research): Desktop app

Status: Research — not scheduled (2026-09-18). Source: owner request 2026-09-18
(`drafts/notes/processed.md`). Roadmap R20-001…R20-008. The owner asks for feasibility first; the
shell, signing, updates and file access are questions to answer, not features to ship. The draft
workflow that was lying in `.github/workflows/build.yml` (untracked, referencing a `src-tauri/` that
does not exist) lives here as `build-desktop.draft.yml` until the scaffold does — on `main` it would
have run on every push and failed.

## What "desktop app" means for Foldmark

The same static app, wrapped in a native window with a system WebView, installed like a program: a
Start-menu entry, its own storage, no browser chrome, a real file system on request, and updates
that arrive without a browser. Everything the web app promises — local first, no accounts, no
tracking — holds for the desktop app; the network is touched only for an update check the user has
switched on.

## Questions to answer before implementation

1. **Shell.** Tauri 2 (Rust core, system WebView: WebView2 on Windows, WKWebView on macOS, WebKitGTK
   on Linux; installer ≈ 5–10 MB; MIT/Apache-2.0) versus Electron (bundled Chromium, ≈ 100 MB,
   identical rendering everywhere). Print fidelity decides: Foldmark prints through the WebView's
   print dialog, and `@page` sizing, margins and page-break behaviour differ between Chromium and
   WebKit. WebView2 is Chromium, so Windows is safe; macOS and Linux need a print check against the
   calibration sheet (change 0043) before they are offered.
2. **Detection and the platform port.** How the app learns where it runs (`isTauri()` from
   `@tauri-apps/api/core`, or the presence of `window.__TAURI_INTERNALS__`), and a `PlatformPort` in
   the application layer (`kind: 'browser' | 'desktop'`,
   `capabilities: { fileSystem, updates, nativeMenus }`) so no `@tauri-apps/*` import leaves
   `src/infrastructure/platform/`.
3. **File system.** "Save as file…" through the native dialog (`plugin-dialog` + `plugin-fs`),
   writing the portable Markdown; a later **mirror folder** mode in which every save also writes
   `<folder>/<title>.md`, IndexedDB staying the source of truth; a files-as-source-of-truth mode is
   a separate, larger change (watching, conflicts, assets beside the file). Tauri 2 capabilities
   scope the plugin to dialog-chosen paths and `$DOCUMENT/Foldmark/**` — nothing else is readable.
4. **Storage.** IndexedDB lives in the WebView's profile (Windows:
   `%LOCALAPPDATA%\<identifier>\EBWebView`), separate from every browser. The backup export/import
   is the migration path from the browser to the desktop app and back; `navigator.storage.persist()`
   is requested on start; a "Reset app" in Windows wipes the profile, which the help text must say.
5. **Updates.** `tauri-plugin-updater` reads a `latest.json` (version, notes, per-platform URL and
   minisign signature) from a URL baked into the app. The repository is private, so GitHub Release
   assets are not fetchable without a token, and a token must never be in the app. Options: (a)
   publish `latest.json` and the installers on the public site (the `deploy-pages` workflow already
   exists) — recommended; (b) make the releases public; (c) a small proxy worker. The check is a
   network request and therefore opt-in (privacy-by-default): a settings switch "Check for updates",
   a "Check now" button, at most once a day, the request documented in
   `docs/privacy/EXTERNAL_REQUEST_REGISTER.md` (what is sent: version, OS, architecture in the URL;
   no identifier). The updater runs in Rust, so the page CSP (`connect-src 'self'`) stays.
6. **Signing and stores.** Windows: Authenticode (OV/EV certificate, or Azure Trusted Signing on a
   monthly plan with identity validation); unsigned installers trigger SmartScreen. Microsoft Store:
   needs MSIX; the store signs it, but Tauri emits NSIS/MSI, so an MSIX step (`MakeAppx`/`SignTool`,
   or the `msix` packaging of the Windows SDK) and a store account come on top. macOS: Apple
   Developer Program (yearly fee), notarisation is mandatory outside the App Store; the App Store
   adds the sandbox (file access through security-scoped bookmarks). Linux: AppImage and `.deb` are
   commonly unsigned; Flathub needs a manifest and a review; Snap needs a store account.
   Certificates as base64 secrets in Actions, used on tag builds only. Decide what is worth the
   money — Windows signing first, stores later, if ever.
7. **Migration paths.** Three versioned things: the IndexedDB records (`schemaVersion: 1`), the
   portable file (`foldmarkVersion: 1`), and the backup. Rule set to write down: additive keys are
   ignored by older readers and preserved by newer ones (already the case for the file); a breaking
   change bumps the version and ships a reader for every older version; record migrations run once
   on start in order, after an automatic backup export to the app's data folder; a downgrade is not
   supported, and the updater dialog offers "Export a backup first". A `MigrationRegistry` in the
   application layer holds the ordered steps and is unit-tested with fixtures per version.
8. **Menus and window.** Native menubar versus the app's own (the app's own, for parity with the
   browser and one implementation); the context menu of change 0050 is reused and the WebView
   default one suppressed; window title follows the document; single instance; file association
   `.md` is _not_ claimed (too generic), `.foldmark` (change 0037) may be.
9. **Build and release pipeline.** `npm run tauri build` locally; a matrix workflow (Windows, macOS
   universal, Linux) on `v*` tags — not on every push — that uploads installers as artefacts and
   drafts a release; the `latest.json` published with the installers. The `.nvmrc` Node and the
   existing quality gate run first.

## Deliverables of the research

An ADR "Desktop shell" (Tauri 2 vs Electron, with the print-fidelity result), an ADR "Update channel
and signing", the `PlatformPort` and its browser adapter (no behaviour change), a spike branch with
the Tauri scaffold that builds the Windows installer locally, the migration rule set in
`document-model.md` and `local-storage.md`, and — only then — implementation changes for the shell,
file access and updates.
