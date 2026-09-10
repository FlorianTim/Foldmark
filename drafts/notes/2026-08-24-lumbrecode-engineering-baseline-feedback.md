# Engineering Baseline Feedback: FlorianTim/web-app-template

> Übergabedokument für `FlorianTim/lumbrecode-engineering`
>
> Analysierter Stand: 2026-08-24, Branch `agent/finalize-template-workflow-parity`, Commit
> `fba50477e0131e354c1378bf13f0c7ef06e66f2d`
>
> Diese Analyse wurde ausschließlich aus dem lokalen Repository abgeleitet. GitHub-Einstellungen,
> Environments, Secrets, Rulesets und der aktuelle Zustand entfernter Dienste wurden nicht
> verifiziert. Datenschutz- und Rechtstexte werden ausdrücklich nicht als rechtlich freigegeben
> bewertet.

## Zweck dieses Dokuments

Dieses Dokument beschreibt, welche Regeln, Workflows, Skills, Agenten, Schemas und Skripte aus dem
Repository `FlorianTim/web-app-template` in eine gemeinsame Engineering-Baseline übernommen werden
können, was zwingend repositoriespezifisch bleiben muss und welche Konflikte bei einer
Synchronisation mit dem privaten Repository `FlorianTim/lumbrecode-engineering` zu erwarten sind.

Es unterscheidet konsequent zwischen:

- **Fakt:** direkt im analysierten Checkout belegt;
- **Ableitung:** Schlussfolgerung aus mehreren belegten Repository-Fakten;
- **Empfehlung:** vorgeschlagene Ausgestaltung der zentralen Baseline;
- **Annahme/offene Frage:** nicht aus dem Checkout abschließend klärbar.

Codeblöcke sind entweder als **bestehender Repository-Ausschnitt** oder als **empfohlener
Zielentwurf** gekennzeichnet. Zielentwürfe sind keine bereits vorhandene Implementierung.

## Executive Summary

### Gesamtbewertung

**Empfohlenes Baseline-Profil: `webapp`.**

Das Repository ist ein einzelnes, privates npm-Paket und dient als generisches Vue-/TypeScript-
Webapp-Template. Es enthält bereits eine ungewöhnlich umfassende Engineering-Basis aus lokalen
Qualitätskommandos, GitHub-Workflows, OpenSpec, arc42, ADRs, Security-/Privacy-Prüfungen,
Lizenzkontrolle, lokal reproduzierbaren Workflow-Einstiegspunkten, Dev Container, Git Hooks, Custom
Agents und Skills.

Die beste Übernahmestrategie ist keine vollständige Zentralisierung, sondern eine Schichtung:

1. **`common`** enthält technologieunabhängige Regeln und Prüfmuster.
2. **`webapp`** ergänzt Node/npm, Browser-, Vue-/TypeScript-, Vite-, Playwright- und statische
   Hosting-Regeln.
3. **Repository-Overlay** enthält Produktidentität, Todo-Demo, konkrete OpenSpec-Inhalte,
   Dateninventar, Threat Model, Public-Site-Inhalte und konkrete Deploymentziele.

Die zentrale Baseline darf keine dauerhafte Laufzeitabhängigkeit erzeugen. Ein Coding-Agent muss
nach dem Checkout ohne Zugriff auf `lumbrecode-engineering` alle Anweisungen lesen, alle lokalen
Gates ausführen und die Architektur verstehen können. Zentrale Aktualisierungen sollten deshalb
versionierte Kopien oder generierte Dateien in dieses Repository synchronisieren und anschließend
als überprüfbarer Pull Request erscheinen.

### Wichtigste übernehmbare Komponenten

- Lokale Einstiegspunkte für alle portablen GitHub-Workflowteile.
- Strukturelle Prüfung, dass Workflows und lokale Kommandos nicht auseinanderlaufen.
- Least-Privilege-Berechtigungen in GitHub Actions.
- Getrennte portable und GitHub-only Security-/Dependency-Prüfungen.
- OpenSpec-/arc42-/ADR-basierte Source-Priority.
- Security-, Privacy-, Architektur-, Lizenz- und Dokumentationschecks.
- Statisches Releaseformat mit ZIP, Manifest und SHA-256-Prüfsumme.
- Agentenrollen für Architektur, Security, Privacy, QA und Release.
- Skills für OpenSpec, ADRs, Security, Privacy und Release-Gates.

### Wichtigste Konflikte vor einer Synchronisation

1. Die analysierte Baseline liegt nicht auf `main`, sondern auf
   `agent/finalize-template-workflow-parity`.
2. Der lokale Branch ist zwei Commits vor `origin/agent/finalize-template-workflow-parity`; `main`
   und `origin/main` stehen weiterhin beim initialen Commit `7e1600a`.
3. Im lokalen Checkout existieren keine Tags, obwohl `CHANGELOG.md` `v1.0.0` referenziert.
4. Es bestehen Identitätsreste und Widersprüche zwischen `LumbreCode`, `Lambro Code`,
   `lambro-web-app-template`, `Foldmark`, `LumbreCodeToDo` und `CHANGE_ME`.
5. `docs/public-site/` fehlt, obwohl die Anwendung öffentliche Support-, FAQ-, Datenschutz-, Lösch-,
   Changelog- und Lizenz-URLs erzeugt.
6. `public/api/openapi.yaml` enthält einen Foldmark-spezifischen zukünftigen API-Vertrag und wird
   als statisches öffentliches Asset ausgeliefert.
7. Es gibt keinen dedizierten automatisierten Accessibility-Gate.
8. Agenten und Skills sind primär für VS Code/GitHub Copilot abgelegt; eine universell erkannte
   lokale Skill-Ablage fehlt.
9. Zwei OpenSpec-Changes liegen weiterhin unter `openspec/changes/`; einer enthält noch eine offene
   Abschlussaufgabe.
10. Action-Versionen werden über Major-/Versions-Tags statt über vollständige Commit-SHAs
    referenziert und zusätzlich im Paritätsskript hart verdrahtet.

## Repository Profile

### Identität und Zweck

| Eigenschaft         | Befund                                                                                         | Evidenz                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Repository          | `FlorianTim/web-app-template`                                                                  | `origin` zeigt auf `https://github.com/FlorianTim/web-app-template.git` |
| Name                | LumbreCode Web App Template                                                                    | `README.md`, `package.json`                                             |
| Zweck               | Wiederverwendbares, privacy-first und local-first Webapp-Template mit austauschbarer Todo-Demo | `README.md`, `openspec/project.md`, ADR 0004                            |
| Repository-Typ      | `webapp`                                                                                       | Vue-/Vite-Browser-SPA, statisches Hosting                               |
| npm-Paket           | `web-app-template`, Version `0.1.0`, `private: true`                                           | `package.json`                                                          |
| Template-Version    | `1.0.0`                                                                                        | `VERSION`, `template.config.json`                                       |
| Struktur            | Einzelprojekt                                                                                  | ein Root-`package.json`, kein Workspace-/Monorepo-Manifest              |
| Default-Branch      | `main`                                                                                         | lokales `origin/HEAD -> origin/main`                                    |
| Analysierter Branch | `agent/finalize-template-workflow-parity`                                                      | Git-Metadaten                                                           |

`private: true` in `package.json` verhindert eine versehentliche npm-Veröffentlichung. Daraus kann
nicht auf die Sichtbarkeit des GitHub-Repositories geschlossen werden.

### Hauptsprachen und Frameworks

- TypeScript und Vue Single File Components bilden die Anwendung.
- JavaScript/MJS orchestriert npm- und Workflow-Aufgaben.
- Dependency-freie Python-Skripte validieren Konfiguration, Architektur, Dokumentation, Privacy,
  Security, Versionen und Packaging.
- Markdown, YAML, JSON, CSS, Shell, PowerShell, Mermaid und PlantUML bilden Dokumentation und
  Automation.
- Runtime-Frameworks: Vue 3, Pinia, Vue I18n, Dexie und Zod.
- Build/UI: Vite, Tailwind CSS und daisyUI.
- Qualität: ESLint, Prettier, Vue TSC, Vitest/jsdom und Playwright/Chromium.

### Bestehender Paket- und Toolchain-Vertrag

**Bestehender Repository-Ausschnitt aus `package.json`:**

```json
{
  "name": "web-app-template",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Secure, privacy-first, local-first Vue web application template for agentic development.",
  "license": "MIT",
  "engines": {
    "node": ">=24.15.0",
    "npm": ">=11.0.0"
  }
}
```

Weitere Pins:

```text
.nvmrc:          24
.python-version: 3.12
```

**Ableitung:** Die zentrale `webapp`-Baseline sollte Versionsdateien als Workflow-Inputs verwenden,
nicht eigene, davon unabhängige Versionsnummern hardcodieren.

### Primäre Plattformen

- Browser-SPA auf statischem Hosting.
- GitHub Pages mit Custom Domain oder Repository-Unterpfad.
- Portables ZIP für andere HTTPS-Webroots.
- Lokale Entwicklung auf Windows/PowerShell und Linux/macOS-Shell.
- CI auf GitHub Actions `ubuntu-latest`.
- Dev Container auf `mcr.microsoft.com/playwright:v1.62.1-noble`.

Nicht vorhanden sind Flutter-, Dart-, Melos-, Astro- oder Library-spezifische Projektmanifeste.
`Makefile`, `melos.yaml`, `pubspec.yaml` und `.github/actions/` fehlen.

## Evidence and Authoritative Sources

### Repositoryeigene Quellenpriorität

**Bestehender Repository-Ausschnitt aus `AGENTS.md`:**

```markdown
## Source priority

1. Explicit user instruction.
2. Accepted OpenSpec specifications in `openspec/specs/`.
3. Active change under `openspec/changes/`.
4. ADRs and arc42.
5. `template.config.json` and repository conventions.
6. Raw material in `drafts/` is input, not normative after specifications have been derived.
```

Diese Prioritätsregel ist weitgehend zentral wiederverwendbar. Repositoriespezifisch sind die
konkreten Pfade und die besondere Rolle von `drafts/` bei der Template-Initialisierung.

### Maßgebliche Quellen je Themenbereich

| Themenbereich           | Maßgebliche Dateien                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| Identität               | `README.md`, `package.json`, `template.config.json`, `openspec/project.md`                |
| Qualitätskommandos      | `package.json`, `vite.config.ts`, `playwright.config.ts`, `eslint.config.js`              |
| Hosted Automation       | `.github/workflows/*.yml`, `.github/dependabot.yml`                                       |
| Lokale Workflow-Parität | `scripts/run-local-workflow.mjs`, `scripts/check-workflow-parity.mjs`                     |
| Architektur             | `AGENTS.md`, `openspec/specs/`, `docs/arc42/`, `docs/adr/`                                |
| Agenten                 | `.github/copilot-instructions.md`, `.github/agents/`, `.github/skills/`                   |
| Security                | `SECURITY.md`, `docs/security/`, `scripts/check-security-config.py`, Security-Tests       |
| Privacy                 | `PRIVACY.md`, `docs/privacy/`, `scripts/check-privacy.py`                                 |
| Release                 | `VERSION`, `CHANGELOG.md`, `scripts/package-release.py`, Release-Workflow                 |
| Public Content          | `src/config/publicResources.ts`, `docs/product/`, `PRIVACY.md`, `CHANGELOG.md`, `public/` |

### Grenzen dieser Analyse

- GitHub Repository Settings, Branch Rules, Pages-Konfiguration, Environments und Secret-Namen
  außerhalb des Codes sind nicht aus dem Checkout belegbar.
- Remote-Refs bilden nur den zuletzt lokal bekannten Zustand ab.
- Der Bericht `docs/release/LOCAL_VERIFICATION_2026-08-04.md` belegt frühere Ausführungen, nicht
  automatisch den Zustand jedes späteren Commits.
- Es wurde keine rechtliche Prüfung vorgenommen.
- Das Zielrepository `lumbrecode-engineering` wurde nicht gelesen; Aussagen über seine konkrete
  derzeitige Struktur wären daher Annahmen.

## Existing Quality Commands

### Vollständige Kommandoliste

| Kategorie               | Befehl                          | Ableitung/Quelle                           | Bemerkung                               |
| ----------------------- | ------------------------------- | ------------------------------------------ | --------------------------------------- |
| Format schreiben        | `npm run format`                | `package.json`                             | `prettier --write .`; verändert Dateien |
| Prettier prüfen         | `npm run format:prettier-check` | `package.json`                             | `prettier --check .`                    |
| Text-Hygiene            | `npm run format:check`          | `package.json`, `scripts/check-format.py`  | finale Newline, trailing whitespace     |
| Lint                    | `npm run lint`                  | `package.json`, `eslint.config.js`         | ESLint mit Security-/Vue-Regeln         |
| Typprüfung              | `npm run typecheck`             | `package.json`                             | `vue-tsc -b --pretty false`             |
| Architektur             | `npm run architecture:check`    | `scripts/check-architecture.py`            | Importgrenzen Domain/Application        |
| Unit-/Adaptertests      | `npm test`                      | `package.json`, `vite.config.ts`           | Vitest, jsdom                           |
| Watch-Tests             | `npm run test:watch`            | `package.json`                             | Vitest Watch Mode                       |
| Coverage                | `npm run test:coverage`         | `package.json`                             | Vitest/V8 Coverage                      |
| Komponententests        | kein eigener Befehl             | Testinventar, Dependencies                 | kein `@vue/test-utils`                  |
| Integrationstests       | kein eigener Befehl             | Testinventar                               | Adaptertests laufen unter Vitest        |
| E2E                     | `npm run test:e2e`              | `playwright.config.ts`                     | Chromium gegen Build/Preview            |
| Template-Generierung    | `npm run template:init`         | `scripts/init-template.py`                 | synchronisiert Identität                |
| Template-Validierung    | `npm run template:validate`     | `scripts/validate-template.py`             | prüft generierte Ziele                  |
| Initializer-Tests       | `npm run template:test`         | `scripts/tests/`                           | Python `unittest`                       |
| Dokumentgenerierung     | `npm run docs:generate`         | `scripts/generate-docs.py`                 | Diagrammindex                           |
| Dokumentprüfung         | `npm run docs:check`            | `scripts/check-docs.py`                    | Pflichtdateien, ADRs, TSDoc             |
| OpenSpec                | `npm run openspec:check`        | `scripts/check-openspec.py`                | Spezifikationen und Change-Struktur     |
| Privacy                 | `npm run privacy:check`         | `scripts/check-privacy.py`                 | verbotene Domains/Tracker               |
| Security-Konfiguration  | `npm run security:check`        | `scripts/check-security-config.py`         | CSP, Robots, Header, Policies           |
| Security-Suite          | `npm run workflow:security`     | `scripts/run-local-workflow.mjs`           | Lint, Security-Konfig, Negativtests     |
| Versionen               | `npm run version:check`         | `scripts/check-versioning.py`              | Template-/App-Versionen                 |
| Lizenzgenerierung       | `npm run licenses:generate`     | `scripts/generate-third-party-notices.mjs` | installierte Paketmetadaten             |
| Lizenzprüfung           | `npm run licenses:check`        | `scripts/check-licenses.py`                | Policy-Allowlist                        |
| Dependency-Prüfung      | `npm run dependencies:check`    | `scripts/check-dependencies.mjs`           | Audit, Signaturen, Tree, Outdated       |
| High-Audit              | `npm run audit`                 | `package.json`                             | `npm audit --audit-level=high`          |
| Produktionsbuild        | `npm run build`                 | `package.json`                             | Vue TSC und Vite                        |
| Pages-Artefakt          | `npm run workflow:pages`        | `scripts/run-local-workflow.mjs`           | CI plus Artefaktprüfung                 |
| Release                 | `npm run workflow:release`      | `scripts/package-release.py`               | ZIP plus SHA-256                        |
| Schneller Gate          | `npm run verify:fast`           | `package.json`                             | Format, Lint, Typen, Unit-Tests         |
| Vollständiger Gate      | `npm run ci`                    | `package.json`                             | Verify, Build, E2E, Audit               |
| Portable Workflow-Suite | `npm run workflow:local`        | `scripts/run-local-workflow.mjs`           | lokale Hosted-Parität                   |
| Dev Container           | `npm run devcontainer:verify`   | `scripts/run-local-workflow.mjs`           | Linux- und Lifecycle-Prüfung            |
| Accessibility           | kein eigener Befehl             | `package.json`, Tests                      | nur Teilaspekte in E2E                  |

### Bestehende npm-Orchestrierung

**Bestehender Repository-Ausschnitt aus `package.json`:**

```json
{
  "scripts": {
    "build": "vue-tsc -b && vite build",
    "typecheck": "vue-tsc -b --pretty false",
    "lint": "eslint . --max-warnings=0",
    "format": "prettier --write .",
    "format:check": "node scripts/run-python.mjs scripts/check-format.py",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "privacy:check": "node scripts/run-python.mjs scripts/check-privacy.py",
    "architecture:check": "node scripts/run-python.mjs scripts/check-architecture.py",
    "security:check": "node scripts/run-python.mjs scripts/check-security-config.py",
    "licenses:check": "node scripts/run-python.mjs scripts/check-licenses.py",
    "dependencies:check": "node scripts/check-dependencies.mjs",
    "verify:fast": "npm run format:prettier-check && npm run lint && npm run typecheck && npm run test",
    "verify": "npm run verify:fast && npm run structured:check && npm run workflow:check && npm run template:validate && npm run template:test && npm run version:check && npm run agents:check && npm run docs:check && npm run openspec:check && npm run privacy:check && npm run architecture:check && npm run security:check && npm run licenses:generate && npm run licenses:check",
    "ci": "npm run verify && npm run build && npm run test:e2e && npm run audit"
  }
}
```

**Empfehlung:** Die zentralen Workflows sollen ausschließlich diese lokalen Einstiegspunkte
aufrufen. Die fachliche Befehlsdefinition bleibt im Repository; das zentrale Repository koordiniert
Runner, Berechtigungen, Caching und standardisierte Artefakte.

### Architekturprüfung

**Bestehender Repository-Ausschnitt aus `scripts/check-architecture.py`:**

```python
rules = {
    'src/domain': [
        r"from ['\"](?:\.\./)*application",
        r"from ['\"](?:\.\./)*infrastructure",
        r"from ['\"](?:\.\./)*presentation",
        r"from ['\"]vue",
        r"from ['\"]dexie",
    ],
    'src/application': [
        r"from ['\"](?:\.\./)*presentation",
        r"from ['\"]vue",
        r"from ['\"]dexie",
    ],
}
```

Die Idee ist für `webapp` wiederverwendbar, die konkreten Ordner und Framework-Verbote sind jedoch
Repository- beziehungsweise Profilparameter. Eine zentrale Version sollte Regeln aus einer lokalen
Konfiguration lesen und weiterhin vollständig offline laufen können.

### Security- und Privacy-Prüfung

**Bestehender Repository-Ausschnitt aus `eslint.config.js`:**

```javascript
{
  files: ['**/*.{ts,vue}'],
  plugins: { security, 'no-unsanitized': noUnsanitized },
  rules: {
    ...security.configs.recommended.rules,
    'no-unsanitized/method': 'error',
    'no-unsanitized/property': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    'vue/no-v-html': 'error',
    'security/detect-object-injection': 'off',
  },
}
```

**Bestehender Repository-Ausschnitt aus `scripts/check-privacy.py`:**

```python
patterns = [
    r'fonts\.googleapis\.com',
    r'fonts\.gstatic\.com',
    r'googletagmanager\.com',
    r'google-analytics\.com',
    r'unpkg\.com',
    r'cdn\.jsdelivr\.net',
    r'cdnjs\.cloudflare\.com',
    r'hotjar\.com',
    r'sentry\.io',
    r'document\.cookie',
]
```

**Bewertung:** Diese Kontrollen sind nützlich, aber keine vollständige Netzwerk- oder
Datenschutzanalyse. Eine Blacklist erkennt unbekannte Ziele, indirekte SDK-Telemetrie und
konfigurationsabhängige Requests nicht zuverlässig. Der E2E-Test auf unerwartete externe Requests
ist deshalb eine wichtige zweite Kontrollebene.

### Accessibility-Lücke

Die E2E-Suite prüft unter anderem grundlegende Landmarks, Tastatur-/Darstellungsaspekte und einen
kleinen Viewport. Es existiert jedoch kein eigenes `accessibility:check`, kein axe/pa11y-Runner und
kein maschinenlesbarer WCAG-Gate.

**Empfohlener Zielentwurf für das lokale Repository:**

```json
{
  "scripts": {
    "accessibility:check": "playwright test tests/e2e/accessibility.spec.ts",
    "verify": "npm run verify:fast && npm run accessibility:check && npm run structured:check"
  }
}
```

Das konkrete Werkzeug und WCAG-Ziel müssen vor Implementierung fachlich festgelegt werden. Ein
automatisierter Scanner ersetzt keine manuelle Accessibility-Prüfung und keine rechtliche Bewertung,
ob und welche regulatorischen Anforderungen gelten.

## Existing Workflows and Automation

### Workflowübersicht

| Datei                                     | Trigger                            | Portable lokale Entsprechung        | GitHub-only-Anteil     |
| ----------------------------------------- | ---------------------------------- | ----------------------------------- | ---------------------- |
| `.github/workflows/ci.yml`                | Push `main`, PR, manuell           | `workflow:prepare`, `workflow:ci`   | Artefaktupload         |
| `.github/workflows/codeql.yml`            | Push `main`, PR, Montag            | `workflow:security`                 | CodeQL-Datenbank/SARIF |
| `.github/workflows/dependency-review.yml` | PR                                 | `workflow:dependency-review`        | PR-Delta-Review        |
| `.github/workflows/deploy-pages.yml`      | Push `main`, manuell               | `workflow:pages`                    | Pages Upload/Deploy    |
| `.github/workflows/release.yml`           | `v*`-Tag, manuell                  | `workflow:release`                  | Actions-Artefaktupload |
| `.github/workflows/scorecard.yml`         | Branchregel, Dienstag, Push `main` | `workflow:repository` nur teilweise | Scorecard/OIDC/SARIF   |

### Continuous Integration

**Bestehender Repository-Ausschnitt aus `.github/workflows/ci.yml`:**

```yaml
name: Continuous integration
on: { push: { branches: [main] }, pull_request: {}, workflow_dispatch: {} }
permissions: { contents: read }
jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version-file: .nvmrc, cache: npm }
      - uses: actions/setup-python@v6
        with: { python-version-file: .python-version }
      - run: npm run workflow:prepare
      - run: npm run workflow:ci
      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v7
        with: { name: playwright-report, path: playwright-report/, if-no-files-found: ignore }
```

Der Workflow eignet sich als Vorlage für ein zentrales `webapp-ci`. Der Trigger sollte jedoch im
Anwendungsrepository bleiben, damit Branchmodell und Ereignisse explizit lokal sichtbar bleiben.

### CodeQL mit portablem Fallback

**Bestehender Repository-Ausschnitt:**

```yaml
jobs:
  portable-security:
    name: Portable security baseline
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version-file: .nvmrc, cache: npm }
      - uses: actions/setup-python@v6
        with: { python-version-file: .python-version }
      - run: npm run workflow:install
      - run: npm run workflow:security

  analyze:
    if: github.event.repository.visibility == 'public' || vars.CODEQL_ENABLED == 'true'
    permissions:
      actions: read
      contents: read
      security-events: write
```

Das Muster ist zentral wertvoll: Repositoryeigene Security-Prüfungen laufen immer, während ein
lizenz-/plattformabhängiger Hosted-Service explizit zugeschaltet wird.

### Dependency Review

**Bestehender Repository-Ausschnitt:**

```yaml
- name: Audit complete dependency graph and licenses
  run: npm run workflow:dependency-review

- name: Review dependency changes
  if: github.event.repository.private == false || vars.DEPENDENCY_REVIEW_ENABLED == 'true'
  uses: actions/dependency-review-action@v5
  with:
    fail-on-severity: moderate
    allow-licenses: >-
      MIT, MIT-0, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, CC0-1.0, BlueOak-1.0.0,
      Python-2.0, MPL-2.0, EPL-2.0, LGPL-2.1-only, LGPL-3.0-only, OFL-1.1, Unicode-3.0
```

Die lokale Policy und die Workflow-Allowlist werden durch `check-workflow-parity.mjs` verglichen.
Das verhindert Drift, koppelt die Implementierung aber an eine konkrete Workflow-Struktur.

### Pages-Deployment

**Bestehender Repository-Ausschnitt:**

```yaml
jobs:
  build:
    permissions: { contents: read }
    steps:
      - run: npm run workflow:prepare
      - run: npm run workflow:pages
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with: { path: dist }
  deploy:
    permissions: { pages: write, id-token: write }
    environment: { name: github-pages, url: '${{ steps.deployment.outputs.page_url }}' }
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

Die Schreib- und OIDC-Berechtigungen sind auf den Deploy-Job begrenzt. Custom Domain, `CNAME`, DNS,
HTTPS und tatsächliche Pages-Einstellungen bleiben bewusst operator- beziehungsweise
repositoryspezifisch.

### Statisches Release

**Bestehender Repository-Ausschnitt aus `.github/workflows/release.yml`:**

```yaml
on:
  workflow_dispatch: {}
  push:
    tags: ['v*']

permissions: { contents: read }

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version-file: .nvmrc, cache: npm }
      - uses: actions/setup-python@v6
        with: { python-version-file: .python-version }
      - run: npm run workflow:prepare
      - run: npm run workflow:release
      - uses: actions/upload-artifact@v7
        with:
          name: static-release
          path: release/*
          if-no-files-found: error
```

Das erzeugte ZIP enthält den deploybaren Site-Root, `release-manifest.json` und `DEPLOYMENT.txt`.
Daneben wird eine `.zip.sha256`-Datei erzeugt. Der Workflow veröffentlicht jedoch kein GitHub
Release und signiert weder Manifest noch Artefakt.

### Lokale Workflow-Parität

**Bestehender Repository-Ausschnitt aus `scripts/run-local-workflow.mjs`:**

```javascript
function ci() {
  verifyToolchain();
  const base = resolveBasePath();
  npm(['run', 'ci'], { env: { VITE_BASE_PATH: base } });
}

function pages() {
  verifyToolchain();
  const base = resolveBasePath();
  npm(['run', 'ci'], { env: { VITE_BASE_PATH: base } });
  verifyStaticBuild(base);
}

function dependencyReview() {
  verifyToolchain();
  npm(['run', 'dependencies:check']);
  npm(['run', 'licenses:generate']);
  npm(['run', 'licenses:check']);
}

function securityReview() {
  verifyToolchain();
  npm(['run', 'lint']);
  npm(['run', 'security:check']);
  npmExec(['vitest', 'run', 'tests/security']);
}

function repositoryReview() {
  verifyToolchain();
  npm(['run', 'workflow:check']);
  npm(['run', 'structured:check']);
  npm(['run', 'docs:check']);
  npm(['run', 'privacy:check']);
}
```

Dieses Muster sollte ein Kernbestandteil der zentralen Baseline werden: Hosted Workflows rufen
lokale, versionierte Befehle auf. GitHub-only-Funktionen werden dokumentiert und nicht fälschlich
als lokal identisch dargestellt.

### Actions-Pinning und Versionspflege

Alle vorhandenen Actions werden über Versions-/Major-Tags referenziert, beispielsweise
`actions/checkout@v6` oder `github/codeql-action/analyze@v4`. Das ist leichter wartbar, aber weniger
stark gegen Tag-Manipulation abgesichert als vollständige Commit-SHA-Pins.

**Empfehlung:** Das zentrale Repository sollte Action-Versionen an einer Stelle verwalten und
vollständige SHAs plus lesbaren Versionskommentar synchronisieren.

**Empfohlener Zielentwurf:**

```yaml
- name: Checkout
  uses: actions/checkout@<FULL_COMMIT_SHA> # vX.Y.Z
```

Die tatsächlichen SHAs müssen über eine kontrollierte Update- und Review-Pipeline ermittelt werden;
dieses Dokument erfindet keine Werte.

### Risiken in Hilfsskripten

- `cleanup-local.mjs` schützt Repositorygrenzen für Dateilöschungen und beschränkt Docker-Cleanup
  standardmäßig über Projektlabels.
- `docker system prune --all --volumes --force` ist vorhanden, verlangt aber explizit
  `--confirm-system-prune`. Dieser Modus darf niemals von CI oder einem automatisch ausgelösten
  Agenten-Gate verwendet werden.
- `package-source.py` schreibt ein ZIP in das übergeordnete Verzeichnis des Repositories. Das kann
  in eingeschränkten Agenten-Sandboxes scheitern und sollte als konfigurierbarer Output behandelt
  werden.
- `scripts/check-workflow-parity.mjs` prüft `bootstrap.sh`, aber nicht `bootstrap.ps1`.
- Der Windows-Bootstrap führt eine andere Sequenz als `bootstrap.sh` aus.

## Existing Agent Instructions and Skills

### Inventar

Vorhanden:

- `AGENTS.md`
- `.github/copilot-instructions.md`
- zehn Dateien unter `.github/agents/*.agent.md`
- acht Skills unter `.github/skills/*/SKILL.md`

Nicht vorhanden:

- `CLAUDE.md`
- `GEMINI.md`
- `.github/instructions/`
- `.agents/skills/`
- `.claude/skills/`
- pfadspezifische weitere `AGENTS.md`

### Repositoryweite Regeln

**Bestehender Repository-Ausschnitt aus `.github/copilot-instructions.md`:**

```markdown
Use TypeScript strict mode and Vue Composition API with `<script setup lang="ts">`. Preserve the
layered/hexagonal architecture described in `AGENTS.md`.

Before implementing a non-trivial feature, read `AGENTS.md`, `template.config.json`, relevant
OpenSpec files, ADRs and the nearest `AGENTS.md`. Create an OpenSpec change when user-visible
behavior, persistence, trust boundaries, architecture or public contracts change.

Never introduce remote fonts, runtime CDN resources, analytics, telemetry or external connectors by
default. Never store secrets in frontend source or `VITE_*` variables. Treat imported content as
untrusted and avoid unsafe DOM APIs.

Run `npm run verify:fast` during implementation and `npm run ci` before declaring completion.
```

Die Regeln sind fachlich sinnvoll, überschneiden sich aber teilweise mit `AGENTS.md`. Eine zentrale
Baseline sollte einen kanonischen Regelkern erzeugen und tool-spezifische Dateien nur als kurze
Adapter verwenden.

### Custom Agents

Vorhandene Rollen:

1. Template Initializer
2. Delivery Orchestrator
3. Architecture Steward
4. Security Reviewer
5. Privacy Reviewer
6. Vue Frontend Engineer
7. Domain Engineer
8. Persistence Engineer
9. QA Engineer
10. Release Engineer

**Bestehendes Muster aus einem Custom Agent:**

```markdown
---
name: Security Reviewer
description: Performs OWASP-oriented threat modeling and secure implementation review.
target: vscode
tools: [read, search, edit, execute, todo, agent]
---

# Security Reviewer

Identify assets, attackers, trust boundaries, misuse cases and controls. Add negative tests and
verify CSP, dependencies, secrets and input/output handling.

Always follow `AGENTS.md`, repository OpenSpec files and the nearest scoped instructions.
```

All Custom Agents deklarieren `target: vscode`. Namen und Tools sind daher nicht unverändert für
jeden lokalen Coding-Agenten portabel. Die Rollenbeschreibung selbst ist jedoch portabel.

### Skills

| Skill                       | Zentral wiederverwendbar | Profil-/Repositoryanteil                    |
| --------------------------- | ------------------------ | ------------------------------------------- |
| `arc42-adr`                 | ja                       | konkrete Doku-Pfade lokal                   |
| `openspec-change`           | ja                       | konkrete Spezifikationen lokal              |
| `privacy-review`            | ja                       | Dateninventar und Rechtskontext lokal       |
| `secure-feature`            | ja                       | konkrete Threat Boundaries lokal            |
| `release-gate`              | teilweise                | npm-Kommandos gehören zu `webapp`           |
| `vue-vertical-slice`        | `webapp`                 | Vue- und Layerstruktur lokal                |
| `initialize-from-drafts`    | nein, templatespezifisch | muss lokal bleiben                          |
| `capture-template-feedback` | teilweise                | Upstreambeziehung ist repositoriespezifisch |

### Fehlende Pfadregeln

Obwohl Agenten „nearest scoped instructions“ referenzieren, gibt es keine zusätzlichen
pfadspezifischen `AGENTS.md`. Sinnvolle Scopes wären:

- `src/domain/AGENTS.md`: Frameworkfreiheit und Domain-Testregeln.
- `src/infrastructure/AGENTS.md`: Adapter, untrusted persistence und Migrationen.
- `.github/AGENTS.md`: Least Privilege, Action-Pinning und Workflow-Parität.
- `docs/public-site/AGENTS.md`: Veröffentlichungsgrenzen und menschliche Freigaben.
- `docs/privacy/AGENTS.md`: keine Behauptung rechtlicher Freigabe.

Diese zusätzlichen Dateien sind eine Empfehlung und derzeit nicht vorhanden.

### Lokale Agent-Kompatibilität

**Fakt:** Root-Anweisungen, Skripte, Schemas und Dokumentation liegen lokal im Checkout. Ein Agent
kann daher ohne Zugriff auf das private zentrale Repository arbeiten.

**Einschränkung:** `.github/skills` wird nicht von jedem Agenten automatisch entdeckt. Eine robuste
Baseline sollte mindestens eine dieser Varianten verwenden:

1. Kanonische lokale Skills unter einer agentenübergreifend vereinbarten Ablage und generierte
   Tool-Adapter.
2. Identische synchronisierte Skills in mehreren Tool-Ablagen mit automatischer Driftprüfung.
3. Kurze tool-spezifische Skilldateien, die auf vollständige lokale Dokumente im Repository
   verweisen.

Eine Runtime-Abfrage des privaten Engineering-Repositories ist nicht akzeptabel, weil Offline-
Arbeit und aus dem Template erzeugte unabhängige Repositories sonst nicht vollständig nutzbar wären.

## Public-Site Readiness

### Status

`docs/public-site/` existiert nicht.

Die Anwendung erzeugt dennoch feste öffentliche Dokumentationsziele.

**Bestehender Repository-Ausschnitt aus `src/config/publicResources.ts`:**

```typescript
const resourceBase = new URL(`apps/${appConfig.slug}/`, `${appConfig.organization.url}/`);

export const publicResourceLinks: PublicResourceLinks = {
  website: resourceBase.href,
  support: new URL('support/', resourceBase).href,
  faq: new URL('faq/', resourceBase).href,
  privacy: new URL('privacy/', resourceBase).href,
  dataDeletion: new URL('data-deletion/', resourceBase).href,
  changelog: new URL('changelog/', resourceBase).href,
  licenses: new URL('licenses/', resourceBase).href,
};
```

Damit besteht bereits ein öffentlicher URL-Vertrag, ohne dass dieses Repository die zugehörigen
Seiten bereitstellt.

### Content-Matrix

| Inhalt              | Vorhanden?                        | Authoritative/geeignete Quellen                      | Lücke oder Freigabe                 |
| ------------------- | --------------------------------- | ---------------------------------------------------- | ----------------------------------- |
| Manifest            | Kein PWA-/Content-Manifest        | `template.config.json`; ZIP enthält Release-Manifest | Manifestart klären                  |
| FAQ DE              | nein                              | deutsche UI-Texte, README-Fakten                     | Redaktion erforderlich              |
| FAQ EN              | nein                              | README, Deployment-, Privacy-Dokumente               | Redaktion erforderlich              |
| Datenschutz DE      | nein                              | Data Inventory, deutsche UI-Texte                    | juristische Prüfung erforderlich    |
| Datenschutz EN      | technischer Entwurf               | `PRIVACY.md`, Privacy-Spec                           | nicht rechtlich freigegeben         |
| Datenlöschung DE/EN | Funktion vorhanden, Seiten fehlen | Settings-/E2E-Verhalten, Data Inventory              | Nutzeranleitung erstellen           |
| Anleitungen         | technische interne Doku vorhanden | README, Static Hosting, Static Releases              | öffentliche DE/EN-Fassungen fehlen  |
| Roadmap             | EN vorhanden                      | `docs/product/requirements_roadmap.md`               | Produktfreigabe erforderlich        |
| Changelog           | EN vorhanden                      | `CHANGELOG.md`                                       | DE fehlt, Tagstatus widersprüchlich |
| Lizenzen            | generiert vorhanden               | Third-Party-Notices                                  | öffentliche Route fehlt             |
| Assets              | technische Public-Dateien         | `public/`                                            | Icons/Bilder/Content Assets fehlen  |

### Fachfremdes öffentliches API-Dokument

**Bestehender Repository-Ausschnitt aus `public/api/openapi.yaml`:**

```yaml
openapi: 3.1.0
info:
  title: Foldmark Optional API Contract
  version: 0.1.0
  description: >
    Optional future API contract. GitHub Pages does not provide a runtime REST API; this file
    documents a possible backend adapter for later synchronization or automation.
servers:
  - url: https://api.example.invalid
```

Dieses Dokument widerspricht der generischen Template-Identität und wird durch Vite als statisches
Asset kopiert. Es muss vor einer Public-Site-Synchronisation entweder entfernt, in einen klar
nichtöffentlichen Entwurfsbereich verschoben oder als generischer Vertrag neu spezifiziert werden.

### Inhalte, die nicht automatisch öffentlich werden dürfen

- `drafts/` und insbesondere rohe Notizen oder Bilder.
- Threat Models mit internen Annahmen und Angriffspfaden.
- Aktive OpenSpec-Designs vor Annahme.
- Dateninventare mit später möglicherweise produktspezifischen Datenkategorien.
- Interne Support- oder Incident-Prozesse.
- Nicht freigegebene Roadmap-Inhalte.
- Datenschutz- und Rechtstexte ohne dokumentierte menschliche Freigabe.
- Lokale Verifikationsberichte mit Maschinen-, Benutzer- oder Pfadangaben, sofern sie nicht vorher
  sanitiziert wurden.

### Rechtliche und menschliche Freigaben

`PRIVACY.md` sagt selbst:

```markdown
A legal review remains necessary before publishing a production service. This repository provides
technical controls, not legal advice.
```

Die Compliance-Baseline beschreibt ebenfalls nur Engineering-Evidenz und keine automatische
rechtliche Zertifizierung. Erforderlich sind mindestens:

- fachliche Freigabe von Manifest, FAQ, Anleitungen, Roadmap und Changelog;
- Privacy-/Legal-Freigabe der Datenschutzerklärungen und Löschinformationen;
- Accessibility-Freigabe beziehungsweise dokumentierte Konformitätsbewertung;
- Security-Freigabe der öffentlich sichtbaren Header, API-Verträge und Hostingkonfiguration;
- redaktionelle Freigabe beider Sprachen.

## Release and Branch Model

### Belegter Git-Stand am 2026-08-24

```text
current branch: agent/finalize-template-workflow-parity
HEAD:           fba50477e0131e354c1378bf13f0c7ef06e66f2d
tracking:       origin/agent/finalize-template-workflow-parity, ahead 2
main:           7e1600a (Init)
origin/main:    7e1600a (Init)
local tags:     keine
```

Der Arbeitsbaum war bei der aktualisierten Prüfung sauber.

### Versionierung

- `VERSION` enthält die Template-Version `1.0.0`.
- `template.config.json.template.version` enthält `1.0.0`.
- `package.json` und Runtime-Konfiguration enthalten die Anwendungs-/Demo-Version `0.1.0`.
- `scripts/check-versioning.py` erzwingt diese bewusst getrennten Versionsachsen.
- `CHANGELOG.md` folgt Semantic Versioning und referenziert `v1.0.0`.
- Ein lokaler `v1.0.0`-Tag ist nicht vorhanden.

### Release-Branches und Kanäle

- Es gibt kein belegtes Release-Branchmodell.
- Es gibt keine dokumentierten Beta-/Stable-Kanäle.
- Tags mit Muster `v*` lösen den statischen Release-Build aus.
- Security-Fixes sollen laut `SECURITY.md` den Default-Branch und den aktuellen getaggten Release
  adressieren.

### Artefakte und Deployment

- `npm run build` erzeugt `dist/`.
- `npm run workflow:release` erzeugt `release/<slug>-<application-version>.zip` und `.zip.sha256`.
- Das ZIP enthält ein Release-Manifest und Installationshinweise.
- GitHub Pages deployt bei Push auf `main` sowie manuell.
- Alternativ kann das ZIP in einen statischen HTTPS-Webroot entpackt werden.
- Store-Deployment ist nicht vorhanden.

### Empfohlener Public-Site-Synchronisationspunkt

1. Vorschau erst aus einem gemergten `main`, nicht direkt aus dem Feature-Branch.
2. Stabile öffentliche Inhalte an einen tatsächlich vorhandenen und verifizierten `v*`-Tag binden.
3. Public-Site-Export als separates, deterministisches Artefakt erzeugen.
4. Rechts-/Datenschutzinhalte nur publizieren, wenn eine maschinenlesbare oder dokumentierte
   menschliche Freigabe vorliegt.
5. Die Synchronisation sollte einen PR im Public-Site-Ziel erzeugen und keinen ungeprüften direkten
   Push.

## Security and Privacy Observations

### Namen von Secrets, Variablen und Environments

Im Repository explizit belegt:

| Typ                  | Name                         | Zweck                                                |
| -------------------- | ---------------------------- | ---------------------------------------------------- |
| Repository Variable  | `CODEQL_ENABLED`             | Hosted CodeQL für ein privates Repository aktivieren |
| Repository Variable  | `DEPENDENCY_REVIEW_ENABLED`  | GitHub PR-Delta-Review aktivieren                    |
| Build Variable       | `VITE_BASE_PATH`             | Deployment-Unterpfad                                 |
| Test Variable        | `PLAYWRIGHT_BROWSER_CHANNEL` | lokales Chrome/Edge statt Download wählen            |
| interne Testvariable | `PLAYWRIGHT_BROWSERS_PATH`   | Browserpfad im Container                             |
| Standard-CI-Variable | `CI`                         | Retry, Worker und Reporter steuern                   |
| GitHub Environment   | `github-pages`               | Pages-Deployment                                     |

Nicht im Checkout belegt:

- explizite `secrets.*`-Referenzen;
- Environment-Secrets;
- Deploy Keys;
- GitHub-App-Credentials;
- OAuth-Client-Secrets;
- Analytics-/Telemetry-Schlüssel.

GitHub Actions nutzt plattformbedingt Tokens, aber der Code referenziert keinen benannten
`secrets.GITHUB_TOKEN`-Ausdruck. Aus dem Checkout können keine möglicherweise in GitHub Settings
hinterlegten Secret-Namen abgeleitet werden.

### Externe Dienste und Netzwerkzugriffe

Build-/Entwicklungszeit:

- npm Registry für Installation, Audit, Signaturen und Outdated-Abfragen;
- Playwright-Browserdownload;
- Microsoft Container Registry für das Dev-Container-Basisimage;
- GitHub Actions, CodeQL, Dependency Review, Scorecard, Pages und Artefaktspeicher;
- DNS/HTTPS und ein optionaler statischer Hostinganbieter.

Anwendungslaufzeit:

- Laut Spezifikation keine intentionalen Drittanfragen im Defaultzustand.
- Keine Remote Fonts, Tracker, Analytics, Runtime-CDNs oder externen Connectoren.
- Ein E2E-Test sammelt externe Requests und erwartet eine leere Liste.

### Lokale Daten

Das Data Inventory dokumentiert:

- Todo-Markdown, Status, Identifier und Zeitstempel in IndexedDB;
- Theme, Locale und Privacy-Hinweisstatus in namespaced `localStorage`;
- direkte Löschbarkeit über Settings;
- keine Empfänger im Defaultzustand.

Tests enthalten generische Beispieldaten und die dokumentierten Shared-Mailbox-Adressen. Es wurden
keine personenbezogenen Testprofile oder Tokens in den untersuchten Test-/Logdateien belegt.

### Positive Kontrollen

- Strikte CSP im HTML und Header-Beispiel.
- `vue/no-v-html`, no-unsanitized und negativer DOM-Sink-Test.
- Keine Production Source Maps.
- Trust-Boundary-Validierung mit Zod und Python-Konfigurationsvalidator.
- Namespaced Speicherung und gezielte Löschung.
- Dependency Audit, Registry-Signaturen, License Policy und Dependabot.
- CodeQL und OpenSSF Scorecard mit begrenzten Berechtigungen.
- Threat Model, ASVS-/OWASP-Abbildung und External Request Register.

### Sicherheits- und Privacy-Lücken

- Keine vollständige Secret-Scanning-Konfiguration im Checkout.
- Action-Referenzen nicht über vollständige Commit-SHAs gepinnt.
- Privacy-Scanner verwendet eine bekannte Domainliste statt einer vollständigen Netzwerkpolicy.
- Security-Konfigurationscheck prüft primär die Präsenz bestimmter Strings.
- HTTP-Header müssen vom tatsächlichen Host reproduziert und deployed überprüft werden.
- `robots.txt` und `noindex` sind keine Zugriffskontrolle.
- Kontaktbestandteile sind Base64-codiert; der Code dokumentiert korrekt, dass dies keine
  Verschlüsselung ist.
- Accessibility ist noch kein eigener automatisierter Release-Gate.

## Conflicts with the Proposed Baseline

### Konfliktmatrix

| Konflikt                          | Evidenz                                             | Auswirkung                                                              | Empfohlene Auflösung                                                        |
| --------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Baseline nicht auf Default-Branch | `main` steht auf `Init`, Arbeitsbranch weit voraus  | Zentrale Übernahme könnte unveröffentlichten Stand als stabil behandeln | erst Merge-/Releaseentscheidung treffen                                     |
| Branch vor Remote                 | aktueller Branch `ahead 2`                          | Remote ist kein vollständiger Referenzstand                             | pushen/reviewen oder Commit explizit übergeben                              |
| Fehlender Tag                     | keine lokalen Tags, Changelog referenziert `v1.0.0` | Releaseautomation und Versionsevidenz widersprechen sich                | Tagstatus klären                                                            |
| Identität `Lambro`/`LumbreCode`   | `AGENTS.md`, Dev Container, Template-ID             | falsche zentrale Namenskonvention möglich                               | verbindliche Schreibweise und Legacy-ID dokumentieren                       |
| `CHANGE_ME`                       | Repository Owner in Template-/Runtime-Konfig        | fehlerhafte öffentliche Metadaten                                       | Owner vor stabiler Veröffentlichung setzen oder Placeholder formal erlauben |
| Foldmark-Reste                    | Public OpenAPI, Bug-Template                        | Produktspezifischer Inhalt im generischen Template                      | entfernen oder neu spezifizieren                                            |
| `LumbreCodeToDo`                  | Kontaktbetreff-Beispiele                            | konkrete App-Identität im Template                                      | generischen Platzhalter verwenden                                           |
| Public-Site fehlt                 | `docs/public-site` nicht vorhanden                  | erzeugte Links können ins Leere laufen                                  | Public-Site-Export definieren                                               |
| OpenSpec nicht reconciliiert      | Changes bleiben aktiv, eine Aufgabe offen           | Current State und Change State überlappen                               | abschließen/archivieren                                                     |
| Accessibility-Gate fehlt          | kein npm-Befehl/Tool                                | Definition of Done nur teilweise automatisiert                          | eigenen Gate ergänzen                                                       |
| Tool-spezifische Agenten          | `target: vscode`                                    | eingeschränkte lokale Portabilität                                      | Rollenmodell plus Tooladapter                                               |
| Skills nur unter `.github`        | keine `.agents/skills`/`.claude/skills`             | Discovery hängt vom Agenten ab                                          | lokale Mirrors oder Adapter erzeugen                                        |
| Keine scoped instructions         | nur Root-`AGENTS.md`                                | Regeln für sensible Pfade nicht lokal präzisiert                        | pfadspezifische Anweisungen ergänzen                                        |
| Actions nicht SHA-gepinnt         | `uses: ...@vN`                                      | Supply-Chain-Härtung unvollständig                                      | zentral SHA-pinnen                                                          |
| Paritätsskript hart gekoppelt     | konkrete Actionversionen/Pfade                      | zentrale Updates erfordern Mehrfachänderung                             | deklaratives Manifest nutzen                                                |
| Windows-Parität unvollständig     | `bootstrap.ps1` nicht strukturell geprüft           | Plattformdrift möglich                                                  | beide Bootstrap-Pfade prüfen                                                |
| `.gitignore`-Muster               | `release/` matcht auch `docs/release/`              | neue Verifikationsdokumente können unbemerkt ignoriert werden           | `/release/` verwenden                                                       |
| Schema-/Validator-Dopplung        | JSON Schema und Python-Konstanten                   | zwei Wahrheiten können driften                                          | Generator oder gemeinsame Testvektoren                                      |

### Identitätsausschnitte

**Bestehende widersprüchliche Ausschnitte:**

```text
AGENTS.md:                         Build concrete Lambro Code applications ...
.devcontainer/devcontainer.json:  Lambro Code Web App Template
README.md:                         LumbreCode Web App Template
template.config.json:             "id": "lambro-web-app-template"
template.config.json:             "repositoryOwner": "CHANGE_ME"
public/api/openapi.yaml:           Foldmark Optional API Contract
.github/ISSUE_TEMPLATE/bug.yml:   Foldmark version or commit
docs/support/CONTACT_CHANNELS.md:  [LumbreCodeToDo] Support request
```

**Annahme:** `lambro-web-app-template` könnte eine historische stabile ID sein. Ohne bestätigte
Migrationsentscheidung darf sie nicht automatisch in `lumbre...` umbenannt werden, weil
Initialisierer, Schemas und Fixtures diese ID derzeit explizit erzwingen.

## Recommended Shared Components

### Zielprofil

```yaml
profile: webapp
extends:
  - common
```

### Empfohlene Ownership-Schichten

| Schicht    | Verantwortung                        | Beispiele                                                                            |
| ---------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| `common`   | technologieunabhängige Governance    | Source Priority, OpenSpec, ADR, Security-/Privacy-Grundsätze, Dokumentationsregeln   |
| `webapp`   | Browser-/Node-basierte Technik       | npm, TypeScript, Vite, Playwright, Browser-Security, statische Releases              |
| Repository | Produkt und konkrete Implementierung | Identität, OpenSpec-Inhalte, Todo-Demo, Dateninventar, Threat Model, Deploymentziele |

### Benötigte zentrale Workflows

1. `common-policy.yml`
   - strukturierte Dateien;
   - Dokumentationspflichten;
   - OpenSpec-/ADR-Struktur;
   - Baseline-Manifest und Driftprüfung.
2. `webapp-ci.yml`
   - Toolchain-Setup;
   - npm Cache;
   - lokaler Install-/CI-Befehl;
   - standardisierte Fehlerartefakte.
3. `webapp-security.yml`
   - portabler lokaler Security-Befehl;
   - optional CodeQL;
   - optional Secret Scanning, soweit Plattform und Lizenz dies erlauben.
4. `dependency-review.yml`
   - lokaler kompletter Dependency-/Lizenzcheck;
   - optionaler GitHub PR-Delta-Review.
5. `static-pages.yml`
   - geprüftes `dist` hochladen;
   - Deploymentberechtigungen nur im Deploy-Job.
6. `static-release.yml`
   - lokales Releasekommando;
   - ZIP, Prüfsumme und Manifest;
   - optionaler signierter Provenance-/Attestation-Schritt nach separater Entscheidung.
7. `public-site-export.yml`
   - nur allowlist-basierte freigegebene Inhalte;
   - DE/EN-Vollständigkeit;
   - Legal-Freigabestatus;
   - Ausgabe als Artefakt oder PR, nicht als unkontrollierter Direkt-Push.

### Empfohlener wiederverwendbarer Workflow

**Empfohlener Zielentwurf für `lumbrecode-engineering`:**

```yaml
name: Reusable webapp CI

on:
  workflow_call:
    inputs:
      node-version-file:
        type: string
        default: .nvmrc
      python-version-file:
        type: string
        default: .python-version
      prepare-command:
        type: string
        required: true
      ci-command:
        type: string
        required: true
      playwright-report-path:
        type: string
        default: playwright-report/

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout
        uses: actions/checkout@<FULL_COMMIT_SHA> # reviewed release
      - name: Set up Node
        uses: actions/setup-node@<FULL_COMMIT_SHA> # reviewed release
        with:
          node-version-file: ${{ inputs.node-version-file }}
          cache: npm
      - name: Set up Python
        uses: actions/setup-python@<FULL_COMMIT_SHA> # reviewed release
        with:
          python-version-file: ${{ inputs.python-version-file }}
      - name: Prepare
        run: ${{ inputs.prepare-command }}
      - name: Verify
        run: ${{ inputs.ci-command }}
      - name: Upload browser diagnostics on failure
        if: failure()
        uses: actions/upload-artifact@<FULL_COMMIT_SHA> # reviewed release
        with:
          name: playwright-report
          path: ${{ inputs.playwright-report-path }}
          if-no-files-found: ignore
```

GitHub behandelt dynamische `run`-Inputs als mächtig. Das Zielrepository sollte deshalb entweder nur
vertrauenswürdige statische Caller zulassen oder statt freier Kommandos feste Profilkommandos
verwenden. Ein sichererer, weniger flexibler Vertrag wäre, lokal immer `npm run workflow:prepare`
und `npm run workflow:ci` vorauszusetzen.

### Empfohlener lokaler Caller

**Empfohlener Zielentwurf für dieses Repository:**

```yaml
name: Continuous integration

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  ci:
    uses: FlorianTim/lumbrecode-engineering/.github/workflows/webapp-ci.yml@<PINNED_REF>
    with:
      node-version-file: .nvmrc
      python-version-file: .python-version
      prepare-command: npm run workflow:prepare
      ci-command: npm run workflow:ci
      playwright-report-path: playwright-report/
```

Bei einem privaten zentralen Repository muss vor Einführung geprüft werden, ob GitHub den Zugriff
von diesem Repository auf private reusable workflows erlaubt. Unabhängig davon müssen die von den
Workflows aufgerufenen Skripte lokal vorhanden bleiben.

### Empfohlenes Baseline-Manifest

**Empfohlener Zielentwurf:**

```yaml
schemaVersion: 1
baseline:
  repository: FlorianTim/lumbrecode-engineering
  profile: webapp
  version: 1.0.0

managed:
  generated:
    - .github/workflows/ci.yml
    - .github/workflows/codeql.yml
    - .github/workflows/dependency-review.yml
  synchronized:
    - .github/skills/arc42-adr/SKILL.md
    - .github/skills/openspec-change/SKILL.md
    - .github/skills/privacy-review/SKILL.md
    - .github/skills/secure-feature/SKILL.md
  localOverlay:
    - AGENTS.md
    - template.config.json
    - openspec/**
    - docs/arc42/**
    - docs/adr/**
    - docs/privacy/**
    - docs/security/THREAT_MODEL.md

commands:
  prepare: npm run workflow:prepare
  ci: npm run workflow:ci
  security: npm run workflow:security
  dependencies: npm run workflow:dependency-review
  pages: npm run workflow:pages
  release: npm run workflow:release

outputs:
  site: dist
  release: release
  browserReport: playwright-report
```

Das Manifest soll Ownership und Versionierung ausdrücken. Es darf keine Secrets enthalten.

### Benötigte Skills

Zentraler Kern:

- `openspec-change`
- `arc42-adr`
- `secure-feature`
- `privacy-review`
- `dependency-review`
- `release-gate`
- `accessibility-review`
- `baseline-sync-review`

Profil `webapp`:

- `vue-vertical-slice`
- `browser-security-review`
- `playwright-e2e`
- `static-site-release`

Repositorylokal:

- `initialize-from-drafts`
- `capture-template-feedback`

### Benötigte Custom Agents

Zentral und technologieunabhängig:

- Architecture Steward
- Security Reviewer
- Privacy Reviewer
- Accessibility Reviewer
- QA Engineer
- Release Engineer

Profil `webapp`:

- Webapp Engineer
- Browser Persistence Engineer

Repositorylokal:

- Template Initializer
- Delivery Orchestrator mit den konkreten OpenSpec- und Reviewgrenzen
- Vue Frontend Engineer, falls die Rolle bewusst Vue-spezifisch bleiben soll

### Benötigte Workflow-Inputs

| Input                    | Wert in diesem Repository            | Pflicht/optional             |
| ------------------------ | ------------------------------------ | ---------------------------- |
| `node-version-file`      | `.nvmrc`                             | Pflicht                      |
| `python-version-file`    | `.python-version`                    | Pflicht für aktuelle Skripte |
| `install-command`        | `npm run workflow:install`           | Pflicht                      |
| `prepare-command`        | `npm run workflow:prepare`           | Pflicht für Browser-CI       |
| `ci-command`             | `npm run workflow:ci`                | Pflicht                      |
| `security-command`       | `npm run workflow:security`          | Pflicht                      |
| `dependency-command`     | `npm run workflow:dependency-review` | Pflicht                      |
| `pages-command`          | `npm run workflow:pages`             | optional nach Profil         |
| `release-command`        | `npm run workflow:release`           | optional nach Profil         |
| `build-output-path`      | `dist`                               | Pflicht für Static Pages     |
| `release-output-path`    | `release/*`                          | Pflicht für Static Release   |
| `playwright-report-path` | `playwright-report/`                 | optional                     |
| `codeql-languages`       | `javascript-typescript`              | optional                     |
| `pages-environment`      | `github-pages`                       | deployment-spezifisch        |
| `base-path`              | automatisch oder `VITE_BASE_PATH`    | deployment-spezifisch        |
| `baseline-version`       | noch festzulegen                     | empfohlen                    |

### Benötigte Secret-Namen

Für die heute vorhandenen Repository-Workflows sind keine zusätzlichen benannten Secrets belegt.

Falls später ein Cross-Repository-Public-Site-PR erzeugt werden soll, muss das
Authentifizierungsmodell zuerst gewählt werden. Bevorzugt wäre eine GitHub App mit minimalen Rechten
gegenüber einem langfristigen Personal Access Token. Der konkrete Secret-Name darf erst nach dieser
Entscheidung standardisiert werden; dieses Dokument erfindet keinen Namen.

## Repository-Specific Exceptions

Folgende Inhalte dürfen nicht zentral überschrieben werden:

### Produkt- und Templateidentität

- `template.config.json`
- `src/config/app.config.json` als lokal generiertes Ziel
- `VERSION` und Anwendungsversionswerte
- `public/CNAME`
- öffentliche URL- und Kontaktrollen

### Spezifikation und Architektur

- `openspec/specs/**`
- `openspec/changes/**`
- `docs/arc42/**`
- konkrete ADRs unter `docs/adr/**`
- Diagramme mit konkretem Systemkontext

### Produktimplementierung

- `src/**`
- Todo-Demo und ihre Tests
- IndexedDB-Schema und konkrete Storage Keys
- Übersetzungen und Themes
- konkrete E2E-Journeys

### Security, Privacy und Compliance

- `docs/security/THREAT_MODEL.md`
- konkrete ASVS-/OWASP-Mappings, soweit sie Produktverhalten beschreiben
- `docs/privacy/DATA_INVENTORY.md`
- `docs/privacy/EXTERNAL_REQUEST_REGISTER.md`
- `PRIVACY.md` und `SECURITY.md`
- lokale Policy-Ausnahmen

### Public Content

- Roadmap, Changelog, FAQ, Anleitungen und rechtliche Texte
- OpenAPI-Verträge
- öffentliche Assets und Branding
- Freigabemetadaten

### Repositoryspezifische Agenten

- Template Initializer
- `initialize-from-drafts`
- Todo-Erhalt bis zur expliziten Initialisierung
- `capture-template-feedback` und die konkrete Upstreambeziehung

## Migration Plan

### Phase 0: Entscheidungsgrundlagen

1. Verbindliche Schreibweise `LumbreCode` versus `Lambro Code` klären.
2. Entscheiden, ob `lambro-web-app-template` eine unveränderliche Legacy-ID ist.
3. Status der Branches, der zwei lokalen Commits und eines möglichen externen `v1.0.0`-Tags
   bestätigen.
4. Verantwortliche Personen für Engineering-, Security-, Privacy-, Accessibility- und
   Public-Content-Freigaben benennen.

### Phase 1: Repository bereinigen

1. Foldmark-Reste im Public OpenAPI und Bug-Template fachlich auflösen.
2. `CHANGE_ME` entweder ersetzen oder als formal erlaubten Template-Placeholder dokumentieren.
3. `LumbreCodeToDo`-Betreffbeispiele generalisieren.
4. `.gitignore` von `release/` auf `/release/` präzisieren, sofern nur das Root-Artefakt gemeint
   ist.
5. OpenSpec-Changes reconciliieren beziehungsweise verbleibende Aufgaben offen dokumentieren.
6. Changelog, Version und tatsächliche Tags synchronisieren.

### Phase 2: Ownership definieren

1. Jede zu synchronisierende Datei einer Kategorie zuweisen: `central-managed`, `profile-managed`,
   `repository-owned` oder `generated`.
2. Konfliktstrategie festlegen: vollständige Generierung, markierte Managed Sections oder
   Drei-Wege-Merge.
3. Eine Baseline-Version und ein lokales Manifest einführen.
4. Definieren, welche Abweichungen erlaubt, befristet oder release-blockierend sind.

### Phase 3: Common- und Webapp-Profil extrahieren

1. Allgemeine Source-Priority und Sicherheitsgrundsätze nach `common` übernehmen.
2. Node/npm/Vue/Vite/Playwright-Regeln in `webapp` kapseln.
3. Konkrete Produkt- und Templateinhalte als lokales Overlay belassen.
4. Bestehende lokale Skripte zunächst nicht entfernen; sie sind die Offline-Fallbacks.

### Phase 4: Agenten portabel machen

1. Rollenbeschreibung von VS-Code-Frontmatter trennen.
2. Kanonische lokale Skills synchronisieren.
3. Tool-spezifische Adapter für GitHub Copilot, Codex und weitere tatsächlich verwendete Agenten
   generieren.
4. Driftprüfung über Inhalte beziehungsweise Hashes ergänzen.
5. Pfadspezifische Anweisungen für Domain, Infrastructure, Workflows, Public Site und Privacy
   einführen.

### Phase 5: Workflows zentralisieren

1. Reusable Workflows im zentralen Repository erstellen.
2. Third-Party Actions auf überprüfte vollständige Commit-SHAs pinnen.
3. Lokale Caller mit minimalen Berechtigungen erzeugen.
4. Hosted-only Grenzen dokumentieren.
5. `bootstrap.sh` und `bootstrap.ps1` strukturell auf denselben Gate-Vertrag prüfen.
6. Sicherstellen, dass ein privates zentrales Repository von allen Zielrepositories erreichbar ist.

### Phase 6: Accessibility und Public Site

1. Accessibility-Ziel, automatisches Werkzeug und manuelle Prüfschritte festlegen.
2. `docs/public-site/` mit klarer Allowlist und DE/EN-Schema einführen.
3. Datenschutz- und Rechtstexte mit Freigabestatus versehen.
4. Public-Site-Export deterministisch erzeugen und validieren.
5. Synchronisation zunächst nur als Artefakt oder Draft-PR testen.

### Phase 7: Verifikation und Einführung

1. Sauberen Install aus Lockfile ausführen.
2. `npm run workflow:local` ausführen.
3. `npm run devcontainer:verify` ausführen, sofern Docker verfügbar ist.
4. GitHub CI, CodeQL, Dependency Review, Scorecard und Pages nach Push prüfen.
5. Statisches ZIP und Prüfsumme unabhängig validieren.
6. Erst danach Baseline-Synchronisation für weitere Repositories freigeben.

## Open Questions

1. Ist `Lambro` eine historische Bezeichnung, ein stabiler technischer Identifier oder ein
   Schreibfehler?
2. Muss `lambro-web-app-template` aus Rückwärtskompatibilitätsgründen erhalten bleiben?
3. Warum steht `main` noch auf dem Initial-Commit, obwohl der Arbeitsbranch die vollständige
   Baseline enthält?
4. Sind die zwei lokalen Commits bewusst noch nicht auf dem Remote?
5. Existiert `v1.0.0` auf GitHub, obwohl der lokale Checkout keinen Tag kennt?
6. Soll das Repository selbst privat bleiben oder als GitHub Template öffentlich werden?
7. Gehört der Foldmark-API-Vertrag in dieses Template?
8. Soll `LumbreCodeToDo` eine organisationsweite Betreffkonvention oder nur ein Produktbeispiel
   sein?
9. Wo wird die öffentliche Website beziehungsweise `lumbrecode.de/apps/<slug>/` technisch gebaut?
10. Soll Public-Site-Synchronisation ein Artefakt, einen Draft-PR oder einen normalen PR erzeugen?
11. Welches Repository ist für Datenschutz- und Rechtstexte authoritative?
12. Wie wird eine menschliche Legal-/Privacy-Freigabe maschinenlesbar dokumentiert?
13. Welches WCAG-Ziel und welches Accessibility-Werkzeug sollen verbindlich sein?
14. Ist GitHub Advanced Security für private Zielrepositories verfügbar?
15. Welche Coding-Agenten müssen unterstützt werden und welche lokalen Skillpfade erkennen sie?
16. Soll die Baseline Dateien vollständig generieren oder nur Managed Sections aktualisieren?
17. Wer genehmigt temporäre Baseline-Ausnahmen, und wann laufen sie ab?
18. Wie werden Action-SHA-Updates zentral geprüft und in Zielrepositories verteilt?
19. Soll ein GitHub Release zusätzlich zum Actions-Artefakt erzeugt werden?
20. Wird für Cross-Repository-Automation eine GitHub App eingesetzt?

## Machine-Readable Summary

```json
{
  "repository": "FlorianTim/web-app-template",
  "analyzedAt": "2026-08-24",
  "analyzedBranch": "agent/finalize-template-workflow-parity",
  "analyzedCommit": "fba50477e0131e354c1378bf13f0c7ef06e66f2d",
  "repositoryType": "webapp",
  "qualityCommands": [
    {
      "purpose": "format",
      "command": "npm run format",
      "source": "package.json"
    },
    {
      "purpose": "format-check",
      "command": "npm run format:prettier-check && npm run format:check",
      "source": "package.json, scripts/check-format.py"
    },
    {
      "purpose": "static-analysis",
      "command": "npm run lint && npm run typecheck && npm run architecture:check",
      "source": "package.json, eslint.config.js, scripts/check-architecture.py"
    },
    {
      "purpose": "unit-tests",
      "command": "npm test",
      "source": "package.json, vite.config.ts"
    },
    {
      "purpose": "component-tests",
      "command": null,
      "source": "No dedicated command found"
    },
    {
      "purpose": "integration-tests",
      "command": null,
      "source": "Adapter tests are included in the Vitest suite"
    },
    {
      "purpose": "e2e-tests",
      "command": "npm run test:e2e",
      "source": "package.json, playwright.config.ts"
    },
    {
      "purpose": "code-generation",
      "command": "npm run template:init && npm run docs:generate && npm run licenses:generate",
      "source": "package.json"
    },
    {
      "purpose": "production-build",
      "command": "npm run build",
      "source": "package.json"
    },
    {
      "purpose": "license-check",
      "command": "npm run licenses:generate && npm run licenses:check",
      "source": "package.json, compliance/license-policy.json"
    },
    {
      "purpose": "security-check",
      "command": "npm run workflow:security && npm run audit",
      "source": "package.json, scripts/run-local-workflow.mjs"
    },
    {
      "purpose": "accessibility-check",
      "command": null,
      "source": "No dedicated automated command found"
    },
    {
      "purpose": "full-ci",
      "command": "npm run ci",
      "source": "package.json"
    }
  ],
  "existingAutomation": [
    ".github/workflows/ci.yml",
    ".github/workflows/codeql.yml",
    ".github/workflows/dependency-review.yml",
    ".github/workflows/deploy-pages.yml",
    ".github/workflows/release.yml",
    ".github/workflows/scorecard.yml",
    ".github/dependabot.yml",
    ".githooks/pre-commit",
    ".githooks/pre-push",
    "scripts/run-local-workflow.mjs",
    "scripts/check-workflow-parity.mjs",
    ".devcontainer/devcontainer.json"
  ],
  "publicSite": {
    "exists": false,
    "authoritativeSources": [
      "template.config.json",
      "openspec/specs/app-shell.md",
      "openspec/specs/privacy-by-default.md",
      "docs/privacy/DATA_INVENTORY.md",
      "docs/privacy/EXTERNAL_REQUEST_REGISTER.md",
      "docs/product/requirements_roadmap.md",
      "CHANGELOG.md",
      "PRIVACY.md",
      "docs/deployment/STATIC_RELEASES.md",
      "public/THIRD-PARTY-NOTICES.generated.md"
    ],
    "missingContent": [
      "public-site content manifest",
      "FAQ German",
      "FAQ English",
      "privacy notice German",
      "legally reviewed privacy notice English",
      "data deletion guide German",
      "data deletion guide English",
      "public user guides German",
      "public user guides English",
      "German changelog",
      "approved public roadmap",
      "public-site assets and icons"
    ]
  },
  "recommendedProfile": "webapp",
  "conflicts": [
    "Baseline implementation is not present on the default branch",
    "Current branch is two commits ahead of its remote tracking branch",
    "No local v1.0.0 tag despite changelog references",
    "Lambro, LumbreCode, Foldmark, LumbreCodeToDo and CHANGE_ME identity drift",
    "Two OpenSpec changes remain active or incomplete",
    "No docs/public-site directory",
    "Foldmark OpenAPI contract is exposed below public/",
    "No dedicated accessibility command",
    "Skills and custom agents are primarily VS Code and GitHub specific",
    "No path-scoped agent instructions",
    "Workflow parity hardcodes action versions and omits bootstrap.ps1",
    "release/ ignore rule also matches docs/release/",
    "Template schema and Python validation duplicate organization-specific constants"
  ],
  "recommendations": [
    "Adopt common plus webapp baseline layering",
    "Keep local versioned copies of skills, schemas and workflow runners",
    "Use reusable workflows with repository-owned trigger wrappers",
    "Separate centrally managed files from repository-owned overlays",
    "Resolve identity and release-state conflicts before synchronization",
    "Add a dedicated automated accessibility gate",
    "Create an allowlist-based and reviewed docs/public-site export boundary",
    "Pin third-party GitHub Actions by full commit SHA",
    "Synchronize baseline updates through reviewable pull requests",
    "Never automatically publish legal, privacy, threat-model or raw draft content"
  ],
  "requiredWorkflowInputs": {
    "nodeVersionFile": ".nvmrc",
    "pythonVersionFile": ".python-version",
    "installCommand": "npm run workflow:install",
    "prepareCommand": "npm run workflow:prepare",
    "ciCommand": "npm run workflow:ci",
    "securityCommand": "npm run workflow:security",
    "dependencyReviewCommand": "npm run workflow:dependency-review",
    "pagesCommand": "npm run workflow:pages",
    "releaseCommand": "npm run workflow:release",
    "buildOutputPath": "dist",
    "releaseOutputPath": "release/*",
    "playwrightReportPath": "playwright-report/",
    "codeqlLanguages": "javascript-typescript",
    "pagesEnvironment": "github-pages"
  },
  "requiredSecretNames": [],
  "localAgentReady": true,
  "confidence": "high"
}
```
