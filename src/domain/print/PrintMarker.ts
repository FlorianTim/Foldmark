import { isValidMillimetres, type BoxMm, type Millimetres } from '@/domain/common/Units';

/**
 * Print markers — the helper geometry Foldmark exists for.
 *
 * A marker is *not* document content. It belongs to the print profile, because
 * the same letter printed on a DIN-style profile and on blank A4 is the same
 * letter; only the sheet differs. Keeping the two apart is what makes "write
 * once, render for many physical targets" possible at all.
 *
 * Every marker carries **two independent visibilities**. `preview` is whether a
 * human sees it on screen, `print` is whether ink reaches the paper. They are
 * genuinely different questions: a safe area is a design aid that must never
 * print, a fold mark is a printed line that must survive into the PDF, and an
 * email PDF suppresses the printed ones while keeping the preview honest.
 */

/** What a marker means. The kind drives both its default rendering and its validation. */
export type MarkerKind =
  | 'fold'
  | 'hole'
  | 'cut'
  | 'bleed'
  | 'safe-area'
  | 'separator'
  | 'address-window'
  | 'stamp-area'
  | 'grid'
  | 'custom';

/** How a marker's line is drawn. */
export type MarkerLineStyle = 'solid' | 'dashed' | 'dotted';

/** Which printable side a marker applies to. */
export type SurfaceScope = 'all' | 'front' | 'back';

/** Marker kinds that describe a region rather than a line. */
export const REGION_MARKER_KINDS: readonly MarkerKind[] = [
  'bleed',
  'safe-area',
  'address-window',
  'stamp-area',
  'grid',
];

/** Marker kinds that carry a claim about what the profile physically supports. */
export const CAPABILITY_MARKER_KINDS: readonly MarkerKind[] = ['fold', 'hole', 'cut', 'bleed'];

/** One helper mark on one surface, positioned in millimetres from the top-left corner. */
export interface PrintMarker {
  readonly id: string;
  readonly kind: MarkerKind;
  /** Free-text label shown next to the marker in the profile editor. */
  readonly label?: string;
  readonly xMm: Millimetres;
  readonly yMm: Millimetres;
  readonly widthMm?: Millimetres;
  readonly heightMm?: Millimetres;
  readonly orientation: 'horizontal' | 'vertical';
  readonly strokeWidthMm: Millimetres;
  readonly lineStyle: MarkerLineStyle;
  /** Visible on screen. */
  readonly preview: boolean;
  /** Reaches the paper. */
  readonly print: boolean;
  readonly surface: SurfaceScope;
  /** Built-in markers are locked: editing one clones the whole profile first. */
  readonly locked: boolean;
}

/** Whether a marker describes a rectangular region instead of a line. */
export function isRegionMarker(marker: PrintMarker): boolean {
  return REGION_MARKER_KINDS.includes(marker.kind);
}

/**
 * The rectangle a marker occupies, so renderers do not each re-derive it.
 *
 * A line marker has no thickness in the geometry model — its stroke width is a
 * rendering property — so a horizontal line becomes a zero-height box. That
 * keeps bounds checks, overlap checks and the SVG/CSS renderers on one code
 * path instead of three.
 */
export function markerBounds(marker: PrintMarker): BoxMm {
  if (isRegionMarker(marker)) {
    return {
      xMm: marker.xMm,
      yMm: marker.yMm,
      widthMm: marker.widthMm ?? 0,
      heightMm: marker.heightMm ?? 0,
    };
  }
  const length = marker.widthMm ?? marker.heightMm ?? 0;
  return marker.orientation === 'vertical'
    ? { xMm: marker.xMm, yMm: marker.yMm, widthMm: 0, heightMm: marker.heightMm ?? length }
    : { xMm: marker.xMm, yMm: marker.yMm, widthMm: length, heightMm: marker.heightMm ?? 0 };
}

/** Whether every coordinate of a marker is a usable physical measurement. */
export function hasFiniteGeometry(marker: PrintMarker): boolean {
  const values = [marker.xMm, marker.yMm, marker.widthMm, marker.heightMm, marker.strokeWidthMm];
  return values.every((value) => value === undefined || isValidMillimetres(value));
}

/** Whether a marker applies to the surface currently being rendered. */
export function appliesToSurface(marker: PrintMarker, surface: SurfaceScope): boolean {
  return marker.surface === 'all' || surface === 'all' || marker.surface === surface;
}

/**
 * Default stroke width for a newly created marker, in millimetres.
 *
 * 0.2 mm is roughly the thinnest line a 600 dpi office printer reproduces
 * reliably; thinner values look correct in the preview and disappear on paper.
 */
export const DEFAULT_STROKE_WIDTH_MM = 0.2;
