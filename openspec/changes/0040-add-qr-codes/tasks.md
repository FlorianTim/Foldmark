# Tasks: QR codes

- [x] Catalogue entry `qr` with the `length` attribute kind; `qr` block in the adapter; literal
      label transform in the remark pipeline; unit tests.
- [x] `src/domain/qr/qrCode.ts` around `uqr` 0.1.3 (MIT, zero dependencies): validation, matrix,
      path, print check, payload kinds, serializer; unit tests.
- [x] `FeatureUsageStore` port, `premium-usage` preference, `QrCodeService` with the gate and the
      counter; unit tests for counting, refusals and the locked state.
- [x] Editor node, view, commands, selection state and `selectQr`; round-trip fixtures and a command
      test.
- [x] `QrCodeFigure`, `SafeMarkdown` case, print and editor styles, height estimate, mail renderers.
- [x] `QrCodeDialog`, `QrToolbar`, toolbar button, Insert menu, source-view insertion, i18n de/en.
- [x] e2e: insert, all three renderers, toolbar alignment, file spelling, source-view edit, the
      allowance after one code.
- [x] Specs (`document-formatting.md`, `app-shell.md`), roadmap R15-011, feature log, changelog,
      help guide, data inventory, dependency review, `processed.md`.
