# Proposal: Foldmark MVP

## Motivation

The LumbreCode Web App Template ships a Todo demo. The input material in `drafts/init/` describes a
concrete product — Foldmark — whose value is precise, configurable physical print geometry that no
general word processor exposes: fold marks, punch marks, safe areas, address windows and duplex
surfaces, positioned in millimetres and verifiable against a ruler.

The demo has to be replaced by that product without eroding the shell, the toolchain or the privacy
and security baseline the template exists to provide.

## Scope

- Foldmark identity: configuration, branding assets, palette, favicon, themes.
- Domain: physical units, identifiers, documents, print profiles and markers, addresses, sender
  identities, assets, export targets, email-header rules, graded validation findings.
- Eight built-in print profiles, frozen at runtime, with an explicit standards-verification status.
- Application: ports, use cases, the deterministic render plan with pagination, and target-aware
  validation.
- Infrastructure: Dexie schema and repositories, a bounded YAML-subset front-matter codec, the
  Markdown document codec, plain-text and restricted-HTML email renderers, an RFC 5322 EML builder,
  a byte-sniffing image probe.
- Presentation: the three-pane workspace, the millimetre-accurate paper preview with zoom that
  cannot affect an export, metadata forms, the surface editor for two-sided pieces, validation and
  export panels, address book, print-profile catalogue, asset library, and the privacy view with a
  counted data inventory, complete backup and deletion.
- German and English for all shipped UI.
- Unit, integration, security and end-to-end tests, plus the documentation this repository requires.

## Out of scope

- Connectors of any kind (Drive, Contacts, address lookup). The capability model is specified; no
  connector is implemented or shipped.
- A PDF generator. PDFs come from the browser print dialog.
- A visual geometry editor for print profiles. Profiles can be inspected, cloned and deleted; the
  numeric editor is a later change.
- ODT export, mail merge, PWA installation, encrypted backups.
- Any claim of DIN 5008 conformance.

## Acceptance

The MVP acceptance criteria in `drafts/init/.../19-mvp-acceptance-criteria.md`, reproduced and
tracked in `openspec/changes/0001-foldmark-mvp/tasks.md`.
