# Local verification — 2026-08-04

## Environment

- Windows 10.0.26200 x64, PowerShell 7
- Node.js 24.17.0, npm 11.13.0, Python 3.12.10, Git 2.55.0
- Playwright 1.62.1 with Chromium 151.0.7922.34
- Docker CLI 29.6.1, Docker Engine 29.6.2, Docker Desktop 4.84.0
- Verified container toolchain: Node.js 24.18.1, npm 11.16.0, Python 3.12.3

## Verified results

- `npm run workflow:local`: cleanly installed 279 dependencies and audited 280 package records with
  zero vulnerabilities. It then reproduced CI, Pages, Dependency Review policy, security, and
  repository checks through the shared workflow entry points.
- `npm run ci`: passed after the clean install. This includes Prettier, ESLint, Vue TSC, 14 Vitest
  tests in 6 files, structured-data parsing, template validation, 6 Python initializer tests,
  agent/documentation/OpenSpec/privacy/architecture/security/license checks, the production build, 9
  Chromium E2E tests, and `npm audit --audit-level=high`.
- Production output: 0.97 kB HTML, 70.49 kB CSS (11.92 kB gzip), and 342.34 kB JavaScript (115.48 kB
  gzip).
- `VITE_BASE_PATH=/web-app-template/ npm run test:e2e`: all 9 browser tests passed with assets and
  the generated notices link resolved below the repository subpath.
- The native pre-commit hook executed the fast verification gate successfully; the native pre-push
  hook then executed the complete shared `npm run workflow:ci` gate successfully. Hook installation
  selected `.githooks`, and the hook/shell files carry executable Git modes.
- No first-load third-party request or browser console error was observed. Browser tests also cover
  IndexedDB failure recovery, locale/theme persistence, system-theme preference, accessibility
  landmarks, input bounds, CRUD persistence, and the small-viewport privacy notice.
- License notices were regenerated from 278 installed package instances and passed the repository
  license policy.
- `npm run devcontainer:verify` completed a real Dev Containers CLI lifecycle, including the named
  `node_modules` volume and exact post-create command, and removed the verification container. It
  then built the Playwright 1.62.1 Noble image through the pinned CLI. Its isolated Linux workspace
  passed all 14 unit tests, the full production build, all 9 Chromium E2E tests, the subpath
  artifact validator, moderate/high audits, licenses, security, privacy, documentation, and workflow
  parity.

## Initializer regression

A repository copy under `C:\tmp` was initialized with the hostile-character sample fixture and then
installed and verified independently:

- application `Sample Notes <Safe>`, package `sample-notes`, and workspace
  `sample-notes.code-workspace` were synchronized;
- HTML attribute/text values were context-escaped and remained Prettier compliant;
- the supplied configuration became the canonical `template.config.json`;
- all 25 source files outside the intentionally generated runtime configuration remained byte
  identical;
- the copy passed its full `npm run ci`, including 14 unit tests, 6 initializer tests, 9 E2E tests,
  build, licenses, and an audit with zero vulnerabilities.

## Remaining external checks

- GitHub-hosted CI, CodeQL, Dependency Review, Scorecard, Pages deployment, repository settings, and
  branch rules cannot be proven locally. Verify them after push with
  `docs/github/TEMPLATE_REPOSITORY_SETUP.md`.
