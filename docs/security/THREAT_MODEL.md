# Threat Model

## Assets

Local user data, imported files, app configuration, dependency integrity, optional connector tokens
and generated exports.

## Trust boundaries

1. Untrusted user/file input into the browser app.
2. Presentation to application/domain boundary.
3. Browser application to IndexedDB.
4. Static application to an optional external provider after consent.
5. Source repository to dependency registry and CI runner.

## Primary threats

- XSS and unsafe rich content.
- Malicious file/SVG/URL imports.
- OAuth token leakage.
- Dependency confusion or compromised packages.
- accidental third-party requests and privacy leakage.
- insecure direct object handling in future APIs.
- loss or corruption of local data.
- configuration-driven HTML injection during initialization.
- denial of service through unbounded local records or oversized configuration values.
- unsafe Markdown rendering or disguised `javascript:`/remote-resource content.
- mistaken reliance on crawler directives or client-side bot classification for confidentiality.

## Controls

Strict validation, context-aware HTML escaping, safe DOM APIs, CSP, no frontend secrets, bounded
configuration and demo collections, bidirectional persistence validation, least scopes, lazy
capabilities, lockfile, CodeQL, Dependency Review, license checks, negative tests, backups/exports
and revocable consent.

The Todo Markdown parser creates a small typed syntax tree and Vue renders it through static
templates. HTML, links and images are not recognized, so no generated HTML reaches a DOM sink.
`robots.txt`, robot metadata and `X-Robots-Tag` are data-minimization signals only; non-public apps
must enforce authentication before content is returned.

The CSP is delivered through a meta element so GitHub Pages can use it without custom headers. Meta
CSP cannot enforce `frame-ancestors`; a host that supports response headers must add
`Content-Security-Policy: frame-ancestors 'none'` (and preferably the full policy) plus other
desired headers such as `X-Content-Type-Options: nosniff` and `Permissions-Policy`. The template
does not claim those headers on hosts that cannot configure them.
