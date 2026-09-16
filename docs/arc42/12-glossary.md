# Glossary

| Term                         | Meaning                                                                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Document**                 | Semantic content and metadata, independent of output medium. Knows no page size.                                                                           |
| **Print profile**            | Physical page or surface geometry: size, margins, named regions and helper markers. Knows no recipient.                                                    |
| **Marker**                   | One piece of helper geometry — fold, hole, cut, bleed, safe area, separator, address window, stamp area, grid or custom.                                   |
| **Preview visibility**       | Whether a marker is drawn on screen. Independent of print visibility.                                                                                      |
| **Print visibility**         | Whether a marker reaches the paper. A safe area has preview visibility and never print visibility.                                                         |
| **Region**                   | A named layout area on one surface, such as `addressWindow`, `body`, `message` or `stamp`.                                                                 |
| **Surface**                  | One printable side. A duplex profile has `front` and `back`; a single-sided one has `all`.                                                                 |
| **Render plan**              | The deterministic, framework-free structure a document and a profile collapse into: pages, markers and positioned blocks in millimetres.                   |
| **Screen mode / paper mode** | The two ways a render plan is built. `screen` draws preview-only guides; `paper` draws only what the profile says prints.                                  |
| **Export target**            | Where output is going — `print`, `pdf`, `email-pdf`, `email-text`, `email-html`, `eml`, `markdown`. Decides what "complete" means.                         |
| **Validation finding**       | A graded result carrying a translation key, not prose: `error` (cannot be produced), `warning` (will probably be wrong on paper), `info` (worth knowing).  |
| **Standards status**         | How far a profile's measurements have been checked: `draft-unverified`, `verified`, `not-applicable`.                                                      |
| **Sender identity**          | A reusable sender: address, contact fields, footer lines, letterhead and default signature. Referenced by a document, not copied into it.                  |
| **Contact**                  | One entry of the contact directory: name, several postal addresses and contact points with one primary each; the scalar fields are projections (ADR 0020). |
| **Folder**                   | A local grouping of documents, nested to eight levels; with the archive flag part of the record, never of the portable file.                               |
| **Demo data**                | A deterministic record set marked `demoData: true`, inserted and removed through the settings for development and screenshots.                             |
| **Recipient**                | The postal address a document is going to. **Embedded** in the document, because correspondence is a record of what was sent.                              |
| **Graphical signature**      | An image of a handwritten signature. Not a qualified electronic signature and not cryptographic.                                                           |
| **Capability**               | An optional external integration, disabled by default, whose code is loaded only after explicit consent. None ships in 0.1.                                |
| **Provenance**               | Where an address came from: `manual`, `imported-file` or `connector`.                                                                                      |
| **Backup package**           | One JSON file containing every stored record and preference, with image bytes base64-encoded.                                                              |
| **Front matter**             | The YAML block at the top of a portable document, parsed by a bounded subset rather than a general YAML library.                                           |
| **Local-first**              | User data and every primary workflow operate in this browser. No account, no server, no upload.                                                            |
