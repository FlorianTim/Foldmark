# Historical first checks and remaining external verification

The original generation environment could not resolve the public npm registry. That limitation was
removed during local finalization on 2026-08-04: clean installation, package compatibility, audit,
formatting, linting, type checking, unit tests, build, Chromium E2E, initializer regression, subpath
behavior, hooks, and documentation/security/privacy/license gates were executed locally. The exact
evidence is recorded in `docs/release/LOCAL_VERIFICATION_2026-08-04.md`. The Dev Container build,
post-create command, and portable Linux workflow were subsequently verified with Docker Desktop.

## Still requires an external environment

1. Live GitHub Actions, CodeQL, Dependency Review, Scorecard and Pages deployment after push.
2. GitHub repository settings, rulesets and template-repository status.

## First execution order

```bash
node --version
npm --version
python3 --version
git --version
npm run workflow:local
npm run hooks:install
npm run devcontainer:verify
```

After those commands pass, test the initializer in a temporary copy, build the Dev Container, and
validate GitHub Pages below the expected repository base path. This sequence remains the reusable
first-check procedure for a newly generated repository.

The authoritative detailed procedure is `docs/prompts/LOCAL_FINAL_POLISH.md`.
