/**
 * Physical units.
 *
 * Foldmark's whole promise is that a fold mark lands 105 mm from the top of a
 * real sheet of paper. That only holds if one unit is canonical everywhere and
 * conversion happens at the edges — so **millimetres are the domain unit**, and
 * pixels, points and CSS lengths exist only inside adapters.
 *
 * The type is a plain `number` rather than a branded type: these values are
 * serialized to JSON and YAML, read back from untrusted files, and compared
 * arithmetically in a hundred places. A brand would have to be stripped and
 * re-applied at every boundary, which is exactly where the mistakes are — so
 * the guarantee is enforced by {@link isValidMillimetres} and the Zod schemas
 * at those boundaries instead.
 */
export type Millimetres = number;

/**
 * The largest dimension any Foldmark geometry may take, in millimetres.
 *
 * Two metres is far beyond any paper a browser will print and still small
 * enough that a hostile profile cannot make the renderer allocate a page the
 * size of a building.
 */
export const MAX_MM = 2_000;

/**
 * The most negative coordinate a marker may take, in millimetres.
 *
 * Crop and bleed marks legitimately sit outside the trimmed page, so the lower
 * bound cannot be zero — but it is bounded, because "outside the page" is a
 * few centimetres, not an arbitrary offset.
 */
export const MIN_MM = -100;

/** Millimetres per PostScript point, for the PDF and print adapters. */
export const MM_PER_POINT = 25.4 / 72;

/** Whether a value is a finite millimetre measurement inside the supported range. */
export function isValidMillimetres(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_MM && value <= MAX_MM;
}

/** A rectangle in millimetres, measured from the top-left corner of a surface. */
export interface BoxMm {
  readonly xMm: Millimetres;
  readonly yMm: Millimetres;
  readonly widthMm: Millimetres;
  readonly heightMm: Millimetres;
}

/** A point in millimetres, measured from the top-left corner of a surface. */
export interface PointMm {
  readonly xMm: Millimetres;
  readonly yMm: Millimetres;
}

/** Page margins in millimetres. */
export interface MarginsMm {
  readonly topMm: Millimetres;
  readonly rightMm: Millimetres;
  readonly bottomMm: Millimetres;
  readonly leftMm: Millimetres;
}

/** A physical page size in millimetres, with the orientation it is meant to print in. */
export interface PageSizeMm {
  readonly widthMm: Millimetres;
  readonly heightMm: Millimetres;
  readonly orientation: 'portrait' | 'landscape';
}

/**
 * Rounds a millimetre value to the precision Foldmark stores and displays.
 *
 * Two decimals is 10 µm — an order of magnitude finer than any consumer
 * printer resolves, and coarse enough that `0.1 + 0.2` never reaches the UI.
 */
export function roundMm(value: Millimetres): Millimetres {
  return Math.round(value * 100) / 100;
}

/**
 * Formats a length as a CSS `mm` string for the print stylesheet.
 *
 * The renderer emits real CSS millimetres rather than pixels so the browser's
 * own print path — not Foldmark — performs the physical mapping. Screen zoom
 * is applied afterwards as a `transform`, which is why zooming cannot move a
 * mark on paper.
 */
export function cssMm(value: Millimetres): string {
  return `${roundMm(value)}mm`;
}

/** Converts millimetres to PostScript points, for PDF-producing adapters. */
export function mmToPoints(value: Millimetres): number {
  return value / MM_PER_POINT;
}

/** Converts PostScript points to millimetres. */
export function pointsToMm(value: number): Millimetres {
  return value * MM_PER_POINT;
}

/** Whether a box lies completely inside a page of the given size. */
export function isBoxInsidePage(box: BoxMm, page: PageSizeMm): boolean {
  return (
    box.xMm >= 0 &&
    box.yMm >= 0 &&
    box.xMm + box.widthMm <= page.widthMm + 0.01 &&
    box.yMm + box.heightMm <= page.heightMm + 0.01
  );
}

/** Whether two boxes overlap by more than a rounding artefact. */
export function boxesOverlap(first: BoxMm, second: BoxMm): boolean {
  const tolerance = 0.01;
  return (
    first.xMm + first.widthMm > second.xMm + tolerance &&
    second.xMm + second.widthMm > first.xMm + tolerance &&
    first.yMm + first.heightMm > second.yMm + tolerance &&
    second.yMm + second.heightMm > first.yMm + tolerance
  );
}

/** The content box of a page once its margins are subtracted. */
export function contentBox(page: PageSizeMm, margins: MarginsMm): BoxMm {
  return {
    xMm: margins.leftMm,
    yMm: margins.topMm,
    widthMm: page.widthMm - margins.leftMm - margins.rightMm,
    heightMm: page.heightMm - margins.topMm - margins.bottomMm,
  };
}
