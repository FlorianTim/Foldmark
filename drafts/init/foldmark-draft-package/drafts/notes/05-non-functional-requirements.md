# Non-functional requirements

## Security

- Follow the repository OWASP/ASVS-oriented baseline.
- Apply strict TypeScript and runtime schema validation at trust boundaries.
- Do not render unsanitized HTML.
- Prevent EML/header CRLF injection.
- Validate file size, MIME, extension and decoded dimensions.
- Avoid secrets in frontend bundles and logs.
- Use a restrictive CSP compatible with the selected implementation.
- Maintain supply-chain checks, lockfile integrity and license policy.

## Privacy

- No analytics, remote fonts, tracking pixels or runtime CDNs.
- External connector code and network calls only after explicit consent.
- Local data export and deletion must be easy to find.
- No persistent third-party OAuth tokens in the first implementation.
- Consent withdrawal must disable the capability and clear transient tokens.

## Performance

- Initial core bundle should remain small; CodeMirror, exporters and connectors should be lazy-loaded.
- Use IndexedDB indexes for address/document search.
- Avoid re-rendering the entire preview on every keystroke; debounce and cancel stale renders.
- Handle at least 1,000 local addresses and 500 documents on a typical desktop browser.

## Accessibility

- Target WCAG 2.2 AA where practical.
- All actions keyboard-accessible.
- Dialog focus trapping and restoration.
- Sufficient contrast in all built-in themes.
- High-contrast theme and reduced-motion support.
- Validation messages connected to fields.

## Portability

- Build output is static and copyable.
- Core operation works on current evergreen browsers.
- File System Access and Web Share are enhancements with fallbacks.
- Canonical files remain human-readable.

## Maintainability

- Ports-and-Adapters dependency direction.
- Every non-trivial capability starts with an OpenSpec change.
- Architecture changes update arc42/ADR/diagrams.
- Vertical slices include tests and translations.
