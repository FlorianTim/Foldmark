# Security Baseline

## Requirement

Trust-boundary validation, context-safe generation, safe DOM APIs, restrictive CSP, dependency
review, SAST, negative tests and documented threat modeling are required. Persisted data and
initializer configuration are untrusted inputs.

Rendered user content must not generate HTML strings. Non-public applications require server-side
access enforcement; crawler directives and client-side bot detection are never confidentiality
controls. Dependency review verifies advisories, registry signatures, installed-tree integrity and
licenses while avoiding unreviewed automatic upgrades.

## Verification

- Automated tests and repository policy checks cover the requirement.
