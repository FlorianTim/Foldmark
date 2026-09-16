import { describe, expect, it } from 'vitest';
import { buildRenderPlan, pageNumberBlock } from '@/application/render/buildRenderPlan';
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
});
