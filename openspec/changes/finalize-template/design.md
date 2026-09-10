# Design: Finalize the generic template

## Decisions

1. Keep domain and application independent; validate records inside the Dexie adapter in both
   directions.
2. Namespace all browser-owned data with the configured application slug and degrade safely when
   browser preference storage is blocked.
3. Surface stable localized errors instead of raw dependency errors.
4. Share initializer validation and HTML rendering in a dependency-free Python module and cover the
   trust boundary with `unittest`.
5. Require TSDoc on exported TypeScript declarations and maintain a human-oriented source guide.
6. Keep current compatible majors where a latest major conflicts with peer ranges or would require a
   separate migration; apply supported patch/minor security updates.
7. Deliver CSP through the static HTML meta element only for supported directives. Framing policy
   must be supplied as an HTTP header by hosts that support it.
8. Route portable hosted and local jobs through common npm entry points, enforce their mapping by
   parsing workflow configuration, and use the pinned official Dev Containers CLI for Linux parity.

## Security and privacy

- Configuration strings have explicit length and identifier constraints.
- HTML title and description values are context-escaped.
- Persisted Todo records are treated as untrusted.
- Local collection growth is bounded.
- No network capability or new data category is introduced.

## Verification

Run clean install, `npm run ci`, audit, initializer dry-run and temporary-copy regression, hook
tests, GitHub Pages base-path build, browser network/console checks, and Dev Container build where
the local environment permits it.
