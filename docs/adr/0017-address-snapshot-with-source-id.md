# ADR 0017: Documents store an address snapshot plus an optional source id

Date: 2026-09-11

## Status

Accepted (change 0006, 2026-09-11).

## Context

ADR 0009 embeds recipients in a document and references senders, on the reasoning that a letter is a
historical record while stationery follows the sender. The post-1.0 feedback merges senders and
recipients into one address book with roles, so the same address can play either part — and with
that, "reference or copy" has to be answered once for both.

## Decision

A document stores an **address snapshot** for sender and recipient: the fields as they were when
chosen, including which contact details are shown. The snapshot carries an optional `sourceId`
pointing at the address-book entry it came from. Editing or deleting an address in the book never
changes an existing document. Updating a document from its source is an explicit user action the UI
offers when the source has changed.

## Consequences

- Old letters stay what was sent, for both parties. Deleting an address is safe; the dialog only
  reports how many documents used it.
- Sender letterhead and signature are resolved through `sourceId` when present, and fall back to the
  snapshot's own fields when the source is gone.
- The portable Markdown file embeds both addresses; the 1.0 `senderId` front-matter field is read on
  import and migrated to a snapshot. Files written by 1.1 do not depend on the reader's address
  book.
