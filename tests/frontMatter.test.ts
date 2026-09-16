import { describe, expect, it } from 'vitest';
import {
  emitFrontMatter,
  FrontMatterError,
  FRONT_MATTER_MAX_LINES,
  parseFrontMatter,
  splitFrontMatter,
  type FrontMatterValue,
} from '@/infrastructure/codec/frontMatter';

/**
 * The front-matter parser is Foldmark's widest text-input boundary: it reads
 * metadata out of files a user was handed. Most of what follows is therefore
 * about what it **refuses**.
 */
describe('front-matter parsing', () => {
  it('reads the shape Foldmark emits', () => {
    const parsed = parseFrontMatter(
      [
        'foldmarkVersion: 1',
        'kind: letter',
        'title: Antrag',
        'recipient:',
        '  organization: Stadt Beispielstadt',
        '  postalCode: "12345"',
        'tags:',
        '  - Behörde',
        '  - Wichtig',
      ].join('\n'),
    );

    expect(parsed.foldmarkVersion).toBe(1);
    expect(parsed.kind).toBe('letter');
    expect((parsed.recipient as Record<string, FrontMatterValue>).organization).toBe(
      'Stadt Beispielstadt',
    );
    expect(parsed.tags).toEqual(['Behörde', 'Wichtig']);
  });

  it('keeps a quoted postcode a string — the reason quoting exists', () => {
    const parsed = parseFrontMatter('postalCode: "01067"\nnumeric: 12345');
    expect(parsed.postalCode).toBe('01067');
    expect(parsed.numeric).toBe(12345);
  });

  it('does not apply YAML implicit typing to words that look like booleans', () => {
    // A city in Norway is `NO`, and a document that says so must not become
    // `false`. This is the single most common YAML footgun.
    const parsed = parseFrontMatter('countryCode: NO\nyes: Yes\ntilde: ~');
    expect(parsed.countryCode).toBe('NO');
    expect(parsed.yes).toBe('Yes');
    expect(parsed.tilde).toBe('~');
  });

  it('parses into a null-prototype object, so nothing inherits from Object', () => {
    const parsed = parseFrontMatter('title: Test');
    expect(Object.getPrototypeOf(parsed)).toBeNull();
  });

  describe('refuses the constructs a general YAML parser would accept', () => {
    const rejected: readonly (readonly [string, string, string])[] = [
      ['anchors', 'a: &anchor value', 'anchorNotSupported'],
      ['aliases', 'a: *anchor', 'aliasNotSupported'],
      ['tags', 'a: !!python/object:os.system', 'tagNotSupported'],
      ['block scalars', 'a: |', 'blockScalarNotSupported'],
      ['folded scalars', 'a: >', 'blockScalarNotSupported'],
      ['flow mappings', 'a: {b: c}', 'flowMappingNotSupported'],
      ['flow sequences', 'a: [1, 2]', 'flowSequenceNotSupported'],
    ];

    for (const [name, source, code] of rejected) {
      it(name, () => {
        expect(() => parseFrontMatter(source)).toThrowError(
          expect.objectContaining({ code }) as Error,
        );
      });
    }
  });

  it('refuses prototype-polluting keys outright', () => {
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      expect(() => parseFrontMatter(`${key}: evil`)).toThrowError(
        expect.objectContaining({ code: 'forbiddenKey' }) as Error,
      );
    }
  });

  it('refuses a duplicate key rather than silently keeping one', () => {
    expect(() => parseFrontMatter('title: a\ntitle: b')).toThrowError(
      expect.objectContaining({ code: 'duplicateKey' }) as Error,
    );
  });

  it('bounds nesting depth', () => {
    const deep = ['a:', '  b:', '    c:', '      d:', '        e: 1'].join('\n');
    expect(() => parseFrontMatter(deep)).toThrowError(
      expect.objectContaining({ code: 'tooDeep' }) as Error,
    );
  });

  it('bounds line count and total size', () => {
    const manyLines = Array.from(
      { length: FRONT_MATTER_MAX_LINES + 1 },
      (_value, index) => `key${index}: value`,
    ).join('\n');
    expect(() => parseFrontMatter(manyLines)).toThrowError(
      expect.objectContaining({ code: 'tooManyLines' }) as Error,
    );

    expect(() => parseFrontMatter(`title: ${'x'.repeat(70_000)}`)).toThrowError(FrontMatterError);
  });

  it('refuses tab indentation, which YAML forbids and editors produce anyway', () => {
    expect(() => parseFrontMatter('a:\n\tb: 1')).toThrowError(
      expect.objectContaining({ code: 'tabIndentation' }) as Error,
    );
  });

  it('refuses an invalid key rather than carrying it', () => {
    expect(() => parseFrontMatter('9lives: yes')).toThrowError(
      expect.objectContaining({ code: 'invalidKey' }) as Error,
    );
  });
});

describe('splitting a file', () => {
  it('separates front matter from body', () => {
    const split = splitFrontMatter('---\ntitle: A\n---\n\nHello\n');
    expect(split.frontMatter).toBe('title: A\n');
    expect(split.body).toBe('\nHello\n');
  });

  it('treats a file without a fence as pure body', () => {
    const split = splitFrontMatter('Just a letter.\n');
    expect(split.frontMatter).toBeNull();
    expect(split.body).toBe('Just a letter.\n');
  });

  it('refuses an unterminated block instead of turning metadata into prose', () => {
    expect(() => splitFrontMatter('---\ntitle: A\n\nHello')).toThrowError(
      expect.objectContaining({ code: 'unterminated' }) as Error,
    );
  });
});

describe('emitting front matter', () => {
  it('round-trips through the parser', () => {
    const value: Record<string, FrontMatterValue> = {
      title: 'Antrag',
      postalCode: '01067',
      count: 3,
      flag: true,
      recipient: { city: 'Beispielstadt', postalCode: '12345' },
      tags: ['a', 'b'],
    };
    expect(parseFrontMatter(emitFrontMatter(value))).toEqual(value);
  });

  it('quotes anything that would read back as another type', () => {
    const emitted = emitFrontMatter({ a: '12345', b: 'true', c: 'null', d: 'plain' });
    expect(emitted).toContain('a: "12345"');
    expect(emitted).toContain('b: "true"');
    expect(emitted).toContain('c: "null"');
    expect(emitted).toContain('d: plain');
  });

  it('quotes values carrying characters that would break the line', () => {
    const emitted = emitFrontMatter({ subject: 'Antrag: dringend' });
    expect(parseFrontMatter(emitted).subject).toBe('Antrag: dringend');
  });

  it('skips empty collections rather than emitting dangling keys', () => {
    expect(emitFrontMatter({ tags: [], nested: {} })).toBe('');
  });
});
