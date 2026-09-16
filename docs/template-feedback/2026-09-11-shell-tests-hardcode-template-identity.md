# Shell tests hard-code the template's identity and fail the moment it is configured

- **Date:** 2026-09-11
- **Area:** Web app template
- **Template version:** 1.0.0
- **Concrete app:** Foldmark 0.1.0
- **Severity:** `friction`
- **Status:** resolved here by adapting the expectations

## Observed

`npm run template:init` is the documented first step of initialization. Running it — before a single
line of application code is written — makes four shell tests fail:

```text
tests/appConfig.test.ts        expected 'foldmark.webapps.lumbrecode.de'
                               to be 'web-app-template.webapps.lumbrecode.de'
tests/publicResources.test.ts  .../apps/web-app-template/privacy/
                               and '%5BWeb%20App%20Template%5D'
tests/settingsRegistry.test.ts localStorage key 'web-app-template:ui:privacy-notice-v1'
```

A fifth lives in the toolchain itself, so `npm run template:test` fails too:

```text
scripts/tests/test_template_config.py
  AssertionError: 'foldmark.webapps.lumbrecode.de'
               != 'web-app-template.webapps.lumbrecode.de'
```

These are exactly the tests the initialization guide tells you to keep and rerun as the check that
initialization went well. They fail for the one reason that means it went _right_.

## Root cause

The assertions embed the literal template slug rather than deriving it from `appConfig`. The
behaviour under test — a custom domain derived from the slug, a namespaced storage key, a subject
prefix from the short name — is genuinely worth testing; only the fixture is wrong.

## Resolution here

The literals were replaced with Foldmark's, which keeps the tests meaningful for this app. The next
app will hit the same four failures.

## Proposed template change

Derive the expectations from configuration, so the tests pass before and after `template:init` and
still fail if the derivation breaks:

```ts
expect(appConfig.customDomain).toBe(`${appConfig.slug}.webapps.lumbrecode.de`);
expect(publicResourceLinks.privacy).toBe(`https://lumbrecode.de/apps/${appConfig.slug}/privacy/`);
expect(createContactHref('support', 'Support request')).toContain(
  encodeURIComponent(`[${appConfig.shortName}]`),
);
```

For the settings test, build the key with `preferenceKey('privacy-notice-v1')` rather than writing
the namespaced string out. For the Python test, compose the expected domain from
`application["slug"]` and `organization["webAppsDomain"]` — which is what `resolve_custom_domain` is
supposed to do, so the assertion becomes a real test of the rule rather than of one string.

This also makes the tests _stronger_: right now they would pass if the derivation logic were
replaced by a hard-coded string.
