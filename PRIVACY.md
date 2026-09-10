# Privacy

This template is designed for privacy by default and data minimization.

## Default behavior

- No analytics or telemetry.
- No remote fonts.
- No runtime CDN scripts or styles.
- No automatic calls to Google, Microsoft or other connector providers.
- Todo demo data is stored locally in IndexedDB.
- Locale, theme and notice acknowledgement are stored in namespaced localStorage.
- No cookies are set by the default application.
- Settings provide direct deletion of Todo records and app-owned localStorage preferences.

## Optional integrations

A concrete app may add external capabilities. Each capability must:

1. be disabled by default;
2. declare its network destinations and permissions;
3. explain data categories and purpose before activation;
4. lazy-load third-party code only after consent;
5. allow revocation and local data deletion;
6. avoid persistent access tokens unless a reviewed threat model requires them.

A legal review remains necessary before publishing a production service. This repository provides
technical controls, not legal advice.

See `docs/compliance/EU_PRIVACY_ACCESSIBILITY_BASELINE.md` for the per-application assessment and
release checklist.
