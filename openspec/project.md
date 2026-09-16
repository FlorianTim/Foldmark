# Project

## Identity

Foldmark is a local-first web application for authoring structured documents and rendering them
through configurable physical print profiles. It is a LumbreCode application generated from the
LumbreCode Web App Template; product identity lives in `template.config.json`.

## What Foldmark is for

One document, many physical and digital outputs. The user writes content once — Markdown body plus
structured metadata — and Foldmark renders it onto a chosen sheet: a DIN-style letter with fold and
punch marks, a blank A4 page, a duplex postcard, a card, a photo format, or an email hand-off.

The differentiator is the **print profile**: page geometry, named regions and helper marks (fold,
hole, cut, bleed, safe area, separator, address window, stamp area) expressed in millimetres and
rendered in CSS millimetres, so what the preview shows is what the printer receives.

## Non-negotiables

- **Local-first.** All user data lives in this browser. There is no account and no server.
- **Privacy by default.** No analytics, no remote fonts, no CDN runtime code. The first load makes
  no intentional third-party request. Connectors are opt-in, consented and lazy-loaded.
- **Prepare, never send.** Foldmark produces files and hands them to the user's own applications. It
  never claims a message was sent.
- **No unverified standards claims.** DIN-style profiles are named "DIN-style", carry
  `standardsStatus: 'draft-unverified'`, and say so in the UI.
- **Physical units are domain data.** Millimetres are canonical; display scale is a presentation
  concern that can never reach an export.

## Development model

- Specs describe accepted current behavior.
- Changes describe proposed deltas before implementation.
- ADRs record durable decisions.
- arc42 describes long-lived architecture.
- Raw drafts under `drafts/init/` are non-normative inputs; `drafts/init/processed.md` tracks what
  has been derived from them.
