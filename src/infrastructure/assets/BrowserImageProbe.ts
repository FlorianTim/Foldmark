import type { ImageProbe, ProbedImage } from '@/application/ports/ImageProbe';

/**
 * Reading an image's real type and size.
 *
 * Two things here are deliberate:
 *
 * **The type comes from the bytes, not from the file.** `Blob.type` is whatever
 * the operating system inferred from a file extension, and an extension is
 * chosen by whoever made the file. The first few bytes of a PNG, a JPEG and a
 * WebP are unambiguous, so Foldmark reads those and ignores the claim. An SVG
 * renamed to `.png` fails here rather than reaching an `<img>` tag.
 *
 * **The size comes from decoding.** A PNG header can say 100 × 100 and expand
 * to 30 000 × 30 000; that is what a decompression bomb is. `createImageBitmap`
 * actually decodes, so the numbers it returns are the ones that would cost
 * memory. The caller enforces the ceilings — this only reports the truth.
 */
export class BrowserImageProbe implements ImageProbe {
  /** Bytes read to identify a format. Every supported signature fits in twelve. */
  private static readonly SIGNATURE_BYTES = 16;

  /**
   * Decodes one candidate file.
   *
   * @returns What the bytes actually are, or `null` when they are not a
   *   supported image.
   */
  public async probe(data: Blob): Promise<ProbedImage | null> {
    const mimeType = await BrowserImageProbe.sniff(data);
    if (!mimeType) return null;

    const size = await BrowserImageProbe.decodeSize(data);
    if (!size) return null;

    return { widthPx: size.widthPx, heightPx: size.heightPx, mimeType };
  }

  /** The MIME type the leading bytes identify, or `null` when unrecognized. */
  public static async sniff(data: Blob): Promise<string | null> {
    const header = new Uint8Array(
      await data.slice(0, BrowserImageProbe.SIGNATURE_BYTES).arrayBuffer(),
    );
    if (startsWith(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
    if (startsWith(header, [0xff, 0xd8, 0xff])) return 'image/jpeg';
    if (
      startsWith(header, [0x52, 0x49, 0x46, 0x46]) &&
      startsWith(header.subarray(8), [0x57, 0x45, 0x42, 0x50])
    ) {
      return 'image/webp';
    }
    return null;
  }

  /**
   * The decoded dimensions.
   *
   * `createImageBitmap` is the direct route and is what every current browser
   * takes. The `Image` fallback exists for environments that do not expose it —
   * notably the jsdom test environment — and reports the same numbers.
   */
  private static async decodeSize(
    data: Blob,
  ): Promise<{ widthPx: number; heightPx: number } | null> {
    if (typeof globalThis.createImageBitmap === 'function') {
      try {
        const bitmap = await globalThis.createImageBitmap(data);
        const size = { widthPx: bitmap.width, heightPx: bitmap.height };
        bitmap.close();
        return size;
      } catch {
        return null;
      }
    }

    if (typeof globalThis.Image !== 'function') return null;
    const url = URL.createObjectURL(data);
    try {
      return await new Promise((resolve) => {
        const image = new globalThis.Image();
        image.addEventListener('load', () =>
          resolve({ widthPx: image.naturalWidth, heightPx: image.naturalHeight }),
        );
        image.addEventListener('error', () => resolve(null));
        image.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}
