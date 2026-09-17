# Design (research): Desktop app

Nothing here is decided; it is the shape the spike takes so the questions in the proposal can be
answered with a running build. Tauri 2 is the working assumption because of installer size and
licence; the print-fidelity check (question 1) can still overturn it for macOS and Linux.

## Spike scaffold

```text
src-tauri/
  Cargo.toml              # package "foldmark", tauri 2, plugins: dialog, fs, updater (later)
  tauri.conf.json         # productName "Foldmark", version from package.json, identifier "de.lumbrecode.foldmark"
  capabilities/default.json
  icons/                  # generated with `tauri icon public/icons/icon-512.png`
  src/main.rs, src/lib.rs # the generated shell; no business logic in Rust
```

`tauri.conf.json` essentials:

```json
{
  "productName": "Foldmark",
  "version": "../package.json",
  "identifier": "de.lumbrecode.foldmark",
  "build": {
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      { "title": "Foldmark", "width": 1280, "height": 860, "minWidth": 960, "minHeight": 640 }
    ],
    "security": { "csp": "<the same policy as index.html>" }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis", "msi", "dmg", "appimage", "deb"],
    "icon": ["icons/icon.ico", "icons/icon.icns", "icons/128x128.png"]
  }
}
```

Vite: `clearScreen: false`, `server.strictPort: true`, `envPrefix: ['VITE_', 'TAURI_ENV_']`; `base`
stays `/` (the WebView serves the bundle from its own origin, `http://tauri.localhost` on Windows).
`package.json` gains `"tauri": "tauri"` and `@tauri-apps/cli` as a dev dependency; `@tauri-apps/api`
and the plugin JS packages are runtime dependencies used only under `src/infrastructure/platform/`.

## Local build on Windows

Once the scaffold exists (the spike's first commit), a Windows installer is built like this. Steps
1–3 are one-time machine setup.

1. **Rust toolchain** (MSVC target, the default on Windows):

   ```powershell
   winget install --id Rustlang.Rustup -e
   rustup default stable-msvc
   ```

2. **C++ build tools** — the "Desktop development with C++" workload of the Visual Studio Build
   Tools (the linker and the Windows SDK):

   ```powershell
   winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
   ```

3. **WebView2 runtime** — preinstalled on Windows 11 and on Windows 10 with Edge; otherwise:

   ```powershell
   winget install --id Microsoft.EdgeWebView2Runtime -e
   ```

4. **Dependencies** (Node from `.nvmrc`), then the build:

   ```powershell
   npm ci
   npm run tauri build
   ```

   `tauri build` runs `npm run build` (the web bundle into `dist/`), compiles the Rust shell in
   release mode and bundles. The first run compiles every crate and takes several minutes; later
   runs reuse `src-tauri/target/`. NSIS and WiX are downloaded by the CLI on first use.

5. **Results:**

   | Artefact                  | Path                                                                      |
   | ------------------------- | ------------------------------------------------------------------------- |
   | Per-user installer (NSIS) | `src-tauri\target\release\bundle\nsis\Foldmark_<version>_x64-setup.exe`   |
   | MSI installer             | `src-tauri\target\release\bundle\msi\Foldmark_<version>_x64_en-US.msi`    |
   | Runnable without install  | `src-tauri\target\release\Foldmark.exe` (needs only the WebView2 runtime) |

   `npm run tauri dev` opens the app in a native window against the Vite dev server with hot reload;
   `npm run tauri build -- --debug` keeps the developer tools enabled in the bundle.

6. **Unsigned builds** show the SmartScreen "unknown publisher" sheet on first start ("More info →
   Run anyway"); that is expected until question 6 of the proposal is answered.

The CI variant is `build-desktop.draft.yml` next to this file: the same steps on a `windows-latest`
/ `macos-latest` / `ubuntu-latest` matrix through `tauri-apps/tauri-action`, with the quality gate
first, installers as workflow artefacts and a draft release. Before it moves back to
`.github/workflows/`, its trigger changes from "every push to `main`" to `v*` tags plus manual
dispatch, and its placeholder comments go.

## Platform port

```ts
// src/application/ports/PlatformPort.ts
export interface PlatformPort {
  readonly kind: 'browser' | 'desktop';
  readonly capabilities: { readonly fileSystem: boolean; readonly updates: boolean };
  saveFile?(suggestedName: string, content: string, mime: string): Promise<{ path: string } | null>;
  checkForUpdate?(): Promise<{ version: string; notes?: string } | null>;
  installUpdate?(): Promise<void>;
}
```

`BrowserPlatformAdapter` (kind `browser`, both capabilities `false`; the existing download path
stays) and `TauriPlatformAdapter` (`plugin-dialog` `save()` + `plugin-fs` `writeTextFile()`;
`plugin-updater` `check()` / `downloadAndInstall()`; `plugin-process` `relaunch()`). The composition
root picks one by `isTauri()`. Settings → About shows "Desktop app <version>" and, when
`capabilities.updates`, the opt-in switch and "Check now". Output → "Save as file…" appears when
`capabilities.fileSystem`.

## Update channel

`https://<public site>/desktop/latest.json`, written by the release workflow beside the installers,
signed with the minisign key pair the updater plugin expects (`TAURI_SIGNING_PRIVATE_KEY` as an
Actions secret, the public key in `tauri.conf.json`). The check goes out only when the switch is on,
at most once per 24 h, and the register entry names the URL and the query (`version`, `target`,
`arch`). A found update shows version and notes and the two buttons "Export a backup first" and
"Install and restart".

## Migration rule set (to be written into the specs)

| Thing            | Version field               | Additive change                      | Breaking change                                                       |
| ---------------- | --------------------------- | ------------------------------------ | --------------------------------------------------------------------- |
| Portable file    | `foldmarkVersion`           | new keys; old readers ignore them    | bump; reader per old version; writer always the newest                |
| IndexedDB record | `schemaVersion` per record  | new optional fields with defaults    | `MigrationRegistry` step, run once on start after an automatic backup |
| Backup package   | `schemaVersion` in the file | new lists ignored by older importers | importer refuses newer major with a clear message                     |

Downgrades are unsupported and said so; the automatic backup before a migration is kept in the app's
data folder (desktop) or offered as a download (browser).
