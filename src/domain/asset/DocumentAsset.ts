/**
 * Locally stored artwork.
 *
 * Images are the one place where Foldmark accepts a file a stranger produced,
 * so the rules here are deliberately narrow: a fixed list of raster types, a
 * size ceiling, and dimensions that must be read back from the *decoded* image
 * rather than believed from its header. A file that claims to be 100 × 100 and
 * decodes to 30 000 × 30 000 is a decompression bomb, and the header is exactly
 * where it lies.
 *
 * SVG is absent from the allowed types on purpose. An SVG is a document that
 * can carry script, external references and foreign objects; accepting one
 * safely means sanitizing or rasterizing it, which is a change of its own
 * rather than a line in a list. Until then, Foldmark says no.
 *
 * A stored signature is an *image of a signature*. It is not a qualified
 * electronic signature, carries no cryptographic meaning, and the UI has to say
 * so wherever it appears.
 */

/**
 * What an asset is used for. `qr-code` is prepared for the later generator
 * (R13-033): a stored raster of a code, nothing more, until then.
 */
export type AssetKind = 'image' | 'logo' | 'signature' | 'background' | 'qr-code';

/** Every kind, in the order the library offers them. */
export const ASSET_KINDS: readonly AssetKind[] = [
  'image',
  'logo',
  'signature',
  'background',
  'qr-code',
];

/** Image types Foldmark accepts. */
export const ALLOWED_ASSET_MIME_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
];

/** Largest accepted file, in bytes. */
export const ASSET_MAX_BYTES = 8 * 1024 * 1024;

/** Largest accepted decoded edge length, in pixels. */
export const ASSET_MAX_EDGE_PX = 12_000;

/** Largest accepted decoded pixel count, guarding against wide-and-short bombs. */
export const ASSET_MAX_PIXELS = 40_000_000;

/** Smallest decoded edge length that is worth storing, in pixels. */
export const ASSET_MIN_EDGE_PX = 8;

/** Metadata about one stored asset. The bytes live in the repository, not here. */
export interface DocumentAsset {
  readonly id: string;
  readonly kind: AssetKind;
  readonly mimeType: string;
  readonly byteSize: number;
  /** SHA-256 of the stored bytes, hex-encoded; used to detect duplicate imports. */
  readonly checksum: string;
  readonly widthPx: number;
  readonly heightPx: number;
  /** Filename as supplied, kept for display only and never used as a path. */
  readonly sourceFilename?: string;
  /** The 1.0 name of `title`, still read from stored records and backups. */
  readonly label?: string;
  /** A title of the user's choosing, independent of the filename (R13-030). */
  readonly title?: string;
  readonly description?: string;
  /** Set on the demo image the settings page can insert and remove again (change 0026). */
  readonly demoData?: boolean;
  readonly createdAt: string;
}

/** Longest title. */
export const ASSET_TITLE_MAX_LENGTH = 120;
/** Longest description. */
export const ASSET_DESCRIPTION_MAX_LENGTH = 500;

/** What the library shows for an asset: its title, else its label, else the filename, else the id. */
export function assetTitle(asset: DocumentAsset): string {
  return asset.title?.trim() || asset.label?.trim() || asset.sourceFilename?.trim() || asset.id;
}

/** Whether a MIME type is one Foldmark stores. */
export function isAllowedAssetType(mimeType: string): boolean {
  return ALLOWED_ASSET_MIME_TYPES.includes(mimeType.toLowerCase());
}

/** The physical size an asset would have at a given print resolution, in millimetres. */
export function intrinsicSizeMm(
  asset: DocumentAsset,
  dpi = 300,
): { widthMm: number; heightMm: number } {
  const mmPerInch = 25.4;
  return {
    widthMm: (asset.widthPx / dpi) * mmPerInch,
    heightMm: (asset.heightPx / dpi) * mmPerInch,
  };
}

/**
 * The effective resolution an asset reaches at a given printed width.
 *
 * The number people actually need: "my photo is 800 px wide and the postcard is
 * 148 mm" is 137 dpi, and that is visibly soft. Below {@link MIN_PRINT_DPI} the
 * export path warns.
 */
export function effectiveDpi(asset: DocumentAsset, printedWidthMm: number): number {
  if (printedWidthMm <= 0) return 0;
  return asset.widthPx / (printedWidthMm / 25.4);
}

/** Below this effective resolution, printed artwork looks soft. */
export const MIN_PRINT_DPI = 200;

/** The aspect-preserving height for a placement that only fixes the width. */
export function heightForWidth(asset: DocumentAsset, widthMm: number): number {
  if (asset.widthPx <= 0) return 0;
  return (asset.heightPx / asset.widthPx) * widthMm;
}
