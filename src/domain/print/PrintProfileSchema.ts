import { z } from 'zod';
import {
  boundedText,
  IdSchema,
  MarginsMmSchema,
  MillimetresSchema,
  NonNegativeMillimetresSchema,
  PageSizeMmSchema,
  TimestampSchema,
} from '@/domain/common/Schemas';

/**
 * Runtime schemas for print profiles.
 *
 * A profile is the one record in Foldmark whose numbers become physical
 * distances, so the parsing here is stricter than the rest: coordinates must be
 * finite, stroke widths positive, surface names known. A profile that survives
 * this schema can be rendered; a profile that does not is reported to the user
 * with the field that failed rather than silently repaired.
 */

/** What a marker means. */
export const MarkerKindSchema = z.enum([
  'fold',
  'hole',
  'cut',
  'bleed',
  'safe-area',
  'separator',
  'address-window',
  'stamp-area',
  'grid',
  'custom',
]);

/** Which side a marker or region applies to. */
export const SurfaceScopeSchema = z.enum(['all', 'front', 'back']);

/** One helper mark. */
export const PrintMarkerSchema = z
  .object({
    id: IdSchema,
    kind: MarkerKindSchema,
    label: boundedText(120).optional(),
    xMm: MillimetresSchema,
    yMm: MillimetresSchema,
    widthMm: NonNegativeMillimetresSchema.optional(),
    heightMm: NonNegativeMillimetresSchema.optional(),
    orientation: z.enum(['horizontal', 'vertical']),
    strokeWidthMm: z.number().finite().gt(0).max(10),
    lineStyle: z.enum(['solid', 'dashed', 'dotted']),
    preview: z.boolean(),
    print: z.boolean(),
    surface: SurfaceScopeSchema,
    locked: z.boolean(),
  })
  .strict();

/** A named layout area on one surface. */
export const ProfileRegionSchema = z
  .object({
    xMm: MillimetresSchema,
    yMm: MillimetresSchema,
    widthMm: NonNegativeMillimetresSchema,
    heightMm: NonNegativeMillimetresSchema,
    surface: SurfaceScopeSchema,
  })
  .strict();

/** What a profile claims to physically support. */
export const ProfileCapabilitiesSchema = z
  .object({
    foldMarks: z.boolean(),
    addressWindow: z.boolean(),
    duplex: z.boolean(),
    bleed: z.boolean(),
  })
  .strict();

/** A profile name in both supported locales. */
export const LocalizedNameSchema = z
  .object({ de: boundedText(80).min(1), en: boundedText(80).min(1) })
  .strict();

/** One complete print profile. */
export const PrintProfileSchema = z
  .object({
    id: IdSchema,
    version: z.number().int().min(1).max(1_000),
    name: LocalizedNameSchema,
    category: z.enum(['letter', 'postcard', 'card', 'photo', 'label', 'custom']),
    builtIn: z.boolean(),
    page: PageSizeMmSchema,
    margins: MarginsMmSchema,
    capabilities: ProfileCapabilitiesSchema,
    markers: z.array(PrintMarkerSchema).max(200),
    regions: z.record(IdSchema, ProfileRegionSchema),
    duplex: z
      .object({
        flip: z.enum(['long-edge', 'short-edge']),
        surfaces: z.tuple([z.literal('front'), z.literal('back')]),
      })
      .strict()
      .optional(),
    bleed: MarginsMmSchema.optional(),
    standardsStatus: z.enum(['draft-unverified', 'verified', 'not-applicable']),
    updatedAt: TimestampSchema.optional(),
  })
  .strict();

/** A whole collection of user-owned profiles loaded from IndexedDB. */
export const PrintProfileListSchema = z.array(PrintProfileSchema);
