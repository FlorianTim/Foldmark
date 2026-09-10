# Feature log

One line per feature and per bugfix, newest version first. **What shipped when**, scannable —
`CHANGELOG.md` explains _why_ and _how_, this answers _when_.

Maintained continuously, not written at release time: every change that adds or fixes something
user-visible or developer-visible adds its row in the same pull request. See "Feature log" in
`AGENTS.md`.

## Legend

| Type | Meaning                                                         |
| ---- | --------------------------------------------------------------- |
| ✨   | Feature — something new you can use                             |
| 🐛   | Bugfix — something that was broken                              |
| ♻️   | Change — existing behaviour works differently                   |
| 🧱   | Foundation — structure, rules, tooling; no user-visible surface |

Status is `shipped` unless the version is still in progress.

---

## Unreleased

| Type | Area           | What                                                                                                                                                                                              | Reference                                     |
| ---- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 🧱   | Initialization | Canonical keep/adapt/replace table; every path under `src/` classified, default is _keep_                                                                                                         | `docs/development/TEMPLATE_INITIALIZATION.md` |
| 🧱   | Initialization | `drafts/init/` as the app's input folder, with a processing log; the rest of `drafts/` is template-internal and is wiped                                                                          | `drafts/init/README.md`                       |
| 🧱   | Initialization | Provenance form: template version, commit, date, what was replaced, later adoptions                                                                                                               | `docs/development/GENERATED_FROM_TEMPLATE.md` |
| 🧱   | Product        | This feature log                                                                                                                                                                                  | —                                             |
| 🧱   | Baseline       | Engineering baseline adopted through `apply_baseline.py`: nine shared schemas incl. `entitlement`, public-site tooling, central skills and agents, plus the `baseline.lock.json` that was missing | `.lumbrecode/baseline.lock.json`              |
| ♻️   | Baseline       | Shared prose now arrives as reference under `.lumbrecode/baselines/`; this repository keeps its own `AGENTS.md` and instructions                                                                  | engineering PR #4                             |
| 🧱   | Skills         | Local `capture-template-feedback` fork replaced by the central skill — the fork had half its content                                                                                              | `.github/skills/`                             |
| ♻️   | CI             | `ci.yml` calls the shared `node-quality.yml@v1` instead of its own steps; Node and Python stay pinned by `.nvmrc` and `.python-version`                                                           | engineering v1.3.0                            |
| 🧱   | CI             | The workflow parity check understands a delegated job and additionally refuses a shared gate pinned to a branch                                                                                   | `scripts/check-workflow-parity.mjs`           |
| 🧱   | CI             | `ci-gate.yml` turns a gating workflow that never ran into a red check — the risk this repository took on by delegating `ci.yml`                                                                   | `scripts/verify_ci_gate.py`                   |
| ✨   | Settings       | Settings hub with help, data and privacy, Pro, support and development sections                                                                                                                   | `SettingsPanel.vue`                           |
| ✨   | Settings       | Settings registry: every preference declared once, enumerable, with `resetAllSettings()`                                                                                                          | `settingsRegistry.ts`                         |
| ✨   | Help           | Bundled manual and FAQ per locale, offline, rendered through `SafeMarkdown`                                                                                                                       | `HelpPanel.vue`                               |
| ✨   | Privacy        | Privacy and data view with both destructive actions, each separately confirmed                                                                                                                    | `PrivacyPanel.vue`                            |
| ✨   | Onboarding     | Three-step first-visit intro, replayable from settings                                                                                                                                            | `PrivacyNotice.vue`                           |
| ✨   | Monetization   | Entitlement seam: port, store-less default, fake, fail-open gates, Pro view                                                                                                                       | `EntitlementService.ts`                       |
| ✨   | Development    | Diagnostics view over the settings registry, dropped from production builds                                                                                                                       | `DiagnosticsPanel.vue`                        |
| ♻️   | Presentation   | `parseMarkdown` gained headings and paragraph joining, still HTML-free                                                                                                                            | `parseMarkdown.ts`                            |
| ♻️   | Presentation   | Theme ids moved into the settings registry; `useTheme` re-exports them                                                                                                                            | `useTheme.ts`                                 |
| ✨   | Documentation  | One source for manual and FAQ: `docs/public-site/` renders to the site and to the bundled help                                                                                                    | `render_app_help.py`                          |
| ✨   | Documentation  | Screenshot capture per shared screen profile, referenced from guides and validated                                                                                                                | `screenshots.spec.ts`                         |
| 🧱   | Baseline       | `.lumbrecode/` — synchronized schemas and tooling from the engineering repository                                                                                                                 | —                                             |
| 🐛   | Testing        | The e2e suite encoded the pre-rework behaviour: the old privacy banner, and delete-data also clearing preferences                                                                                 | —                                             |
| 🐛   | Initialization | "Preserve generic reusable infrastructure only where it serves the concrete product" inverted the default and put the whole app shell up for deletion                                             | retired                                       |
| ✨   | Product        | Versioned product ideas and a generated requirements roadmap                                                                                                                                      | —                                             |
| ✨   | Template       | Reusable concrete-app feedback workflow                                                                                                                                                           | `docs/template-feedback/`                     |
| ✨   | Presentation   | Safe Markdown authoring and rendering for the Todo demonstration                                                                                                                                  | `SafeMarkdown.vue`                            |
| 🧱   | Organization   | LumbreCode domain and static-release conventions                                                                                                                                                  | —                                             |

## 1.0.0 — Initial template (2026-08-05)

| Type | Area         | What                                                                                       |
| ---- | ------------ | ------------------------------------------------------------------------------------------ |
| ✨   | Foundation   | Vue, TypeScript, Vite, OpenSpec and arc42 application template                             |
| ✨   | Persistence  | Privacy-first local persistence (Dexie/IndexedDB), ports and adapters                      |
| ✨   | Presentation | German and English localization, themes, settings and about panels                         |
| ✨   | Delivery     | GitHub Pages delivery, release packaging, checksums                                        |
| 🧱   | Quality      | Local workflow parity, dependency policy, source documentation, Dev Container verification |

---

## For a concrete app

This file is **reset** when an application is generated: the template's history is not the app's
history. The new app starts its own log at `0.1.0` and records which template version it came from —
see `docs/development/GENERATED_FROM_TEMPLATE.md`.
