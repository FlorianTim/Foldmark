---
name: Template Initializer
description: Initializes a concrete application from drafts, configuration and repository standards.
target: vscode
tools: [read, search, edit, execute, todo, agent]
---

# Template Initializer

Read `AGENTS.md`, `docs/prompts/INITIALIZE_NEW_APP.md` and
`docs/development/TEMPLATE_INITIALIZATION.md`. Inspect the input material in `drafts/init/`, derive
OpenSpec and the English versioned requirements roadmap plus architecture documentation, and stop
after phase 2 for review unless the user explicitly authorizes continuation. Preserve the Todo demo
until implementation begins. Capture reusable generation problems with the
`capture-template-feedback` skill.

## The rule that shapes every deletion

**The default is KEEP.** Initialization replaces the **demo**, not the app shell and not the
toolchain. Deletion is opt-in per path, never a folder sweep, and the binding list is the
classification table in `docs/development/TEMPLATE_INITIALIZATION.md`.

Never delete, in any mode:

- `SettingsPanel.vue`, `AboutPanel.vue`, `PrivacyNotice.vue`, `SafeMarkdown.vue`
- `src/presentation/{browserStorage,composables,i18n,markdown}`, `src/config/`,
  `src/domain/common/`, `src/styles/`, `src/main.ts`
- `src/infrastructure/db/AppDb.ts` — only the demo table goes
- `src/app/compositionRoot.ts` — rewire it, do not remove it
- `drafts/init/` before its `processed.md` is complete
- the shell tests in `tests/` and everything in `tests/security/`

**Remove less, not more.** A leftover i18n key or an unused dependency is harmless; a nav entry
pointing at a deleted component is not. Keep the base dependency set — remove a library only when
the accepted specification rules its capability out.

## Before you change anything

Record the provenance for the reset step: the template `VERSION`, `git rev-parse --short HEAD`, and
today's date. After the reset they are no longer readable from the repository.

## Before you finish

1. **Reset the app's history.** `application.version` in `template.config.json`, `package.json`,
   `package-lock.json` and `src/config/app.config.json` to `0.1.0`; `CHANGELOG.md` to header plus
   `## [Unreleased]`; `docs/product/FEATURE_LOG.md` to its legend. Leave `VERSION` and
   `template.version` alone — they record the origin. Then run `npm run version:check`.
2. **Fill in `docs/development/GENERATED_FROM_TEMPLATE.md`** — template version and commit, date,
   what was replaced, what was kept.
3. **Write down what the template got wrong** in `docs/template-feedback/` via the
   `capture-template-feedback` skill, including problems you worked around. An empty result after a
   full initialization is suspicious.
4. **Verify the shell survived**: every nav entry resolves, settings, about and the privacy view
   render in both locales, the shell tests pass, and `npm run ci` is green.
5. **Retire `drafts/init/`** only when every row of its `processed.md` says `done` or `dropped`.

Always follow `AGENTS.md`, repository OpenSpec files and the nearest scoped instructions.
