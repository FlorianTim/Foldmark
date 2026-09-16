/**
 * Email header safety.
 *
 * Every value that ends up on a header line passes through here first, because
 * a single unescaped newline in a subject turns one header into two and lets
 * whoever supplied it add a `Bcc:`. Foldmark reads subjects and addresses out
 * of a Markdown file it did not write, so that input is untrusted by
 * definition.
 *
 * The rule is refusal, not repair: a header value containing CR or LF is
 * rejected and reported, never silently stripped. Quietly repairing input is
 * how a truncated subject becomes a support ticket, and it hides the fact that
 * something tried.
 */

/** Longest header value RFC 5322 allows on one unfolded line. */
export const HEADER_VALUE_MAX_LENGTH = 998;

/**
 * Longest `mailto:` URL Foldmark will generate.
 *
 * Browsers and mail clients truncate long `mailto:` URLs at wildly different
 * points, and a silently truncated letter is worse than a copy button, so the
 * hand-off falls back to copy-and-paste above this length.
 */
export const MAILTO_MAX_LENGTH = 1_800;

/** Thrown when a value that must occupy one header line does not. */
export class HeaderInjectionError extends Error {
  public constructor(public readonly headerName: string) {
    super(`Header ${headerName} must not contain a line break.`);
    this.name = 'HeaderInjectionError';
  }
}

/**
 * Any C0 or C1 control character — the CR and LF that split a header, and the
 * NUL, vertical tab and friends that some clients treat as separators too.
 */
// The control characters are the point of this class, not an accident.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/u;

/** The same class, global, for replacing every occurrence rather than testing for one. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS_GLOBAL = /[\u0000-\u001F\u007F-\u009F]/gu;

/** Characters that must not survive into a MIME `filename` parameter. */
const FILENAME_UNSAFE = /["\\/:*?<>|]/gu;

/** Whether a value is safe to place on a header line. */
export function isSafeHeaderValue(value: string): boolean {
  return value.length <= HEADER_VALUE_MAX_LENGTH && !CONTROL_CHARACTERS.test(value);
}

/**
 * Returns a header value, or throws when it could break the header block.
 *
 * @throws {HeaderInjectionError} When the value contains a control character or is too long.
 */
export function assertSafeHeaderValue(headerName: string, value: string): string {
  const trimmed = value.trim();
  if (!isSafeHeaderValue(trimmed)) throw new HeaderInjectionError(headerName);
  return trimmed;
}

/**
 * A conservative address pattern.
 *
 * Deliberately narrower than RFC 5322 permits: quoted local parts, comments and
 * bare-IP domains are all legal and none of them belong in a letter written in
 * a text editor. Rejecting them costs a user nothing and removes an entire
 * class of parser disagreement between Foldmark and the mail client.
 */
// Linear: the local part, the label and the dot-prefixed groups use disjoint
// character sets, so no input can make the engine backtrack.
const ADDRESS_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){1,10}$/; // eslint-disable-line security/detect-unsafe-regex

/** Whether a string is an address Foldmark is willing to put in a header. */
export function isValidEmailAddress(value: string): boolean {
  const candidate = value.trim();
  return candidate.length <= 254 && ADDRESS_PATTERN.test(candidate);
}

/** Splits a comma-separated recipient list into individual addresses. */
export function parseAddressList(value: string): readonly string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Escapes a filename for a MIME `filename="..."` parameter.
 *
 * Quotes, backslashes and control characters are replaced rather than escaped,
 * and the result is length-bounded. Path separators go too: the filename is a
 * label, and a receiving client that treats it as a path must not be handed one.
 */
export function quoteMimeFilename(filename: string): string {
  const safe = filename
    .replaceAll(CONTROL_CHARACTERS_GLOBAL, '_')
    .replaceAll(FILENAME_UNSAFE, '_')
    .replace(/^\.+/u, '_')
    .slice(0, 180)
    .trim();
  return `"${safe || 'attachment'}"`;
}

/**
 * Suggests a subject line from what the document already says.
 *
 * Falls back through subject, then title, then a generic label, so the field is
 * never empty — an empty subject is the one thing every mail client complains
 * about.
 */
export function suggestSubject(parts: {
  subject?: string;
  title?: string;
  fallback: string;
}): string {
  const candidate = parts.subject?.trim() || parts.title?.trim() || parts.fallback;
  return candidate.replaceAll(/\s+/gu, ' ').slice(0, HEADER_VALUE_MAX_LENGTH);
}

/**
 * Builds a `mailto:` URL, or `null` when the result would be too long to trust.
 *
 * @throws {HeaderInjectionError} When a supplied value could break out of its header.
 */
export function buildMailtoUrl(input: {
  to?: string;
  subject?: string;
  body?: string;
}): string | null {
  const to = input.to ? assertSafeHeaderValue('To', input.to) : '';
  if (to && !parseAddressList(to).every(isValidEmailAddress)) {
    throw new HeaderInjectionError('To');
  }
  const subject = input.subject ? assertSafeHeaderValue('Subject', input.subject) : '';

  const query = new URLSearchParams();
  if (subject) query.set('subject', subject);
  if (input.body) query.set('body', input.body);

  // `to` is not percent-encoded: it has already passed the address pattern, so
  // it contains nothing that needs escaping — and clients disagree about how to
  // read a percent-encoded `@`.
  const url = `mailto:${to}${query.size ? `?${query.toString()}` : ''}`;
  return url.length > MAILTO_MAX_LENGTH ? null : url;
}
