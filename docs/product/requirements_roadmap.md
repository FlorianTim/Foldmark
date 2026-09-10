# Requirements roadmap

This roadmap is the current English specification view derived from
`drafts/notes/new-feature-ideas.md`. Raw ideas remain non-normative until accepted through OpenSpec.

### 1.1 — LumbreCode distribution and trustworthy maintenance

| ID      | Requirement                                                                                                      | Priority |
| ------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| R11-001 | Each initialized app exposes a validated `<slug>.webapps.lumbrecode.de` deployment target.                       | Must     |
| R11-002 | The release process creates a compressed static artifact plus a SHA-256 checksum for direct web-root extraction. | Must     |
| R11-003 | Default builds use no cookies, trackers, remote fonts or non-essential external requests.                        | Must     |
| R11-004 | Every app supports German and English, theme selection, privacy links and direct local-data deletion.            | Must     |
| R11-005 | Local and hosted gates verify vulnerabilities, licenses, registry provenance and dependency-policy drift.        | Must     |
| R11-006 | Concrete apps can produce sanitized, template-versioned feedback for the original template.                      | Must     |
| R11-007 | The Todo demo supports a bounded Markdown subset without inserting generated HTML into the DOM.                  | Should   |

### 1.2 — Optional controlled access

| ID      | Requirement                                                                                               | Priority |
| ------- | --------------------------------------------------------------------------------------------------------- | -------- |
| R12-001 | Non-public apps can add server-side access control without weakening development automation.              | Should   |
| R12-002 | A reviewed OWASP ZAP baseline can scan an explicitly supplied preview URL and emit a portable report.     | Could    |
| R12-003 | Any bot-abuse control documents necessity, legal basis, accessibility impact and false-positive handling. | Must     |
