# Source code guide

This guide documents the generated application source, its dependency direction, its public
extension points, and the invariants that comments alone cannot explain. Exported TypeScript APIs
also carry concise TSDoc at the declaration so editors can surface the contract in-place.

## Dependency map

```text
src/presentation ──► src/application ──► src/domain
        │                    ▲
        └──► src/app ────────┤
                 │           │
                 └──► src/infrastructure
```

- `domain/` owns immutable Todo entities, bounds, and Zod schemas. It has no framework or browser
  dependency.
- `application/` owns use cases, application errors, and the `TodoRepository` port. It depends only
  on domain contracts.
- `infrastructure/` implements ports with Dexie. Records are validated both before storage and after
  loading because IndexedDB can be edited, corrupted, or left behind by an older version.
- `presentation/` owns Vue components, Pinia screen state, i18n, themes, and resilient browser
  preference access. It never opens IndexedDB directly.
- `app/compositionRoot.ts` is the only place that chooses concrete adapters. Replace or add an
  adapter here after declaring its application port and consent requirements.

`scripts/check-architecture.py` enforces the most important inward dependency rules. Durable changes
to these boundaries require an ADR and synchronized arc42 documentation.

GitHub workflow build steps and local verification share the entry points described in
`docs/development/LOCAL_WORKFLOWS.md`. `scripts/run-local-workflow.mjs` owns orchestration and
static artifact validation; `scripts/check-workflow-parity.mjs` prevents workflow YAML from
bypassing it.

## Runtime flow

1. `main.ts` creates Vue, Pinia, and Vue I18n.
2. `App.vue` initializes the saved CSS-token theme and renders the application shell.
3. `TodoPanel.vue` asks `todoStore` to load or mutate screen data and renders the Todo Markdown
   syntax tree without generating HTML.
4. The store invokes `TodoService`; it never depends on Dexie.
5. `TodoService` validates untrusted titles, enforces the demo collection bound, and calls the
   `TodoRepository` port.
6. `DexieTodoRepository` validates persistence-boundary data with `TodoSchema` and operates on the
   slug-namespaced `AppDb`.
7. The store translates expected application failures into stable i18n keys. Raw library messages
   are not displayed.

## Public configuration

`template.config.json` is the canonical initializer source. An explicitly supplied `--config` file
is validated and copied there before the initializer writes the public subset to
`src/config/app.config.json`; `AppConfigSchema` validates that subset again at browser startup.
Runtime configuration must contain no secrets; every `VITE_*` value is public bundle input.

`customDomain: auto` resolves to `<slug>.webapps.lumbrecode.de`. Public documentation links are
derived by `config/publicResources.ts`. Shared mailbox local parts are reversibly transformed in the
bundle and reconstructed only for user-initiated links; this discourages basic scraping but does not
make the address secret.

`scripts/template_config.py` is the shared initializer trust boundary. It validates identifiers,
lengths, locales, themes, URLs, and exact object keys. HTML metadata is context-escaped before it is
written. Run `npm run template:test` after changing this behavior.

## Local data and preferences

- IndexedDB database: `<application-slug>-db`
- IndexedDB table: `todos`
- UI keys: `<application-slug>:ui:<preference>`
- Preferences: theme, locale, and privacy-notice acknowledgement

Preference helpers catch blocked `localStorage` access and fall back to session defaults. IndexedDB
failures produce a localized recovery message. The Todo demo is intentionally capped at 1,000
records and Markdown sources at 2,000 characters. A concrete application must replace these limits
with domain-specific bounds, migrations, export, and deletion behavior.

The settings deletion flow calls the Todo application use case and then removes only preference keys
owned by the app slug. It never clears another application's origin data.

## Safe extension checklist

1. Define or update accepted OpenSpec behavior.
2. Put business rules and validation in `domain/`.
3. Declare required I/O as an `application/ports` interface.
4. Implement the adapter in `infrastructure/` and validate both directions at its trust boundary.
5. Wire the adapter only in `app/compositionRoot.ts`.
6. Keep Vue components thin and translate every user-visible string in German and English.
7. Add domain/application unit tests, negative security tests, and critical-journey E2E coverage.
8. Update the data inventory, threat model, arc42, and ADRs when their facts change.

## Documentation policy

Exported TypeScript declarations require TSDoc that explains purpose, important invariants,
side-effects, and expected errors without repeating the implementation. Vue single-file components
remain self-explanatory through semantic names and focused functions; non-obvious security or
lifecycle decisions receive a local comment. `npm run docs:check` enforces the exported-API rule and
the presence of this guide.
