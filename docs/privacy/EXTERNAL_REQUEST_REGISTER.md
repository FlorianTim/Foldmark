# External request register

## Current state: empty

Foldmark 0.1 makes **no** external requests. Not on first load, not on any interaction. There is no
analytics, no remote font, no CDN runtime code, no telemetry and no connector. This is asserted by
an end-to-end test that fails when a request leaves the origin during start-up.

| Destination | Purpose | Data | Activation | Revocation |
| ----------- | ------- | ---- | ---------- | ---------- |
| _(none)_    |         |      |            |            |

## What the application does instead

| Need               | How Foldmark meets it without a request             |
| ------------------ | --------------------------------------------------- |
| Fonts              | System font stack only                              |
| Icons              | Local SVG in `src/assets/icons`                     |
| Markdown rendering | A parser in the domain layer                        |
| YAML front matter  | A bounded subset parser in the infrastructure layer |
| PDF                | The browser's own print dialog                      |
| Sending email      | Hand-off to the user's mail client                  |
| Storage            | IndexedDB in this browser                           |

## Considered and declined

| Candidate                                                      | Why not                                                                      |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Address autocomplete (Nominatim, Photon public, Google Places) | Sends what the user types about a real person to a third party; see ADR 0018 |

## Before anything is added here

A connector may only be implemented once this register names its destination, purpose, data
categories, activation condition and revocation behavior — and once
`openspec/specs/capability-system.md` is satisfied: disabled by default, code loaded only after
explicit consent, Authorization Code with PKCE without a client secret, minimal scopes, no persisted
third-party tokens.

Addresses that arrive from a connector must record `provenance.source = 'connector'` so imported
data stays distinguishable from data the user typed.
