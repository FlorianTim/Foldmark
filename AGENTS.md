# AGENTS.md

The rules every LumbreCode repository shares are in `.lumbrecode/baselines/AGENTS.md`, delivered by
the engineering baseline and never edited here. What follows applies **on top of them** and wins
where the two overlap — this repository is where its own rules live, and the baseline is the floor,
not the ceiling.

## Mission

Build concrete LumbreCode applications from this repository without eroding architecture, privacy,
security, accessibility or documentation quality.

## Source priority

1. Explicit user instruction.
2. Accepted OpenSpec specifications in `openspec/specs/`.
3. Active change under `openspec/changes/`.
4. ADRs and arc42.
5. `template.config.json` and repository conventions.
6. Raw material in `drafts/` is input, not normative after specifications have been derived.
   `drafts/init/` is the app's input material and survives initialization until its `processed.md`
   is complete; the rest of `drafts/` is template-internal and is deleted.

## New application workflow

The Todo demo must remain until the user explicitly asks to initialize a concrete app.

### The app shell is never deleted

Initialization replaces the **Todo demo**. It does not touch the app shell — `SettingsPanel.vue`,
`AboutPanel.vue`, `PrivacyNotice.vue`, `SafeMarkdown.vue`,
`src/presentation/{browserStorage,composables,i18n,markdown}`, `src/config/`, `src/domain/common/`,
`src/styles/`, `src/main.ts`, `src/app/compositionRoot.ts`, `src/infrastructure/db/AppDb.ts` — nor
the toolchain under `.github/`, `scripts/`, `compliance/` and `config/`.

The default is **keep**. Delete by explicit path, never by folder sweep. The binding classification
is `docs/development/TEMPLATE_INITIALIZATION.md`.

**Remove less, not more.** A leftover i18n key or an unused dependency is harmless; a nav entry
pointing at a deleted component is not. Keep the base dependency set — remove a library only when
the accepted specification rules its capability out.

### The app starts at zero, the origin is recorded

`VERSION` and `template.config.json → template.version` are the **template's** version and are left
alone. The **application** version resets to `0.1.0` across `template.config.json`, `package.json`,
`package-lock.json` and `src/config/app.config.json`; `CHANGELOG.md` and
`docs/product/FEATURE_LOG.md` reset with it.

`docs/development/GENERATED_FROM_TEMPLATE.md` records template version, template commit, generation
date, what was replaced versus kept, and template updates adopted later. Never delete it.

When initialization is requested:

1. Read every text file and inspect every relevant image under `drafts/notes/` and `drafts/assets/`.
2. Validate and normalize `template.config.json`.
3. Produce a product brief, glossary, actor/use-case overview and assumptions list.
4. Create/update OpenSpec current-state specs and a first change proposal with `proposal.md`,
   `design.md` and `tasks.md`.
5. Update arc42 sections 1–4 and create ADR candidates.
6. Produce implementation phases and a test strategy.
7. Stop after phase 2 for human review unless the user explicitly authorizes uninterrupted
   implementation.
8. After approval, replace the Todo demo incrementally. Keep the project buildable after each work
   package.

## Feature log (mandatory)

`docs/product/FEATURE_LOG.md` answers **"which version brought which feature or bugfix?"** at a
glance. It is maintained continuously, not written at release time:

- Every change that adds, fixes or alters something user-visible or developer-visible **adds its row
  in the same pull request**. A change without a row is incomplete.
- One row per feature or fix, typed (✨ feature, 🐛 bugfix, ♻️ change, 🧱 foundation), with the area
  and a reference to its OpenSpec capability, ADR or requirement id.
- It complements `CHANGELOG.md` rather than replacing it: the changelog explains _why_ and _how_ in
  prose, the feature log is the scannable _when_.

## Template feedback (mandatory during initialization)

`docs/template-feedback/` records everything about the **template** that got in the way —
ambiguities, stale instructions, missing steps, wrong classifications — written when it happens,
including what was worked around. Use the `capture-template-feedback` skill.

An empty register after a full initialization is a suspicious result, not a good one. It is the
input for the next template version.

## Generated files

- `src/presentation/help/*.md` — rendered from `docs/public-site/` (FAQ from `faq/<locale>.yaml`,
  manual from `guides/<locale>/`). The same source the public website publishes. Edit the source,
  then `npm run help:render`.
- `THIRD-PARTY-NOTICES.generated.md` — `npm run licenses:generate`.
- `design/screenshots/<profile>/` — `npm run screenshots:capture`.

Never edit a generated file. `npm run help:check` fails when one drifts from its source.

## Architectural rules

- Domain has no imports from application, infrastructure or presentation.
- Application depends on domain and declares ports.
- Infrastructure implements application ports.
- Presentation invokes application use cases and may use Pinia only for UI/workspace state.
- External integrations are adapters behind explicit ports and capability consent.
- Runtime configuration contains no secrets.

## Security and privacy

- Apply OWASP Top 10 and the repository ASVS baseline.
- Treat all imported files, URLs, rich text, HTML, SVG and connector data as untrusted.
- Do not use `v-html`, `innerHTML`, dynamic code execution or unsafe URL schemes.
- Do not add remote fonts, analytics, trackers or CDN runtime scripts.
- Do not put credentials or OAuth client secrets in frontend code.
- Add or update threat models when trust boundaries change.
- Run privacy, security, dependency and license checks before completion.

## Definition of done

A change is complete only when:

- acceptance criteria are implemented
- validation and error states exist
- unit tests cover domain/application logic
- security regression tests cover relevant input boundaries
- E2E coverage exists for critical user journeys
- `npm run ci` succeeds
- OpenSpec is reconciled
- arc42/ADR/diagrams are updated where needed
- translations are complete for German and English
- `docs/product/FEATURE_LOG.md` has a row for the change
- `npm run help:check` passes — the bundled help under `src/presentation/help/` is generated from
  `docs/public-site/` and must not be edited directly
- no unresolved high/critical dependency vulnerability is knowingly introduced
