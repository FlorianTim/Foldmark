import { z } from 'zod';
import { boundedText, IdSchema, TimestampSchema } from '@/domain/common/Schemas';
import {
  ALLOWED_ASSET_MIME_TYPES,
  ASSET_DESCRIPTION_MAX_LENGTH,
  ASSET_MAX_BYTES,
  ASSET_MAX_EDGE_PX,
  ASSET_TITLE_MAX_LENGTH,
} from '@/domain/asset/DocumentAsset';

/**
 * Runtime schema for stored artwork.
 *
 * The MIME type is checked against the allow-list here rather than only at
 * import, because the record is read back out of IndexedDB — where a script on
 * the same origin could have written `image/svg+xml` into it — before its bytes
 * are handed to an `<img>` element.
 */

/** What an asset is used for. */
export const AssetKindSchema = z.enum(['image', 'logo', 'signature', 'background', 'qr-code']);

/** Metadata about one stored asset. */
export const DocumentAssetSchema = z
  .object({
    id: IdSchema,
    kind: AssetKindSchema,
    mimeType: z
      .string()
      .refine(
        (value) => ALLOWED_ASSET_MIME_TYPES.includes(value.toLowerCase()),
        'Unsupported image type.',
      ),
    byteSize: z.number().int().min(1).max(ASSET_MAX_BYTES),
    checksum: z.string().regex(/^[0-9a-f]{64}$/u),
    widthPx: z.number().int().min(1).max(ASSET_MAX_EDGE_PX),
    heightPx: z.number().int().min(1).max(ASSET_MAX_EDGE_PX),
    sourceFilename: boundedText(255).optional(),
    label: boundedText(120).optional(),
    title: boundedText(ASSET_TITLE_MAX_LENGTH).optional(),
    description: boundedText(ASSET_DESCRIPTION_MAX_LENGTH).optional(),
    demoData: z.boolean().optional(),
    createdAt: TimestampSchema,
  })
  .strict();

/** Every stored asset record. */
export const DocumentAssetListSchema = z.array(DocumentAssetSchema);
