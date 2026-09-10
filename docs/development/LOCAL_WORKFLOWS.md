# Local workflow parity

Every portable GitHub workflow step uses a versioned npm entry point that can be executed from the
same checkout. `scripts/check-workflow-parity.mjs` parses the workflow YAML, package scripts,
license policy, and Dev Container configuration to prevent those entry points from drifting.

## Commands

| GitHub job                | Local command                                                        | Scope                                                                                     |
| ------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Continuous integration    | `npm run workflow:prepare` then `npm run workflow:ci`                | Clean install, Chromium, full CI with repository subpath                                  |
| Pages build               | `npm run workflow:prepare` then `npm run workflow:pages`             | Full CI plus validation of `dist/`, hashed assets, notices, and base-aware URLs           |
| Dependency Review         | `npm run workflow:install` then `npm run workflow:dependency-review` | Moderate-severity audit, complete installed tree, notices, and the same license allowlist |
| CodeQL portable checks    | `npm run workflow:security`                                          | Security-focused lint rules, configuration checks, and negative security tests            |
| Scorecard portable checks | `npm run workflow:repository`                                        | Workflow parity, structured files, documentation, and privacy policy checks               |
| Static release            | `npm run workflow:release`                                           | Pages-equivalent full CI, root-level ZIP, manifest and SHA-256 checksum                   |
| All portable checks       | `npm run workflow:local`                                             | Clean preparation, every portable check, and the static release package                   |
| Dev Container             | `npm run devcontainer:verify`                                        | Official CLI lifecycle/post-create, isolated image build, and portable Linux checks       |

With a configured custom domain, the default base is `/`; without one it is `/<repositoryName>/`.
`VITE_BASE_PATH` can override that value. It must be `/` or a safe absolute path ending in `/`, for
example:

```powershell
$env:VITE_BASE_PATH = '/preview/'
npm run workflow:pages
```

```bash
VITE_BASE_PATH=/preview/ npm run workflow:pages
```

The Dev Container keeps Linux `node_modules` in a named volume so opening it cannot overwrite host
binaries. The verification command removes its lifecycle and workflow containers automatically. It
retains the tagged image `<application-slug>-devcontainer:local`; the Dev Containers CLI can also
retain its generated alias and the named `node_modules` cache volume for reuse. Because a first-time
Playwright image build and the isolated dependency install need temporary Docker storage, the
verification command requires at least 5 GiB free on the workspace volume and fails before starting
Docker when that safety margin is unavailable.

After local verification, `npm run clean:all` removes reproducible repository artifacts and
project-scoped Docker resources. See [`LOCAL_CLEANUP.md`](LOCAL_CLEANUP.md) for dry-run, deep-clean,
and explicitly confirmed system-wide Docker options.

Playwright uses its pinned Chromium build by default. On a constrained local machine that already
has a supported browser installed, set `PLAYWRIGHT_BROWSER_CHANNEL=msedge` or
`PLAYWRIGHT_BROWSER_CHANNEL=chrome` before `workflow:prepare` or `workflow:local`. The preparation
step then skips the browser download and the end-to-end suite uses the selected installed browser.
GitHub Actions and the Dev Container deliberately keep using the pinned Chromium build.

## GitHub-only boundaries

Some hosted controls cannot be reproduced exactly without GitHub event data or credentials:

- Dependency Review additionally compares the pull-request lockfile delta against GitHub advisory
  data for public repositories. Private repositories always run the complete-graph fallback and can
  opt into the GitHub delta action with the repository variable `DEPENDENCY_REVIEW_ENABLED=true`
  after GitHub Advanced Security and the dependency graph have been enabled.
- CodeQL publishes a GitHub-managed database and SARIF result for public repositories. Private
  repositories always run the portable security baseline and can enable analysis with the repository
  variable `CODEQL_ENABLED=true` after GitHub Advanced Security/code scanning is available. The
  local command covers repository-owned rules and tests; enabled hosted CodeQL remains authoritative
  for its query suite.
- Scorecard evaluates branch protection and uses OIDC to publish results. The local repository
  command checks only facts present in the checkout.
- Pages upload and deployment require the GitHub Pages environment. `workflow:pages` produces and
  validates the exact `dist/` directory uploaded by the workflow.
- Artifact upload requires GitHub storage. `workflow:release` produces the same `release/` files
  locally that the hosted workflow uploads.

These boundaries are service behavior, not missing build steps. A local success is required before
push, and the hosted checks remain required after the branch is pushed.
