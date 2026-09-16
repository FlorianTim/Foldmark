# Architecture Decisions

Durable decisions live in `docs/adr/`. The ones that shape Foldmark specifically:

| ADR                                                                     | Decision                                                                                                |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [0009](../adr/0009-separate-document-from-print-profile.md)             | Separate document content from print geometry                                                           |
| [0010](../adr/0010-bounded-yaml-subset.md)                              | Parse front matter with a bounded subset instead of a YAML library                                      |
| [0011](../adr/0011-no-generated-html.md)                                | Generate no HTML from document text                                                                     |
| [0012](../adr/0012-millimetres-and-css-mm.md)                           | Make millimetres the domain unit and emit CSS millimetres                                               |
| [0013](../adr/0013-runtime-page-rule-via-constructable-stylesheet.md)   | Write the `@page` size through a constructable stylesheet                                               |
| [0014](../adr/0014-shell-views-instead-of-a-router.md)                  | Keep shell views instead of adding a router                                                             |
| [0015](../adr/0015-standards-status-as-data.md)                         | Model standards verification as data and show it                                                        |
| [0016](../adr/0016-markdown-first-rich-editor-and-render-plan.md)       | Markdown-first rich editor behind a port; the render plan stays the only renderer input                 |
| [0017](../adr/0017-address-snapshot-with-source-id.md)                  | Documents embed an address snapshot plus the source id                                                  |
| [0018](../adr/0018-address-lookup-provider.md)                          | No online address lookup; offline postal-code table first                                               |
| [0019](../adr/0019-formatting-through-directives-and-document-theme.md) | Formatting through directives and a document theme; `remark-directive` canonical; no free colour values |
| [0020](../adr/0020-contact-lists-with-primary-projections.md)           | Contacts carry lists of addresses and contact points; the 1.0 scalar fields are projections             |

Inherited from the template: ADRs 0001–0008 (Vue/TypeScript/Vite, ports and adapters, native Git
hooks, the replaceable demo, privacy by default, OpenSpec/arc42/ADRs, static deployment,
configuration-driven initialization).
