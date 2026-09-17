import { describe, expect, it } from 'vitest';
import { hasBlockingIssue } from '@/domain/common/ValidationIssue';
import {
  BUILT_IN_PROFILES,
  DEFAULT_PROFILE_ID,
  findBuiltInProfile,
} from '@/domain/print/builtInProfiles';
import { markerBounds } from '@/domain/print/PrintMarker';
import {
  bodyFollowsMargins,
  cloneProfile,
  markersFor,
  pageCount,
  region,
  turnProfile,
} from '@/domain/print/PrintProfile';
import { PrintProfileSchema } from '@/domain/print/PrintProfileSchema';
import { validateProfile } from '@/domain/print/validateProfile';

describe('built-in print profiles', () => {
  it('all satisfy their own schema', () => {
    for (const profile of BUILT_IN_PROFILES) {
      expect(PrintProfileSchema.safeParse(profile).success, profile.id).toBe(true);
    }
  });

  it('all validate without a blocking issue', () => {
    for (const profile of BUILT_IN_PROFILES) {
      const issues = validateProfile(profile);
      expect(hasBlockingIssue(issues), `${profile.id}: ${JSON.stringify(issues)}`).toBe(false);
    }
  });

  it('report no warnings either — a shipped profile the app itself doubts is a bug', () => {
    for (const profile of BUILT_IN_PROFILES) {
      const warnings = validateProfile(profile).filter((issue) => issue.severity === 'warning');
      expect(warnings, `${profile.id}: ${JSON.stringify(warnings)}`).toEqual([]);
    }
  });

  it('carry the DIN-style working values the drafts specify', () => {
    const formB = findBuiltInProfile('din5008-b');
    expect(formB?.markers.map((marker) => marker.yMm)).toEqual([105, 148.5, 210]);

    const formA = findBuiltInProfile('din5008-a');
    expect(formA?.markers.map((marker) => marker.yMm)).toEqual([87, 148.5, 192]);
  });

  it('never claims verified conformance for the DIN-style profiles', () => {
    for (const id of ['din5008-a', 'din5008-b']) {
      expect(findBuiltInProfile(id)?.standardsStatus).toBe('draft-unverified');
    }
  });

  it('are frozen at runtime, not merely readonly at compile time', () => {
    const profile = findBuiltInProfile(DEFAULT_PROFILE_ID);
    expect(profile).toBeDefined();
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(profile?.markers)).toBe(true);
    expect(Object.isFrozen(profile?.markers[0])).toBe(true);
  });

  it('places fold and punch marks inside the sheet', () => {
    const profile = findBuiltInProfile('din5008-b');
    for (const marker of profile?.markers ?? []) {
      const bounds = markerBounds(marker);
      expect(bounds.yMm).toBeLessThanOrEqual(profile!.page.heightMm);
      expect(bounds.xMm + bounds.widthMm).toBeLessThanOrEqual(profile!.page.widthMm);
    }
  });

  it('separates printed marks from preview-only guides', () => {
    const postcard = findBuiltInProfile('postcard-a6-landscape-duplex');
    expect(postcard).toBeDefined();

    const printedOnBack = markersFor(postcard!, 'back', 'print').map((marker) => marker.id);
    const previewOnBack = markersFor(postcard!, 'back', 'preview').map((marker) => marker.id);

    expect(printedOnBack).toContain('divider');
    expect(printedOnBack).not.toContain('safe');
    expect(previewOnBack).toContain('safe');
  });

  it('gives a duplex profile two pages and per-surface regions', () => {
    const postcard = findBuiltInProfile('postcard-a6-landscape-duplex')!;
    expect(pageCount(postcard)).toBe(2);
    expect(region(postcard, 'background')?.surface).toBe('front');
    expect(region(postcard, 'address')?.surface).toBe('back');
  });
});

describe('cloning a profile', () => {
  it('produces an editable copy that no longer claims the original standard', () => {
    const source = findBuiltInProfile('din5008-b')!;
    const copy = cloneProfile(source, 'my-letter', { de: 'Mein Brief', en: 'My letter' });

    expect(copy.builtIn).toBe(false);
    expect(copy.id).toBe('my-letter');
    expect(copy.standardsStatus).toBe('draft-unverified');
    expect(copy.markers.every((marker) => !marker.locked)).toBe(true);
    // The geometry is carried over unchanged; only ownership changes.
    expect(copy.markers.map((marker) => marker.yMm)).toEqual([105, 148.5, 210]);
  });

  it('leaves the source untouched', () => {
    const source = findBuiltInProfile('a5-card')!;
    cloneProfile(source, 'copy', { de: 'Kopie', en: 'Copy' });
    expect(source.builtIn).toBe(true);
    expect(source.markers[0].locked).toBe(true);
  });
});

describe('profile validation', () => {
  const base = findBuiltInProfile('a4-blank')!;

  it('rejects a page size outside the supported range', () => {
    const broken = { ...base, page: { ...base.page, widthMm: 5 } };
    expect(
      validateProfile(broken).some((issue) => issue.code === 'profile.pageSizeOutOfRange'),
    ).toBe(true);
  });

  it('rejects margins that leave no content area', () => {
    const broken = { ...base, margins: { topMm: 200, rightMm: 0, bottomMm: 200, leftMm: 0 } };
    expect(validateProfile(broken).some((issue) => issue.code === 'profile.contentBoxEmpty')).toBe(
      true,
    );
  });

  it('rejects a non-finite marker coordinate', () => {
    const broken = {
      ...base,
      markers: [
        {
          id: 'bad',
          kind: 'fold' as const,
          xMm: Number.NaN,
          yMm: 10,
          widthMm: 8,
          orientation: 'horizontal' as const,
          strokeWidthMm: 0.2,
          lineStyle: 'solid' as const,
          preview: true,
          print: true,
          surface: 'all' as const,
          locked: false,
        },
      ],
      capabilities: { ...base.capabilities, foldMarks: true },
    };
    expect(
      validateProfile(broken).some((issue) => issue.code === 'profile.markerGeometryInvalid'),
    ).toBe(true);
  });

  it('refuses a fold-mark claim a profile cannot back up', () => {
    const lying = { ...base, capabilities: { ...base.capabilities, foldMarks: true } };
    expect(
      validateProfile(lying).some((issue) => issue.code === 'profile.capabilityWithoutMarker'),
    ).toBe(true);
  });

  it('refuses an address-window claim without the region', () => {
    const lying = { ...base, capabilities: { ...base.capabilities, addressWindow: true } };
    const issues = validateProfile(lying);
    expect(issues.some((issue) => issue.code === 'profile.addressWindowRegionMissing')).toBe(true);
    expect(hasBlockingIssue(issues)).toBe(true);
  });

  it('warns about fold marks on a photo format', () => {
    const photo = findBuiltInProfile('photo-10x15')!;
    const odd = {
      ...photo,
      capabilities: { ...photo.capabilities, foldMarks: true },
      markers: [
        ...photo.markers,
        {
          id: 'fold',
          kind: 'fold' as const,
          xMm: 5,
          yMm: 75,
          widthMm: 8,
          orientation: 'horizontal' as const,
          strokeWidthMm: 0.2,
          lineStyle: 'solid' as const,
          preview: true,
          print: true,
          surface: 'all' as const,
          locked: false,
        },
      ],
    };
    expect(
      validateProfile(odd).some((issue) => issue.code === 'profile.photoFoldMarksUnexpected'),
    ).toBe(true);
  });
});

describe('landscape (change 0045)', () => {
  it('ships A4, A5 and US Letter sideways with the body inside the margins', () => {
    for (const [id, width, height] of [
      ['a4-landscape', 297, 210],
      ['a5-landscape', 210, 148],
      ['us-letter-landscape', 279.4, 215.9],
    ] as const) {
      const profile = findBuiltInProfile(id)!;
      expect(profile.page).toEqual({ widthMm: width, heightMm: height, orientation: 'landscape' });
      expect(bodyFollowsMargins(profile)).toBe(true);
      expect(profile.category).toBe('letter');
    }
  });

  it('turns a profile by swapping the sheet and keeping the millimetres of everything else', () => {
    const blank = findBuiltInProfile('a4-blank')!;
    const wide = turnProfile(blank, 'landscape', new Date('2026-09-17T00:00:00Z'));
    expect(wide.page).toEqual({ widthMm: 297, heightMm: 210, orientation: 'landscape' });
    expect(wide.margins).toEqual(blank.margins);
    expect(wide.regions.body).toMatchObject({ xMm: 20, yMm: 20, widthMm: 257, heightMm: 170 });
    expect(turnProfile(blank, 'portrait')).toBe(blank);
    expect(turnProfile(wide, 'portrait').regions.body).toEqual(blank.regions.body);

    // A structured body stays where it is; the DIN marks stay too and the
    // validation, not the turn, says the sheet no longer holds them.
    const din = findBuiltInProfile('din5008-b')!;
    const dinWide = turnProfile(din, 'landscape');
    expect(dinWide.regions.body).toEqual(din.regions.body);
    expect(dinWide.markers).toEqual(din.markers);
    expect(hasBlockingIssue(validateProfile(dinWide))).toBe(true);
    expect(hasBlockingIssue(validateProfile(wide))).toBe(false);
  });
});
