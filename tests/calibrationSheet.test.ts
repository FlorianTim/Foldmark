import { describe, expect, it } from 'vitest';
import {
  buildCalibrationPage,
  CALIBRATION_INSET_MM,
  calibrationMarkers,
} from '@/application/render/calibrationSheet';
import { isBoxInsidePage } from '@/domain/common/Units';
import { findBuiltInProfile } from '@/domain/print/builtInProfiles';
import { markerBounds } from '@/domain/print/PrintMarker';
import { markersFor } from '@/domain/print/PrintProfile';

/** Change 0043 (R02-002): the calibration sheet is a render page of known distances. */

const din5008B = findBuiltInProfile('din5008-b')!;
const wording = {
  title: 'Kalibrierbogen',
  subtitle: 'DIN A4 · 210 × 297 mm',
  instructions: '1. Drucke mit **100 %**.\n\n2. Miss den Rahmen.',
  marksHeading: 'Marken:',
  markLines: ['Falzmarke: x 0 mm · y 105 mm · 5 mm'],
};

describe('calibration sheet', () => {
  it('frames the sheet at the inset on every side', () => {
    const markers = calibrationMarkers(210, 297);
    const frame = markers.filter((marker) => marker.id.startsWith('cal-frame-'));
    expect(frame.map((marker) => [marker.id, marker.xMm, marker.yMm])).toEqual([
      ['cal-frame-top', CALIBRATION_INSET_MM, CALIBRATION_INSET_MM],
      ['cal-frame-bottom', CALIBRATION_INSET_MM, 297 - CALIBRATION_INSET_MM],
      ['cal-frame-left', CALIBRATION_INSET_MM, CALIBRATION_INSET_MM],
      ['cal-frame-right', 210 - CALIBRATION_INSET_MM, CALIBRATION_INSET_MM],
    ]);
    const top = frame.find((marker) => marker.id === 'cal-frame-top')!;
    expect(top.widthMm).toBe(210 - 2 * CALIBRATION_INSET_MM);
    const left = frame.find((marker) => marker.id === 'cal-frame-left')!;
    expect(left.heightMm).toBe(297 - 2 * CALIBRATION_INSET_MM);
    for (const marker of markers) expect(marker.print && marker.preview).toBe(true);
  });

  it('ticks every 10 mm from the frame corner, longer every 50 mm, and crosses the centre', () => {
    const markers = calibrationMarkers(210, 297);
    const xTicks = markers.filter((marker) => marker.id.startsWith('cal-tick-x-'));
    const yTicks = markers.filter((marker) => marker.id.startsWith('cal-tick-y-'));
    // 190 mm of frame: ticks at 10 … 180, never on the far edge.
    expect(xTicks).toHaveLength(18);
    expect(yTicks).toHaveLength(27);
    expect(xTicks[0]!.xMm).toBe(CALIBRATION_INSET_MM + 10);
    expect(xTicks.at(-1)!.xMm).toBe(CALIBRATION_INSET_MM + 180);
    const major = xTicks.find((marker) => marker.id === 'cal-tick-x-100')!;
    const minor = xTicks.find((marker) => marker.id === 'cal-tick-x-90')!;
    expect(major.heightMm).toBeGreaterThan(minor.heightMm!);
    const cross = markers.filter((marker) => marker.id.startsWith('cal-cross-'));
    expect(cross).toHaveLength(2);
    for (const arm of cross) {
      const bounds = markerBounds(arm);
      expect(bounds.xMm + bounds.widthMm / 2).toBeCloseTo(105, 5);
      expect(bounds.yMm + bounds.heightMm / 2).toBeCloseTo(148.5, 5);
    }
  });

  it('draws the profile marks as a letter prints them, and everything stays on the sheet', () => {
    const page = buildCalibrationPage(din5008B, wording);
    expect(page.page).toEqual(din5008B.page);
    const printed = markersFor(din5008B, 'front', 'print');
    expect(printed.length).toBeGreaterThan(0);
    for (const marker of printed) expect(page.markers).toContain(marker);
    // Preview-only guides (safe areas, address window) never reach the sheet.
    const previewOnly = din5008B.markers.filter((marker) => !marker.print);
    for (const marker of previewOnly) expect(page.markers).not.toContain(marker);
    for (const marker of page.markers) {
      expect(isBoxInsidePage(markerBounds(marker), page.page)).toBe(true);
    }
    for (const block of page.blocks) expect(isBoxInsidePage(block.box, page.page)).toBe(true);
  });

  it('prints the wording it is given: title, size, instructions, tick labels and the marks', () => {
    const page = buildCalibrationPage(din5008B, wording);
    const lines = page.blocks.flatMap((block) => (block.kind === 'lines' ? block.lines : []));
    expect(lines).toContain('Kalibrierbogen');
    expect(lines).toContain('DIN A4 · 210 × 297 mm');
    expect(lines).toContain('Marken:');
    expect(lines).toContain('Falzmarke: x 0 mm · y 105 mm · 5 mm');
    // Labels at 50, 100, 150 along the width and 50 … 250 along the height.
    expect(lines.filter((line) => line === '50')).toHaveLength(2);
    expect(lines.filter((line) => line === '250')).toHaveLength(1);
    expect(lines).not.toContain('200,');
    const markdown = page.blocks.find((block) => block.kind === 'markdown');
    expect(markdown && markdown.kind === 'markdown' && markdown.source).toBe(wording.instructions);
  });

  it('leaves the mark list out when the profile prints no marks', () => {
    const plain = { ...din5008B, markers: din5008B.markers.filter((marker) => !marker.print) };
    const page = buildCalibrationPage(plain, wording);
    const lines = page.blocks.flatMap((block) => (block.kind === 'lines' ? block.lines : []));
    expect(lines).not.toContain('Marken:');
  });
});
