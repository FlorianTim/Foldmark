# Design notes (research): package and sharing

Candidate pipeline, to be confirmed by the spike:

```text
FoldmarkDocument + assets
  -> PackageWriter (manifest.json, document.md, assets/*)      [zip.js or minimal ZIP writer]
  -> optional EncryptionProvider (AES-GCM, PBKDF2)             [Web Crypto only]
  -> Blob "*.foldmark" | "*.foldmarkx"
Share:
  snapshot -> canonical compact JSON -> CompressionStream(gzip) -> optional encrypt -> base64url -> #share=
```

Constraints already decided by the specs: no network, no third-party runtime, everything behind
explicit user actions, the fragment never reaches a server, the passphrase never travels with the
link, a received share is a copy that is previewed before it is stored.

Open: `zip.js` licence entry in `compliance/`, worker bundling under the strict CSP, and the
receiving route (`#share=` is read once on load, then cleared from the URL).
