# Security Policy

## Supported branch

Security fixes target the default branch and current tagged release.

## Reporting

Do not disclose exploitable vulnerabilities in public issues. Use GitHub private vulnerability
reporting when enabled, or contact the repository owner through the security contact configured for
the concrete project.

## Baseline

- OWASP Top 10 risk review
- OWASP ASVS-inspired verification requirements
- strict CSP and no remote runtime assets
- dependency lockfile and automated updates
- CodeQL, Dependency Review and secret-scanning guidance
- validation at every trust boundary
- output encoding and safe DOM APIs
- least-privilege connector scopes

Run `npm run security:check`, `npm run privacy:check`, `npm audit --audit-level=high` and the full
`npm run ci` gate before release.
