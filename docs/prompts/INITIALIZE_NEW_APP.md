# Master prompt: initialize a concrete LumbreCode web application

Act as the repository's **Template Initializer** custom agent and transform this generic template
into a concrete application from the raw requirements in `drafts/`.

## Authorization and inputs

You are explicitly authorized to read every text file and image under:

- `drafts/init/` — **the app's input material**: description, notes, mockups, icons, resources
- `drafts/notes/`, `drafts/assets/` — template-internal scratch, read for context only

These drafts are non-normative input. After you derive and present the specification, accepted
OpenSpec files become normative. `drafts/init/` survives initialization until
`drafts/init/processed.md` marks every entry `done` or `dropped`; the rest of `drafts/` is deleted.

Also read:

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `template.config.json`
- existing `openspec/`, `docs/arc42/`, `docs/adr/`, security/privacy documents and source structure

## Non-negotiable technical foundation

Preserve Vue, strict TypeScript, Vite, Pinia, i18n, themes, local-first ports/adapters architecture,
tests, GitHub Pages deployability, Dev Container, native Git hooks, privacy checks, license notices,
CodeQL and dependency review unless a reviewed ADR justifies a change.

**The default is KEEP.** You are replacing the Todo demo, not the app shell and not the toolchain.
The binding classification — what is kept, adapted and replaced, path by path — is
`docs/development/TEMPLATE_INITIALIZATION.md`. Delete by explicit path, never by folder sweep.

Never delete: `SettingsPanel.vue`, `AboutPanel.vue`, `PrivacyNotice.vue`, `SafeMarkdown.vue`,
`src/presentation/{browserStorage,composables,i18n,markdown}`, `src/config/`, `src/domain/common/`,
`src/styles/`, `src/main.ts`, `src/app/compositionRoot.ts`, `src/infrastructure/db/AppDb.ts` (only
the demo table goes), the shell tests, or `drafts/init/` before it is processed.

**Remove less, not more.** A leftover i18n key or an unused dependency is harmless; a nav entry
pointing at a deleted component is not. Keep the base dependency set — remove a library only when
the accepted specification rules its capability out.

Do not load remote fonts, analytics, runtime CDN scripts or external APIs by default. Do not put
secrets in frontend code. Use OWASP-oriented threat modeling and the repository ASVS baseline.

## Work phases

### Phase 1 — discovery

1. Inventory all drafts and summarize each input.
2. Resolve product identity from `template.config.json`; identify missing or placeholder values.
3. Derive actors, goals, user journeys, domain vocabulary, functional requirements, non-functional
   requirements, data categories, external systems and constraints.
4. Record explicit assumptions, ambiguities, conflicts and deferred ideas. Do not silently invent
   requirements.
5. Assess whether the app remains static/local-first or needs optional backend capabilities.
6. Read the planned-version sections in `drafts/notes/new-feature-ideas.md` and their versioned
   supporting directories.

### Phase 2 — specification and architecture

1. Update `openspec/project.md` for the concrete product.
2. Replace generic current-state specs with concrete capability specs.
3. Create the first change under `openspec/changes/` with `proposal.md`, `design.md` and `tasks.md`.
4. Translate accepted German ideas into the versioned English `docs/product/requirements_roadmap.md`
   with stable IDs and Must/Should/Could priorities.
5. Define acceptance criteria and validation rules for each MVP capability.
6. Define domain entities, value objects, application ports, persistence schema and UI routes/views.
7. Produce a threat-model delta and privacy data inventory.
8. Update arc42 sections 1–4, ADR candidates and architecture diagrams.
9. Produce an implementation plan of small vertical slices and a unit/integration/E2E/security test
   plan.
10. State which Todo demo files will be removed or transformed, but do not remove them yet.

**Stop after phase 2 and request review.** Continue only if the user explicitly said to implement
without a review stop.

### Phase 3 — initialization

After approval:

1. Run or update `scripts/init-template.py` so package metadata, runtime config, index metadata and
   workspace naming match the product.
2. Replace the Todo demo incrementally with the first vertical slice.
3. Keep the app buildable after each slice.
4. Preserve the app shell and the toolchain in full. Only demo-specific code is replaced — see the
   classification table in `docs/development/TEMPLATE_INITIALIZATION.md`.
5. Add migrations rather than destructive IndexedDB schema edits.

### Phase 4 — implementation

Implement accepted OpenSpec tasks in priority order. For every slice:

- domain model and validation
- application use case and ports
- infrastructure adapter
- accessible Vue presentation
- German and English translations
- tests and security negative cases
- documentation reconciliation

### Phase 5 — hardening and handoff

0. **Reset the app's history and record its provenance.** `application.version` in
   `template.config.json`, `package.json`, `package-lock.json` and `src/config/app.config.json` to
   `0.1.0`; `CHANGELOG.md` to header plus `## [Unreleased]`; `docs/product/FEATURE_LOG.md` to its
   legend. `VERSION` and `template.version` stay — they record what the app was generated from. Fill
   in `docs/development/GENERATED_FROM_TEMPLATE.md`. Then `npm run version:check`.
1. Run `npm run ci`.
2. Run `npm run dependencies:check` and inspect GitHub workflow policies.
3. Verify that the production build makes no unintended third-party requests.
4. Run `npm run workflow:release` and verify the custom-domain base path, ZIP and checksum.
5. Verify data export/deletion behavior and connector consent where applicable.
6. Update README, PRIVACY, SECURITY, arc42, ADRs, diagrams and third-party notices.
7. Report completed work, remaining risks, deferred features and exact local commands.
8. Use the `capture-template-feedback` skill for reusable initialization problems — including the
   ones you worked around. An empty `docs/template-feedback/` after a full initialization is a
   suspicious result, not a good one.
9. Verify the shell survived: every nav entry resolves, settings, about and the privacy view render
   in both locales, and the shell tests pass.
10. Retire `drafts/init/` only when every row of its `processed.md` says `done` or `dropped`.

## Output discipline

Do not claim tests passed unless you ran them. Never bypass validation with `--force`, relaxed
TypeScript, disabled lint rules or `--no-verify` merely to obtain green output. Prefer a smaller
complete vertical slice over many half-implemented features.
