/**
 * Finding text (change 0048): the same matching for the visual editor, which
 * searches its text blocks, and the Markdown source, which searches a string.
 * Plain substring matching, optionally case-sensitive and whole-word — no
 * regular expressions, so a query is never a pattern and a `(` finds a `(`.
 */

/** How a query is matched. */
export interface TextSearchOptions {
  readonly caseSensitive?: boolean;
  readonly wholeWord?: boolean;
}

/** One match as offsets into the searched text, end exclusive. */
export interface TextMatch {
  readonly from: number;
  readonly to: number;
}

/** Longest query Foldmark searches for; longer ones are cut, not refused. */
export const SEARCH_QUERY_MAX_LENGTH = 200;

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}_]/u.test(char);
}

/** Every non-overlapping match of the query in the text, left to right. */
export function findInText(
  text: string,
  query: string,
  options: TextSearchOptions = {},
): readonly TextMatch[] {
  const needle = query.slice(0, SEARCH_QUERY_MAX_LENGTH);
  if (!needle) return [];
  const haystack = options.caseSensitive ? text : text.toLocaleLowerCase();
  const wanted = options.caseSensitive ? needle : needle.toLocaleLowerCase();
  // Case folding can change a string's length (ß → ss); fall back to
  // case-sensitive matching when it does, rather than mis-map the offsets.
  if (haystack.length !== text.length || wanted.length !== needle.length) {
    return findInText(text, needle, { ...options, caseSensitive: true });
  }
  const matches: TextMatch[] = [];
  let start = 0;
  while (start <= haystack.length - wanted.length) {
    const index = haystack.indexOf(wanted, start);
    if (index < 0) break;
    const end = index + wanted.length;
    const whole = !options.wholeWord || (!isWordChar(text[index - 1]) && !isWordChar(text[end]));
    if (whole) matches.push({ from: index, to: end });
    start = whole ? end : index + 1;
  }
  return matches;
}

/**
 * The match to go to next: the first one starting at or after `from` when
 * searching forward, the last one ending at or before `to` when searching
 * back; wraps around at the ends. `-1` without matches.
 */
export function nextMatchIndex(
  matches: readonly TextMatch[],
  selection: { readonly from: number; readonly to: number },
  direction: 1 | -1,
): number {
  if (!matches.length) return -1;
  if (direction === 1) {
    const index = matches.findIndex((match) => match.from >= selection.to);
    return index < 0 ? 0 : index;
  }
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    if (matches[index]!.to <= selection.from) return index;
  }
  return matches.length - 1;
}

/** Whether the selection is exactly one of the matches — the one Replace acts on. */
export function selectedMatchIndex(
  matches: readonly TextMatch[],
  selection: { readonly from: number; readonly to: number },
): number {
  return matches.findIndex((match) => match.from === selection.from && match.to === selection.to);
}

/** The text with every match replaced; matches are applied from the end so offsets hold. */
export function replaceMatches(
  text: string,
  matches: readonly TextMatch[],
  replacement: string,
): string {
  let result = text;
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const { from, to } = matches[index]!;
    result = `${result.slice(0, from)}${replacement}${result.slice(to)}`;
  }
  return result;
}
