# Security and privacy requirements

## Trust boundaries

- imported Markdown/YAML
- imported images/SVG/backup archives
- browser storage
- rendered HTML and print DOM
- downloaded/exported files
- optional OAuth providers and external APIs
- package/dependency supply chain

## Required negative tests

- script tags and event handlers in Markdown
- `javascript:` and dangerous data URLs
- malicious SVG with scripts/external references
- YAML type confusion and huge/nested input limits
- EML CRLF injection
- malformed MIME filenames
- oversized images and backups
- missing/revoked capability consent
- stale token behavior
- prototype pollution attempts in imported JSON
- path traversal names inside future archives

## Privacy by default

The first load must not intentionally contact third-party origins. There is no cookie banner for nonexistent tracking; instead show a concise first-run local-mode notice and a granular consent center for optional connectors.

## Storage

Do not describe IndexedDB as secure storage. Sensitive signature images and addresses remain accessible to scripts executing in the same origin; therefore XSS prevention is critical. Avoid storing OAuth access tokens persistently in MVP.
