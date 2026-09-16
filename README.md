# Foldmark

**Write once. Print it where it actually has to fit.**

Foldmark is a local-first web application for letters, postcards and cards. You write the content
once — a Markdown body plus structured metadata — and render it onto whichever sheet it is going on:
a DIN-style letter with fold and punch marks, a blank A4 page, a duplex A6 postcard, a card, a photo
format, or a message handed to your mail client.

Everything stays in your browser. There is no account, no server and no upload.

## What it does that a word processor does not

**Configurable physical helper geometry.** Fold marks, punch marks, cut marks, bleed, safe areas,
address windows, stamp areas and separators — positioned in millimetres, rendered in CSS
millimetres, and shown with their measurements so you can check them against a ruler.

Three properties follow from how that is built:

- **Zoom cannot move a mark.** The preview draws the sheet in millimetres and applies display scale
  as a CSS transform on a parent element. A transform does not change layout, so no zoom level can
  alter a coordinate that reaches the printer.
- **What prints is not the preview.** Printing renders a separate copy built in "paper" mode, so the
  print profile decides which marks appear — not a stylesheet.
- **Foldmark does not claim what it has not verified.** The DIN-style profiles use commonly cited
  working values, are named "DIN-style … (draft)", and say on every print that they have not been
  checked against a licensed copy of the standard.

## Shipped print profiles

| Profile                  | Size             | Notes                                                          |
| ------------------------ | ---------------- | -------------------------------------------------------------- |
| DIN-style Form B (draft) | A4               | Folds at 105 mm and 210 mm, punch at 148.5 mm, address window  |
| DIN-style Form A (draft) | A4               | Folds at 87 mm and 192 mm, punch at 148.5 mm, address window   |
| A4 blank                 | A4               | No helper marks                                                |
| A4 with letterhead       | A4               | Reserved band for a local logo or background                   |
| A5 card                  | A5               | Preview-only safe area                                         |
| A6 postcard, landscape   | 148 × 105 mm     | Front and back, short-edge flip, message/address/stamp regions |
| Photo 10 × 15 cm         | 100 × 150 mm     | Bleed and safe area                                            |
| US Letter                | 215.9 × 279.4 mm | No DIN-specific assumptions                                    |

Built-in profiles are immutable. Editing one creates a copy — and the copy drops the standards
claim, because moving a fold mark cannot make geometry more standard-conformant.

## Your data

|               |                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| Where         | IndexedDB and localStorage, in this browser only                                                                     |
| What          | Documents, addresses, sender identities, custom print profiles, images, preferences                                  |
| Sent anywhere | No. The application makes no external request at all — asserted by a test                                            |
| Export        | One JSON backup containing everything, or a single document as Markdown with YAML front matter                       |
| Delete        | "Delete my local data" clears content; "Reset settings" clears preferences. Separate actions, separate confirmations |

Full detail: [data inventory](docs/privacy/DATA_INVENTORY.md),
[external request register](docs/privacy/EXTERNAL_REQUEST_REGISTER.md), [PRIVACY.md](PRIVACY.md).

**Foldmark prepares output; it never sends it.** Email hand-off produces a `mailto:` link, a body to
copy, or an `.eml` file for your own mail client. PDFs come from your browser's print dialog, where
"Save as PDF" is a destination.

## The document format

Markdown with YAML front matter — readable and editable without Foldmark:

```markdown
---
foldmarkVersion: 1
kind: letter
title: Antrag auf Ausstellung einer Bescheinigung
locale: de-DE
printProfile: din5008-b
recipient:
  organization: Stadt Beispielstadt
  street: Rathausplatz 1
  postalCode: '12345'
  city: Beispielstadt
date: 2026-08-03
subject: Antrag auf Ausstellung einer Bescheinigung
---

Sehr geehrte Damen und Herren,

hiermit beantrage ich die Ausstellung einer Bescheinigung.
```

Front matter is parsed by a purpose-built bounded subset rather than a general YAML library:
anchors, aliases, tags and flow collections are refused with the offending line number, a quoted
postcode stays a string, and `city: NO` stays Norway
([ADR 0010](docs/adr/0010-bounded-yaml-subset.md)). A file that cannot be parsed is handed back with
its original text, never swallowed.

## Quick start

```bash
npm ci --ignore-scripts
npm run hooks:install
npm run verify
npm run dev
```

On Windows PowerShell: `./scripts/bootstrap.ps1` — on Linux/macOS: `./scripts/bootstrap.sh`.

## Common commands

| Purpose                                          | Command                       |
| ------------------------------------------------ | ----------------------------- |
| Start development server                         | `npm run dev`                 |
| Fast lint, types and unit tests                  | `npm run verify:fast`         |
| Full local CI                                    | `npm run ci`                  |
| End-to-end journeys                              | `npm run test:e2e`            |
| All portable hosted-workflow checks              | `npm run workflow:local`      |
| Build Pages artifact                             | `npm run workflow:pages`      |
| Build portable ZIP and checksum                  | `npm run workflow:release`    |
| Capture documentation screenshots                | `npm run screenshots:capture` |
| Render the bundled help from `docs/public-site/` | `npm run help:render`         |
| Review advisories, signatures and updates        | `npm run dependencies:check`  |
| Validate version consistency                     | `npm run version:check`       |
| Verify in the Dev Container                      | `npm run devcontainer:verify` |

## Architecture

```text
Presentation (Vue, Pinia, i18n)
        ↓
Application (use cases, ports, render plan, target validation)
        ↓
Domain (units, documents, print profiles, markers, addresses, assets, findings)
        ↑
Infrastructure (Dexie/IndexedDB, codecs, email renderers, image probe)
```

Dependency direction is inward and enforced by `npm run architecture:check`. The domain imports no
framework; Vue components never touch IndexedDB.

The piece worth reading first is the **render plan**
([`buildRenderPlan.ts`](src/application/render/buildRenderPlan.ts)): a pure function turning a
document, a profile, a sender and resolved assets into pages, markers and positioned blocks in
millimetres, with no DOM and no HTML. The screen preview, the print copy and any future PDF adapter
all consume it, which is why they cannot drift apart.

- [arc42 architecture documentation](docs/arc42/)
- [Architecture decisions](docs/adr/) — 0009–0015 are Foldmark's
- [Diagram sources](docs/architecture/diagrams/)
- [Specifications](openspec/specs/) and the [first change](openspec/changes/0001-foldmark-mvp/)
- [Source-code guide](docs/development/SOURCE_CODE.md)
- [Threat model](docs/security/THREAT_MODEL.md)

## Quality and security

- No HTML is generated from document text anywhere, on screen or in email. There is no sanitizer
  because there is nothing to sanitize ([ADR 0011](docs/adr/0011-no-generated-html.md)).
- Mail header values are **refused, not repaired**, when they contain a control character — silent
  repair hides that something tried.
- Image imports are validated against the decoded image, not the declared type. SVG is not accepted.
- Every record is validated on the way out of IndexedDB as well as on the way in, and a damaged
  record is dropped rather than allowed to break a screen.
- Strict TypeScript, ESLint security rules, a Content-Security-Policy without `'unsafe-inline'`,
  CodeQL, dependency review, licence policy and generated third-party notices.
- 208 unit and integration tests, 18 end-to-end journeys, and a security suite of negative cases.

`pre-push` runs the complete `npm run workflow:ci` gate.

## Provenance

Foldmark was generated from the LumbreCode Web App Template `1.0.0`. What was replaced, what was
inherited and what has been adopted since is recorded in
[`GENERATED_FROM_TEMPLATE.md`](docs/development/GENERATED_FROM_TEMPLATE.md). Problems found in the
template while building this app are in [`docs/template-feedback/`](docs/template-feedback/).

The input material the product was derived from is in `drafts/init/`, with
[`processed.md`](drafts/init/processed.md) recording what became of each piece.

## Status and open questions

Version `1.0.0`, not yet tagged. The MVP acceptance criteria are met; see
[`tasks.md`](openspec/changes/0001-foldmark-mvp/tasks.md) for what is implemented and what is not.

Open for review: the DIN-style geometry is unverified, a numeric print-profile editor is not yet
built, signature _drawing_ is not implemented (importing a signature image is), and no formal WCAG
2.2 AA audit has been run.

## License

MIT. Generated third-party notices are in `public/` after dependency installation.
