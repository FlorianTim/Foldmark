# Lambro Code Web App Template — Local Build, Security Review and Final Polish Prompt

Act as a senior Vue/TypeScript platform engineer, application architect, test engineer, release engineer and OWASP-oriented security reviewer.

You are working inside the extracted **Lambro Code Web App Template** repository. This is intended to become a GitHub Template Repository named `web-app-template`. It must remain a generic, reusable foundation rather than turning into a specific product. The small Todo application is an intentional integration demo and must remain unless the user explicitly asks to initialize a concrete application from `drafts/`.

Your task is to inspect the complete repository, perform a real clean local build, fix reproducible defects, verify all quality and security controls, and leave the template ready for publication as a GitHub Template Repository.

## Known verification status and first priorities

The template author could prepare and statically inspect the repository, but the execution environment could not resolve the public npm registry (`getaddrinfo EAI_AGAIN registry.npmjs.org`). Treat the following points as **not yet verified** until you run them successfully yourself:

- a clean `npm ci --ignore-scripts` using the committed lockfile;
- the actually installed dependency graph, peer-dependency compatibility and package lifecycle behavior;
- Prettier, ESLint, `vue-tsc`, Vitest, Vite production build and Playwright against a clean install;
- `npm audit` against current public registry advisory data;
- generation of notices from the actually installed dependency tree;
- manual browser behavior, IndexedDB persistence, theme/i18n behavior, CSP console output, accessibility and default-load network requests;
- Playwright browser installation and the complete E2E suite;
- execution of the Git hooks in a real temporary Git repository;
- building and opening the Dev Container;
- live GitHub Actions execution, CodeQL, Dependency Review, Scorecard and GitHub Pages deployment;
- GitHub Pages behavior below a repository subpath;
- current support/security status of every pinned package and GitHub Action at the time you perform this task.

The following preparation was completed and may be used as a starting point, but must not replace the real checks above:

- the generic repository structure, demo application, agents, skills, OpenSpec, arc42 and ADR skeletons were created;
- template configuration and Python-based static validation scripts were exercised;
- the initializer was exercised against a temporary sample configuration;
- JSON/YAML/Python/Shell structure was statically inspected;
- the source package was created without `node_modules`, `dist`, coverage, local `.env` files or browser reports.

Work in this priority order before making cosmetic changes:

1. **Environment and clean installation:** verify Node/npm versions, public registry access, lockfile integrity and `npm ci --ignore-scripts`.
2. **Dependency compatibility and security:** verify pinned versions from primary sources, peer constraints, lifecycle scripts, advisories and license metadata.
3. **Executable quality gates:** run formatting, lint, TypeScript, unit/security tests, documentation checks and production build.
4. **Browser verification:** run Playwright and manually test IndexedDB, themes, i18n, privacy notice, accessibility, CSP and network behavior.
5. **Developer tooling:** exercise Git hooks and build the Dev Container.
6. **Deployment tooling:** validate GitHub Actions and GitHub Pages/subpath deployment.
7. **Initializer regression:** initialize a temporary sample application and rerun the complete gate there.

Do not report any item above as passed merely because a configuration file exists or appears plausible. Record the exact command, environment and result.

## Mandatory context to read first

Read these files and directories before changing anything:

- `README.md`
- `AGENTS.md`
- `.github/copilot-instructions.md`
- `template.config.json`
- `config/template.schema.json`
- `package.json`
- `package-lock.json`
- `.nvmrc`
- `.npmrc`
- `vite.config.ts`
- `eslint.config.js`
- `playwright.config.ts`
- `.devcontainer/`
- `.githooks/`
- `.github/workflows/`
- `.github/agents/`
- `.github/skills/`
- `openspec/`
- `docs/arc42/`
- `docs/adr/`
- `docs/security/`
- `docs/privacy/`
- `docs/deployment/`
- `scripts/`
- `src/`
- `tests/`

Follow the repository instructions and the nearest `AGENTS.md`. Do not discard the architecture or replace the stack merely because another framework is familiar.

## Non-negotiable intent

The final repository must provide:

- Vue 3 with Composition API and strict TypeScript;
- Vite-based static builds;
- Pinia for presentation/workspace state;
- Dexie/IndexedDB behind application repository ports;
- Zod validation at trust boundaries;
- German and English i18n;
- local CSS-token themes without remote fonts or CDN assets;
- a small persistent Todo demo;
- a configuration-driven app initializer;
- agentic development through custom agents, skills, OpenSpec, arc42 and ADRs;
- GitHub Pages and generic static-host deployment;
- unit, security and Playwright E2E tests;
- native version-controlled Git hooks;
- Dev Container support;
- privacy by default and OWASP-oriented security controls.

Do not introduce analytics, telemetry, remote fonts, runtime CDN scripts, hidden external requests or frontend secrets.

## Phase 1 — environment and repository integrity

1. Record the operating system, architecture and exact versions of:
   - Node.js
   - npm
   - Python
   - Git
   - Docker/Dev Containers tooling if available
2. Confirm the installed Node version satisfies `package.json` and Vite requirements.
3. Confirm `package.json` and the root package metadata in `package-lock.json` are synchronized.
4. Confirm every `resolved` URL in `package-lock.json` uses a public package registry and contains no environment-specific OpenAI/internal artifact registry URL.
5. Confirm no `node_modules`, `dist`, coverage, browser reports, `.env`, credentials, private drafts or build artifacts are committed.
6. Validate all JSON and GitHub YAML files.
7. Check executable bits for shell scripts and Git hooks on Unix-like systems.
8. Do not use `npm install --force`, `--legacy-peer-deps`, disabled engine checks or manual lockfile fabrication to hide incompatibilities.

## Phase 2 — dependency review and clean installation

1. Review current stable/supported versions from primary sources or npm metadata for at least:
   - Vue
   - Vite
   - Vitest
   - TypeScript
   - Pinia
   - Vue I18n
   - Dexie
   - Zod
   - Tailwind CSS
   - daisyUI
   - Playwright
   - ESLint and Vue/TypeScript ESLint plugins
2. Prefer a mutually compatible, supported and security-patched set over blindly adopting every newest major.
3. Explain every major-version upgrade and check migration documentation.
4. Keep dependency versions exact-pinned and preserve a reproducible lockfile.
5. Remove dependencies that are genuinely unused by the generic template unless they are intentionally documented as template infrastructure.
6. Run a clean installation:

```bash
rm -rf node_modules dist coverage playwright-report test-results
npm ci --ignore-scripts
```

7. If installation fails, diagnose the exact package/peer/engine/registry cause. Fix the cause properly and regenerate the lockfile using normal npm behavior.
8. Run:

```bash
npm audit --audit-level=high
```

9. Resolve high and critical advisories where a compatible fix exists. Do not add a broad override without documenting why it is safe.
10. Regenerate and review third-party license notices.

## Phase 3 — build, lint and unit/security tests

Run in this order:

```bash
npm run hooks:install
npm run format:prettier-check
npm run lint
npm run typecheck
npm run test
npm run template:validate
npm run docs:check
npm run openspec:check
npm run privacy:check
npm run architecture:check
npm run security:check
npm run licenses:generate
npm run licenses:check
npm run build
```

For every failure:

- identify the root cause;
- make the smallest maintainable correction;
- add a regression test where useful;
- rerun the failing command and then the complete relevant gate.

Do not weaken strict TypeScript, disable security rules globally, add blanket ESLint ignores or remove tests merely to get green output.

## Phase 4 — browser and E2E verification

1. Install the standard Playwright Chromium browser if necessary:

```bash
npx playwright install --with-deps chromium
```

2. Run:

```bash
npm run test:e2e
```

3. Start the development server and inspect the app in a real browser.
4. Verify all Todo demo behavior:
   - empty-state display;
   - add a valid Todo;
   - reject/ignore empty input;
   - enforce the configured maximum title length;
   - toggle completed state;
   - delete one item;
   - clear all items;
   - persist across reload through IndexedDB;
   - recover with a useful error if IndexedDB is unavailable.
5. Verify settings:
   - German and English switch correctly;
   - every built-in theme works;
   - system theme follows the operating-system preference;
   - theme selection persists;
   - high-contrast mode remains legible.
6. Verify the first-run privacy notice and settings navigation.
7. Verify the Third-Party Notices link works under the GitHub Pages base path, not just at `/`.
8. Verify keyboard-only operation, visible focus, labels, landmarks, heading hierarchy and reasonable screen-reader naming.
9. Test desktop and a small mobile viewport.
10. Check browser console for CSP, hydration, Vue, IndexedDB and accessibility-related errors.

## Phase 5 — privacy and network review

1. Open browser developer tools and record all network requests from a clean first load.
2. The default load must make no intentional request to a third party.
3. Confirm there are no references to:
   - Google Fonts;
   - Google Analytics/Tag Manager;
   - Sentry/Hotjar or similar telemetry;
   - unpkg, jsDelivr, cdnjs or runtime package CDNs;
   - remote images, CSS, scripts or tracking pixels.
4. Confirm local storage and IndexedDB keys are namespaced using the application slug.
5. Confirm the data inventory accurately describes stored demo data and settings.
6. Confirm users can understand that data remains local in the default mode.
7. Confirm future connectors are specified as optional lazy-loaded capabilities with explicit consent and revocation.

## Phase 6 — OWASP and secure-design review

Review the template against the current OWASP Top 10 and the repository ASVS-inspired baseline.

At minimum inspect:

- unsafe DOM sinks such as `innerHTML`, `outerHTML`, `insertAdjacentHTML` and Vue `v-html`;
- URL scheme validation and external-link `rel` values;
- imported file and future SVG/rich-content threat boundaries;
- CSP effectiveness and limitations of CSP delivered through a meta element on static hosting;
- frontend secret exposure and misuse of `VITE_*` variables;
- dependency integrity and supply-chain controls;
- error handling and accidental sensitive-data disclosure;
- IndexedDB corruption/migration behavior;
- future OAuth requirements such as Authorization Code with PKCE, state validation, least scopes and token lifetime;
- GitHub Actions permissions and untrusted pull-request behavior;
- script injection through generated docs, config values or app names;
- denial-of-service risks from unbounded local data or imported assets.

Add focused negative tests for any security boundary that is already implemented.

## Phase 7 — template initializer verification

1. Copy `template.config.json` to a temporary file.
2. Change the temporary values to a realistic sample app, for example:
   - name: `Sample Notes`
   - slug: `sample-notes`
   - package name: `sample-notes`
   - repository name: `sample-notes`
   - default language: `en`
3. Run the initializer in dry-run mode and inspect the output.
4. Run it against a temporary working-tree copy.
5. Verify that it deterministically updates:
   - `src/config/app.config.json`;
   - package metadata;
   - lockfile root metadata;
   - HTML language/title/description;
   - VS Code workspace filename;
   - no unrelated source content.
6. Run validation, tests and build in the temporary initialized copy.
7. Restore and revalidate the generic `Web App Template` state.
8. Harden escaping/validation if a product name or description containing quotes or HTML-like characters can corrupt `index.html`.

## Phase 8 — agents, skills and specification workflow

1. Validate that every `.github/agents/*.agent.md` file has valid YAML frontmatter and a clear, non-overlapping purpose.
2. Validate that every `.github/skills/*/SKILL.md` file:
   - is named exactly `SKILL.md`;
   - has a `name` matching its directory;
   - has a useful description;
   - contains actionable instructions.
3. Confirm `.github/copilot-instructions.md` and `AGENTS.md` do not conflict.
4. Confirm `docs/prompts/INITIALIZE_NEW_APP.md`:
   - authorizes reading all drafts;
   - treats drafts as non-normative;
   - derives OpenSpec first;
   - stops after phase 2 by default;
   - preserves the Todo demo until implementation is approved;
   - requires security, privacy, architecture and tests.
5. Confirm OpenSpec checks allow an empty changes directory but validate every real change folder.
6. Confirm arc42 sections, ADR format and Mermaid/PlantUML source files pass documentation checks.

## Phase 9 — Git hooks and developer experience

1. Verify:

```bash
npm run hooks:install
git config --get core.hooksPath
```

2. Confirm `pre-commit` runs a reasonably fast gate.
3. Confirm `pre-push` runs all required tests, build, E2E and audit checks.
4. Test hook behavior in a temporary Git repository if practical.
5. Confirm Windows users can run hooks through Git for Windows/Git Bash; document limitations rather than adding platform-specific hidden behavior.
6. Verify VS Code recommendations, settings and workspace file.
7. Ensure the template can also be used without VS Code.

## Phase 10 — Dev Container and deployment

1. Build the Dev Container if Docker is available.
2. Verify its Node, npm, Python, Git and Playwright versions are compatible with the lockfile.
3. Verify `postCreateCommand` succeeds from a clean clone.
4. Verify ports 5173 and 4173 are correctly forwarded.
5. Run a production build with:

```bash
VITE_BASE_PATH=/web-app-template/ npm run build
```

6. Serve the `dist/` output under a subpath and verify assets resolve correctly.
7. Review GitHub Pages workflow permissions, concurrency, artifact path and base path.
8. Review CI, CodeQL, Dependency Review, Dependabot and Scorecard workflows for current valid action versions and least privilege.
9. Confirm `dist/` can be copied to another static host independently of the Lambro Code company website.
10. Document custom-domain/CNAME behavior without hard-coding `lambrocode.de` for every generated app.

## Phase 11 — final full gate

Run the complete repository gate from a clean state:

```bash
npm run ci
```

Then rerun:

```bash
npm audit --audit-level=high
```

Do not declare completion unless every enforceable check passes. If Docker, browser installation or external registry access is unavailable, distinguish a repository defect from an environment limitation and state the exact unverified command.

## Allowed changes

You may:

- fix source, tests, scripts, configuration and documentation;
- update dependencies to compatible supported releases;
- regenerate the lockfile and third-party notices;
- strengthen validation, tests, CSP and workflow permissions;
- improve the Todo demo only where needed to prove the template foundation;
- simplify unused generic dependencies.

Do not:

- implement Foldmark or another concrete product;
- remove the Todo demo;
- introduce a backend;
- add analytics, tracking or remote fonts;
- add secrets or real OAuth credentials;
- replace Vue/Vite/TypeScript without an explicit user decision;
- bypass failures with force flags or disabled checks.

## Required final report

End with a structured report containing:

1. **Environment** — versions and relevant limitations.
2. **Commands run** — exact commands and outcomes.
3. **Changes made** — files and reasons.
4. **Dependency status** — upgrades, audit result and remaining advisories.
5. **Test status** — unit, security, E2E and manual browser checks.
6. **Security/privacy status** — OWASP findings, CSP, network requests and data handling.
7. **Initializer status** — dry-run and temporary sample initialization result.
8. **Dev Container/deployment status** — build and GitHub Pages/subpath verification.
9. **Unresolved risks** — concrete, prioritized and honest.
10. **GitHub setup checklist** — template flag, Pages, branch rules, private vulnerability reporting, Dependabot, CodeQL and required checks.

## Definition of done

The repository is ready only when:

- a clean lockfile-based install succeeds;
- formatting, lint, type checking, unit/security tests and documentation gates pass;
- the production build succeeds;
- Playwright E2E tests pass;
- no unresolved high or critical known dependency vulnerability remains without documented acceptance;
- the initial app load makes no intentional third-party request;
- Git hooks and Dev Container behavior are verified;
- the initializer works reproducibly without damaging unrelated files;
- GitHub Pages subpath deployment works;
- generated notices and policy documentation are current;
- the generic Todo demo remains intact;
- the repository can be marked as a GitHub Template Repository.
