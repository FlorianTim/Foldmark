# Dependency update workflow

Dependencies are exact-pinned and the lockfile is committed. Dependabot opens weekly npm and GitHub
Actions pull requests with a cooldown so newly published non-security versions have time to receive
ecosystem scrutiny. Security advisories remain urgent; cooldown is not a reason to defer a known
fix.

Run:

```bash
npm run workflow:install
npm run dependencies:check
npm run ci
```

`dependencies:check` verifies advisories at moderate severity, registry signatures/attestations, the
complete installed tree and available updates. An outdated version is review input, not a failure:
inspect release notes, maintainer/account changes, install scripts, provenance, package diff and
ecosystem compatibility before changing the exact pin. Major upgrades require focused design review.
Registry attestations improve evidence but cannot prove a package is benign.

Use the OWASP
[Software Component Verification Standard](https://owasp.org/www-project-software-component-verification-standard/)
and
[Software Supply Chain Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Software_Supply_Chain_Security_Cheat_Sheet.html)
as review references. Never run an automated update with broad write or publish credentials.
