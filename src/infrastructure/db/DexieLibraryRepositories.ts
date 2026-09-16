import type { FolderRepository } from '@/application/ports/FolderRepository';
import type { TemplateRepository } from '@/application/ports/TemplateRepository';
import { DocumentTemplateSchema } from '@/domain/document/DocumentSchema';
import type { DocumentTemplate } from '@/domain/document/DocumentTemplate';
import type {
  AddressRepository,
  AssetRepository,
  PrintProfileRepository,
  StoredAsset,
} from '@/application/ports/LibraryRepositories';
import { FolderSchema } from '@/domain/document/DocumentSchema';
import type { Folder } from '@/domain/document/Folder';
import type { Address } from '@/domain/address/Address';
import { AddressSchema } from '@/domain/address/AddressSchema';
import type { DocumentAsset } from '@/domain/asset/DocumentAsset';
import { DocumentAssetSchema } from '@/domain/asset/DocumentAssetSchema';
import type { PrintProfile } from '@/domain/print/PrintProfile';
import { PrintProfileSchema } from '@/domain/print/PrintProfileSchema';
import { searchTokens, type AddressRecord, type AppDb } from './AppDb';

export { searchTokens };

/**
 * IndexedDB adapters for the supporting libraries.
 *
 * All three validate on read as well as on write, and all three drop rather than
 * throw when a stored record no longer satisfies its schema — one bad row must
 * not take a screen down. See `DexieDocumentRepository` for why the read side
 * is a trust boundary at all.
 */

function toAddress(record: AddressRecord | undefined): Address | null {
  if (!record) return null;
  // The token index is a persistence detail and would fail the strict schema.
  const candidate: Record<string, unknown> = { ...record };
  delete candidate.searchTokens;
  const parsed = AddressSchema.safeParse(candidate);
  return parsed.success ? (parsed.data as Address) : null;
}

/** IndexedDB adapter for the address book. */
export class DexieAddressRepository implements AddressRepository {
  public constructor(private readonly db: AppDb) {}

  /** One address, or `null`. */
  public async get(id: string): Promise<Address | null> {
    return toAddress(await this.db.addresses.get(id));
  }

  /** Every valid address, most recently changed first. */
  public async list(): Promise<readonly Address[]> {
    const records = await this.db.addresses.orderBy('updatedAt').reverse().toArray();
    return records.map(toAddress).filter((address): address is Address => address !== null);
  }

  /**
   * Addresses matching every term in the query.
   *
   * Each term is an indexed prefix seek and the results are intersected, so
   * "mül bre" narrows the way a person expects rather than widening.
   */
  public async search(query: string, limit = 50): Promise<readonly Address[]> {
    const terms = query
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
      .slice(0, 8);
    if (terms.length === 0) return this.list();

    let matches = new Set<string>();
    for (const [index, term] of terms.entries()) {
      const keys = await this.db.addresses
        .where('searchTokens')
        .startsWithIgnoreCase(term)
        .primaryKeys();
      const ids = new Set<string>(keys.map((key) => String(key)));
      matches = index === 0 ? ids : new Set([...matches].filter((id) => ids.has(id)));
      if (matches.size === 0) return [];
    }

    const records = await this.db.addresses.bulkGet([...matches]);
    return records
      .map(toAddress)
      .filter((address): address is Address => address !== null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, limit);
  }

  /** Validates and stores one address together with its derived search tokens. */
  public async save(address: Address): Promise<void> {
    const validated = AddressSchema.parse(address) as Address;
    await this.db.addresses.put({ ...validated, searchTokens: searchTokens(validated) });
  }

  /** Deletes one address. */
  public async delete(id: string): Promise<void> {
    await this.db.addresses.delete(id);
  }

  /** Clears the address book. */
  public async clear(): Promise<void> {
    await this.db.addresses.clear();
  }
}

/** IndexedDB adapter for the workspace folders (change 0024). */
export class DexieFolderRepository implements FolderRepository {
  public constructor(private readonly db: AppDb) {}

  public async get(id: string): Promise<Folder | null> {
    const record = await this.db.folders.get(id);
    if (!record) return null;
    const parsed = FolderSchema.safeParse(record);
    return parsed.success ? (parsed.data as Folder) : null;
  }

  public async list(): Promise<readonly Folder[]> {
    const records = await this.db.folders.toArray();
    return records
      .map((record) => FolderSchema.safeParse(record))
      .filter((result) => result.success)
      .map((result) => result.data as Folder);
  }

  public async save(folder: Folder): Promise<void> {
    await this.db.folders.put(FolderSchema.parse(folder) as Folder);
  }

  public async delete(id: string): Promise<void> {
    await this.db.folders.delete(id);
  }

  public async clear(): Promise<void> {
    await this.db.folders.clear();
  }
}

/** IndexedDB adapter for user-owned print profiles. */
export class DexiePrintProfileRepository implements PrintProfileRepository {
  public constructor(private readonly db: AppDb) {}

  /** One user-owned profile, or `null`. */
  public async get(id: string): Promise<PrintProfile | null> {
    const record = await this.db.printProfiles.get(id);
    if (!record) return null;
    const parsed = PrintProfileSchema.safeParse(record);
    return parsed.success ? (parsed.data as PrintProfile) : null;
  }

  /** Every valid user-owned profile, most recently changed first. */
  public async list(): Promise<readonly PrintProfile[]> {
    const records = await this.db.printProfiles.orderBy('updatedAt').reverse().toArray();
    return records
      .map((record) => PrintProfileSchema.safeParse(record))
      .filter((result) => result.success)
      .map((result) => result.data as PrintProfile);
  }

  /** Validates and stores one user-owned profile. */
  public async save(profile: PrintProfile): Promise<void> {
    await this.db.printProfiles.put(PrintProfileSchema.parse(profile) as PrintProfile);
  }

  /** Deletes one user-owned profile. */
  public async delete(id: string): Promise<void> {
    await this.db.printProfiles.delete(id);
  }

  /** Clears every user-owned profile. Built-ins are unaffected. */
  public async clear(): Promise<void> {
    await this.db.printProfiles.clear();
  }
}

/** IndexedDB adapter for stored artwork, with metadata and bytes kept apart. */
export class DexieAssetRepository implements AssetRepository {
  public constructor(private readonly db: AppDb) {}

  /** One asset's metadata, or `null`. */
  public async get(id: string): Promise<DocumentAsset | null> {
    const record = await this.db.assets.get(id);
    if (!record) return null;
    const parsed = DocumentAssetSchema.safeParse(record);
    return parsed.success ? (parsed.data as DocumentAsset) : null;
  }

  /** Every valid asset record, newest first, without loading any bytes. */
  public async list(): Promise<readonly DocumentAsset[]> {
    const records = await this.db.assets.orderBy('createdAt').reverse().toArray();
    return records
      .map((record) => DocumentAssetSchema.safeParse(record))
      .filter((result) => result.success)
      .map((result) => result.data as DocumentAsset);
  }

  /** The bytes for one asset, or `null`. */
  public async data(id: string): Promise<Blob | null> {
    const record = await this.db.assetData.get(id);
    return record?.data ?? null;
  }

  /**
   * Stores metadata and bytes together.
   *
   * One transaction across both tables, so a crash cannot leave an asset the
   * library lists but cannot display.
   */
  public async save(stored: StoredAsset): Promise<void> {
    const validated = DocumentAssetSchema.parse(stored.asset) as DocumentAsset;
    await this.db.transaction('rw', this.db.assets, this.db.assetData, async () => {
      await this.db.assets.put(validated);
      await this.db.assetData.put({ id: validated.id, data: stored.data });
    });
  }

  /** Deletes metadata and bytes together. */
  public async delete(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.assets, this.db.assetData, async () => {
      await this.db.assets.delete(id);
      await this.db.assetData.delete(id);
    });
  }

  /** Clears every asset and its payload. */
  public async clear(): Promise<void> {
    await this.db.transaction('rw', this.db.assets, this.db.assetData, async () => {
      await this.db.assets.clear();
      await this.db.assetData.clear();
    });
  }
}

/** Templates in their own table (change 0039); every record is re-validated on read. */
export class DexieTemplateRepository implements TemplateRepository {
  public constructor(private readonly db: AppDb) {}

  public async get(id: string): Promise<DocumentTemplate | null> {
    const record = await this.db.templates.get(id);
    if (!record) return null;
    const parsed = DocumentTemplateSchema.safeParse(record);
    return parsed.success ? (parsed.data as DocumentTemplate) : null;
  }

  public async list(): Promise<readonly DocumentTemplate[]> {
    const records = await this.db.templates.toArray();
    return records
      .map((record) => DocumentTemplateSchema.safeParse(record))
      .filter((result) => result.success)
      .map((result) => result.data as DocumentTemplate);
  }

  public async save(template: DocumentTemplate): Promise<void> {
    await this.db.templates.put(DocumentTemplateSchema.parse(template) as DocumentTemplate);
  }

  public async delete(id: string): Promise<void> {
    await this.db.templates.delete(id);
  }

  public async clear(): Promise<void> {
    await this.db.templates.clear();
  }
}
