# ADR 0020: Contacts carry lists; the 1.0 scalar fields are projections of the primary entries

Date: 2026-09-15

## Status

Accepted (change 0025, 2026-09-15).

## Context

The 1.0 address record has one postal address and one e-mail, phone and website each. The
post-release feedback asks for a contact with several of each — home, office, PO box; private and
work e-mail — one of them primary. Every renderer, the snapshot (ADR 0017), the search index, the
e-mail hand-off and the backup read the scalar fields, and five thousand records may already be in
IndexedDB.

## Decision

The record keeps its type name `Address` and its scalar fields. It gains `addresses: PostalEntry[]`,
`emails`, `phones` and `websites: ContactPoint[]`, each entry with a `primary` flag, and first/last
name fields. `postal`, `email`, `phone` and `website` are **projections of the primary entries**,
recomputed by `normalizeContact` on every read (the Zod schema's transform) and every write. A
record without lists — every 1.0 record — gets its lists derived from its scalars on read and is not
rewritten until it is saved again. A caller that still writes only a scalar replaces the list of
that kind.

The person's name lives in the name fields; an address entry without its own person line prints the
contact's name, so a "c/o" line stays possible per address.

## Alternatives considered

- **Replace the scalars with the lists** — every consumer changes, the migration rewrites every
  record, and a failed upgrade leaves a directory half-converted.
- **A separate `Contact` aggregate that owns `Address` rows** — a cleaner model, but the snapshot
  and the search would have to join, and nothing in the product needs an address without its
  contact.

## Consequences

- No Dexie upgrade step for contacts (version 4 only adds the folder and document indexes); the 1.0
  backup imports unchanged.
- The snapshot a document takes is the primary address, as before; choosing another address of the
  same contact for one letter is a later feature and does not need a model change.
- `normalizeContact` is the single place that keeps the two shapes consistent; a test asserts it is
  idempotent and that a 1.0 fixture reads as a one-entry contact.
