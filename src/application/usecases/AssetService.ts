import { AssetRejectedError, NotFoundError } from '@/application/errors/FoldmarkErrors';
import type { ImageProbe } from '@/application/ports/ImageProbe';
import type { AssetRepository } from '@/application/ports/LibraryRepositories';
import type { DocumentRepository } from '@/application/ports/DocumentRepository';
import { createId } from '@/domain/common/Ids';
import {
  ASSET_MAX_BYTES,
  ASSET_MAX_EDGE_PX,
  ASSET_MAX_PIXELS,
  ASSET_MIN_EDGE_PX,
  isAllowedAssetType,
  type AssetKind,
  type DocumentAsset,
} from '@/domain/asset/DocumentAsset';
import { DocumentAssetSchema } from '@/domain/asset/DocumentAssetSchema';
import type { FoldmarkDocument } from '@/domain/document/FoldmarkDocument';

/**
 * Importing and managing local artwork.
 *
 * This is Foldmark's widest trust boundary: arbitrary bytes chosen by whoever
 * gave the user the file. The order of the checks is the point.
 *
 * 1. **Size before anything else** — refusing early is what keeps a
 *    multi-gigabyte file from being read into memory at all.
 * 2. **Declared type** against the allow-list, to reject obvious cases cheaply.
 * 3. **Decode**, and then trust *only* what the decoder reports. A file whose
 *    header says `image/png` and which decodes as something else is rejected
 *    on what it decoded to, and the pixel-count ceiling is what stops a
 *    decompression bomb — a 40 kB file that expands to a gigabyte of bitmap.
 *
 * Deletion is the mirror image: an asset in use is never removed silently. The
 * caller gets the list of documents that reference it and decides.
 */
export class AssetService {
  public constructor(
    private readonly assets: AssetRepository,
    private readonly probe: ImageProbe,
    private readonly documents: DocumentRepository,
  ) {}

  /** Every stored asset, without loading any bytes. */
  public list(): Promise<readonly DocumentAsset[]> {
    return this.assets.list();
  }

  /** One asset's metadata, or `null`. */
  public get(id: string): Promise<DocumentAsset | null> {
    return this.assets.get(id);
  }

  /** The bytes for one asset, or `null` when it is gone. */
  public data(id: string): Promise<Blob | null> {
    return this.assets.data(id);
  }

  /**
   * Validates and stores one imported file.
   *
   * @throws {AssetRejectedError} When the file fails any import rule. The
   *   reason is a translation-key suffix, so the UI can say which rule.
   */
  public async import(
    file: Blob,
    input: { kind: AssetKind; filename?: string; label?: string; title?: string },
    now = new Date(),
  ): Promise<DocumentAsset> {
    if (file.size === 0) throw new AssetRejectedError('empty');
    if (file.size > ASSET_MAX_BYTES) throw new AssetRejectedError('tooLarge');
    if (!isAllowedAssetType(file.type)) throw new AssetRejectedError('unsupportedType');

    const probed = await this.probe.probe(file);
    if (!probed) throw new AssetRejectedError('undecodable');
    if (!isAllowedAssetType(probed.mimeType)) throw new AssetRejectedError('unsupportedType');
    if (probed.widthPx < ASSET_MIN_EDGE_PX || probed.heightPx < ASSET_MIN_EDGE_PX) {
      throw new AssetRejectedError('tooSmall');
    }
    if (probed.widthPx > ASSET_MAX_EDGE_PX || probed.heightPx > ASSET_MAX_EDGE_PX) {
      throw new AssetRejectedError('dimensionsTooLarge');
    }
    if (probed.widthPx * probed.heightPx > ASSET_MAX_PIXELS) {
      throw new AssetRejectedError('pixelCountTooLarge');
    }

    const asset: DocumentAsset = {
      id: createId(),
      kind: input.kind,
      mimeType: probed.mimeType.toLowerCase(),
      byteSize: file.size,
      checksum: await AssetService.checksum(file),
      widthPx: probed.widthPx,
      heightPx: probed.heightPx,
      sourceFilename: input.filename?.slice(0, 255),
      label: input.label,
      title: (input.title ?? input.filename?.replace(/\.[a-z0-9]+$/iu, ''))?.slice(0, 120),
      createdAt: now.toISOString(),
    };

    const parsed = DocumentAssetSchema.safeParse(asset);
    if (!parsed.success) throw new AssetRejectedError('invalidMetadata');

    await this.assets.save({ asset, data: file });
    return asset;
  }

  /**
   * Changes an asset's title, description or kind — the metadata a person
   * maintains; the bytes and the measured facts stay (R13-030).
   *
   * @throws {NotFoundError} When the asset does not exist.
   * @throws {AssetRejectedError} When the result fails the schema.
   */
  public async updateMetadata(
    id: string,
    changes: { title?: string; description?: string; kind?: AssetKind },
  ): Promise<DocumentAsset> {
    const current = await this.assets.get(id);
    if (!current) throw new NotFoundError('asset');
    const next: DocumentAsset = {
      ...current,
      ...(changes.kind ? { kind: changes.kind } : {}),
      title: changes.title === undefined ? current.title : changes.title.trim() || undefined,
      description:
        changes.description === undefined
          ? current.description
          : changes.description.trim() || undefined,
    };
    const parsed = DocumentAssetSchema.safeParse(next);
    if (!parsed.success) throw new AssetRejectedError('invalidMetadata');
    const data = await this.assets.data(id);
    if (!data) throw new NotFoundError('asset');
    await this.assets.save({ asset: next, data });
    return next;
  }

  /**
   * The documents that would break if an asset were deleted.
   *
   * Reported before deletion rather than after: "3 documents use this image" is
   * a decision the user can make, and a missing background discovered at the
   * printer is not.
   */
  public async usage(assetId: string): Promise<readonly FoldmarkDocument[]> {
    const documents = await this.documents.list();
    return documents.filter((document) => AssetService.references(document, assetId));
  }

  /**
   * Removes one asset.
   *
   * @throws {NotFoundError} When the asset does not exist.
   */
  public async remove(id: string): Promise<void> {
    const asset = await this.assets.get(id);
    if (!asset) throw new NotFoundError('asset');
    await this.assets.delete(id);
  }

  /** Removes every stored asset. */
  public clear(): Promise<void> {
    return this.assets.clear();
  }

  /** Whether a document refers to an asset anywhere. */
  public static references(document: FoldmarkDocument, assetId: string): boolean {
    if (document.metadata.signatureId === assetId) return true;
    if (document.assetPlacements.some((placement) => placement.assetId === assetId)) return true;
    return Object.values(document.surfaces).some(
      (surface) => surface?.backgroundAssetId === assetId,
    );
  }

  /**
   * SHA-256 of the stored bytes, hex-encoded.
   *
   * Used to spot a file the user already imported, not for integrity against an
   * attacker: anything that can rewrite the blob can rewrite the checksum next
   * to it.
   */
  public static async checksum(data: Blob): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', await data.arrayBuffer());
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
}
