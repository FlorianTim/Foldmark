import { describe, expect, it } from 'vitest';
import { InvalidInputError } from '@/application/errors/FoldmarkErrors';
import { PrintProfileService } from '@/application/usecases/PrintProfileService';
import { findBuiltInProfile } from '@/domain/print/builtInProfiles';
import {
  capabilitiesFor,
  freeMarkerId,
  lineLength,
  MARKERS_MAX,
  moveMarker,
  newMarker,
  withLineLength,
  withMarker,
  withOrientation,
  withoutMarker,
} from '@/domain/print/markerEditing';
import { markerBounds } from '@/domain/print/PrintMarker';
import { FakePrintProfileRepository } from './helpers/fakes';

/** Change 0047 (R02-001): markers of an own profile edited by number. */

const din = findBuiltInProfile('din5008-b')!;
const a4 = findBuiltInProfile('a4-blank')!;

describe('marker editing', () => {
  it('hands out free ids per kind', () => {
    expect(freeMarkerId([], 'fold')).toBe('fold-1');
    expect(freeMarkerId([{ ...din.markers[0]!, id: 'fold-1' }], 'fold')).toBe('fold-2');
  });

  it('starts a new line at the left edge, halfway down, and a new region in the corner', () => {
    const fold = newMarker([], 'fold', a4.page);
    expect(fold).toMatchObject({
      id: 'fold-1',
      kind: 'fold',
      xMm: 5,
      yMm: 148.5,
      widthMm: 8,
      orientation: 'horizontal',
      print: true,
      preview: true,
      locked: false,
    });
    const safe = newMarker([fold], 'safe-area', a4.page);
    expect(safe).toMatchObject({
      id: 'safe-area-1',
      xMm: 10,
      yMm: 10,
      widthMm: 40,
      heightMm: 40,
      print: false,
      lineStyle: 'dashed',
    });
    // A tiny sheet gets a region that fits it.
    const tiny = newMarker([], 'grid', { widthMm: 40, heightMm: 30, orientation: 'landscape' });
    expect(tiny.widthMm).toBe(15);
  });

  it('replaces, removes and moves by id and leaves the ends alone', () => {
    const [top, punch, bottom] = din.markers;
    const moved = withMarker(din.markers, { ...punch!, yMm: 150 });
    expect(moved[1]!.yMm).toBe(150);
    expect(withMarker(din.markers, { ...punch!, id: 'nope' })).toEqual(din.markers);
    expect(withoutMarker(din.markers, 'punch').map((marker) => marker.id)).toEqual([
      'fold-top',
      'fold-bottom',
    ]);
    expect(moveMarker(din.markers, 'punch', -1).map((marker) => marker.id)).toEqual([
      'punch',
      'fold-top',
      'fold-bottom',
    ]);
    expect(moveMarker(din.markers, 'fold-top', -1)).toBe(din.markers);
    expect(moveMarker(din.markers, 'fold-bottom', 1)).toBe(din.markers);
    expect([top, bottom].map((marker) => marker!.kind)).toEqual(['fold', 'fold']);
  });

  it('keeps a line length on its axis when the line turns', () => {
    const horizontal = din.markers[1]!;
    expect(lineLength(horizontal)).toBe(12);
    const vertical = withOrientation(horizontal, 'vertical');
    expect(vertical).toMatchObject({ orientation: 'vertical', heightMm: 12, widthMm: undefined });
    expect(lineLength(vertical)).toBe(12);
    expect(markerBounds(vertical)).toEqual({ xMm: 5, yMm: 148.5, widthMm: 0, heightMm: 12 });
    expect(withLineLength(vertical, 20).heightMm).toBe(20);
    expect(withLineLength(horizontal, 20)).toMatchObject({ widthMm: 20, heightMm: undefined });
    expect(withOrientation(horizontal, 'horizontal')).toEqual(horizontal);
  });

  it('derives the fold and bleed claims from the markers, keeping the rest', () => {
    expect(capabilitiesFor(din, [])).toEqual({ ...din.capabilities, foldMarks: false });
    expect(capabilitiesFor(a4, [newMarker([], 'fold', a4.page)])).toEqual({
      ...a4.capabilities,
      foldMarks: true,
    });
    expect(capabilitiesFor(a4, [newMarker([], 'bleed', a4.page)]).bleed).toBe(true);
  });
});

describe('PrintProfileService.updateMarkers', () => {
  function service(): PrintProfileService {
    return new PrintProfileService(new FakePrintProfileRepository());
  }

  it('stores the list, unlocked, with the claims that follow', async () => {
    const profiles = service();
    const copy = await profiles.clone('a4-blank', { de: 'Eigen', en: 'Own' });
    const fold = newMarker([], 'fold', copy.page);
    const updated = await profiles.updateMarkers(copy.id, [{ ...fold, locked: true }]);
    expect(updated.markers).toEqual([fold]);
    expect(updated.capabilities.foldMarks).toBe(true);
    expect(profiles.validate(updated).some((issue) => issue.severity === 'error')).toBe(false);
    const stored = await profiles.get(copy.id);
    expect(stored?.markers).toEqual([fold]);
  });

  it('refuses a mark outside the sheet, too many marks, and a built-in', async () => {
    const profiles = service();
    const copy = await profiles.clone('a4-blank', { de: 'Eigen', en: 'Own' });
    const outside = { ...newMarker([], 'fold', copy.page), yMm: 400 };
    await expect(profiles.updateMarkers(copy.id, [outside])).rejects.toThrowError(
      InvalidInputError,
    );
    const many = Array.from({ length: MARKERS_MAX + 1 }, (_, index) => ({
      ...newMarker([], 'custom', copy.page),
      id: `custom-${index + 1}`,
    }));
    await expect(profiles.updateMarkers(copy.id, many)).rejects.toThrowError(InvalidInputError);
    await expect(profiles.updateMarkers('din5008-b', [])).rejects.toThrow();
    expect((await profiles.get(copy.id))?.markers).toEqual([]);
  });
});
