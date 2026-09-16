/**
 * Dates in a document body.
 *
 * A date inserted by the editor is stored as the directive `:date[YYYY-MM-DD]`,
 * not as formatted text: the locale is a render-time decision, so a letter
 * switched from German to English re-renders its dates instead of carrying
 * "11. September 2026" into an English body. The directive is a known inline
 * of the catalogue (`directives.ts`), rendered by every output in the
 * document's language; to any other Markdown reader it is the plain ISO date.
 *
 * Foldmark 1.1 wrote `{{date:YYYY-MM-DD}}` instead. That spelling is still
 * read — the parser turns it into the same token — and is migrated to the
 * directive whenever a document is loaded, so a file written today never
 * carries it.
 */

/** ISO calendar date, `YYYY-MM-DD`. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

/** The 1.1 spelling of a date token. */
const LEGACY_DATE_TOKEN = /\{\{date:(\d{4}-\d{2}-\d{2})\}\}/gu;

/** The directive for a calendar date. Throws on anything but `YYYY-MM-DD`. */
export function dateToken(isoDate: string): string {
  if (!ISO_DATE.test(isoDate)) throw new RangeError(`Not an ISO date: ${isoDate}`);
  return `:date[${isoDate}]`;
}

/** Today's ISO date in the local calendar, the way a letter is dated. */
export function todayIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Rewrites every 1.1 `{{date:…}}` token to the `:date[…]` directive. Malformed tokens stay. */
export function migrateDateTokens(source: string): string {
  return source.replaceAll(LEGACY_DATE_TOKEN, (_match, iso: string) => dateToken(iso));
}

/**
 * Formats an ISO calendar date in a locale, for every renderer that meets a
 * date token. `timeZone: 'UTC'` is not a detail: the value is a calendar date,
 * and reading `2026-08-03` in a browser west of Greenwich would otherwise
 * print the second.
 */
export function formatIsoDate(
  isoDate: string,
  locale: string,
  format: 'long' | 'medium' | 'numeric' = 'long',
): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  try {
    const options: Intl.DateTimeFormatOptions =
      format === 'numeric'
        ? { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' }
        : { dateStyle: format, timeZone: 'UTC' };
    return new Intl.DateTimeFormat(locale, options).format(parsed);
  } catch {
    return isoDate;
  }
}
