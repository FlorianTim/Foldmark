# Functional requirements

## Documents

- Create, duplicate, rename, archive and delete documents.
- Support document kinds: letter, postcard, card, photo-card, email and custom.
- Store body as Markdown and structured metadata separately in the runtime domain model.
- Serialize portable documents as Markdown with YAML front matter.
- Show clear parsing errors with line/context information where feasible.
- Maintain timestamps and optional tags without leaking device-identifying metadata.

## Print profiles

- Select a built-in profile or clone it into a user-owned profile.
- Define page width, height, orientation and margins in physical units.
- Define content boxes and profile-specific regions.
- Add, edit, enable, disable and reorder marker definitions.
- Distinguish preview-only markers from printed markers.
- Provide profile validation and profile-version metadata.
- Never mutate built-in profiles; user changes create copies.

## Preview and print

- Display one or more paper surfaces at a meaningful zoom.
- Offer 100%/fit-width/fit-page display modes without changing physical export geometry.
- Warn that browser/printer scaling must be 100% for physical accuracy.
- Support multi-page content and deterministic page breaks.
- Produce an email-PDF mode where physical marks are disabled by default.

## Addresses

- Save and search addresses locally.
- Maintain multiple sender identities.
- Import a selected external contact only after connector activation.
- Record source provenance without requiring permanent external linkage.
- Validate required fields depending on layout/export context.

## Assets

- Import local PNG/JPEG/WebP and carefully validated SVG.
- Store asset metadata and Blob data locally.
- Insert logo, image, letterhead background or signature by reference.
- Position assets with physical coordinates, size, rotation, opacity and layer.
- Preserve aspect ratio by default.

## Email handoff

- Suggest a subject from document metadata.
- Render plain-text and restricted HTML bodies.
- Produce mailto links for short compatible messages.
- Produce EML with MIME attachments in a later slice.
- Allow PDF generation followed by Web Share/download/mail-client opening.
- Explain client/browser limitations instead of promising direct delivery.

## Settings

- Language and theme selection.
- Default sender, print profile and export choices.
- Local-only status and capability consent.
- Data inventory, export, import and delete actions.
- Used libraries, versions, licenses and application version/build hash.
