import { z } from 'zod';
import { ID_MAX_LENGTH, ID_PATTERN } from '@/domain/common/Ids';
import { MAX_MM, MIN_MM } from '@/domain/common/Units';

/**
 * Shared runtime schemas.
 *
 * These are the primitives every trust boundary reuses: an identifier, a
 * measurement, a bounded string. Defining them once is what keeps "how long may
 * a city name be?" from having four different answers in four files, and it is
 * where the limits that stop a hostile file live.
 *
 * Every object schema in Foldmark is `.strict()`. Unknown keys are rejected
 * rather than stripped, because a file that contains a key Foldmark does not
 * understand is a file Foldmark does not understand — and silently dropping
 * half of it is how data disappears.
 */

/** A Foldmark identifier: bounded, opaque, safe as an object key. */
export const IdSchema = z.string().min(1).max(ID_MAX_LENGTH).regex(ID_PATTERN);

/** A physical measurement in millimetres, inside the supported range. */
export const MillimetresSchema = z.number().finite().min(MIN_MM).max(MAX_MM);

/** A non-negative physical measurement in millimetres. */
export const NonNegativeMillimetresSchema = z.number().finite().min(0).max(MAX_MM);

/** A rectangle in millimetres. */
export const BoxMmSchema = z
  .object({
    xMm: MillimetresSchema,
    yMm: MillimetresSchema,
    widthMm: NonNegativeMillimetresSchema,
    heightMm: NonNegativeMillimetresSchema,
  })
  .strict();

/** Page margins in millimetres. */
export const MarginsMmSchema = z
  .object({
    topMm: NonNegativeMillimetresSchema,
    rightMm: NonNegativeMillimetresSchema,
    bottomMm: NonNegativeMillimetresSchema,
    leftMm: NonNegativeMillimetresSchema,
  })
  .strict();

/** A physical page size with the orientation it is meant to print in. */
export const PageSizeMmSchema = z
  .object({
    widthMm: NonNegativeMillimetresSchema,
    heightMm: NonNegativeMillimetresSchema,
    orientation: z.enum(['portrait', 'landscape']),
  })
  .strict();

/** UTC ISO-8601 timestamp. */
export const TimestampSchema = z.string().datetime();

/** A calendar date, `YYYY-MM-DD` — the date on a letter, not a moment in time. */
export const CalendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

// Linear: a fixed two-letter prefix followed by at most two dot-free subtags,
// so no input can make the engine backtrack.
// eslint-disable-next-line security/detect-unsafe-regex
const LOCALE_TAG = /^[a-z]{2}(?:-[A-Za-z0-9]{2,8}){0,2}$/u;

/** A BCP-47 language tag, restricted to the shapes Foldmark produces. */
export const LocaleTagSchema = z.string().regex(LOCALE_TAG);

/** An ISO 3166-1 alpha-2 country code. */
export const CountryCodeSchema = z.string().regex(/^[A-Z]{2}$/u);

/** A short free-text field, trimmed and bounded. */
export function boundedText(max: number): z.ZodString {
  return z.string().trim().max(max);
}

/**
 * Object keys that must never reach a plain-object assignment.
 *
 * Zod builds fresh objects, so a parsed result cannot itself be polluted — but
 * `preserved` metadata is later merged back into emitted YAML, and a key called
 * `__proto__` surviving that round trip is a footgun with no upside.
 */
export const FORBIDDEN_KEYS: readonly string[] = ['__proto__', 'constructor', 'prototype'];

/** Whether a string is usable as a key in a record Foldmark writes back out. */
export function isSafeRecordKey(key: string): boolean {
  return !FORBIDDEN_KEYS.includes(key) && ID_PATTERN.test(key);
}

/** Most entries a preserved list or one-level mapping may carry. */
export const PRESERVED_ENTRIES_MAX = 32;

/**
 * A record of preserved metadata, with keys and value sizes bounded: scalars,
 * lists of scalars and one-level mappings of scalars (change 0017), which is
 * what a Pandoc header such as `geometry:` needs and no deeper.
 */
export function preservedRecordSchema(maxKeys: number, maxValueLength: number) {
  // Booleans and numbers keep their type, so `lot: true` from a Pandoc header
  // is written back as the boolean it was, not as the string "true".
  const scalar = z.union([z.string().max(maxValueLength), z.number().finite(), z.boolean()]);
  const safeKeys = (value: object) => Object.keys(value).every(isSafeRecordKey);
  return z
    .record(
      z.string(),
      z.union([
        scalar,
        z.array(scalar).max(PRESERVED_ENTRIES_MAX),
        z
          .record(z.string(), scalar)
          .refine((value) => Object.keys(value).length <= PRESERVED_ENTRIES_MAX)
          .refine(safeKeys, 'Preserved mapping keys must be simple identifiers.'),
      ]),
    )
    .refine(
      (value) => Object.keys(value).length <= maxKeys,
      `At most ${maxKeys} preserved keys are supported.`,
    )
    .refine(
      (value) => Object.keys(value).every(isSafeRecordKey),
      'Preserved keys must be simple identifiers.',
    );
}
