# Recommended implementation slices

## Slice 1 — product shell

Initialize config/branding, replace Todo navigation while retaining its code until the new shell builds, add routes, i18n keys, themes and empty Foldmark workspace.

## Slice 2 — document codec

Domain model, schemas, Markdown/YAML codec, import/export UI and negative security tests.

## Slice 3 — print profiles

Physical value objects, built-in profiles, marker renderer, profile validation and preview.

## Slice 4 — letter workspace

Metadata forms, Markdown editor, render plan, A4 preview, print stylesheet and browser print.

## Slice 5 — persistence and addresses

Dexie schema/migrations, document repository, address book and sender profiles.

## Slice 6 — privacy/backup

Settings repository, data inventory, complete export/delete, first-run notice and license page.

## Slice 7 — email handoff

Text/HTML renderers, subject suggestion, mailto fallback and PDF-for-email options.

## Slice 8 — postcard

Duplex profile, front/back editing, image reference, postal regions and two-page export.

## Slice 9 — assets/signature

Blob repository, safe import, local asset library, placements and graphical signature.

## Slice 10 — capabilities

Consent registry, lazy connector shells and external request audit.
