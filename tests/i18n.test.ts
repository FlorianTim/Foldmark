import { describe, expect, it } from 'vitest';
import { PostalAddressSchema } from '@/domain/document/DocumentSchema';
import { selectInitialLocale } from '@/presentation/i18n';
import de from '@/presentation/i18n/messages/de.json';
import en from '@/presentation/i18n/messages/en.json';

describe('initial locale selection', () => {
  it('prefers a saved supported locale', () => {
    expect(selectInitialLocale('de', ['en-US'])).toBe('de');
  });

  it('uses the first supported browser language', () => {
    expect(selectInitialLocale(null, ['fr-FR', 'de-DE', 'en-US'])).toBe('de');
  });

  it('falls back to configured locale', () => {
    expect(selectInitialLocale(null, ['fr-FR'])).toBe('de');
  });
});

/**
 * "German and English are complete" is a promise the app makes in its specs, and
 * the only way it stays true is a test that fails when one catalogue grows a key
 * the other lacks. A missing key does not throw at runtime — vue-i18n renders
 * the key itself, which looks like a typo in production rather than a bug.
 */
describe('message catalogues', () => {
  function leafKeys(value: object, prefix = ''): readonly string[] {
    return Object.entries(value).flatMap(([key, entry]) =>
      entry !== null && typeof entry === 'object'
        ? leafKeys(entry as object, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    );
  }

  const german = leafKeys(de);
  const english = leafKeys(en);

  it('define exactly the same keys', () => {
    expect([...german].sort()).toEqual([...english].sort());
  });

  it('leave no message empty', () => {
    for (const [name, catalogue] of [
      ['de', de],
      ['en', en],
    ] as const) {
      const empty = leafKeys(catalogue).filter((key) => {
        const value = key
          .split('.')
          .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], catalogue);
        return typeof value !== 'string' || value.trim() === '';
      });
      expect(empty, `${name}: ${empty.join(', ')}`).toEqual([]);
    }
  });

  it('use the same interpolation placeholders in both languages', () => {
    // A placeholder present in one language and missing in the other renders as
    // a silently dropped value — the kind of bug only a reader of that language
    // notices.
    const placeholders = (value: string): readonly string[] =>
      [...value.matchAll(/\{(\w+)\}/gu)].map((match) => match[1]).sort();

    for (const key of german) {
      const read = (catalogue: object): string =>
        key
          .split('.')
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)[part],
            catalogue,
          ) as string;
      expect(placeholders(read(de)), key).toEqual(placeholders(read(en)));
    }
  });
});

/**
 * Keys built at runtime from a field list (`metadata.field.${field}`) are invisible to
 * the key-parity test above: both catalogues can lack the same key and still agree.
 * `metadata.field.region` was exactly that in 1.0 (R13-005), so the lists the UI
 * iterates are checked against the catalogue here.
 */
describe('keys built from field lists', () => {
  it('cover every postal field', () => {
    for (const [name, catalogue] of [
      ['de', de],
      ['en', en],
    ] as const) {
      const fields = Object.keys(PostalAddressSchema.shape);
      const missing = fields.filter(
        (field) =>
          typeof catalogue.metadata.field[field as keyof typeof catalogue.metadata.field] !==
          'string',
      );
      expect(missing, name).toEqual([]);
    }
  });
});

/**
 * "About this template" shipped in 1.0 because the initialization replaced the
 * product facts but not every inherited sentence. A generated app must not
 * mention the template it came from anywhere a user can read.
 */
describe('shipped messages', () => {
  it('never mention the template', () => {
    for (const [name, catalogue] of [
      ['de', de],
      ['en', en],
    ] as const) {
      // "Template" on its own is a Foldmark word since change 0039 (document
      // templates); what must never appear is the *web-app* template.
      const offenders = Object.entries(flatten(catalogue)).filter(([, value]) =>
        /(?:this|the web app|web-app|lumbrecode|about this) template|(?:^|\W)(?:demo|todos?)(?:\W|$)|aufgaben/iu.test(
          value,
        ),
      );
      expect(offenders, `${name}: ${offenders.map(([key]) => key).join(', ')}`).toEqual([]);
    }
  });

  function flatten(value: object, prefix = ''): Record<string, string> {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) =>
        entry !== null && typeof entry === 'object'
          ? Object.entries(flatten(entry as object, `${prefix}${key}.`))
          : [[`${prefix}${key}`, String(entry)]],
      ),
    );
  }
});
