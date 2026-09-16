# Design: Address book redesign

## Model

```ts
type AddressRole = 'primary' | 'home' | 'sender' | 'favorite' | 'normal';

interface Address {
  id, roles: AddressRole[], country, name, lines, postalCode, city, region?,
  contact: { email?, phone?, web? }, contactVisibility: { email?, phone?, web? },
  lastUsedAt?, createdAt, updatedAt
}

interface AddressSnapshot { sourceId?: string; ...the address fields as written }
```

The document embeds `AddressSnapshot` for recipient (already the case) **and** for sender (currently
a reference). A snapshot is a copy; `sourceId` lets the UI offer "update from address book" as an
explicit action and lets the picker highlight the origin.

## Decisions

| Decision                      | Alternative rejected                    | Why                                                                                                    |
| ----------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| One repository with roles     | Keep sender identities separate         | The same person is both; two tables mean two edits and two places to search.                           |
| Sender becomes a snapshot too | Keep senders referenced (ADR 0009 note) | Stationery does follow the sender — but a letter is still a record. Explicit "update" resolves both.   |
| Country first, local list     | Free-text country                       | Country decides address line order and postal-code validation.                                         |
| Usage-aware delete            | Hard delete                             | Documents keep their snapshot, so deleting an address is safe; the dialog still says how many used it. |

## Migration

Dexie schema version bump: `senderIdentities` rows become `addresses` with `roles: ['sender']`;
documents with `senderId` get a snapshot built at migration time and keep `sourceId`. Letterhead and
signature references on the former sender identity move to the address.
