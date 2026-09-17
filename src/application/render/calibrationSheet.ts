import type { RenderBlock, RenderPage } from '@/application/render/RenderPlan';
import type { PrintMarker } from '@/domain/print/PrintMarker';
import { markersFor, type PrintProfile } from '@/domain/print/PrintProfile';

/**
 * The calibration sheet (change 0043, R02-002): one page of known distances
 * for the profile's paper, so a person can hold a ruler against the print and
 * read their printer's offset and scale error off it.
 *
 * It is an ordinary {@link RenderPage} — markers and blocks in millimetres —
 * drawn by the same `PaperSurface` and the same print copy as a letter, so a
 * frame that lands at 10 mm here means a fold mark lands at 105 mm there.
 * No document is involved: the sheet belongs to the profile.
 *
 * What is on it:
 *
 * - a **frame** inset {@link CALIBRATION_INSET_MM} from every paper edge: the
 *   distance from the edge to the line is the printer's offset on that side;
 * - **ticks** every 10 mm along the frame's top and left edge, longer every
 *   50 mm and labelled, so the scale can be read against a ruler;
 * - a **centre cross** at the middle of the sheet;
 * - the profile's own **printed marks** (fold, hole, cut …) exactly where a
 *   letter would print them, and their coordinates as text.
 *
 * The wording is handed in by the caller: the application layer has no
 * language, and the sheet carries plain text only.
 */

/** How far the frame sits from every paper edge. */
export const CALIBRATION_INSET_MM = 10;

/** Text the sheet prints, worded by the presentation layer. */
export interface CalibrationWording {
  readonly title: string;
  /** The profile's name and paper size, e.g. "DIN A4 Brief – Form B · 210 × 297 mm". */
  readonly subtitle: string;
  /** Instruction lines as Markdown; `{inset}`, `{width}` and `{height}` are already filled. */
  readonly instructions: string;
  /** Heading above the list of the profile's printed marks; absent when the profile has none. */
  readonly marksHeading: string;
  /** One line per printed mark, already worded. */
  readonly markLines: readonly string[];
}

/** A tick spacing that keeps the sheet readable: 10 mm, longer every 50 mm. */
const TICK_MM = 10;
const MAJOR_TICK_MM = 50;
const TICK_LENGTH_MM = 3;
const MAJOR_TICK_LENGTH_MM = 5;
const CROSS_ARM_MM = 10;
const STROKE_MM = 0.25;

function line(
  id: string,
  xMm: number,
  yMm: number,
  orientation: 'horizontal' | 'vertical',
  lengthMm: number,
): PrintMarker {
  return {
    id,
    kind: 'custom',
    xMm,
    yMm,
    ...(orientation === 'horizontal' ? { widthMm: lengthMm } : { heightMm: lengthMm }),
    orientation,
    strokeWidthMm: STROKE_MM,
    lineStyle: 'solid',
    preview: true,
    print: true,
    surface: 'all',
    locked: true,
  };
}

/** The frame, the ticks and the centre cross for a sheet of the given size. */
export function calibrationMarkers(widthMm: number, heightMm: number): readonly PrintMarker[] {
  const inset = CALIBRATION_INSET_MM;
  const right = widthMm - inset;
  const bottom = heightMm - inset;
  const markers: PrintMarker[] = [
    line('cal-frame-top', inset, inset, 'horizontal', right - inset),
    line('cal-frame-bottom', inset, bottom, 'horizontal', right - inset),
    line('cal-frame-left', inset, inset, 'vertical', bottom - inset),
    line('cal-frame-right', right, inset, 'vertical', bottom - inset),
    line('cal-cross-h', widthMm / 2 - CROSS_ARM_MM, heightMm / 2, 'horizontal', CROSS_ARM_MM * 2),
    line('cal-cross-v', widthMm / 2, heightMm / 2 - CROSS_ARM_MM, 'vertical', CROSS_ARM_MM * 2),
  ];
  // Ticks measure from the frame's top-left corner, inward: a ruler laid along
  // the frame reads 0 at the corner and 100 at the "100" label.
  for (let distance = TICK_MM; inset + distance < right; distance += TICK_MM) {
    const length = distance % MAJOR_TICK_MM === 0 ? MAJOR_TICK_LENGTH_MM : TICK_LENGTH_MM;
    markers.push(line(`cal-tick-x-${distance}`, inset + distance, inset, 'vertical', length));
  }
  for (let distance = TICK_MM; inset + distance < bottom; distance += TICK_MM) {
    const length = distance % MAJOR_TICK_MM === 0 ? MAJOR_TICK_LENGTH_MM : TICK_LENGTH_MM;
    markers.push(line(`cal-tick-y-${distance}`, inset, inset + distance, 'horizontal', length));
  }
  return markers;
}

/** The labels next to the major ticks, as small caption blocks. */
function tickLabels(widthMm: number, heightMm: number): RenderBlock[] {
  const inset = CALIBRATION_INSET_MM;
  const blocks: RenderBlock[] = [];
  for (
    let distance = MAJOR_TICK_MM;
    inset + distance < widthMm - inset;
    distance += MAJOR_TICK_MM
  ) {
    blocks.push({
      kind: 'lines',
      region: 'calibration',
      box: {
        xMm: inset + distance - 6,
        yMm: inset + MAJOR_TICK_LENGTH_MM + 0.5,
        widthMm: 12,
        heightMm: 4,
      },
      lines: [String(distance)],
      style: 'caption',
    });
  }
  for (
    let distance = MAJOR_TICK_MM;
    inset + distance < heightMm - inset;
    distance += MAJOR_TICK_MM
  ) {
    blocks.push({
      kind: 'lines',
      region: 'calibration',
      box: {
        xMm: inset + MAJOR_TICK_LENGTH_MM + 1,
        yMm: inset + distance - 2,
        widthMm: 12,
        heightMm: 4,
      },
      lines: [String(distance)],
      style: 'caption',
    });
  }
  return blocks;
}

/**
 * The sheet for one profile. The profile's printed marks are drawn as a letter
 * would print them — the same filter the print copy uses — so their positions
 * can be checked with the same ruler.
 */
export function buildCalibrationPage(
  profile: PrintProfile,
  wording: CalibrationWording,
): RenderPage {
  const { widthMm, heightMm } = profile.page;
  const inset = CALIBRATION_INSET_MM;
  const textX = inset + 15;
  const textWidth = widthMm - textX - inset - 15;
  const profileMarks = markersFor(profile, 'front', 'print');
  const blocks: RenderBlock[] = [
    {
      kind: 'lines',
      region: 'calibration',
      box: { xMm: textX, yMm: inset + 15, widthMm: textWidth, heightMm: 10 },
      lines: [wording.title],
      style: 'subject',
    },
    {
      kind: 'lines',
      region: 'calibration',
      box: { xMm: textX, yMm: inset + 23, widthMm: textWidth, heightMm: 6 },
      lines: [wording.subtitle],
      style: 'meta',
    },
    {
      kind: 'markdown',
      region: 'calibration',
      box: { xMm: textX, yMm: inset + 32, widthMm: textWidth, heightMm: heightMm / 2 - inset - 45 },
      source: wording.instructions,
      style: 'body',
    },
    ...tickLabels(widthMm, heightMm),
  ];
  if (profileMarks.length && wording.markLines.length) {
    blocks.push({
      kind: 'lines',
      region: 'calibration',
      box: {
        xMm: textX,
        yMm: heightMm / 2 + 15,
        widthMm: textWidth,
        heightMm: Math.min(heightMm / 2 - inset - 25, 8 + wording.markLines.length * 5),
      },
      lines: [wording.marksHeading, ...wording.markLines],
      style: 'meta',
    });
  }
  return {
    index: 0,
    surface: 'front',
    page: profile.page,
    markers: [...calibrationMarkers(widthMm, heightMm), ...profileMarks],
    blocks,
  };
}
