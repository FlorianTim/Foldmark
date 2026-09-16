# Prompt: Foldmark aus dem Lambro Code Web App Template initialisieren

Act as the repository's **Template Initializer** custom agent (`.github/agents/00-template-initializer.agent.md`) and initialize the concrete Foldmark application from the provided drafts.

## Authorization

You are explicitly authorized to read every file below:

- `drafts/notes/`
- `drafts/assets/`

Read text, JSON, SVG, Mermaid, PlantUML, code examples and image previews. Treat all drafts as non-normative source material. Do not silently discard conflicting or uncertain requirements.

Also read and obey:

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `template.config.json`
- `.github/skills/initialize-from-drafts/SKILL.md`
- existing OpenSpec, arc42, ADR, privacy, security and test documentation

## Product identity

- Product name: **Foldmark**
- Organization: **Lambro Code**
- Organization domain: **lambrocode.de**
- Product category: local-first document, print-profile and export web application
- Default languages: German and English
- Deployment: static build, initially GitHub Pages; the `dist/` folder must remain portable to other static hosts

## Core product intent

Foldmark lets users author structured Markdown/YAML documents and render them through configurable physical print profiles. The primary differentiator is precise, configurable print-helper geometry: fold marks, hole marks, cut marks, safe areas, bleed, address windows, stamp areas and duplex surfaces.

The same document content may be rendered as a DIN-style letter, blank A4/A5 page, postcard, card, photo format, PDF for email, plain-text email, HTML email, Markdown or future ODT output.

## Required work phases

### Phase 1 — complete discovery

1. Inventory every draft file and summarize its relevance.
2. Derive actors, journeys, business rules, vocabulary, entities, use cases, external systems and constraints.
3. Separate MVP, post-MVP, experimental and explicitly deferred features.
4. Record ambiguities and conflicts instead of guessing.
5. Verify that the existing generic template remains appropriate.
6. Identify any draft code or dimensions that require standards or security verification before production use.

### Phase 2 — specification and architecture

1. Update `template.config.json` using the supplied Foldmark configuration and run the initializer in a safe branch/worktree.
2. Create concrete OpenSpec current-state specs and the first implementation change.
3. Define acceptance criteria for all MVP capabilities.
4. Define the document model, print-profile model, marker geometry, address model, asset model, signature model, email handoff model and capability/consent model.
5. Define repository ports, rendering/export ports, persistence schema and migrations.
6. Define routes, views, dialogs and responsive UX.
7. Produce a privacy data inventory and a threat-model delta based on OWASP-oriented repository rules.
8. Update arc42 sections 1–4 and create ADR candidates.
9. Create Mermaid and PlantUML source diagrams as separate versioned files.
10. Create a phased vertical-slice plan and full unit/integration/E2E/security/accessibility test plan.
11. State which Todo demo files will be transformed or removed, but keep the demo intact until implementation starts.

**Stop after Phase 2 for review unless the user has explicitly authorized implementation without a review stop.**

### Phase 3 — implementation after approval

Implement the MVP in buildable vertical slices. Each slice must include domain, validation, use case, port/adapter, accessible Vue UI, German/English strings, tests, security negative cases and documentation reconciliation.

Recommended slice order:

1. Foldmark shell, branding, navigation and local settings
2. Document model plus Markdown/YAML import/export
3. Built-in print profiles and marker renderer
4. Letter workspace with DIN-style preview and browser print
5. Local address book and sender profiles
6. Local document persistence and backup/export/delete
7. Email text/HTML/mailto handoff and PDF-for-email options
8. Postcard front/back model and duplex preview
9. Local image, logo and graphical signature assets
10. Privacy center, capability registry and connector shells
11. Advanced export adapters and optional connectors

## Non-negotiable engineering rules

- Preserve Vue, strict TypeScript, Vite, Ports and Adapters, tests, Dev Container, Git hooks, CI, CodeQL, dependency review, privacy checks and license notices unless an approved ADR changes them.
- No remote fonts, analytics, CDN runtime libraries or external APIs on normal startup.
- External connectors are opt-in, consented and lazy-loaded.
- Never embed client secrets in frontend code.
- Raw Markdown HTML is disabled by default; generated HTML must be sanitized.
- SVG/image/file imports need MIME, size and content validation.
- EML and mail headers must reject CR/LF injection.
- OAuth connectors must use Authorization Code with PKCE and minimal scopes; do not persist third-party tokens in the MVP.
- User data must be exportable and deletable.
- Print measurements are represented in physical units and tested independently from zoom/display scaling.
- Do not claim standards compliance until dimensions are verified against authorized current sources.
- Do not bypass failures with force flags, disabled tests, relaxed TypeScript or `--no-verify`.

## Completion report

At every stop, report:

- files read and generated
- assumptions and unresolved questions
- accepted/recommended MVP scope
- architecture decisions and ADR candidates
- threat/privacy findings
- exact commands executed and their results
- tests not run or environments not available
- next recommended vertical slice
