# Initializing a concrete application

How this template becomes a real app — and, more importantly, **what survives that**.

> **Canonical source.** `.github/agents/00-template-initializer.agent.md` and
> `docs/prompts/INITIALIZE_NEW_APP.md` follow this file. If they disagree, this one wins.

## Overview

1. Drop everything the app is built from into **`drafts/init/`** — the description, notes, mockups,
   icons, resources. See `drafts/init/README.md`.
2. Fill in `template.config.json` (application identity, organization, repository owner).
3. Run the Template Initializer: phases 1–2, then **stop for review**.
4. After approval: `npm run template:init`, then replace the demo incrementally, keeping the build
   green after every slice.
5. Reset the app's history and record its provenance (see below).
6. Retire `drafts/init/` once `drafts/init/processed.md` is complete.

## What is kept, adapted and replaced

Initialization is a **careful replacement of the demo**, not a reset of `src/`. The default for
every path is _keep_.

| Path                                                                                                                    | Action                                      | Why                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/domain/todo/`                                                                                                      | **replace**                                 | The demo domain                                                                                       |
| `src/application/{errors/TodoErrors,ports/TodoRepository,usecases/TodoService}.ts`                                      | **replace**                                 | The demo use case and its port                                                                        |
| `src/infrastructure/db/DexieTodoRepository.ts`                                                                          | **replace**                                 | The demo adapter                                                                                      |
| `src/presentation/components/TodoPanel.vue`                                                                             | **replace**                                 | The demo view                                                                                         |
| `src/presentation/stores/todoStore.ts`                                                                                  | **replace**                                 | The demo store                                                                                        |
| `tests/{todo,todoService,dexieTodoRepository}.test.ts`, `tests/e2e/todo.spec.ts`                                        | **replace**                                 | Demo tests — replaced by the app's, never simply deleted                                              |
| `todo.*` i18n keys                                                                                                      | **replace**                                 | Demo copy                                                                                             |
| **App shell — never delete**                                                                                            |                                             |                                                                                                       |
| `src/App.vue`                                                                                                           | **adapt**                                   | Nav entries change; the shell stays                                                                   |
| `src/app/compositionRoot.ts`                                                                                            | **adapt**                                   | Wire the app's use cases; the composition pattern stays                                               |
| `src/presentation/components/SettingsPanel.vue`                                                                         | **keep**                                    | The settings hub                                                                                      |
| `src/presentation/components/AboutPanel.vue`                                                                            | **keep**                                    | Links, contacts, licences, version                                                                    |
| `src/presentation/components/PrivacyNotice.vue`                                                                         | **keep**                                    | First-visit notice and intro                                                                          |
| `src/presentation/components/SafeMarkdown.vue`                                                                          | **keep**                                    | Sanitized Markdown renderer                                                                           |
| `src/presentation/{browserStorage,composables,i18n,markdown}`                                                           | **keep**                                    | Preferences, theme, i18n, Markdown                                                                    |
| `src/presentation/help/*.md`                                                                                            | **generated — never edit**                  | Rendered from `docs/public-site/`; edit the source, then `npm run help:render`                        |
| `docs/public-site/`                                                                                                     | **rewrite the content, keep the structure** | One source for the published site and the bundled in-app help                                         |
| `docs/public-site/screenshots.yaml`                                                                                     | **rewrite**                                 | Which screenshots the guides may reference. Keep them required: a missing image should fail the build |
| `tests/e2e/screenshots.spec.ts`                                                                                         | **adapt the flow, keep the contract**       | The output layout `design/screenshots/<profile>/` is shared across stacks                             |
| `.lumbrecode/`                                                                                                          | **keep**                                    | Synchronized baseline: shared schemas and tooling                                                     |
| `src/config/`, `src/domain/common/`, `src/styles/`, `src/main.ts`                                                       | **keep**                                    | Runtime config, Result type, themes, bootstrap                                                        |
| `src/infrastructure/db/AppDb.ts`                                                                                        | **adapt**                                   | Only the demo table goes; the database, its versioning and migrations stay                            |
| `tests/{appConfig,browserStorage,i18n,markdown,publicResources}.test.ts`, `tests/security/`                             | **keep**                                    | They test the shell                                                                                   |
| **Infrastructure — never delete**                                                                                       |                                             |                                                                                                       |
| `.github/`, `scripts/`, `compliance/`, `config/`, `openspec/`, `docs/` (see below)                                      | **keep**                                    | Workflows, checks, agents, skills, specs                                                              |
| `package.json` dependencies                                                                                             | **keep**                                    | See "Remove less, not more"                                                                           |
| **Documentation**                                                                                                       |                                             |                                                                                                       |
| `docs/{adr,arc42,architecture,compliance,privacy,security,support,deployment,development,github,dependencies,release}/` | **keep**                                    | The rules and runbooks the app inherits                                                               |
| `docs/product/requirements_roadmap.md`                                                                                  | **reset**                                   | The app's own roadmap                                                                                 |
| `docs/product/FEATURE_LOG.md`                                                                                           | **reset to the legend**                     | The template's history is not the app's                                                               |
| `docs/prompts/`                                                                                                         | **keep**                                    | Still needed for later work                                                                           |
| `docs/template-feedback/`                                                                                               | **keep and fill**                           | What the template got wrong                                                                           |
| `openspec/specs/`, `openspec/changes/`                                                                                  | **replace**                                 | Demo capabilities give way to the app's                                                               |
| `openspec/project.md`                                                                                                   | **rewrite**                                 | The concrete product                                                                                  |
| **Drafts**                                                                                                              |                                             |                                                                                                       |
| `drafts/notes/`, `drafts/assets/`                                                                                       | **delete**                                  | Template-internal exploration                                                                         |
| `drafts/init/`                                                                                                          | **keep until processed**                    | The app's input material                                                                              |

### Remove less, not more

A leftover i18n key, an unused CSS class or a dependency the app does not touch yet is **harmless**
— the bundler drops what nothing imports, and a later cleanup costs minutes.

A half-removed feature is not harmless: a nav entry pointing at a deleted component, a
composition-root binding for a port that no longer exists, a store imported by nothing. That is an
afternoon of debugging in a codebase nobody knows yet.

So: **optimise for "nothing is broken", not for "nothing is left over".**

The same goes for dependencies. Vue, Pinia, vue-i18n, Dexie, the Markdown sanitizer and the test
stack are the base set every LumbreCode web app ends up needing. Removing one today is re-adding it
in three weeks at a different version — and the licence notices, the CI cache and the lockfile all
move with it. Remove a dependency only when the accepted specification rules its capability out.

> The instruction "preserve generic reusable infrastructure **only where it serves the concrete
> product**" is retired. It inverted the default and made every shell component argue for its own
> existence. Keep by default; delete by explicit path.

## The app starts at zero

The template already separates the two version numbers — keep it that way:

|                                                                                                                 | Meaning                  | On initialization                                                   |
| --------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------- |
| `VERSION`, `template.config.json → template.version`                                                            | the **template** version | untouched; it records what the app was generated from               |
| `template.config.json → application.version`, `package.json`, `package-lock.json`, `src/config/app.config.json` | the **app** version      | reset to `0.1.0`                                                    |
| `CHANGELOG.md`                                                                                                  |                          | reset to header + `## [Unreleased]`, then a first entry for the app |
| `docs/product/FEATURE_LOG.md`                                                                                   |                          | reset to its legend                                                 |

`npm run version:check` enforces that the four application versions agree and that the changelog
names the template version — run it after the reset.

### Provenance survives the reset

`docs/development/GENERATED_FROM_TEMPLATE.md` records what the app came from: template version and
commit, generation date, the app spec, what was replaced versus kept, and a table for template
updates adopted later.

Without it, nobody can tell six months on which template improvements this app already has. **Never
delete it.**

## The documentation is generated in CI

`.github/workflows/docs-generate.yml` captures the screenshots and renders the bundled help on
`main`, then commits both back. A developer edits `docs/public-site/`; the workflow owns
`src/presentation/help/` and `design/screenshots/`.

`npm run help:check` runs the same renderer locally and is part of `verify`. That is fast feedback
on a branch, not a second authority — if the two ever disagree, the workflow is what lands.

A derived app keeps both: the workflow, and the paths it writes to.

## Feedback flows back

`docs/template-feedback/` is filled in **while** the app is generated and built, not afterwards —
one sanitized entry per reusable problem, via the `capture-template-feedback` skill.

Every ambiguity, stale instruction and wrong classification gets an entry, including the ones that
were worked around. An empty feedback directory after a full initialization is a suspicious result,
not a good one.

## The check that catches a bad initialization

After the demo is replaced, before the release gate:

- Every nav entry in `src/App.vue` resolves to a component that exists.
- Settings, About and the privacy view still render, in both locales.
- The shell tests still pass:

```bash
npx vitest run tests/appConfig.test.ts tests/browserStorage.test.ts tests/i18n.test.ts tests/markdown.test.ts tests/publicResources.test.ts tests/security
```

- `npm run ci` is green, including `version:check`, `privacy:check`, `architecture:check` and
  `security:check`.

If a shell test was deleted rather than adapted, restore it — a deleted test is how a deleted
feature goes unnoticed.

## Deployment consequences of getting this wrong

- **The in-app deletion path is a legal surface.** `SettingsPanel.vue` owns "delete local data"; the
  privacy view explains what is stored. Both are linked from `PRIVACY.md` and the published privacy
  page. Deleting either breaks a promise the documents make.
- **`publicResources.ts` derives every legal URL from the configured slug.** Publish the privacy,
  data-deletion, FAQ, changelog and licence pages before the app goes live; the links exist from day
  one.
- **Third-party notices are generated, not written** (`npm run licenses:generate`). Keep the
  generator wired; a hand-maintained list goes stale at the first dependency bump.
