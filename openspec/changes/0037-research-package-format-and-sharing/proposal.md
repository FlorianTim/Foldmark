# Proposal (research): `.foldmark` package, protected export, share links

Status: Research — not scheduled (2026-09-16). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Korrekturen_Roadmap_Premium_2026-09-16.md` Teil C, C1–C7,
C28. Roadmap R15-001…R15-004. Nothing here ships with 1.4; the change exists so the questions are
written down before somebody answers them in code.

## Questions to answer before implementation

1. **Container.** ZIP through `zip.js` (BSD-3-Clause; ~ 200 kB; Web Streams, Zip64, AES) versus a
   hand-rolled "stored" ZIP writer plus `CompressionStream` per entry. Decide on bundle size,
   licence register entry, and whether AES-ZIP interoperability with desktop tools is a goal at all.
2. **Manifest.** Fix `manifest.json` v1: `format`, `formatVersion`, `foldmarkSchemaVersion`,
   `documentId`, `documentKind`, `createdAt`, `createdWith`, `contentFile`,
   `assets[] { path, id, mime, sha256 }`, `compression`, `integrity`. No person-related fields
   unless opted in.
3. **Envelope.** Variant B (own header + AES-GCM over the whole ZIP, PBKDF2-SHA-256 with a
   benchmarked iteration count, random 16-byte salt, 12-byte IV, versioned parameters) versus
   ZIP-AES. The envelope must be reviewed before the UI says "encrypted".
4. **Share link.** `#share=v1.gzip.<base64url>` and `#share=e1.<salt>.<iv>.<ct>`; the 8 / 32 KiB
   thresholds validated against a messenger/mail matrix (WhatsApp, Signal, Outlook, Gmail, iOS and
   Android share sheets); the receiving view (preview → import as copy → discard) and the "this is a
   copy" disclosure.
5. **Progress.** Worker for anything above ~ 1 MB; cancel; per-asset errors.
6. **Template backport.** Which parts are generic (`PackageWriter/Reader`, `CompressionProvider`,
   `EncryptionProvider`, `SharePayloadCodec`, `ProgressReporter`) and how they land in the web-app
   template's `drafts/notes/` inbox.

## Deliverables of the research

An ADR for the container and the envelope, a spike branch with fixtures for the wire formats, a
security review note, and — only then — implementation changes.
