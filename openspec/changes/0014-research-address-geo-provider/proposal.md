# Proposal: Research an optional address/geo provider

Status: Done (1.2 research) — decision in ADR 0018

## Motivation

Address entry is error-prone; postal-code lookup and address completion would help. Any such
provider is a network call about a real person's address, which is exactly what Foldmark's privacy
model exists to control.

## Scope

- Evaluate candidates against the capability model: declared provider, purpose, scopes, data flow,
  consent, lazy loading, no persisted tokens.
- Privacy review: what leaves the browser, when, to whom, retention, jurisdiction.
- Decide whether an offline alternative (bundled postal-code table per country) covers enough.

## Deliverable

A decision record (ADR) with a recommendation: implement as a connector, bundle offline data, or
drop with a reason.
