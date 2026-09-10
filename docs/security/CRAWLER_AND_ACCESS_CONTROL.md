# Crawlers, AI agents and access control

The default static build asks crawlers not to index or reuse content through `robots.txt`, HTML
`robots`/`googlebot` metadata and an `X-Robots-Tag` example in `public/_headers`. These signals
reduce ordinary indexing but are voluntary. GitHub Pages ignores `_headers`; configure the
equivalent HTTP headers at the actual host.

Do not treat crawler directives, JavaScript bot detection, browser fingerprinting or an obfuscated
URL as confidentiality controls. A client-side library and its bypass can be inspected and replayed,
while behavioral detection creates accessibility, privacy and false-positive risks. The template
therefore does not pretend to distinguish humans from automated clients.

Apps containing non-public information require enforcement before static assets or API data are
returned, for example an authenticated reverse proxy, an identity-aware access gateway or
application-level authorization. Development and automated tests may target a separate local or
preview origin, but a production authentication bypass must never be selected from an untrusted
request parameter or shipped as a client-side feature flag.

For public apps, use rate limits and abuse controls at the edge or API, minimize public metadata,
avoid secrets and personal data in bundles, and log only the events justified by the documented
privacy purpose. Update the threat model before adding any bot-mitigation provider.
