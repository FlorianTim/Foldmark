# Local Assets and Signatures

## Requirement

Images — photographs, logos, letterheads and signature images — are imported from the local machine,
stored in this browser, and never uploaded or fetched.

Import rules, applied in this order: refuse an empty file; refuse a file over the size ceiling
before decoding it; check the declared type against the allow-list (PNG, JPEG, WebP); then decode
and trust only what the decoder reports. Dimensions and pixel count are bounded to stop
decompression bombs. **SVG is not accepted**: it is a document that can carry script, external
references and foreign objects, and accepting one safely is a change of its own.

Deleting an asset first reports which documents reference it. Deletion is the user's decision, never
a silent one.

A stored signature is an **image of a signature**. It carries no cryptographic or legal meaning, and
the UI says so wherever it appears.

### Metadata

An asset carries a **title** independent of its filename and a **description** (change 0027), both
edited in place on the library card, which also states filename, MIME type, pixel and physical
dimensions, file size and import date; the kind can be changed there, and `qr-code` is a kind
(prepared for a later generator). The image dialog in the editor shows a thumbnail with title,
dimensions and size before inserting.

## Verification

- `tests/services.test.ts` covers every import rule through a stubbed image probe.
- `tests/security/untrustedInput.test.ts` covers the records that must be refused.
