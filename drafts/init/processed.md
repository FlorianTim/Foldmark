# Processing log for `drafts/init/`

One row per piece of input material, so a half-finished initialization can be picked up later — and
so "is this folder safe to delete?" has an answer that is not a guess.

`drafts/init/` may be deleted when every row says **done** or **dropped**.

## Status values

| Status | Meaning |
| --- | --- |
| `open` | Not looked at yet |
| `in spec` | Turned into an OpenSpec capability or change, not accepted yet |
| `done` | Accepted spec exists, or the asset is in its final place |
| `dropped` | Deliberately not used — with a reason in the row |

## Not safe to delete yet

Three rows below are `open`, all of them about ideas deliberately deferred past 0.1. Keep this
folder until they are either specified or dropped with a reason.

## Product and requirements

| Material | Kind | Processed into | Status |
| --- | --- | --- | --- |
| `notes/00-read-first.md` | principles | `openspec/project.md`, ADR 0009 | done |
| `notes/01-product-vision.md` | vision | `docs/arc42/01-introduction-and-goals.md`, `README.md` | done |
| `notes/02-personas-and-journeys.md` | personas | arc42 §1 stakeholders; the journeys became `tests/e2e/foldmark.spec.ts` | done |
| `notes/03-scope-and-roadmap.md` | scope | `docs/product/requirements_roadmap.md`, `openspec/changes/0001-foldmark-mvp/proposal.md` | done |
| `notes/04-functional-requirements.md` | requirements | `openspec/specs/{document-model,print-profiles,render-and-print,validation,email-handoff,assets-and-signatures}.md` | done |
| `notes/05-non-functional-requirements.md` | requirements | `openspec/specs/{security-baseline,privacy-by-default,local-storage,i18n,maintainability}.md`, arc42 §2 | done |
| `notes/06-domain-model.md` | domain | `src/domain/`, `docs/architecture/diagrams/domain-model.puml` | done |
| `notes/07-architecture-guidance.md` | architecture | arc42 §4, ADR 0009, `container.mmd`; ports implemented as described | done |
| `notes/08-print-profile-and-marker-system.md` | domain | `src/domain/print/`, `openspec/specs/print-profiles.md`, ADR 0015 | done |
| `notes/09-markdown-yaml-format.md` | format | `src/infrastructure/codec/`, `openspec/specs/document-model.md`, ADR 0010 | done |
| `notes/10-ui-ux-and-routes.md` | UX | `src/presentation/components/foldmark/`, ADR 0014 (routes became shell views) | done |
| `notes/11-letter-layouts.md` | layout | The five letter profiles and their regions in `builtInProfiles.ts` | done |
| `notes/12-postcard-duplex.md` | layout | `postcard-a6-landscape-duplex` profile, `SurfaceEditor.vue`, duplex render path | done |
| `notes/13-email-handoff.md` | feature | `openspec/specs/email-handoff.md`, `src/infrastructure/email/` | done |
| `notes/14-address-book-and-connectors.md` | feature | Address book implemented; connectors specified only, in `openspec/specs/capability-system.md` | done |
| `notes/15-assets-signatures-and-letterhead.md` | feature | `openspec/specs/assets-and-signatures.md`, `AssetService`, `BrowserImageProbe`. Signature *drawing* deferred | done |
| `notes/16-settings-themes-and-licenses.md` | feature | `settingsRegistry.ts`, `themes.css`, the inherited About panel | done |
| `notes/17-security-and-privacy.md` | security | `docs/security/THREAT_MODEL.md`, `docs/privacy/`, `tests/security/` | done |
| `notes/18-testing-and-quality.md` | testing | `tests/` — unit, integration, security and 18 e2e journeys | done |
| `notes/19-mvp-acceptance-criteria.md` | acceptance | `openspec/changes/0001-foldmark-mvp/tasks.md`, tracked per criterion | done |
| `notes/20-future-ideas.md` | backlog | Roadmap 0.2/0.3/later; the rest stays an idea | open |
| `notes/21-open-questions.md` | questions | Answered below | done |
| `notes/22-glossary.md` | glossary | `docs/arc42/12-glossary.md` vocabulary and the specs | done |
| `notes/23-implementation-slices.md` | plan | Followed; slices 1–9 implemented, slice 10 (connectors) specified only | done |
| `notes/24-brand-direction.md` | brand | `src/styles/themes.css`, `public/brand/`, favicon | done |
| `notes/25-documentation-expectations.md` | documentation | OpenSpec, arc42, ADRs 0009–0015, six diagram sources, privacy and threat docs | done |

## Assets

| Material | Kind | Processed into | Status |
| --- | --- | --- | --- |
| `assets/brand/*.svg`, `*.png` | artwork | `public/brand/`; mark used as favicon and app icon | done |
| `assets/icons/*.svg` | artwork | `src/assets/icons/`; `logo.svg` is the shell brand mark | done |
| `assets/design/tokens.json`, `themes.css` | design | Palette adopted into `src/styles/themes.css`, extended with per-theme contrast tokens and a daisyUI mapping | done |
| `assets/design/component-inventory.md` | design | Component set under `src/presentation/components/foldmark/`; names differ where the implementation merged views | done |
| `assets/mockups/*.svg`, `*.png` | design | Layout of the workspace, postcard editor, profile view and privacy centre | done |
| `assets/examples/print-profiles/*.json` | data | `src/domain/print/builtInProfiles.ts`, with the corrections noted below | done |
| `assets/examples/documents/*.md` | data | Format verified by `tests/markdownCodec.test.ts`, which parses the Form B example verbatim | done |
| `assets/examples/data/addresses.json`, `sender-profiles.json` | data | Shapes informed `Address` and `SenderProfile`; not shipped as seed data | done |
| `assets/diagrams/*.mmd`, `*.puml` | diagrams | `docs/architecture/diagrams/`, redrawn to match what was built | done |
| `assets/code-examples/**` | reference | Read and reconciled; see the deviations below | done |

## Deviations from the draft material, with reasons

| Draft | Implemented | Reason |
| --- | --- | --- |
| Organization "Lambro Code", `lambrocode.de` | LumbreCode, `lumbrecode.de` | `config/template.schema.json` fixes these as constants. Recorded as an open question and as template feedback. |
| `markdown-it` + `DOMPurify` | The template's token parser, moved to the domain | Nothing generates HTML from user text, so there is nothing to sanitize (ADR 0011). |
| `yaml` as a runtime dependency | Purpose-built bounded subset parser | Anchors, tags and implicit typing are a large behaviour surface on the widest input boundary (ADR 0010). |
| `vue-router` routes | Shell views in `App.vue` | The template ships no router; the base dependency set was preserved. Views map 1:1 to the proposed routes (ADR 0014). |
| `a5-card`, `postcard-a6…` declaring `bleed: true` | `bleed: false` | Neither profile defines bleed geometry. A capability flag with no marker behind it is exactly what profile validation now refuses. |
| `photo-10x15` with `bleed: true` and no bleed marker | Bleed marker added | Same rule, resolved the other way: the profile does define a bleed box. |
| Postcard `separator` as a region without a width | A vertical `separator` marker | It is a drawn line, not a content area. |
| Asset placements in the portable Markdown file | Backup package only | They reference bytes local to one browser. |

## The draft's open questions, answered

| # | Question | Answer |
| --- | --- | --- |
| 1 | Is "Foldmark" the final name? | Used throughout. Trademark and domain availability **not** checked — still open for the owner. |
| 2 | Which licence? | MIT, inherited from the template and recorded in `template.config.json`. |
| 3 | Must the MVP claim DIN 5008 compliance? | No. Profiles are "DIN-style (draft)" and carry `standardsStatus` (ADR 0015). |
| 4 | Is a visual Markdown editor required in the MVP? | No — source plus live preview. The format depends on the source staying visible. |
| 5 | Addresses embedded or referenced in exported Markdown? | Embedded. Correspondence is a record of what was sent. |
| 6 | Signatures in portable files or local only? | The *id* travels; the bytes do not. A missing asset is reported, not silently dropped. |
| 7 | Maximum local asset and document sizes? | 8 MB per image, 12 000 px per edge, 40 MP; 200 000 characters per body; 500 documents; 5 000 addresses. |
| 8 | Which browsers are supported for print accuracy? | Current evergreen browsers. Cross-browser print comparison is documented as a manual check, not assumed. |
| 9 | PWA installation in the MVP? | No. `features.pwa` stays `false`. |
| 10 | Google integrations in this repository? | Undecided — nothing is implemented. The capability spec requires the decision before any code. |
| 11 | Funding model? | Not decided. The template's entitlement seam is inherited and no purchase channel is configured. |

## Remaining work before this folder can be retired

| Item | Why it is still open |
| --- | --- |
| `notes/20-future-ideas.md` | Several ideas — profile marketplace, calibration wizard, envelope overlays, QR codes, booklet imposition — are neither specified nor explicitly dropped. |
| Trademark and domain check for "Foldmark" | Owner decision; the drafts flag it and it is unresolved. |
| Verify the DIN-style geometry | Needs a licensed copy of the current standard. Until then the shipped values stay `draft-unverified`. |
