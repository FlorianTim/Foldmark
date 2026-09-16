import type { Address } from '@/domain/address/Address';
import type { DocumentAsset } from '@/domain/asset/DocumentAsset';
import type { PrintProfile } from '@/domain/print/PrintProfile';

/**
 * The supporting libraries a document draws on.
 *
 * Three ports in one file because they are one shape — a small keyed collection
 * with the same lifecycle — and splitting them across four files would have
 * produced three copies of the same six signatures without making any of them
 * easier to find.
 *
 * They stay three *types* rather than one generic `Repository<T>`: the asset
 * store hands out binary data and the print-profile store has to refuse to
 * store built-ins, and those differences are the interesting part.
 */

/** Persistence for the local address book. */
export interface AddressRepository {
  get(id: string): Promise<Address | null>;
  list(): Promise<readonly Address[]>;
  /** Addresses whose indexed text contains every term, most recently used first. */
  search(query: string, limit?: number): Promise<readonly Address[]>;
  save(address: Address): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Persistence for user-owned print profiles.
 *
 * Built-in profiles are *not* stored here. They ship with the application, and
 * writing them into the database would make "the profile the app shipped"
 * depend on when the user first opened it.
 */
export interface PrintProfileRepository {
  get(id: string): Promise<PrintProfile | null>;
  list(): Promise<readonly PrintProfile[]>;
  save(profile: PrintProfile): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

/** One stored asset: its metadata and its bytes. */
export interface StoredAsset {
  readonly asset: DocumentAsset;
  readonly data: Blob;
}

/**
 * Persistence for locally stored artwork.
 *
 * Metadata and bytes are read separately because almost every screen needs the
 * former and almost none need the latter — an asset list that loaded eight
 * megabytes of image data to show eight filenames is a slow app for no reason.
 */
export interface AssetRepository {
  get(id: string): Promise<DocumentAsset | null>;
  list(): Promise<readonly DocumentAsset[]>;
  /** The bytes for one asset, or `null` when the record is gone. */
  data(id: string): Promise<Blob | null>;
  save(stored: StoredAsset): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
