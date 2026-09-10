# LumbreCode Web App Template — Copilot Instructions

Use TypeScript strict mode and Vue Composition API with `<script setup lang="ts">`. Preserve the
layered/hexagonal architecture described in `AGENTS.md`.

Before implementing a non-trivial feature, read `AGENTS.md`, `template.config.json`, relevant
OpenSpec files, ADRs and the nearest `AGENTS.md`. Create an OpenSpec change when user-visible
behavior, persistence, trust boundaries, architecture or public contracts change.

Keep the Todo demo until the Template Initializer is explicitly asked to create a new application
from `drafts/init/`.

Initialization replaces the **demo**, never the app shell (`SettingsPanel.vue`, `AboutPanel.vue`,
`PrivacyNotice.vue`, `SafeMarkdown.vue`,
`src/presentation/{browserStorage,composables,i18n,markdown}`, `src/config/`, `src/domain/common/`,
`src/styles/`, `src/main.ts`, `src/app/compositionRoot.ts`, `src/infrastructure/db/AppDb.ts`) and
never the toolchain. The default is keep; delete by explicit path. Binding list:
`docs/development/TEMPLATE_INITIALIZATION.md`.

Every change that adds, fixes or alters something visible adds a row to
`docs/product/FEATURE_LOG.md` in the same pull request.

Do not silently invent product requirements. Record assumptions and make them reviewable. Keep
German and English translations synchronized.

Never introduce remote fonts, runtime CDN resources, analytics, telemetry or external connectors by
default. Never store secrets in frontend source or `VITE_*` variables. Treat imported content as
untrusted and avoid unsafe DOM APIs.

Run `npm run verify:fast` during implementation and `npm run ci` before declaring completion. Update
OpenSpec, arc42, ADRs and diagrams together with code.
