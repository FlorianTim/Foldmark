# Proposal (research): Premium as feature gating, offline licences, commerce readiness

Status: Research — not scheduled (2026-09-16). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Korrekturen_Roadmap_Premium_2026-09-16.md` Teil C, C10–C16,
C24, C25. Roadmap R15-007, R15-008, R15-014. Nothing ships with 1.4; Foldmark stays fully usable
without premium, login or cloud (C29).

## What exists

The template already ships `domain/entitlement/Entitlement.ts` (levels `free`, `pro-lifetime`,
`pro-subscription`; a fail-open feature-gate catalogue), `EntitlementService` (`isUnlocked`,
`restore`) over a `PurchaseGateway` port with an `UnavailablePurchaseGateway`, and `ProPanel.vue`.
Foldmark gates nothing today.

## Questions to answer

1. **Feature ids and quotas.** Extend the catalogue with stable ids (`template.custom.save`,
   `template.custom.multiple`, `qr.generate`, `qr.style`, `export.docx`, `export.odt`,
   `theme.custom`, `letterhead.advanced`, `package.encryption`) and a state model
   `{ mode: 'free' | 'beta-free' | 'quota' | 'licensed' | 'locked', used?, limit?, resetAt? }`.
   `consume()` counts only after a successful action.
2. **Enforcement in use cases.** Every gated operation checks the service itself; the UI badge is
   decoration. Local counters are acknowledged as tamperable; obfuscation is not called security.
3. **Beta-free provider.** During the test phase all marked features are on and labelled "free
   during the test phase"; no purchase button while no shop exists.
4. **Signed licence.** Token payload (`licenseId`, optional `subject`, `plan`, `features`,
   `issuedAt`, `expiresAt`), signature scheme (Ed25519 via Web Crypto where available, else ECDSA
   P-256), public key shipped in the app, import of a licence file, inclusion in the backup.
5. **Fulfilment.** Stripe Payment Link → webhook → small worker signs the token → e-mail or
   download. No Stripe secret, no private key in the client. Manual issuing as the alpha path.
6. **SSO.** Identity only (`sub`), never the store for entitlements; optional, never required.
7. **Commerce readiness.** The C24 checklist as a document the owner signs off before any sale.

## Deliverables

An ADR on the entitlement model and the licence format, the extended catalogue with tests, the
beta-free provider, and the commerce checklist — implementation of paid features follows in their
own changes (R15-009…R15-013).
