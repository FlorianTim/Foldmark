import type { BoxMm, MarginsMm, Millimetres, PageSizeMm } from '@/domain/common/Units';
import type { PrintMarker, SurfaceScope } from '@/domain/print/PrintMarker';

/**
 * Print profiles — the physical half of a Foldmark document.
 *
 * A profile answers "what does the paper look like?": how big it is, where the
 * content may go, which helper marks belong on it and whether it has a back.
 * It never answers "what does it say". That separation is the reason one
 * document can be a DIN-style letter, a blank A4 page and a PDF attachment
 * without being rewritten.
 *
 * Built-in profiles are **immutable**. Editing one produces a user-owned copy,
 * so the values the app shipped stay the values it shipped — otherwise a
 * profile named "DIN-style Form B" could silently mean anything.
 */

/** Broad physical category, used for category-aware validation and for filtering. */
export type ProfileCategory = 'letter' | 'postcard' | 'card' | 'photo' | 'label' | 'custom';

/**
 * How far the profile's measurements have been checked against a standard.
 *
 * Foldmark ships DIN-*style* profiles built from commonly cited working values.
 * Until those are checked against a licensed copy of the current standard, the
 * app must not claim conformance — so the claim is data, it is displayed, and
 * it defaults to unverified.
 */
export type StandardsStatus = 'draft-unverified' | 'verified' | 'not-applicable';

/** What a profile physically supports, independent of which markers happen to exist. */
export interface ProfileCapabilities {
  /** The profile is designed for folding into an envelope. */
  readonly foldMarks: boolean;
  /** The profile positions content for a windowed envelope. */
  readonly addressWindow: boolean;
  /** The profile has a front and a back surface. */
  readonly duplex: boolean;
  /** The profile expects artwork to run past the trim edge. */
  readonly bleed: boolean;
}

/** Duplex geometry: which surfaces exist and how the sheet is meant to be turned. */
export interface DuplexSpec {
  readonly flip: 'long-edge' | 'short-edge';
  readonly surfaces: readonly ['front', 'back'];
}

/** Bleed added on each edge, in millimetres, for profiles that print past the trim. */
export type BleedMm = MarginsMm;

/**
 * A named layout area on one surface.
 *
 * The surface is part of the region rather than inferred from its name, because
 * a duplex profile has a `message` area on the back and an `image` area on the
 * front, and nothing else can tell the overlap check that those two are allowed
 * to sit on top of each other.
 */
export interface ProfileRegion extends BoxMm {
  readonly surface: SurfaceScope;
}

/** A localized profile name; every supported locale must be present. */
export interface LocalizedName {
  readonly de: string;
  readonly en: string;
}

/** One physical print target: page geometry, regions, markers and what it claims to support. */
export interface PrintProfile {
  readonly id: string;
  /** Bumped whenever the shipped geometry of a built-in profile changes. */
  readonly version: number;
  readonly name: LocalizedName;
  readonly category: ProfileCategory;
  /** Built-in profiles are shipped with the app and can never be mutated in place. */
  readonly builtIn: boolean;
  readonly page: PageSizeMm;
  readonly margins: MarginsMm;
  readonly capabilities: ProfileCapabilities;
  readonly markers: readonly PrintMarker[];
  /** Named layout areas the renderer places content into, keyed by region name. */
  readonly regions: Readonly<Record<string, ProfileRegion>>;
  readonly duplex?: DuplexSpec;
  readonly bleed?: BleedMm;
  readonly standardsStatus: StandardsStatus;
  /** ISO-8601; absent on built-ins, which never change outside a release. */
  readonly updatedAt?: string;
}

/** The surfaces a profile renders, in the order they are printed. */
export function profileSurfaces(profile: PrintProfile): readonly SurfaceScope[] {
  return profile.duplex ? profile.duplex.surfaces : ['all'];
}

/** How many physical pages one copy of this profile produces. */
export function pageCount(profile: PrintProfile): number {
  return profile.duplex ? profile.duplex.surfaces.length : 1;
}

/** The markers that apply to one surface and are visible in the given mode. */
export function markersFor(
  profile: PrintProfile,
  surface: SurfaceScope,
  mode: 'preview' | 'print',
): readonly PrintMarker[] {
  return profile.markers.filter(
    (marker) =>
      (mode === 'preview' ? marker.preview : marker.print) &&
      (marker.surface === 'all' || surface === 'all' || marker.surface === surface),
  );
}

/** The named region a renderer should use, or `undefined` when the profile has none. */
export function region(profile: PrintProfile, name: string): ProfileRegion | undefined {
  return Object.hasOwn(profile.regions, name) ? profile.regions[name] : undefined;
}

/**
 * Turns a built-in profile into an editable copy owned by the user.
 *
 * The copy takes a new id, drops the built-in flag, unlocks every marker and
 * loses the standards claim — a profile stops being "DIN-style Form B" the
 * moment somebody moves a fold mark, and pretending otherwise is how a wrong
 * letter gets blamed on the standard.
 */
export function cloneProfile(
  profile: PrintProfile,
  id: string,
  name: LocalizedName,
  now = new Date(),
): PrintProfile {
  return {
    ...profile,
    id,
    name,
    builtIn: false,
    version: 1,
    standardsStatus:
      profile.standardsStatus === 'not-applicable' ? 'not-applicable' : 'draft-unverified',
    markers: profile.markers.map((marker) => ({ ...marker, locked: false })),
    updatedAt: now.toISOString(),
  };
}

/**
 * Whether the body region is exactly the margin box — a plain profile whose
 * body may follow the margins and the orientation, as opposed to a structured
 * body (the DIN letter's, below the address field) that stays where it is.
 */
export function bodyFollowsMargins(profile: PrintProfile): boolean {
  const body = profile.regions.body;
  if (!body) return false;
  // Inch-based sheets (US Letter) make the subtraction drift by a float ulp.
  const same = (left: number, right: number) => Math.abs(left - right) < 0.01;
  const { page, margins } = profile;
  return (
    same(body.xMm, margins.leftMm) &&
    same(body.yMm, margins.topMm) &&
    same(body.widthMm, page.widthMm - margins.leftMm - margins.rightMm) &&
    same(body.heightMm, page.heightMm - margins.topMm - margins.bottomMm)
  );
}

/**
 * The same profile turned to the other orientation (change 0045, R16-001):
 * width and height swap, a body that was the margin box follows, everything
 * else — other regions, markers, margins — keeps its millimetres. A marker
 * that no longer fits the turned sheet is the caller's problem to validate:
 * turning a DIN letter sideways is refused by the geometry check, not guessed.
 * Pure: the same orientation returns the profile unchanged.
 */
export function turnProfile(
  profile: PrintProfile,
  orientation: PageSizeMm['orientation'],
  now = new Date(),
): PrintProfile {
  if (profile.page.orientation === orientation) return profile;
  const page: PageSizeMm = {
    widthMm: profile.page.heightMm,
    heightMm: profile.page.widthMm,
    orientation,
  };
  const { margins } = profile;
  const regions =
    profile.regions.body && bodyFollowsMargins(profile)
      ? {
          ...profile.regions,
          body: {
            ...profile.regions.body,
            widthMm: page.widthMm - margins.leftMm - margins.rightMm,
            heightMm: page.heightMm - margins.topMm - margins.bottomMm,
          },
        }
      : profile.regions;
  return { ...profile, page, regions, updatedAt: now.toISOString() };
}

/** The largest page dimension Foldmark accepts, in millimetres. */
export const MAX_PAGE_MM: Millimetres = 1_000;

/** The smallest page dimension Foldmark accepts, in millimetres. */
export const MIN_PAGE_MM: Millimetres = 10;
