# Design: LumbreCode distribution and compliance baseline

## Decisions

1. Keep the generic template slug; resolve `customDomain: auto` only when runtime configuration and
   `CNAME` are generated.
2. Derive public documentation URLs from the validated organization URL and app slug.
3. Store shared mailbox local parts as reversible encoded values and reconstruct them only for a
   user-initiated `mailto:` link. Document that this is scraping friction, not secrecy.
4. Render a small Markdown syntax tree with static Vue branches. Do not accept HTML, URLs or images
   and do not create an HTML string.
5. Delete only namespaced preferences and Todo records after an explicit two-step confirmation.
6. Produce a web-root ZIP and SHA-256 checksum from the same verified `dist` used by Pages.
7. Treat crawler directives as advisory and require server-side access control for non-public apps.
8. Delay non-security dependency updates through Dependabot cooldowns and verify advisories,
   registry signatures, licenses and the installed tree locally.

## Verification

Unit-test URL/contact derivation, configuration resolution, preference deletion and Markdown
parsing. Extend browser tests for Markdown, localization and deletion. Run full CI, release artifact
inspection, audit/signature checks, initializer-copy regression and workflow-parity checks.
