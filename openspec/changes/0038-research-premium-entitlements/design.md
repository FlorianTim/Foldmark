# Design notes (research): premium architecture

```text
Presentation   premium badge, quota display, "free during the test phase"
Application    EntitlementService: getState(id) / canUse(id) / consume(id, n)
Infrastructure LocalBetaEntitlementProvider (now) | SignedLicenseProvider (later) | AccountEntitlementProvider (later)
```

Rules already fixed by the specs and C29: local-first stays complete without premium; no secret in
the static app; counters only after success; a use case re-checks the entitlement even when the UI
was bypassed; a disabled button is not a control.

Open: whether the template's three-level `Entitlement` becomes per-feature states or wraps them;
where the licence file is imported (Settings → About → Licence); how the backup carries it.
