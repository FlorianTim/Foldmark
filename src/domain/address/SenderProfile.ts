import { createId } from '@/domain/common/Ids';
import { normalizeContact, type Address } from '@/domain/address/Address';
import type { AssetPlacement, PostalAddress } from '@/domain/document/FoldmarkDocument';

/**
 * The sender, as the renderer sees it.
 *
 * Since change 0006 a sender is an address-book entry with a sender role, not
 * a record of its own. What the renderer needs — name, postal fields, contact
 * block, footer lines, letterhead, default signature — is projected from the
 * address by {@link senderProfileFrom}, or rebuilt from the **snapshot** a
 * document carries by {@link senderProfileFromSnapshot} when the book entry has
 * changed or gone (ADR 0017).
 *
 * Contact details are projected only when the address says they may be shown;
 * the visibility switch lives on the address, the snapshot copies the answer.
 */

/** Longest single contact field. */
export const SENDER_FIELD_MAX_LENGTH = 200;

/** Everything the layout needs from a sender. */
export interface SenderProfile {
  readonly id: string;
  /** What the picker shows: "Privat", "Verein", "Beispiel GmbH". */
  readonly name: string;
  readonly postal: PostalAddress;
  readonly email?: string;
  readonly phone?: string;
  readonly website?: string;
  /** Bank details, register numbers and the like, shown in the letter footer. */
  readonly footerLines: readonly string[];
  /** Identifier of a locally stored signature image used unless the document overrides it. */
  readonly defaultSignatureId?: string;
  /** Letterhead artwork placed on every letter from this sender. */
  readonly letterhead: readonly AssetPlacement[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * What a document remembers about its sender: the fields as they were when
 * chosen, with the contact details already filtered by visibility. The source
 * id lives beside it in the metadata (`senderProfileId`), so letterhead and
 * signature can still be looked up while the entry exists.
 */
export interface SenderSnapshot {
  readonly name: string;
  readonly postal: PostalAddress;
  readonly email?: string;
  readonly phone?: string;
  readonly website?: string;
  readonly footerLines: readonly string[];
}

/** The renderer's view of an address-book entry. */
export function senderProfileFrom(address: Address): SenderProfile {
  const visible = address.contactVisibility;
  return {
    id: address.id,
    name: address.displayName,
    postal: address.postal,
    email: visible.email ? address.email : undefined,
    phone: visible.phone ? address.phone : undefined,
    website: visible.website ? address.website : undefined,
    footerLines: address.stationery?.footerLines ?? [],
    defaultSignatureId: address.stationery?.defaultSignatureId,
    letterhead: address.stationery?.letterhead ?? [],
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}

/** The snapshot a document stores when an address is chosen as its sender. */
export function senderSnapshotOf(address: Address): SenderSnapshot {
  const profile = senderProfileFrom(address);
  return {
    name: profile.name,
    postal: profile.postal,
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    footerLines: profile.footerLines,
  };
}

/**
 * A sender rebuilt from a document's snapshot.
 *
 * Letterhead and signature are not part of the snapshot — they reference
 * bytes local to one browser — so they come from the source address while it
 * exists and are simply absent afterwards.
 */
export function senderProfileFromSnapshot(
  snapshot: SenderSnapshot,
  source: Address | null,
  sourceId = source?.id ?? 'snapshot',
): SenderProfile {
  return {
    id: sourceId,
    name: snapshot.name,
    postal: snapshot.postal,
    email: snapshot.email,
    phone: snapshot.phone,
    website: snapshot.website,
    footerLines: snapshot.footerLines,
    defaultSignatureId: source?.stationery?.defaultSignatureId,
    letterhead: source?.stationery?.letterhead ?? [],
    createdAt: source?.createdAt ?? '',
    updatedAt: source?.updatedAt ?? '',
  };
}

/**
 * The single line printed above the recipient inside an address window.
 *
 * Windowed envelopes show it through the same window as the address, which is
 * why it has to fit on one line and gets truncated rather than wrapped.
 */
export function returnAddressLine(profile: SenderProfile): string {
  const { person, organization, street, postalCode, city } = profile.postal;
  return [organization ?? person, street, [postalCode, city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' · ')
    .slice(0, SENDER_FIELD_MAX_LENGTH);
}

/** Creates a standalone sender, for fixtures and for reading pre-0006 records. */
export function createSenderProfile(
  input: {
    name: string;
    postal: PostalAddress;
    email?: string;
    phone?: string;
    website?: string;
    footerLines?: readonly string[];
    defaultSignatureId?: string;
  },
  now = new Date(),
): SenderProfile {
  const timestamp = now.toISOString();
  return {
    id: createId(),
    name: input.name.trim().slice(0, SENDER_FIELD_MAX_LENGTH),
    postal: input.postal,
    email: input.email,
    phone: input.phone,
    website: input.website,
    footerLines: input.footerLines ?? [],
    defaultSignatureId: input.defaultSignatureId,
    letterhead: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** The address-book entry a pre-0006 sender identity becomes. */
export function addressFromLegacySender(profile: SenderProfile): Address {
  return normalizeContact({
    id: profile.id,
    displayName: profile.name,
    addresses: [],
    emails: [],
    phones: [],
    websites: [],
    postal: profile.postal,
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    // Pre-0006 senders printed their contact block unconditionally.
    contactVisibility: {
      email: profile.email !== undefined,
      phone: profile.phone !== undefined,
      website: profile.website !== undefined,
    },
    roles: ['sender'],
    stationery: {
      footerLines: profile.footerLines,
      defaultSignatureId: profile.defaultSignatureId,
      letterhead: profile.letterhead,
    },
    tags: [],
    provenance: { source: 'manual' },
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  });
}
