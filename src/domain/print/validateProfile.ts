import { isValidId } from '@/domain/common/Ids';
import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import {
  boxesOverlap,
  contentBox,
  isBoxInsidePage,
  isValidMillimetres,
} from '@/domain/common/Units';
import { hasFiniteGeometry, markerBounds, type PrintMarker } from '@/domain/print/PrintMarker';
import {
  MAX_PAGE_MM,
  MIN_PAGE_MM,
  type PrintProfile,
  type ProfileRegion,
} from '@/domain/print/PrintProfile';

/**
 * Print-profile validation.
 *
 * Every rule here answers a question the user would otherwise only be able to
 * answer by wasting a sheet of paper. The output is deliberately graded:
 *
 * - **error** — the profile cannot be rendered as described.
 * - **warning** — it renders, but it will very likely be wrong on paper.
 * - **info** — worth knowing, no action required.
 *
 * The pairs that look pedantic are the ones that matter most: a capability flag
 * claiming fold marks a profile does not have, and marker coordinates that
 * survive JSON but not arithmetic.
 */

/** How far outside the trimmed page a crop or bleed mark may legitimately sit, in millimetres. */
const OUTSIDE_PAGE_TOLERANCE_MM = 30;

/** Regions whose whole purpose is to sit under, between or beyond the others. */
const UNDERLYING_REGIONS = new Set(['background', 'separator', 'bleed']);

function checkPage(profile: PrintProfile, issues: ValidationIssue[]): void {
  const { widthMm, heightMm } = profile.page;
  for (const [value, path] of [
    [widthMm, 'page.widthMm'],
    [heightMm, 'page.heightMm'],
  ] as const) {
    if (!Number.isFinite(value) || value < MIN_PAGE_MM || value > MAX_PAGE_MM) {
      issues.push({ severity: 'error', code: 'profile.pageSizeOutOfRange', path });
    }
  }
}

function checkMargins(profile: PrintProfile, issues: ValidationIssue[]): void {
  const { margins } = profile;
  const values = [margins.topMm, margins.rightMm, margins.bottomMm, margins.leftMm];
  if (values.some((value) => !isValidMillimetres(value) || value < 0)) {
    issues.push({ severity: 'error', code: 'profile.marginInvalid', path: 'margins' });
    return;
  }
  const box = contentBox(profile.page, margins);
  if (box.widthMm <= 0 || box.heightMm <= 0) {
    issues.push({ severity: 'error', code: 'profile.contentBoxEmpty', path: 'margins' });
  }
}

function checkMarker(marker: PrintMarker, profile: PrintProfile, issues: ValidationIssue[]): void {
  const path = `markers.${marker.id}`;
  if (!isValidId(marker.id)) {
    issues.push({ severity: 'error', code: 'profile.markerIdInvalid', path });
  }
  if (!hasFiniteGeometry(marker)) {
    issues.push({ severity: 'error', code: 'profile.markerGeometryInvalid', path });
    return;
  }
  if (marker.strokeWidthMm <= 0) {
    issues.push({ severity: 'error', code: 'profile.markerStrokeInvalid', path });
  }

  const bounds = markerBounds(marker);
  const mayLeavePage = marker.kind === 'cut' || marker.kind === 'bleed';
  if (!isBoxInsidePage(bounds, profile.page)) {
    const slack = mayLeavePage ? OUTSIDE_PAGE_TOLERANCE_MM : 0;
    const farOutside =
      bounds.xMm < -slack ||
      bounds.yMm < -slack ||
      bounds.xMm + bounds.widthMm > profile.page.widthMm + slack ||
      bounds.yMm + bounds.heightMm > profile.page.heightMm + slack;
    // A crop or bleed mark outside the trim is doing its job, so it is reported
    // as information rather than as a problem. Anything else out there is not.
    issues.push({
      severity: farOutside ? 'error' : mayLeavePage ? 'info' : 'warning',
      code: mayLeavePage ? 'profile.markerOutsidePageAllowed' : 'profile.markerOutsidePage',
      path,
      params: { label: marker.label ?? marker.id },
    });
  }

  if (marker.surface !== 'all' && !profile.duplex) {
    issues.push({ severity: 'warning', code: 'profile.markerSurfaceWithoutDuplex', path });
  }

  if (profile.builtIn && !marker.locked) {
    issues.push({ severity: 'info', code: 'profile.builtInMarkerUnlocked', path });
  }
}

function checkCapabilityClaims(profile: PrintProfile, issues: ValidationIssue[]): void {
  const claims = [
    ['foldMarks', 'fold'],
    ['bleed', 'bleed'],
  ] as const;

  for (const [capability, kind] of claims) {
    const hasMarker = profile.markers.some((marker) => marker.kind === kind);
    if (profile.capabilities[capability] && !hasMarker) {
      issues.push({
        severity: 'warning',
        code: 'profile.capabilityWithoutMarker',
        path: `capabilities.${capability}`,
        params: { capability },
      });
    }
    // The inverse is the rule the drafts call out explicitly: a profile may not
    // claim a capability just because some custom line happens to be drawn, and
    // it may not carry the marks while denying it supports them.
    if (!profile.capabilities[capability] && hasMarker) {
      issues.push({
        severity: 'warning',
        code: 'profile.markerWithoutCapability',
        path: `capabilities.${capability}`,
        params: { capability },
      });
    }
  }

  if (profile.capabilities.addressWindow && !Object.hasOwn(profile.regions, 'addressWindow')) {
    issues.push({
      severity: 'error',
      code: 'profile.addressWindowRegionMissing',
      path: 'regions.addressWindow',
    });
  }

  if (profile.capabilities.duplex !== Boolean(profile.duplex)) {
    issues.push({ severity: 'error', code: 'profile.duplexClaimMismatch', path: 'duplex' });
  }
}

function checkRegions(profile: PrintProfile, issues: ValidationIssue[]): void {
  const entries = Object.entries(profile.regions) as readonly (readonly [string, ProfileRegion])[];
  for (const [name, box] of entries) {
    const path = `regions.${name}`;
    if (!isValidId(name)) {
      issues.push({ severity: 'error', code: 'profile.regionNameInvalid', path });
    }
    const measurements = [box.xMm, box.yMm, box.widthMm, box.heightMm];
    if (measurements.some((value) => !isValidMillimetres(value))) {
      issues.push({ severity: 'error', code: 'profile.regionGeometryInvalid', path });
      continue;
    }
    if (box.widthMm <= 0 || box.heightMm <= 0) {
      issues.push({ severity: 'error', code: 'profile.regionEmpty', path });
      continue;
    }
    if (!isBoxInsidePage(box, profile.page)) {
      issues.push({ severity: 'error', code: 'profile.regionOutsidePage', path });
    }
  }

  // Overlap is reported once per pair, and only between content-bearing regions
  // that share a surface: the front image of a postcard covering the same
  // coordinates as its message area is not a conflict, it is the other side.
  //
  // Three names are exempt because overlapping is what they are for: a
  // `background` is meant to sit underneath everything on its side, a
  // `separator` is a line drawn *between* two areas, and `bleed` extends past
  // the trim by definition.
  const contentRegions = entries.filter(([name]) => !UNDERLYING_REGIONS.has(name));
  for (let first = 0; first < contentRegions.length; first += 1) {
    for (let second = first + 1; second < contentRegions.length; second += 1) {
      const [firstName, firstBox] = contentRegions[first];
      const [secondName, secondBox] = contentRegions[second];
      const sharesSurface =
        firstBox.surface === 'all' ||
        secondBox.surface === 'all' ||
        firstBox.surface === secondBox.surface;
      if (sharesSurface && boxesOverlap(firstBox, secondBox)) {
        issues.push({
          severity: 'warning',
          code: 'profile.regionsOverlap',
          path: `regions.${firstName}`,
          params: { first: firstName, second: secondName },
        });
      }
    }
  }
}

function checkCategory(profile: PrintProfile, issues: ValidationIssue[]): void {
  const printedFolds = profile.markers.filter((marker) => marker.kind === 'fold' && marker.print);
  if (profile.category === 'photo' && printedFolds.length > 0) {
    issues.push({
      severity: 'warning',
      code: 'profile.photoFoldMarksUnexpected',
      path: 'markers',
      params: { count: printedFolds.length },
    });
  }
  if (profile.category === 'postcard' && !profile.duplex) {
    issues.push({ severity: 'warning', code: 'profile.postcardWithoutDuplex', path: 'duplex' });
  }
  if (profile.standardsStatus === 'draft-unverified') {
    issues.push({ severity: 'info', code: 'profile.standardsUnverified', path: 'standardsStatus' });
  }
}

/**
 * Validates one print profile and returns every finding, most severe first.
 *
 * Returns all issues rather than stopping at the first: a profile editor that
 * reveals one problem per save is how a five-field form takes five round trips.
 */
export function validateProfile(profile: PrintProfile): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isValidId(profile.id)) {
    issues.push({ severity: 'error', code: 'profile.idInvalid', path: 'id' });
  }
  if (!profile.name.de.trim() || !profile.name.en.trim()) {
    issues.push({ severity: 'error', code: 'profile.nameIncomplete', path: 'name' });
  }

  checkPage(profile, issues);
  checkMargins(profile, issues);
  for (const marker of profile.markers) checkMarker(marker, profile, issues);
  checkCapabilityClaims(profile, issues);
  checkRegions(profile, issues);
  checkCategory(profile, issues);

  const order = { error: 0, warning: 1, info: 2 } as const;
  return [...issues].sort((left, right) => order[left.severity] - order[right.severity]);
}
