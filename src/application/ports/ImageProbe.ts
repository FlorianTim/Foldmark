/**
 * Reading an image's real dimensions.
 *
 * A port rather than a function, because the only honest way to learn how big
 * an image is, is to decode it — and decoding needs the browser. Keeping that
 * behind a port is what lets the import rules be unit-tested with a stub that
 * claims 30 000 × 30 000 pixels, which is the case that matters.
 *
 * The probe reports what it *found*, never what the file *claimed*. A PNG
 * header saying 100 × 100 is an assertion by whoever wrote the file.
 */

/** What decoding an image revealed. */
export interface ProbedImage {
  readonly widthPx: number;
  readonly heightPx: number;
  /** The type the decoder recognized, which may differ from the declared one. */
  readonly mimeType: string;
}

/** Decodes an image far enough to learn its true size and type. */
export interface ImageProbe {
  /**
   * Decodes one candidate file.
   *
   * @returns The decoded dimensions, or `null` when the bytes are not a
   *   supported image at all.
   */
  probe(data: Blob): Promise<ProbedImage | null>;
}
