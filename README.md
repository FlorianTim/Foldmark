# LumbreCode Web App Template

A reusable **GitHub Template Repository** for secure, privacy-first, local-first web applications
developed agentically with Vue, TypeScript, Vite, OpenSpec, arc42 and ADRs.

The repository intentionally contains a very small Todo demonstration. The demo proves that UI,
state, persistence, validation, themes, i18n, testing and deployment are wired correctly. It is only
removed when the template initializer is explicitly instructed to create a concrete application from
the material in `drafts/`.

## Verification status

The template was locally finalized on 2026-08-04 with Node 24.17.0 and npm 11.13.0. A clean install,
all repository gates, the production build, Chromium E2E tests, an initialized-copy regression,
subpath deployment behavior, dependency audit, and license generation passed. The Docker daemon and
live GitHub services were also tested where local execution is possible: the Dev Container passed
its post-create and portable workflow suite. Hosted Actions/CodeQL/Pages publication remains a
post-push check. See the
[`local verification report`](docs/release/LOCAL_VERIFICATION_2026-08-04.md).

## Quick start

```bash
npm ci --ignore-scripts
npm run hooks:install
npm run verify
npm run build
npm run dev
```

On Windows PowerShell:

```powershell
./scripts/bootstrap.ps1
```

On Linux/macOS:

```bash
./scripts/bootstrap.sh
```

## Create a concrete application

Using this repository as a GitHub Template Repository is the recommended start: each app receives an
independent repository and history while improvements continue in the original template.

1. Enable **Template repository** in this repository's GitHub settings.
2. Create a new repository with **Use this template**; do not fork it.
3. Put German raw requirements, notes and images into `drafts/notes/`, `drafts/assets/` and the
   planned-version folders. Do not put secrets or personal data there.
4. Adjust `template.config.json`. Keep `customDomain` as `auto` to derive
   `<slug>.webapps.lumbrecode.de`; for a Todo app with slug `todo`, this becomes
   `todo.webapps.lumbrecode.de`.
5. Apply and validate configuration:

```bash
python3 scripts/init-template.py --config template.config.json
npm run template:validate
```

6. Open the generated workspace in VS Code.
7. Select the `Template Initializer` custom agent or paste `docs/prompts/INITIALIZE_NEW_APP.md` into
   your coding agent.
8. Review the English product brief, requirements roadmap and OpenSpec change after phase 2 before
   implementation continues.

The initializer writes `public/CNAME`, but DNS and GitHub Pages' custom-domain/HTTPS settings remain
operator tasks. See [`GitHub Template Repository setup`](docs/github/TEMPLATE_REPOSITORY_SETUP.md).

## Local workflow parity

Run `npm run workflow:local` to reproduce every portable CI, Pages, dependency, security, and
repository-policy step from a clean install. With Docker running, `npm run devcontainer:verify`
builds the Dev Container through the pinned official CLI and executes its post-create command plus
the portable workflow suite inside Linux. The exact mapping and unavoidable GitHub-only boundaries
are documented in [`docs/development/LOCAL_WORKFLOWS.md`](docs/development/LOCAL_WORKFLOWS.md).

## Common commands

| Purpose                                   | Command                                              |
| ----------------------------------------- | ---------------------------------------------------- |
| Start development server                  | `npm run dev`                                        |
| Fast lint, types and unit tests           | `npm run verify:fast`                                |
| Full local CI                             | `npm run ci`                                         |
| All portable hosted-workflow checks       | `npm run workflow:local`                             |
| Build Pages artifact                      | `npm run workflow:pages`                             |
| Validate an existing `dist/` artifact     | `npm run artifact:check`                             |
| Build portable ZIP and checksum           | `npm run workflow:release`                           |
| Preview removable project data            | `npm run clean:dry-run`                              |
| Remove project build and Docker caches    | `npm run clean:all`                                  |
| Review advisories, signatures and updates | `npm run dependencies:check`                         |
| Validate version consistency              | `npm run version:check`                              |
| Validate the initializer                  | `npm run template:validate && npm run template:test` |
| Verify in the Dev Container               | `npm run devcontainer:verify`                        |

The static release format and extraction instructions are documented in
[`docs/deployment/STATIC_RELEASES.md`](docs/deployment/STATIC_RELEASES.md). Dependency review is in
[`docs/dependencies/UPDATE_WORKFLOW.md`](docs/dependencies/UPDATE_WORKFLOW.md). Shared mailboxes and
subject conventions are in [`docs/support/CONTACT_CHANNELS.md`](docs/support/CONTACT_CHANNELS.md).
Safe project cleanup and the explicitly confirmed system-wide Docker prune are documented in
[`docs/development/LOCAL_CLEANUP.md`](docs/development/LOCAL_CLEANUP.md).

## Configuration

Product-specific values live primarily in:

- `template.config.json` — source configuration for initialization.
- `src/config/app.config.json` — generated runtime-safe public configuration.
- `.env.example` — optional build-time values; never store secrets in `VITE_*` variables.
- `vite.config.ts` — deployment base path, normally resolved automatically in GitHub Actions.

The initializer updates package metadata, HTML metadata, the VS Code workspace, app configuration
and documentation context. Avoid manual global search-and-replace.

## Architecture

```text
Presentation (Vue, Pinia, i18n)
        ↓
Application (use cases, ports)
        ↓
Domain (entities, value objects, validation)
        ↑
Infrastructure (Dexie/IndexedDB, browser adapters)
```

Dependency direction is inward. Vue components do not access IndexedDB directly. Domain code does
not import Vue, Pinia, Dexie or browser APIs.

The generated source, runtime flow, public extension points, storage keys, and documentation policy
are described in [`docs/development/SOURCE_CODE.md`](docs/development/SOURCE_CODE.md). Exported
TypeScript APIs carry TSDoc and are checked by `npm run docs:check`.

## Agentic workflow

- `.github/copilot-instructions.md` contains repository-wide rules.
- `AGENTS.md` defines agent collaboration and delivery gates.
- `.github/agents/*.agent.md` contains discoverable custom agents for VS Code and GitHub Copilot.
- `.github/skills/*/SKILL.md` contains portable agent skills.
- `openspec/specs/` describes the accepted current system.
- `openspec/changes/` contains proposed changes before implementation.
- `docs/arc42/`, `docs/adr/` and `docs/architecture/diagrams/` stay synchronized with code.

GitHub and VS Code discover repository custom agents from `.github/agents` and skills from
`.github/skills`.

## Quality and security

The template includes:

- strict TypeScript
- ESLint security rules and unsafe DOM checks
- unit, security and browser-test foundations
- Content Security Policy and privacy checks
- no remote fonts, analytics or runtime CDN dependencies
- dependency review, CodeQL, Dependabot and OpenSSF Scorecard workflows
- generated third-party notices and license policy checks
- native Git hooks under `.githooks/`
- Dev Container for reproducible development
- GitHub Pages deployment
- advisory crawler exclusions and host-header examples
- a portable static ZIP plus SHA-256 checksum
- dependency registry-signature checks and Dependabot cooldowns

`pre-push` runs the complete shared `npm run workflow:ci` gate. To bypass a hook in a genuine
emergency, use Git's standard `--no-verify` option and document the reason in the pull request.

## Privacy

The default application intentionally performs no third-party network requests. Optional connectors
must be separate lazy-loaded capabilities with explicit consent. It sets no cookies, loads no remote
fonts, and provides direct deletion of app-owned local data. Read [PRIVACY.md](PRIVACY.md) and the
[`EU privacy and accessibility baseline`](docs/compliance/EU_PRIVACY_ACCESSIBILITY_BASELINE.md).

Crawler directives are only requests to cooperative bots. They do not make a public static app
private, and client-side “human detection” is not a reliable security boundary. Apps with non-public
data need server-side authentication or an access gateway; see
[`crawlers and access control`](docs/security/CRAWLER_AND_ACCESS_CONTROL.md).

## Continuous template improvement

`drafts/notes/new-feature-ideas.md` is the versioned idea inbox. During specification, accepted
ideas become the English [`requirements roadmap`](docs/product/requirements_roadmap.md). Generated
apps use the `capture-template-feedback` repository skill to record sanitized, reproducible template
problems under `docs/template-feedback/` and propose them back to the original template. See
[`IDEA_TO_ROADMAP.md`](docs/product/IDEA_TO_ROADMAP.md).

Template version is stored in `VERSION`; application version remains in `template.config.json` and
package metadata. Record both released and planned changes in [CHANGELOG.md](CHANGELOG.md).

## License

Template code is MIT licensed. Generated third-party notices are available in `public/` after
dependency installation.
