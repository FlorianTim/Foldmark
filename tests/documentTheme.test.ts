import { describe, expect, it } from 'vitest';
import { buildRenderPlan } from '@/application/render/buildRenderPlan';
import { markdownHeightMm, textMetricsFor } from '@/application/render/textMetrics';
import {
  allColorNames,
  COLOR_ALIASES,
  COLOR_TONES,
  contrastOnWhite,
  DEFAULT_DOCUMENT_THEME,
  isColorName,
  MIN_PRINT_CONTRAST,
  parseColorName,
  resolveColor,
  resolveTheme,
  themeDeviations,
} from '@/domain/document/DocumentTheme';
import { DocumentThemeSettingsSchema } from '@/domain/document/DocumentSchema';
import { findBuiltInProfile } from '@/domain/print/builtInProfiles';
import { MarkdownDocumentCodecImpl } from '@/infrastructure/codec/MarkdownDocumentCodecImpl';
import { letterFixture } from './helpers/fakes';

/**
 * The document theme and the palette (change 0017, parts c and d).
 */
describe('the palette', () => {
  it('offers every tone in three shades plus the aliases, by name', () => {
    const names = allColorNames();
    expect(names).toHaveLength(COLOR_TONES.length * 3 + COLOR_ALIASES.length);
    expect(names).toContain('light-green');
    expect(names).toContain('dark-blue');
    expect(names).toContain('danger');
    for (const name of names) expect(isColorName(name)).toBe(true);
    expect(isColorName('gold')).toBe(false);
    expect(isColorName('light-gold')).toBe(false);
    expect(isColorName('#ff0000')).toBe(false);
    expect(parseColorName('dark-rose')).toEqual({ tone: 'rose', shade: 'dark' });
  });

  it('gives every print value at least 4.5:1 against white', () => {
    const theme = DEFAULT_DOCUMENT_THEME;
    for (const tone of COLOR_TONES) {
      for (const shade of ['light', 'base', 'dark'] as const) {
        const pair = theme.colors[tone][shade];
        expect(contrastOnWhite(pair.print), `${shade}-${tone}`).toBeGreaterThanOrEqual(
          MIN_PRINT_CONTRAST,
        );
        expect(pair.screen).toMatch(/^#[0-9a-f]{6}$/u);
      }
      // Darker on paper than on screen, or the same — never lighter.
      expect(contrastOnWhite(theme.colors[tone].light.print)).toBeGreaterThanOrEqual(
        contrastOnWhite(theme.colors[tone].light.screen),
      );
    }
  });

  it('resolves aliases through the theme', () => {
    expect(resolveColor('danger', DEFAULT_DOCUMENT_THEME)).toEqual(
      DEFAULT_DOCUMENT_THEME.colors.red.base,
    );
    const theme = resolveTheme({ aliases: { danger: 'dark-rose' } });
    expect(resolveColor('danger', theme)).toEqual(theme.colors.rose.dark);
    expect(resolveColor('gold', theme)).toBeNull();
    // An alias may not point at an alias.
    expect(resolveTheme({ aliases: { danger: 'warning' as never } }).aliases.danger).toBe('red');
  });
});

describe('the document theme', () => {
  it('defaults to today’s rendering', () => {
    const theme = resolveTheme(undefined);
    expect(theme).toBe(DEFAULT_DOCUMENT_THEME);
    const metrics = textMetricsFor(theme);
    expect(metrics.body.fontSizeMm).toBeCloseTo((11 * 25.4) / 72, 6);
    expect(metrics.body.lineHeightMm).toBeCloseTo(((11 * 25.4) / 72) * 1.45, 6);
  });

  it('bounds every value and ignores what it cannot use', () => {
    const theme = resolveTheme({
      fontSizePt: 400,
      lineHeight: 0.1,
      fontFamily: 'comic' as never,
      colors: { red: { print: 'red', screen: '#ff0000' } },
      highlight: { screen: 'yellow' },
    });
    expect(theme.fontSizePt).toBe(24);
    expect(theme.lineHeight).toBe(1);
    expect(theme.fontFamily).toBe('sans');
    expect(theme.colors.red.base.screen).toBe('#ff0000');
    expect(theme.colors.red.base.print).toBe(DEFAULT_DOCUMENT_THEME.colors.red.base.print);
    expect(theme.highlight).toEqual(DEFAULT_DOCUMENT_THEME.highlight);
  });

  it('stores only deviations from the default', () => {
    expect(themeDeviations(undefined)).toEqual({});
    expect(themeDeviations({ fontSizePt: 11, fontFamily: 'sans' })).toEqual({});
    expect(
      themeDeviations({ fontSizePt: 12, colors: { 'light-red': { print: '#7f1d1d' } } }),
    ).toEqual({ fontSizePt: 12, colors: { 'light-red': { print: '#7f1d1d' } } });
  });

  it('is validated as a whole at the file boundary', () => {
    expect(DocumentThemeSettingsSchema.safeParse({ fontSizePt: 12 }).success).toBe(true);
    expect(DocumentThemeSettingsSchema.safeParse({ fontSizePt: 99 }).success).toBe(false);
    expect(DocumentThemeSettingsSchema.safeParse({ aliases: { danger: 'gold' } }).success).toBe(
      false,
    );
    expect(
      DocumentThemeSettingsSchema.safeParse({ colors: { red: { print: 'url(x)' } } }).success,
    ).toBe(false);
  });

  it('travels in the front matter as a `theme` map of deviations only', () => {
    const codec = new MarkdownDocumentCodecImpl();
    const document = letterFixture({
      printOptions: {
        pageNumbers: { format: 'none', position: 'bottom-center', hideOnFirstPage: false },
        theme: { fontSizePt: 12, fontFamily: 'serif', aliases: { danger: 'dark-red' } },
      },
    });
    const encoded = codec.encode(document);
    expect(encoded).toContain(
      'theme:\n  fontFamily: serif\n  fontSizePt: 12\n  aliases:\n    danger: dark-red',
    );
    expect(encoded).not.toContain('lineHeight');
    const decoded = codec.decode(encoded, { id: 'x', locale: 'de-DE', printProfileId: 'a4-blank' });
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.document.printOptions.theme).toEqual({
      fontFamily: 'serif',
      fontSizePt: 12,
      aliases: { danger: 'dark-red' },
    });
    // A plain letter carries no theme block at all.
    expect(codec.encode(letterFixture())).not.toContain('theme:');
  });

  it('is refused as a whole with a report when the file asks for the impossible', () => {
    const codec = new MarkdownDocumentCodecImpl();
    const source =
      '---\ntitle: A\ntheme:\n  fontSizePt: 999\n  aliases:\n    danger: gold\n---\n\nText\n';
    const decoded = codec.decode(source, { id: 'x', locale: 'de-DE', printProfileId: 'a4-blank' });
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.document.printOptions.theme).toBeUndefined();
    expect(
      decoded.issues.some(
        (issue) => issue.code === 'import.fieldInvalid' && issue.path === 'theme',
      ),
    ).toBe(true);
  });

  it('changes the page count with the font size', () => {
    const body = Array.from(
      { length: 40 },
      (_, index) => `Absatz ${index}. ${'Text '.repeat(40)}`,
    ).join('\n\n');
    const profile = findBuiltInProfile('a4-blank')!;
    const pagesAt = (fontSizePt: number): number =>
      buildRenderPlan({
        document: letterFixture({
          bodyMarkdown: body,
          printOptions: {
            pageNumbers: { format: 'none', position: 'bottom-center', hideOnFirstPage: false },
            theme: { fontSizePt },
          },
        }),
        profile,
        target: 'print',
        mode: 'paper',
      }).pages.length;
    expect(pagesAt(14)).toBeGreaterThan(pagesAt(9));
    expect(
      markdownHeightMm(body, 'body', 170, { theme: resolveTheme({ fontSizePt: 14 }) }),
    ).toBeGreaterThan(
      markdownHeightMm(body, 'body', 170, { theme: resolveTheme({ fontSizePt: 9 }) }),
    );
  });

  it('measures the catalogue: a page break is nothing, a note box and an image take room', () => {
    const plain = markdownHeightMm('Ein Absatz.', 'body', 170);
    expect(markdownHeightMm('::page-break', 'body', 170)).toBe(0);
    expect(markdownHeightMm(':::note\nEin Absatz.\n:::', 'body', 170)).toBeGreaterThan(plain);
    expect(markdownHeightMm(':::signature{lines=3}\nName\n:::', 'body', 170)).toBeGreaterThan(
      plain * 3,
    );
    const asset = {
      id: 'img',
      kind: 'image' as const,
      mimeType: 'image/png',
      byteSize: 1,
      checksum: 'x',
      widthPx: 200,
      heightPx: 100,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    // 60 mm wide at a 2:1 aspect is 30 mm tall, on top of the alt-less paragraph line.
    expect(
      markdownHeightMm('![](asset:img){width=60mm}', 'body', 170, { assets: [asset] }),
    ).toBeCloseTo(plain + 30, 5);
  });
});
