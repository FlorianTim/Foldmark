import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findBuiltInProfile } from '@/domain/print/builtInProfiles';
import {
  MarkdownDocumentCodecImpl,
  pandocGeometry,
} from '@/infrastructure/codec/MarkdownDocumentCodecImpl';
import { parseFrontMatter } from '@/infrastructure/codec/frontMatter';
import { letterFixture } from './helpers/fakes';

/**
 * Pandoc-compatible front matter (change 0017, part g).
 *
 * The header of a document written for `pandoc file.md -o file.pdf` is read
 * without losing anything preservable, and a Foldmark file carries the
 * Pandoc keys for the same page. Every claim below names what is taken over,
 * what is derived and what is only carried.
 */
const codec = new MarkdownDocumentCodecImpl();
const defaults = { id: 'doc', locale: 'de-DE', printProfileId: 'a4-blank' };
// eslint-disable-next-line security/detect-non-literal-fs-filename -- a test fixture path
const fixture = readFileSync(join(process.cwd(), 'tests', 'fixtures', 'pandoc-example.md'), 'utf8');

describe('importing a Pandoc header', () => {
  const result = codec.decode(fixture, defaults);

  it('takes over the keys that mean the same thing', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.title).toBe('Automatic Activation');
    // `lang` is the document language.
    expect(result.document.locale).toBe('en-US');
    expect(result.document.bodyMarkdown).toContain('# Automatic Activation');
  });

  it('carries everything else and loses nothing preservable', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const preserved = result.document.preserved;
    expect(preserved.subtitle).toBe('Architecture Documentation');
    expect(preserved.author).toBe('Author: Team Que');
    expect(preserved.titlepage).toBe(true);
    expect(preserved.lot).toBe(true);
    expect(preserved.lof).toBe(true);
    expect(preserved.subparagraph).toBe(true);
    expect(preserved['links-as-notes']).toBe(true);
    expect(preserved['footer-left']).toBe('© Team Que');
    expect(preserved['footer-center']).toBe('Daimler Fleetboard GmbH');
    // Page keys are carried, never read: the print profile is the page.
    expect(preserved.papersize).toBe('a4');
    expect(preserved.geometry).toEqual(['margin=20mm']);
    expect(result.document.printProfileId).toBe('a4-blank');
    expect(result.issues.some((issue) => issue.code === 'import.metadataDropped')).toBe(false);
  });

  it('writes the header back, with the page derived from the profile', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const profile = findBuiltInProfile('a4-blank')!;
    const encoded = codec.encode(result.document, {
      page: profile.page,
      margins: profile.margins,
    });
    for (const line of [
      'title: Automatic Activation',
      'lang: en-US',
      'author: "Author: Team Que"',
      'subtitle: Architecture Documentation',
      'titlepage: true',
      'papersize: a4',
      'geometry:\n  - margin=20mm',
      'lot: true',
      'lof: true',
      'subparagraph: true',
      'links-as-notes: true',
      'footer-left: © Team Que',
      'footer-center: Daimler Fleetboard GmbH',
    ]) {
      expect(encoded).toContain(line);
    }
    // The second trip is stable.
    const again = codec.decode(encoded, defaults);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.document.preserved).toEqual(result.document.preserved);
    expect(again.document.locale).toBe('en-US');
  });

  it('writes the profile page even when the file was not from Pandoc', () => {
    const document = letterFixture();
    const profile = findBuiltInProfile('din5008-b')!;
    const encoded = codec.encode(document, { page: profile.page, margins: profile.margins });
    expect(encoded).toContain('papersize: a4');
    expect(encoded).toContain(
      'geometry:\n  - top=45mm\n  - right=20mm\n  - bottom=20mm\n  - left=25mm',
    );
    // Without a profile no page is invented.
    expect(codec.encode(document)).not.toContain('papersize');
  });

  it('derives Pandoc names: aliases, keywords, author from the sender', () => {
    const source =
      '---\nlocale: de-AT\ntags:\n  - a\n  - b\nsender:\n  name: Erika Muster\nauthor: Someone Else\n---\n\nText\n';
    const result = codec.decode(source, defaults);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The 1.x names are read as aliases …
    expect(result.document.locale).toBe('de-AT');
    expect(result.document.tags).toEqual(['a', 'b']);
    // … and a file author is ignored while the sender snapshot is the source.
    expect(result.document.preserved.author).toBeUndefined();
    const encoded = codec.encode(result.document);
    expect(encoded).toContain('lang: de-AT');
    expect(encoded).toContain('keywords:\n  - a\n  - b');
    expect(encoded).toContain('author: Erika Muster');
    expect(encoded).not.toContain('locale:');
    expect(encoded).not.toContain('tags:');
  });

  it('names the sheet for Pandoc, including odd sizes and landscape', () => {
    expect(
      pandocGeometry({
        page: { widthMm: 297, heightMm: 210, orientation: 'landscape' },
        margins: { topMm: 10, rightMm: 10, bottomMm: 10, leftMm: 10 },
      }),
    ).toEqual({ papersize: 'a4', geometry: ['landscape', 'margin=10mm'] });
    expect(
      pandocGeometry({
        page: { widthMm: 100, heightMm: 150, orientation: 'portrait' },
        margins: { topMm: 5, rightMm: 5, bottomMm: 5, leftMm: 5 },
      }),
    ).toEqual({ geometry: ['paperwidth=100mm', 'paperheight=150mm', 'margin=5mm'] });
  });
});

describe('flow syntax in a Pandoc header', () => {
  it('is still refused by the parser unless the caller asks to drop it', () => {
    expect(() => parseFrontMatter('keywords: [a, b]')).toThrow();
    const dropped: string[] = [];
    const parsed = parseFrontMatter('title: A\nkeywords: [a, b]\nlot: true', {
      onDropped: (key) => dropped.push(key),
    });
    expect(dropped).toEqual(['keywords']);
    expect(parsed).toEqual({ title: 'A', lot: true });
  });

  it('loses the affected key on import and reports it', () => {
    const source = '---\ntitle: A\nkeywords: [a, b]\nlot: true\n---\n\nText\n';
    const result = codec.decode(source, defaults);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.tags).toEqual([]);
    expect(result.document.preserved.lot).toBe(true);
    expect(
      result.issues.find((issue) => issue.code === 'import.flowCollectionDropped')?.params?.key,
    ).toBe('keywords');
  });
});
