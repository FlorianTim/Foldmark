# Domain model draft

## Aggregates and entities

### Document

- `id`
- `kind`
- `title`
- `metadata`
- `bodyMarkdown`
- `surfaceContent`
- `assetPlacements`
- optional `signatureId`
- optional preferred `printProfileId`
- timestamps and schema version

### Address

- postal fields plus optional organization, department and person
- localized country code
- label/search fields
- source provenance: manual, imported, connector identifier

### SenderProfile

- address reference or embedded address
- contact fields
- optional letterhead/logo defaults
- default signature

### PrintProfile

- immutable built-in or mutable user profile
- page size and orientation
- margins and content boxes
- markers
- optional duplex surfaces
- capabilities such as address window, fold marks, bleed

### PrintMarker

Kinds: fold, hole, cut, bleed, safe-area, separator, address-window, stamp-area, grid, custom.

### DocumentAsset

- Blob reference
- MIME type and checksum
- intrinsic dimensions
- kind: image, logo, signature, background
- createdAt and optional source filename

### Capability

- manifest, requested permissions, consent state, load function and lifecycle.

## Value objects

- `Millimetres`
- `BoxMm`
- `PointMm`
- `PageSize`
- `EmailAddress`
- `PostalCode`
- `Locale`
- `DocumentId`, `AddressId`, `AssetId`, `ProfileId`

## Domain invariants

- Dimensions must be finite and positive.
- Markers must remain within reasonable page bounds unless explicitly allowed as crop/bleed marks.
- Built-in profiles are immutable.
- Postcard duplex profiles define front and back surfaces.
- A profile cannot claim fold-mark support merely because custom lines exist.
- Email header values cannot contain CR or LF.
- Asset placement references an existing local asset.
- Deleting an asset used by documents requires confirmation and impact reporting.
