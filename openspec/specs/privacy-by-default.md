# Privacy By Default

## Requirement

Initial load performs no intentional third-party request. Remote fonts, trackers and optional
connectors are disabled by default.

The app sets no cookies. Every shipped browser-storage use is documented, namespaced and directly
deletable. Crawler directives minimize ordinary indexing but are not represented as access control.

The privacy view **counts** what is stored by reading the tables rather than reporting a remembered
number, and offers three actions: export everything, import a backup, delete all content. Deleting
content and resetting preferences are separate actions with separate confirmations, because they
have different blast radii.

Foldmark prepares output and never transmits it. There is no SMTP, no upload and no delivery path;
the user interface says so wherever an export could be mistaken for sending.

## Verification

- `tests/e2e/foldmark.spec.ts` asserts no third-party request and no console error on first load.
- `npm run privacy:check` covers forbidden remote-asset patterns.
- Automated tests and repository policy checks cover the requirement.
