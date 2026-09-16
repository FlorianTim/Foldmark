import { describe, expect, it } from 'vitest';
import { printTitleFor, safeFilename } from '@/presentation/download';

const doc = (title: string, subject?: string) => ({ title, metadata: { subject } });

describe('safeFilename', () => {
  it('replaces path and control characters and keeps the extension', () => {
    expect(safeFilename('a/b:c*d?e"f<g>h|i\u0000j', 'md')).toBe('a_b_c_d_e_f_g_h_i_j.md');
    expect(safeFilename('..hidden', 'md')).toBe('_hidden.md');
    expect(safeFilename('   ', 'md')).toBe('foldmark.md');
  });
});

describe('printTitleFor', () => {
  it('prefers the document title', () => {
    expect(printTitleFor(doc('Antrag Bescheinigung', 'Betreff'), 'Foldmark')).toBe(
      'Antrag Bescheinigung',
    );
  });

  it('falls back to the subject, then to the app name', () => {
    expect(printTitleFor(doc('', 'Kündigung Vertrag 4711'), 'Foldmark')).toBe(
      'Kündigung Vertrag 4711',
    );
    expect(printTitleFor(doc('  ', undefined), 'Foldmark')).toBe('Foldmark');
  });

  it('is a filename, not a title: no path characters, no line breaks, bounded', () => {
    expect(printTitleFor(doc('Rechnung 2026/09: "Test"\n Zwei'), 'Foldmark')).toBe(
      'Rechnung 2026_09_ _Test_ Zwei',
    );
    expect(printTitleFor(doc('x'.repeat(200)), 'Foldmark')).toHaveLength(80);
  });
});
