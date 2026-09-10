# ASVS-inspired browser application baseline

- Validate all trust-boundary input using explicit schemas.
- Encode output and prohibit unsafe DOM sinks.
- Enforce CSP and secure navigation/URL handling.
- Store no secrets in frontend bundles.
- Require explicit authorization and least privilege for optional APIs.
- Pin and review dependencies.
- Test security-relevant negative cases.
- Provide safe failure messages without sensitive details.
- Document data inventory and deletion/export behavior.
- Escape configuration separately for HTML text and attribute contexts.
- Bound imported, generated, and locally persisted collections and strings.
- Validate stored records again when crossing from persistence into application code.
