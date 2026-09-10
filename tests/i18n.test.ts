import { describe, expect, it } from 'vitest';
import { selectInitialLocale } from '@/presentation/i18n';

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
