import { describe, expect, it } from 'vitest';
import {
  appendPoint,
  cropToInk,
  hasInk,
  inkBounds,
  SIGNATURE_PADDING_PX,
  SIGNATURE_PEN_WIDTH_PX,
  SIGNATURE_STROKE_MAX_POINTS,
  smoothPath,
  type Stroke,
} from '@/domain/asset/signatureStrokes';

/** Change 0046 (R02-003): the drawn signature as geometry before it becomes an image. */

const stroke: Stroke = [
  { x: 100, y: 120 },
  { x: 140, y: 100 },
  { x: 180, y: 130 },
];

describe('signature strokes', () => {
  it('drop jitter, non-finite samples and everything past the length bound', () => {
    let built: Stroke = [];
    built = appendPoint(built, { x: 10, y: 10 });
    built = appendPoint(built, { x: 10.2, y: 10.1 });
    built = appendPoint(built, { x: Number.NaN, y: 10 });
    built = appendPoint(built, { x: 12, y: 10 });
    expect(built).toEqual([
      { x: 10, y: 10 },
      { x: 12, y: 10 },
    ]);
    let long: Stroke = [];
    for (let index = 0; index < SIGNATURE_STROKE_MAX_POINTS + 10; index += 1) {
      long = appendPoint(long, { x: index * 2, y: 0 });
    }
    expect(long).toHaveLength(SIGNATURE_STROKE_MAX_POINTS);
  });

  it('know ink from an empty pad, and a tap counts', () => {
    expect(hasInk([])).toBe(false);
    expect(hasInk([[]])).toBe(false);
    expect(hasInk([[{ x: 1, y: 1 }]])).toBe(true);
  });

  it('measure the ink including the pen width', () => {
    expect(inkBounds([])).toBeNull();
    const bounds = inkBounds([stroke, [{ x: 90, y: 200 }]])!;
    const half = SIGNATURE_PEN_WIDTH_PX / 2;
    expect(bounds).toEqual({
      x: 90 - half,
      y: 100 - half,
      width: 90 + SIGNATURE_PEN_WIDTH_PX,
      height: 100 + SIGNATURE_PEN_WIDTH_PX,
    });
  });

  it('crop to the ink with a margin, wherever on the pad the person signed', () => {
    expect(cropToInk([])).toBeNull();
    const cropped = cropToInk([[], stroke])!;
    const half = SIGNATURE_PEN_WIDTH_PX / 2;
    // Empty strokes are dropped; the first ink sits at the padding's distance.
    expect(cropped.strokes).toHaveLength(1);
    expect(cropped.strokes[0]![0]).toEqual({
      x: SIGNATURE_PADDING_PX + half,
      y: SIGNATURE_PADDING_PX + 20 + half,
    });
    expect(cropped.width).toBe(Math.ceil(80 + SIGNATURE_PEN_WIDTH_PX + 2 * SIGNATURE_PADDING_PX));
    expect(cropped.height).toBe(Math.ceil(30 + SIGNATURE_PEN_WIDTH_PX + 2 * SIGNATURE_PADDING_PX));
    // A signature far down the pad crops to the same size.
    const shifted = cropToInk([stroke.map((point) => ({ x: point.x + 300, y: point.y + 60 }))])!;
    expect([shifted.width, shifted.height]).toEqual([cropped.width, cropped.height]);
    expect(shifted.strokes[0]![0]).toEqual(cropped.strokes[0]![0]);
  });

  it('smooth through midpoints with the samples as control points', () => {
    expect(smoothPath([])).toEqual([]);
    expect(smoothPath(stroke.slice(0, 2))).toEqual([]);
    expect(smoothPath(stroke)).toEqual([{ control: { x: 140, y: 100 }, to: { x: 160, y: 115 } }]);
  });
});
