# Maintainability

## Requirement

The application documents source layout, dependency direction, runtime flow, configuration and safe
extension points. Every exported TypeScript declaration has concise TSDoc, and documentation checks
prevent undocumented public source APIs.

Layering is enforced: the domain imports nothing from application, infrastructure, presentation, Vue
or Dexie; the application layer declares ports and imports no framework; infrastructure implements
ports; presentation invokes use cases and may hold only UI and workspace state.

## Verification

- `npm run docs:check` validates the source guide and exported TypeScript declarations.
- `npm run architecture:check` validates the dependency direction.
- Architecture and source documentation are linked from the repository README.

## Workflow parity

Portable GitHub build steps must invoke versioned repository commands that developers can execute
locally. A structural check must fail when CI, Pages, dependency license policy, package scripts, or
the Dev Container bootstrap drift apart. GitHub-only event analysis and result publication must be
documented explicitly rather than represented as locally equivalent.

Template and application versions have separate consistency checks. Every hosted build or release
entry point has the same local npm entry point, including the static ZIP and checksum release.
