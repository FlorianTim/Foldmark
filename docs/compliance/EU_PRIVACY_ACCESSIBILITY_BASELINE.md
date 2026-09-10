# EU privacy and accessibility baseline

This repository provides engineering defaults and evidence, not automatic legal certification. Every
concrete app still needs an identified controller, purpose-by-purpose legal-basis review, data
inventory, retention decision, processor/transfer review, accessibility evaluation and published
notices appropriate to its actual behavior and audience. Obtain qualified legal advice for the final
assessment.

## Default behavior

- No cookies, analytics, trackers, remote fonts, CDN scripts or third-party requests.
- Todos stay in IndexedDB; locale, theme and notice state stay in namespaced localStorage.
- The first-run notice describes storage. It is not a consent banner because the default app has no
  optional processing to accept or reject.
- Settings provide direct deletion of the app-owned local records and preferences.
- German and English are bundled locally and selected from the browser preference with a manual
  override.
- Keyboard operation, visible focus, semantic landmarks, reflow and system/high-contrast themes are
  part of the baseline.

Browser storage is still terminal-equipment access. For every new localStorage, IndexedDB, cache,
cookie or similar use, record whether it is strictly necessary and whether consent is required under
the national implementation of Article 5(3) ePrivacy. The
[EDPB Guidelines 2/2023](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en)
cover technologies beyond conventional cookies; the
[EDPB consent guidelines](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en)
define valid consent conditions.

## Concrete-app release review

1. Reconcile the data inventory and threat model with implemented features.
2. Publish privacy, deletion, support, FAQ, changelog and license pages below
   `https://lumbrecode.de/apps/<slug>/`.
3. Verify data-subject request handling, retention, deletion and export where applicable.
4. Confirm that no optional storage or external processing starts before valid consent.
5. Test WCAG conformance and assess whether the service falls under the European Accessibility Act.
   Directive (EU) 2019/882 has applied to covered products and services since 28 June 2025; scope is
   product-specific. See the
   [official EUR-Lex summary](https://eur-lex.europa.eu/legal-content/en/LSU/?uri=CELEX%3A32019L0882).
6. Review the deployed headers, HTTPS/TLS, DNS, backups and hosting processors; a static bundle
   cannot configure all of these itself.
7. Record the assessment and remaining risks before release.

The governing privacy regulation is the
[General Data Protection Regulation](https://eur-lex.europa.eu/eli/reg/2016/679/oj). This checklist
must be revised when law, guidance, product behavior or hosting changes.
