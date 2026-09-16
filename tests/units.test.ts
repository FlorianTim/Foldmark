import { describe, expect, it } from 'vitest';
import {
  boxesOverlap,
  contentBox,
  cssMm,
  isBoxInsidePage,
  isValidMillimetres,
  mmToPoints,
  pointsToMm,
  roundMm,
  MAX_MM,
  MIN_MM,
} from '@/domain/common/Units';

describe('physical units', () => {
  it('accepts measurements inside the supported range and rejects the rest', () => {
    expect(isValidMillimetres(105)).toBe(true);
    expect(isValidMillimetres(MIN_MM)).toBe(true);
    expect(isValidMillimetres(MAX_MM)).toBe(true);
    expect(isValidMillimetres(MAX_MM + 1)).toBe(false);
    expect(isValidMillimetres(MIN_MM - 1)).toBe(false);
    expect(isValidMillimetres(Number.NaN)).toBe(false);
    expect(isValidMillimetres(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('rounds to a precision finer than any printer resolves', () => {
    expect(roundMm(0.1 + 0.2)).toBe(0.3);
    expect(roundMm(148.4999)).toBe(148.5);
  });

  it('emits CSS millimetres, which is what makes the browser do the physical mapping', () => {
    expect(cssMm(105)).toBe('105mm');
    expect(cssMm(148.5)).toBe('148.5mm');
  });

  it('round-trips through PostScript points', () => {
    expect(mmToPoints(25.4)).toBeCloseTo(72, 10);
    expect(pointsToMm(72)).toBeCloseTo(25.4, 10);
  });

  it('detects boxes that leave the page', () => {
    const a4 = { widthMm: 210, heightMm: 297, orientation: 'portrait' } as const;
    expect(isBoxInsidePage({ xMm: 20, yMm: 45, widthMm: 85, heightMm: 45 }, a4)).toBe(true);
    expect(isBoxInsidePage({ xMm: 180, yMm: 45, widthMm: 85, heightMm: 45 }, a4)).toBe(false);
    expect(isBoxInsidePage({ xMm: -1, yMm: 10, widthMm: 10, heightMm: 10 }, a4)).toBe(false);
  });

  it('treats touching edges as separate, not overlapping', () => {
    const left = { xMm: 0, yMm: 0, widthMm: 10, heightMm: 10 };
    const touching = { xMm: 10, yMm: 0, widthMm: 10, heightMm: 10 };
    const overlapping = { xMm: 9, yMm: 0, widthMm: 10, heightMm: 10 };
    expect(boxesOverlap(left, touching)).toBe(false);
    expect(boxesOverlap(left, overlapping)).toBe(true);
  });

  it('derives the content box from page and margins', () => {
    const box = contentBox(
      { widthMm: 210, heightMm: 297, orientation: 'portrait' },
      { topMm: 45, rightMm: 20, bottomMm: 20, leftMm: 25 },
    );
    expect(box).toEqual({ xMm: 25, yMm: 45, widthMm: 165, heightMm: 232 });
  });
});
