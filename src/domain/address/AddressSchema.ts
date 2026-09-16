import { z } from 'zod';
import { boundedText, IdSchema, TimestampSchema } from '@/domain/common/Schemas';
import {
  ADDRESS_FIELD_MAX_LENGTH,
  CONTACT_LABEL_MAX_LENGTH,
  CONTACT_POINTS_MAX,
  normalizeContact,
  POSTAL_ENTRIES_MAX,
  STATIONERY_LINE_MAX_LENGTH,
  type Address,
} from '@/domain/address/Address';
import { SENDER_FIELD_MAX_LENGTH } from '@/domain/address/SenderProfile';
import {
  AssetPlacementSchema,
  PostalAddressSchema,
  SenderSnapshotSchema,
} from '@/domain/document/DocumentSchema';

export { SenderSnapshotSchema };

/**
 * Runtime schemas for the address book and sender identities.
 *
 * Provenance is validated as carefully as the address itself: the privacy
 * inventory and the connector audit both read it, so a record claiming an
 * unknown source has to fail here rather than quietly become "manual".
 */

/** Where a stored address came from. */
export const AddressProvenanceSchema = z
  .object({
    source: z.enum(['manual', 'imported-file', 'connector']),
    origin: boundedText(80).optional(),
    importedAt: TimestampSchema.optional(),
  })
  .strict();

/** What an address is to its owner. */
export const AddressRoleSchema = z.enum(['primary', 'home', 'sender', 'favorite', 'normal']);

/** Which contact details print. Absent means hidden. */
export const ContactVisibilitySchema = z
  .object({
    email: z.boolean().optional(),
    phone: z.boolean().optional(),
    website: z.boolean().optional(),
  })
  .strict();

/** What a sender brings to every letter. */
export const StationerySchema = z
  .object({
    footerLines: z.array(boundedText(STATIONERY_LINE_MAX_LENGTH)).max(8),
    defaultSignatureId: IdSchema.optional(),
    letterhead: z.array(AssetPlacementSchema).max(8),
  })
  .strict();

/** One postal address of a contact (change 0025). */
export const PostalEntrySchema = z
  .object({
    id: IdSchema,
    label: boundedText(CONTACT_LABEL_MAX_LENGTH).optional(),
    postal: PostalAddressSchema,
    primary: z.boolean(),
    favorite: z.boolean().optional(),
  })
  .strict();

/** One e-mail address, phone number or website of a contact. */
function contactPointSchema(maxLength: number) {
  return z
    .object({
      value: boundedText(maxLength),
      label: boundedText(CONTACT_LABEL_MAX_LENGTH).optional(),
      primary: z.boolean(),
    })
    .strict();
}

/**
 * One entry in the local contact directory.
 *
 * `roles` and `contactVisibility` default rather than fail: records and backups
 * written before change 0006 lack them, and a missing role is "normal", not a
 * corrupt row. The lists (change 0025) default to empty and are then derived
 * from the 1.0 scalars by `normalizeContact`, which also recomputes the
 * scalar projections — so a record is consistent whichever way it was written.
 */
export const AddressSchema = z
  .object({
    id: IdSchema,
    displayName: boundedText(ADDRESS_FIELD_MAX_LENGTH),
    firstName: boundedText(ADDRESS_FIELD_MAX_LENGTH).optional(),
    lastName: boundedText(ADDRESS_FIELD_MAX_LENGTH).optional(),
    addresses: z.array(PostalEntrySchema).max(POSTAL_ENTRIES_MAX).default([]),
    emails: z.array(contactPointSchema(254)).max(CONTACT_POINTS_MAX).default([]),
    phones: z.array(contactPointSchema(40)).max(CONTACT_POINTS_MAX).default([]),
    websites: z.array(contactPointSchema(300)).max(CONTACT_POINTS_MAX).default([]),
    postal: PostalAddressSchema,
    email: boundedText(254).optional(),
    phone: boundedText(40).optional(),
    website: boundedText(300).optional(),
    contactVisibility: ContactVisibilitySchema.default({}),
    roles: z.array(AddressRoleSchema).min(1).max(5).default(['normal']),
    stationery: StationerySchema.optional(),
    notes: z.string().max(2_000).optional(),
    tags: z.array(boundedText(40)).max(24),
    provenance: AddressProvenanceSchema,
    lastUsedAt: TimestampSchema.optional(),
    demoData: z.boolean().optional(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict()
  .transform((record) => normalizeContact(record as Address))
  .refine((address) => address.displayName.length > 0, {
    message: 'displayName',
    path: ['displayName'],
  });

/** A whole address book loaded from IndexedDB. */
export const AddressListSchema = z.array(AddressSchema);

/** A pre-0006 sender identity, still accepted from old backups and migrated on read. */
export const SenderProfileSchema = z
  .object({
    id: IdSchema,
    name: boundedText(SENDER_FIELD_MAX_LENGTH).min(1),
    postal: PostalAddressSchema,
    email: boundedText(254).optional(),
    phone: boundedText(40).optional(),
    website: boundedText(300).optional(),
    footerLines: z.array(boundedText(SENDER_FIELD_MAX_LENGTH)).max(8),
    defaultSignatureId: IdSchema.optional(),
    letterhead: z.array(AssetPlacementSchema).max(8),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

/** Every stored sender identity. */
export const SenderProfileListSchema = z.array(SenderProfileSchema);
