/**
 * Identifiers.
 *
 * Foldmark identifiers have to survive a round trip through a Markdown file a
 * human may have written by hand, so they are **not** required to be UUIDs.
 * `din5008-b` and `sender-private` are as valid as a generated UUID; the
 * built-in profiles and the example documents both rely on that.
 *
 * What they must be is bounded, opaque and free of anything that could change
 * meaning when embedded in YAML, a filename or an object key — hence the
 * deliberately narrow character set.
 */

/** Longest identifier accepted anywhere in the domain. */
export const ID_MAX_LENGTH = 80;

/**
 * Characters an identifier may contain.
 *
 * Must start alphanumeric so an id can never be read as a YAML directive, a
 * relative path segment or `__proto__`.
 */
export const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

/** Whether a string is a well-formed Foldmark identifier. */
export function isValidId(value: string): boolean {
  return ID_PATTERN.test(value);
}

/** Creates a fresh random identifier for a locally created record. */
export function createId(): string {
  return crypto.randomUUID();
}

/**
 * Derives a stable, bounded identifier from human text.
 *
 * Used where a person names a thing and an id has to follow — a cloned print
 * profile, an imported asset. Falls back to a random id when nothing usable
 * survives normalization, because an empty id is worse than an opaque one.
 */
export function slugifyId(value: string): string {
  const slug = value
    .normalize('NFKD')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, ID_MAX_LENGTH);
  return isValidId(slug) ? slug : createId();
}
