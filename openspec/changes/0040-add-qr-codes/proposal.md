# Proposal: QR codes in the body

Status: Implemented (2026-09-17). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Korrekturen_Roadmap_Premium_2026-09-16.md` Teil C, C19 ("QR
Basis"), C11/C12 for the gate; the owner's recommended order (C27, Phase 6) puts it right after the
own templates (change 0039). Roadmap R15-011. Priority: premium future, picked as the next feature.

## Scope

- **File format.** A leaf directive `::qr[payload]{size=30mm align=center ec=M}` in the directive
  catalogue. The label is the payload, taken literally; `size` is the drawn side in millimetres,
  quiet zone included (15–80, default 30); `align` left/center/right; `ec` L/M/Q/H. Defaults are not
  written. Nothing but text is stored — no image, no asset.
- **Rendering.** Encoded locally (`uqr`, MIT, no dependencies) whenever the block is drawn: editor
  node view, preview, print copy, as one SVG path in module units, black on white, crisp edges. The
  height estimate counts the size. Plain-text mail carries the payload, HTML mail the payload as
  text.
- **Editor.** Insert → QR code, a toolbar button, and a dialog: web address, e-mail (with subject),
  phone, or a line of text; size, alignment, error correction; a live preview with the module size
  and a warning under 0.5 mm; the free allowance. A click selects a code; a strip under it offers
  alignment and "Edit…", which reopens the dialog on the code. The Markdown view writes the same
  directive.
- **Premium.** `qr.generate` (registry, free limit 5) is asked and counted in
  `QrCodeService.generate` — on a successful insertion only. A new `FeatureUsageStore` port holds
  the counters, backed by the `premium-usage` preference. Test phase: marked, never blocked.
- **Out of scope** (recorded in the roadmap): multi-line payloads (vCard, events, Wi-Fi), styled
  codes (`qr.style`: colours, rounded modules, logos), a scan test in CI.

## Acceptance

- `::qr[https://example.org]{size=40mm align=center}` shows a 40 mm centred code in the editor, the
  preview and the print copy; the same SVG path in all three.
- `::qr[mailto:info@example.org?subject=Hi&body=a*b*]` encodes exactly that string — no directive,
  no emphasis is read inside the label; the editor writes it back unchanged.
- The dialog refuses an empty, multi-line, control-character or oversized payload with a reason and
  does not count it; inserting counts one; editing counts nothing; the fifth code is the last free
  one and the sixth still works, marked.
- A code below 0.5 mm per module is drawn and flagged in the dialog.
- `npm run ci` green; no HTML from the payload anywhere (security fixture).

## Deviations from the source

- **`uqr` instead of `qrcode`.** C19 names `qrcode` as a candidate; it drags `yargs` (a CLI parser)
  and `pngjs` into the lock file for a browser that needs neither. `uqr` (unjs, MIT, zero
  dependencies, TypeScript, 27 kB unminified) exposes the module matrix directly, which is all the
  renderers use — the SVG is drawn by Foldmark, without `innerHTML`.
- **Single-line payloads.** A leaf directive is one line; vCard and event payloads need a container
  form or an escape convention and are left for a later change rather than half-done here.
