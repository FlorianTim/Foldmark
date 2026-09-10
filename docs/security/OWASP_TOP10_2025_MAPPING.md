# OWASP Top 10:2025 mapping

| Risk area                             | Template control                                                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Broken access control                 | No default remote authorization surface; optional APIs require separate authorization design and least scope.                      |
| Security misconfiguration             | Restrictive meta CSP, no source maps, least-privilege Actions, documented static-host header limitations.                          |
| Software supply-chain failures        | Exact versions, lockfile, ignored lifecycle scripts during install, audit, Dependabot, Dependency Review, CodeQL, license notices. |
| Cryptographic failures                | No frontend secrets or default tokens; future OAuth requires Authorization Code with PKCE and state validation.                    |
| Injection                             | Zod and Python boundary validation, escaped generated metadata, no unsafe DOM sinks or dynamic code execution.                     |
| Insecure design                       | Ports/adapters, explicit trust boundaries, OpenSpec review, threat model, bounded local data.                                      |
| Authentication failures               | Authentication is absent by default; a concrete capability must define session and reauthentication controls.                      |
| Integrity failures                    | Validated IndexedDB records, immutable entities, locked dependencies, protected CI workflows.                                      |
| Logging and alerting failures         | No privacy-invasive client telemetry; repository security alerts and host-side monitoring belong to concrete deployments.          |
| Mishandling of exceptional conditions | Blocked/corrupt local storage becomes a localized safe error without exposing dependency details.                                  |
