# Static releases and LumbreCode domains

Concrete applications use `<slug>.webapps.lumbrecode.de` when `application.customDomain` is `auto`.
The initializer resolves that hostname into runtime configuration and `public/CNAME`. DNS and the
hosting platform must still be configured separately, and HTTPS must be active before launch.

Run the complete verified release locally:

```bash
npm run workflow:prepare
npm run workflow:release
```

The result is `release/<slug>-<application-version>.zip` plus a `.sha256` checksum. The ZIP contains
the deployable site at its root, a release manifest and extraction instructions. Verify the
checksum, then extract all files directly into the HTTPS web root. Do not publish source maps or
repository files.

After a plain `npm run build`, `npm run artifact:check` validates base-aware assets, license notices
and the absence of unobfuscated shared-mailbox addresses without rerunning CI.

The `Build static release` workflow calls the same commands for manual runs and `v*` tags and
uploads the exact local artifact shape. `public/_headers` is a portable header example, not a
universal server configuration; reproduce those headers in the selected host if it does not process
that file.
