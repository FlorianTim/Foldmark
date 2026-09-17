/**
 * A hand-drawn signature as geometry (change 0046, R02-003): the strokes a
 * pen, finger or mouse left on the pad, in pad pixels, before they become an
 * image. Keeping the geometry pure means undo, bounds and the crop are unit
 * tests, and the canvas only draws what is decided here.
 */

/** One sample of a stroke, in pad pixels from the top-left corner. */
export interface StrokePoint {
  readonly x: number;
  readonly y: number;
}

/** One continuous movement from pen-down to pen-up. */
export type Stroke = readonly StrokePoint[];

/** The pen's width on the pad, in pad pixels; the image scales it with everything else. */
export const SIGNATURE_PEN_WIDTH_PX = 2.5;

/** Blank space kept around the ink when the signature is cropped, in pad pixels. */
export const SIGNATURE_PADDING_PX = 16;

/** How many image pixels one pad pixel becomes, so the stored image prints crisply. */
export const SIGNATURE_RASTER_SCALE = 3;

/** Longest a single stroke may get; a pad is not a drawing board. */
export const SIGNATURE_STROKE_MAX_POINTS = 4_000;

/** Most strokes one signature may hold. */
export const SIGNATURE_MAX_STROKES = 200;

/** Samples closer than this to the previous one carry no information and are dropped. */
const MIN_SAMPLE_DISTANCE_PX = 0.75;

/** Adds a sample to a stroke, dropping jitter and honouring the length bound. */
export function appendPoint(stroke: Stroke, point: StrokePoint): Stroke {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return stroke;
  if (stroke.length >= SIGNATURE_STROKE_MAX_POINTS) return stroke;
  const last = stroke.at(-1);
  if (last && Math.hypot(point.x - last.x, point.y - last.y) < MIN_SAMPLE_DISTANCE_PX) {
    return stroke;
  }
  return [...stroke, point];
}

/** Whether there is any ink at all: a lone tap counts, an empty pad does not. */
export function hasInk(strokes: readonly Stroke[]): boolean {
  return strokes.some((stroke) => stroke.length > 0);
}

/** The rectangle the ink occupies, including the pen width; `null` without ink. */
export function inkBounds(
  strokes: readonly Stroke[],
  penWidth = SIGNATURE_PEN_WIDTH_PX,
): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const stroke of strokes) {
    for (const point of stroke) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  if (!Number.isFinite(minX)) return null;
  const half = penWidth / 2;
  return {
    x: minX - half,
    y: minY - half,
    width: maxX - minX + penWidth,
    height: maxY - minY + penWidth,
  };
}

/**
 * The strokes moved so the ink sits at the padding's distance from the
 * top-left corner, plus the size of the sheet that holds them. The stored
 * image is cropped to the signature, not to the pad — a person who signs in
 * one corner of the pad gets a signature, not a mostly empty rectangle.
 */
export function cropToInk(
  strokes: readonly Stroke[],
  padding = SIGNATURE_PADDING_PX,
  penWidth = SIGNATURE_PEN_WIDTH_PX,
): { readonly strokes: readonly Stroke[]; readonly width: number; readonly height: number } | null {
  const bounds = inkBounds(strokes, penWidth);
  if (!bounds) return null;
  const dx = padding - bounds.x;
  const dy = padding - bounds.y;
  return {
    strokes: strokes
      .filter((stroke) => stroke.length > 0)
      .map((stroke) => stroke.map((point) => ({ x: point.x + dx, y: point.y + dy }))),
    width: Math.ceil(bounds.width + 2 * padding),
    height: Math.ceil(bounds.height + 2 * padding),
  };
}

/**
 * The midpoints a smooth curve passes through: each segment is drawn as a
 * quadratic curve from one midpoint to the next with the sample as control
 * point, which rounds the corners a mouse leaves without lagging behind the
 * pen. Returned as data so the canvas and a test see the same path.
 */
export function smoothPath(
  stroke: Stroke,
): readonly { readonly control: StrokePoint; readonly to: StrokePoint }[] {
  if (stroke.length < 3) return [];
  const segments: { control: StrokePoint; to: StrokePoint }[] = [];
  for (let index = 1; index < stroke.length - 1; index += 1) {
    const current = stroke[index]!;
    const next = stroke[index + 1]!;
    segments.push({
      control: current,
      to: { x: (current.x + next.x) / 2, y: (current.y + next.y) / 2 },
    });
  }
  return segments;
}
