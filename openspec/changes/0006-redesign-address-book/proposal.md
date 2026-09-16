# Proposal: Address book redesign

Status: Implemented (1.1)

## Motivation

1.0 keeps recipients in an address book and senders as separate "sender identities". The feedback
asks for one repository with roles, so the same address can be a sender today and a recipient
tomorrow, and for an address book that scales past a handful of entries: alphabetical grouping,
search, and a clear set of actions.

## Scope

- One `AddressRepository` for senders and recipients. Roles: `primary`, `home`, `sender`,
  `favorite`, `normal`. Exactly one primary; at most one home.
- Sender ordering: primary, home, favourites/own addresses, recently used, remaining alphabetical.
- Address book view: alphabetical sections, local search, "+ Address".
- Actions per address: edit, duplicate, set as primary, mark as home, mark as favourite, use as
  sender, use as recipient, delete (usage-aware).
- Creating an address starts with a locally searchable country list; no network.
- Documents store an **address snapshot plus optional source id** for sender and recipient. Editing
  the address book never changes an existing document (ADR 0017).
- Contact details on an address carry a "show in document" flag per field.

## Out of scope

- The combobox picker in the document (change 0007).
- Any remote lookup (change 0014).

## Acceptance

- Migration: every 1.0 sender identity becomes an address with role `sender`; the default sender
  becomes `primary`. Existing documents keep rendering identically.
- 5 000 addresses list and search without visible lag.
