import {
  cropToInk,
  SIGNATURE_PEN_WIDTH_PX,
  SIGNATURE_RASTER_SCALE,
  smoothPath,
  type Stroke,
} from '@/domain/asset/signatureStrokes';

/**
 * Drawing signature strokes onto a canvas (change 0046): the pad on screen
 * and the stored image use this one function, so what the person saw is what
 * the letter prints, at a higher resolution.
 */
export function drawStrokes(
  context: CanvasRenderingContext2D,
  strokes: readonly Stroke[],
  options: { readonly scale?: number; readonly color?: string; readonly penWidth?: number } = {},
): void {
  const scale = options.scale ?? 1;
  const penWidth = options.penWidth ?? SIGNATURE_PEN_WIDTH_PX;
  context.save();
  context.scale(scale, scale);
  context.lineWidth = penWidth;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = options.color ?? '#000';
  context.fillStyle = context.strokeStyle;
  for (const stroke of strokes) {
    const first = stroke[0];
    if (!first) continue;
    if (stroke.length === 1) {
      // A tap: a dot the width of the pen.
      context.beginPath();
      context.arc(first.x, first.y, penWidth / 2, 0, Math.PI * 2);
      context.fill();
      continue;
    }
    context.beginPath();
    context.moveTo(first.x, first.y);
    if (stroke.length === 2) {
      context.lineTo(stroke[1]!.x, stroke[1]!.y);
    } else {
      const second = stroke[1]!;
      context.lineTo((first.x + second.x) / 2, (first.y + second.y) / 2);
      for (const segment of smoothPath(stroke)) {
        context.quadraticCurveTo(segment.control.x, segment.control.y, segment.to.x, segment.to.y);
      }
      const last = stroke.at(-1)!;
      context.lineTo(last.x, last.y);
    }
    context.stroke();
  }
  context.restore();
}

/**
 * The signature as a PNG with a transparent background, cropped to the ink
 * with a margin and scaled up so it prints crisply. `null` without ink or
 * where the browser cannot encode a canvas.
 */
export async function rasterizeSignature(
  strokes: readonly Stroke[],
  scale = SIGNATURE_RASTER_SCALE,
): Promise<{ readonly blob: Blob; readonly widthPx: number; readonly heightPx: number } | null> {
  const cropped = cropToInk(strokes);
  if (!cropped) return null;
  const canvas = globalThis.document.createElement('canvas');
  canvas.width = Math.round(cropped.width * scale);
  canvas.height = Math.round(cropped.height * scale);
  const context = canvas.getContext('2d');
  if (!context) return null;
  drawStrokes(context, cropped.strokes, { scale });
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/png');
  });
  return blob ? { blob, widthPx: canvas.width, heightPx: canvas.height } : null;
}
