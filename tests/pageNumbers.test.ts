import { describe, expect, it } from 'vitest';
import { buildRenderPlan, pageNumberBlock } from '@/application/render/buildRenderPlan';
import {
  applyPageNumberPattern,
  isValidPageNumberPattern,
  PAGE_NUMBER_PATTERN_MAX_LENGTH,
} from '@/domain/document/FoldmarkDocument';
import { findBuiltInProfile } from '@/domain/print/builtInProfiles';
import { MarkdownDocumentCodecImpl } from '@/infrastructure/codec/MarkdownDocumentCodecImpl';
import { letterFixture } from './helpers/fakes';

const din5008B = findBuiltInProfile('din5008-b')!;
const longBody = Array.from({ length: 60 }, (_, i) => `Absatz ${i + 1} mit etwas Text.`).join(
  '\n\n',
);

describe('page numbers', () => {
  it('are absent by default and by choice', () => {
    expect(
      pageNumberBlock(
        { format: 'none', position: 'bottom-center', hideOnFirstPage: false },
        din5008B,
        1,
        3,
      ),
    ).toBeNull();
    expect(
      pageNumberBlock(
        { format: 'page', position: 'bottom-center', hideOnFirstPage: true },
        din5008B,
        1,
        3,
      ),
    ).toBeNull();
    expect(
      pageNumberBlock(
        { format: 'page', position: 'bottom-center', hideOnFirstPage: true },
        din5008B,
        2,
        3,
      ),
    ).not.toBeNull();
  });

  it('sit in the chosen margin across the content width, aligned as asked', () => {
    const bottom = pageNumberBlock(
      { format: 'page-of', position: 'bottom-right', hideOnFirstPage: false },
      din5008B,
      2,
      3,
    )!;
    expect(bottom.kind).toBe('pageNumber');
    expect(bottom.box.xMm).toBe(din5008B.margins.leftMm);
    expect(bottom.box.widthMm).toBe(
      din5008B.page.widthMm - din5008B.margins.leftMm - din5008B.margins.rightMm,
    );
    expect(bottom.box.yMm).toBeGreaterThan(din5008B.page.heightMm - din5008B.margins.bottomMm);
    expect(bottom.box.yMm + bottom.box.heightMm).toBeLessThanOrEqual(din5008B.page.heightMm);
    if (bottom.kind === 'pageNumber') expect(bottom.align).toBe('right');

    const top = pageNumberBlock(
      { format: 'number', position: 'top-left', hideOnFirstPage: false },
      din5008B,
      1,
      1,
    )!;
    expect(top.box.yMm + top.box.heightMm).toBeLessThanOrEqual(din5008B.margins.topMm);
  });

  it('count the pages the plan actually produced', () => {
    const document = letterFixture({
      bodyMarkdown: longBody,
      printOptions: {
        pageNumbers: { format: 'page-of', position: 'bottom-center', hideOnFirstPage: false },
      },
    });
    const plan = buildRenderPlan({ document, profile: din5008B, target: 'print', mode: 'paper' });
    expect(plan.pages.length).toBeGreaterThan(1);
    for (const [index, page] of plan.pages.entries()) {
      const block = page.blocks.find((candidate) => candidate.kind === 'pageNumber');
      expect(block && block.kind === 'pageNumber' ? [block.page, block.total] : null).toEqual([
        index + 1,
        plan.pages.length,
      ]);
    }
  });

  it('round-trip through the portable file and default when absent', () => {
    const codec = new MarkdownDocumentCodecImpl();
    const document = letterFixture({
      printOptions: {
        pageNumbers: { format: 'page', position: 'top-right', hideOnFirstPage: true },
      },
    });
    const encoded = codec.encode(document);
    expect(encoded).toContain('pageNumbers:');
    const decoded = codec.decode(encoded, {
      id: document.id,
      locale: 'de-DE',
      printProfileId: 'din5008-b',
    });
    expect(decoded.ok && decoded.document.printOptions).toEqual(document.printOptions);

    const plain = codec.decode(codec.encode(letterFixture()), {
      id: 'x',
      locale: 'de-DE',
      printProfileId: 'din5008-b',
    });
    expect(plain.ok && plain.document.printOptions.pageNumbers.format).toBe('none');
  });

  it('start where the writer says and count "of" up to the last sheet (R12-003)', () => {
    const options = {
      format: 'page-of' as const,
      position: 'bottom-center' as const,
      hideOnFirstPage: false,
      startAt: 4,
    };
    const first = pageNumberBlock(options, din5008B, 1, 3)!;
    const last = pageNumberBlock(options, din5008B, 3, 3)!;
    expect(first.kind === 'pageNumber' && [first.page, first.total]).toEqual([4, 6]);
    expect(last.kind === 'pageNumber' && [last.page, last.total]).toEqual([6, 6]);
    // The first-page switch and the mirroring follow the sheet, not the number on it.
    expect(pageNumberBlock({ ...options, hideOnFirstPage: true }, din5008B, 1, 3)).toBeNull();
  });

  it('swap left and right on even sheets when asked, never the centre', () => {
    const left = {
      format: 'number' as const,
      position: 'bottom-left' as const,
      hideOnFirstPage: false,
    };
    const plain = pageNumberBlock(left, din5008B, 2, 3)!;
    expect(plain.kind === 'pageNumber' && plain.align).toBe('left');
    const mirrored = { ...left, mirrorOnEvenPages: true };
    const odd = pageNumberBlock(mirrored, din5008B, 1, 3)!;
    const even = pageNumberBlock(mirrored, din5008B, 2, 3)!;
    expect(odd.kind === 'pageNumber' && odd.align).toBe('left');
    expect(even.kind === 'pageNumber' && even.align).toBe('right');
    const right = pageNumberBlock({ ...mirrored, position: 'top-right' }, din5008B, 2, 3)!;
    expect(right.kind === 'pageNumber' && right.align).toBe('left');
    const centre = pageNumberBlock({ ...mirrored, position: 'top-center' }, din5008B, 2, 3)!;
    expect(centre.kind === 'pageNumber' && centre.align).toBe('center');
  });

  it('carry an own wording only when it is usable, and fall back otherwise', () => {
    expect(isValidPageNumberPattern('Blatt {page} von {pages}')).toBe(true);
    expect(isValidPageNumberPattern('{page}')).toBe(true);
    expect(isValidPageNumberPattern('Blatt {pages}')).toBe(false);
    expect(isValidPageNumberPattern('   ')).toBe(false);
    expect(isValidPageNumberPattern('{page}\nzwei')).toBe(false);
    expect(isValidPageNumberPattern(`{page}${'x'.repeat(PAGE_NUMBER_PATTERN_MAX_LENGTH)}`)).toBe(
      false,
    );
    expect(applyPageNumberPattern('Blatt {page} von {pages} — {page}', 2, 5)).toBe(
      'Blatt 2 von 5 — 2',
    );

    const base = { position: 'bottom-center' as const, hideOnFirstPage: false };
    const own = pageNumberBlock(
      { ...base, format: 'custom', pattern: '– {page} –' },
      din5008B,
      1,
      1,
    )!;
    expect(own.kind === 'pageNumber' && [own.format, own.pattern]).toEqual([
      'custom',
      '– {page} –',
    ]);
    const broken = pageNumberBlock(
      { ...base, format: 'custom', pattern: 'no placeholder' },
      din5008B,
      1,
      1,
    )!;
    expect(broken.kind === 'pageNumber' && [broken.format, broken.pattern]).toEqual([
      'page-of',
      undefined,
    ]);
  });

  it('write the extensions to the file only when set and read them back guarded', () => {
    const codec = new MarkdownDocumentCodecImpl();
    const context = { id: 'x', locale: 'de-DE', printProfileId: 'din5008-b' };
    const plain = codec.encode(
      letterFixture({
        printOptions: {
          pageNumbers: { format: 'page', position: 'top-right', hideOnFirstPage: false },
        },
      }),
    );
    expect(plain).not.toMatch(/startAt|mirrorOnEvenPages|pattern/u);

    const extended = letterFixture({
      printOptions: {
        pageNumbers: {
          format: 'custom',
          position: 'bottom-left',
          hideOnFirstPage: false,
          startAt: 12,
          mirrorOnEvenPages: true,
          pattern: 'Blatt {page}/{pages}',
        },
      },
    });
    const encoded = codec.encode(extended);
    expect(encoded).toContain('startAt: 12');
    expect(encoded).toContain('mirrorOnEvenPages: true');
    const decoded = codec.decode(encoded, context);
    expect(decoded.ok && decoded.document.printOptions.pageNumbers).toEqual(
      extended.printOptions.pageNumbers,
    );

    // A hand-edited file: a start below 2, a wording without `{page}` and a
    // non-boolean mirror flag are dropped, never repaired into something else.
    const tampered = encoded
      .replace('startAt: 12', 'startAt: -3')
      .replace('mirrorOnEvenPages: true', "mirrorOnEvenPages: 'yes'")
      .replace('Blatt {page}/{pages}', 'nothing here');
    const guarded = codec.decode(tampered, context);
    expect(guarded.ok && guarded.document.printOptions.pageNumbers).toEqual({
      format: 'custom',
      position: 'bottom-left',
      hideOnFirstPage: false,
    });
  });
});
