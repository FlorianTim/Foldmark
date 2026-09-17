import type { PageSizeMm } from '@/domain/common/Units';
import {
  DEFAULT_STROKE_WIDTH_MM,
  isRegionMarker,
  REGION_MARKER_KINDS,
  type MarkerKind,
  type PrintMarker,
} from '@/domain/print/PrintMarker';
import type { PrintProfile, ProfileCapabilities } from '@/domain/print/PrintProfile';

/**
 * Editing the markers of a user-owned profile by number (change 0047,
 * R02-001): every operation is a pure function from a marker list to a marker
 * list, so the panel can keep a draft, show the validation of the would-be
 * profile while typing, and hand the list to the service once. Nothing here
 * decides whether the result is a valid profile — `validateProfile` does, on
 * the draft and again on save.
 */

/** Marker kinds a person may add; every kind the model knows, in the catalogue's order. */
export const EDITABLE_MARKER_KINDS: readonly MarkerKind[] = [
  'fold',
  'hole',
  'cut',
  'separator',
  'custom',
  'safe-area',
  'address-window',
  'stamp-area',
  'grid',
  'bleed',
];

/** Most markers one profile may carry; a profile is a sheet, not a drawing. */
export const MARKERS_MAX = 64;

/** The length a new line marker starts with, in millimetres. */
const NEW_LINE_LENGTH_MM = 8;

/** The size a new region marker starts with, in millimetres. */
const NEW_REGION_SIZE_MM = 40;

/** Whether a kind describes a rectangle rather than a line. */
export function isRegionKind(kind: MarkerKind): boolean {
  return REGION_MARKER_KINDS.includes(kind);
}

/** An id of the form `<kind>-<n>` that no marker in the list carries yet. */
export function freeMarkerId(markers: readonly PrintMarker[], kind: MarkerKind): string {
  const taken = new Set(markers.map((marker) => marker.id));
  for (let index = 1; index < 10_000; index += 1) {
    const candidate = `${kind}-${index}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${kind}-${Date.now()}`;
}

/**
 * A new marker with a sensible place on the sheet: a line at the left edge,
 * halfway down — where fold and punch marks live — and a region in the
 * top-left corner. Printed for the kinds that are printed on a letter (fold,
 * hole, cut), preview-only for the design aids.
 */
export function newMarker(
  markers: readonly PrintMarker[],
  kind: MarkerKind,
  page: PageSizeMm,
): PrintMarker {
  const id = freeMarkerId(markers, kind);
  const printed = kind === 'fold' || kind === 'hole' || kind === 'cut';
  if (isRegionKind(kind)) {
    const size = Math.min(NEW_REGION_SIZE_MM, page.widthMm / 2, page.heightMm / 2);
    return {
      id,
      kind,
      xMm: 10,
      yMm: 10,
      widthMm: size,
      heightMm: size,
      orientation: 'horizontal',
      strokeWidthMm: DEFAULT_STROKE_WIDTH_MM,
      lineStyle: 'dashed',
      preview: true,
      print: false,
      surface: 'all',
      locked: false,
    };
  }
  return {
    id,
    kind,
    xMm: 5,
    yMm: Math.round((page.heightMm / 2) * 2) / 2,
    widthMm: Math.min(NEW_LINE_LENGTH_MM, page.widthMm),
    orientation: 'horizontal',
    strokeWidthMm: DEFAULT_STROKE_WIDTH_MM,
    lineStyle: 'solid',
    preview: true,
    print: printed,
    surface: 'all',
    locked: false,
  };
}

/** The list with one marker replaced by id; an unknown id leaves it unchanged. */
export function withMarker(
  markers: readonly PrintMarker[],
  replacement: PrintMarker,
): readonly PrintMarker[] {
  return markers.map((marker) => (marker.id === replacement.id ? replacement : marker));
}

/** The list without the marker of that id. */
export function withoutMarker(markers: readonly PrintMarker[], id: string): readonly PrintMarker[] {
  return markers.filter((marker) => marker.id !== id);
}

/** The list with one marker moved up (−1) or down (+1); the ends stay put. */
export function moveMarker(
  markers: readonly PrintMarker[],
  id: string,
  direction: -1 | 1,
): readonly PrintMarker[] {
  const index = markers.findIndex((marker) => marker.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= markers.length) return markers;
  const next = [...markers];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved!);
  return next;
}

/**
 * A line marker's length lives in `widthMm` when horizontal and `heightMm`
 * when vertical; turning the line moves it across. A region keeps both.
 */
export function withOrientation(
  marker: PrintMarker,
  orientation: PrintMarker['orientation'],
): PrintMarker {
  if (isRegionMarker(marker) || marker.orientation === orientation) {
    return { ...marker, orientation };
  }
  const length = marker.widthMm ?? marker.heightMm ?? NEW_LINE_LENGTH_MM;
  return orientation === 'vertical'
    ? { ...marker, orientation, widthMm: undefined, heightMm: length }
    : { ...marker, orientation, widthMm: length, heightMm: undefined };
}

/** The length of a line marker, whichever axis holds it. */
export function lineLength(marker: PrintMarker): number {
  return marker.orientation === 'vertical'
    ? (marker.heightMm ?? marker.widthMm ?? 0)
    : (marker.widthMm ?? marker.heightMm ?? 0);
}

/** A line marker with a new length on its axis. */
export function withLineLength(marker: PrintMarker, lengthMm: number): PrintMarker {
  return marker.orientation === 'vertical'
    ? { ...marker, heightMm: lengthMm, widthMm: undefined }
    : { ...marker, widthMm: lengthMm, heightMm: undefined };
}

/**
 * The capability claims that follow from the markers: a profile with a fold
 * mark folds, one with a bleed mark bleeds. The address window and duplex
 * claims are about regions and surfaces, not markers, and stay as they are.
 */
export function capabilitiesFor(
  profile: Pick<PrintProfile, 'capabilities'>,
  markers: readonly PrintMarker[],
): ProfileCapabilities {
  return {
    ...profile.capabilities,
    foldMarks: markers.some((marker) => marker.kind === 'fold'),
    bleed: markers.some((marker) => marker.kind === 'bleed'),
  };
}
