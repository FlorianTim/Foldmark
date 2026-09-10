# Changelog

All notable template changes are recorded here. Versions follow Semantic Versioning and dates use
ISO 8601.

## [Unreleased]

### Added

- LumbreCode domain and static-release conventions.
- Versioned product ideas and a generated requirements roadmap.
- A reusable concrete-app feedback workflow.
- Safe Markdown authoring and rendering for the Todo demonstration.
- **Settings hub** with sections for help, data and privacy, Pro status, support and — in
  development builds only — diagnostics.
- **Settings registry** (`src/presentation/settings/`): every persisted preference declared once
  with key, default and encoding, enumerable for diagnostics and for `resetAllSettings()`. Locale,
  theme and the intro flag are migrated onto it, and it is now the single source for the theme ids.
- **Bundled help documents** — a manual and an FAQ per locale, imported as raw strings so they work
  offline, rendered through `SafeMarkdown`.
- **Privacy and data view** that states what is stored, links the published documents and owns both
  destructive actions: deleting local content and resetting the preferences, each with its own
  confirmation and its own stated blast radius.
- **First-visit intro**: the privacy banner grew into three short steps and can be reopened from the
  settings hub at any time.
- **Entitlement seam**: a `PurchaseGateway` port, a store-less default implementation, a
  deterministic fake, a fail-open feature-gate catalogue (empty by default) and a Pro view that
  shows the state and sells nothing.
- **Development-only diagnostics view** over the settings registry, loaded behind a build-time flag
  so a production build drops its chunk.
- **`drafts/init/`** as the app's input folder — description, notes, mockups, icons, resources —
  with a processing log. It is the one part of `drafts/` the initializer reads and the one part that
  survives initialization.
- **`docs/development/TEMPLATE_INITIALIZATION.md`** — the canonical keep/adapt/replace table: every
  path under `src/` classified, the default is _keep_, deletion is by explicit path.
- **`docs/development/GENERATED_FROM_TEMPLATE.md`** — provenance for a generated app: template
  version, template commit, date, what was replaced versus kept, and template updates adopted later.
- **`docs/product/FEATURE_LOG.md`** — feature and bugfix per version, maintained in the same pull
  request as the change.

- **One source for the manual, the FAQ and the screenshots.** `docs/public-site/` is authored once
  and rendered twice: onto the public website and into the bundled in-app help under
  `src/presentation/help/`, which is now generated. `npm run help:render` writes it,
  `npm run help:check` guards it in `verify`.
- **Documentation screenshots** via `npm run screenshots:capture`, a separate Playwright project so
  the pull-request gate stays fast. Screen profiles (`phone-portrait`, `tablet`, `desktop`) and the
  output layout `design/screenshots/<profile>/` are a shared LumbreCode contract, so a Flutter
  integration test and this spec produce images the same document can reference.
- **`.lumbrecode/`** — the synchronized baseline from `lumbrecode-engineering`: the shared schemas
  and the help renderer. Excluded from local formatting; it is owned upstream.

### Changed

- `parseMarkdown` understands headings (levels 1–3, deeper levels capped) and joins wrapped lines
  into one paragraph. The subset stays HTML-free; bundled prose was previously rendered as a stack
  of one-line paragraphs.
- The Template Initializer agent and `INITIALIZE_NEW_APP.md` now reset the application version to
  `0.1.0`, record provenance, and verify the shell survived before finishing.

### Fixed

- The end-to-end suite still drove the pre-intro privacy banner and expected deleting local data to
  also clear preferences. Both were behaviour the settings rework deliberately changed; the suite
  now asserts the split instead: deleting content keeps preferences, resetting settings keeps
  content. `privacy.accept` was orphaned by the intro and is removed.
- The initialization instruction "preserve generic reusable infrastructure only where it serves the
  concrete product" inverted the default and put the entire app shell up for deletion. Replaced by
  an explicit classification with keep as the default.

## [1.0.0] - 2026-08-05

### Added

- Initial reusable Vue, TypeScript, Vite, OpenSpec and arc42 application template.
- Privacy-first local persistence, German and English localization, themes, tests and GitHub Pages
  delivery.
- Local workflow parity, dependency policy, source documentation and Dev Container verification.

[Unreleased]: https://github.com/FlorianTim/web-app-template/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/FlorianTim/web-app-template/releases/tag/v1.0.0
