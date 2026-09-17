import { describe, expect, it } from 'vitest';
import {
  findInText,
  nextMatchIndex,
  replaceMatches,
  selectedMatchIndex,
} from '@/domain/markdown/textSearch';

/** Change 0048: plain-text search shared by the visual editor and the Markdown source. */

const text = 'Vertrag verlängern. Der Vertrag endet; vertraglich geregelt.';

describe('text search', () => {
  it('finds every occurrence, case-insensitively by default, left to right', () => {
    expect(findInText(text, 'vertrag')).toEqual([
      { from: 0, to: 7 },
      { from: 24, to: 31 },
      { from: 39, to: 46 },
    ]);
    expect(findInText(text, 'Vertrag', { caseSensitive: true })).toEqual([
      { from: 0, to: 7 },
      { from: 24, to: 31 },
    ]);
    expect(findInText(text, 'vertrag', { wholeWord: true })).toEqual([
      { from: 0, to: 7 },
      { from: 24, to: 31 },
    ]);
    expect(findInText(text, '')).toEqual([]);
    expect(findInText(text, '(')).toEqual([]);
    // A query is never a pattern.
    expect(findInText('a.c abc', 'a.c')).toEqual([{ from: 0, to: 3 }]);
    // Matches do not overlap.
    expect(findInText('aaaa', 'aa')).toEqual([
      { from: 0, to: 2 },
      { from: 2, to: 4 },
    ]);
  });

  it('falls back to exact matching when case folding would move the offsets', () => {
    expect(findInText('Straße STRASSE', 'straße')).toEqual([{ from: 0, to: 6 }]);
  });

  it('steps to the next or previous match from the selection and wraps', () => {
    const matches = findInText(text, 'vertrag');
    expect(nextMatchIndex(matches, { from: 0, to: 0 }, 1)).toBe(0);
    expect(nextMatchIndex(matches, { from: 0, to: 7 }, 1)).toBe(1);
    expect(nextMatchIndex(matches, { from: 39, to: 46 }, 1)).toBe(0);
    expect(nextMatchIndex(matches, { from: 24, to: 31 }, -1)).toBe(0);
    expect(nextMatchIndex(matches, { from: 0, to: 7 }, -1)).toBe(2);
    expect(nextMatchIndex([], { from: 0, to: 0 }, 1)).toBe(-1);
    expect(selectedMatchIndex(matches, { from: 24, to: 31 })).toBe(1);
    expect(selectedMatchIndex(matches, { from: 24, to: 30 })).toBe(-1);
  });

  it('replaces every match without disturbing the others', () => {
    const matches = findInText(text, 'Vertrag', { caseSensitive: true });
    expect(replaceMatches(text, matches, 'Abo')).toBe(
      'Abo verlängern. Der Abo endet; vertraglich geregelt.',
    );
    expect(replaceMatches('aaaa', findInText('aaaa', 'aa'), 'b')).toBe('bb');
    expect(replaceMatches(text, [], 'x')).toBe(text);
  });
});
