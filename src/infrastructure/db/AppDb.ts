import Dexie, { type EntityTable } from 'dexie';
import { searchIndexOf, type Address } from '@/domain/address/Address';
import { addressFromLegacySender, type SenderProfile } from '@/domain/address/SenderProfile';
import type { DocumentAsset } from '@/domain/asset/DocumentAsset';
import type { DocumentTemplate } from '@/domain/document/DocumentTemplate';
import type { Folder } from '@/domain/document/Folder';
import type { Checkpoint, WorkingCopy } from '@/domain/document/History';
import type { FoldmarkDocument } from '@/domain/document/FoldmarkDocument';
import type { PrintProfile } from '@/domain/print/PrintProfile';

/**
 * The local database.
 *
 * Two shape decisions are worth knowing about:
 *
 * **Asset bytes live in their own table.** IndexedDB returns whole records, so
 * keeping an eight-megabyte blob next to the metadata would mean loading every
 * image to render a list of filenames. Splitting them is what makes the asset
 * library open instantly.
 *
 * **Addresses carry a token index.** IndexedDB can seek a prefix but cannot
 * search a substring, so each address stores the lowercase words it should be
 * findable by in a `multiEntry` index. Search is then an indexed prefix seek
 * per term instead of a scan across five thousand records on every keystroke.
 *
 * Built-in print profiles are deliberately absent: they ship with the app, and
 * writing them here would make the shipped geometry depend on which version of
 * Foldmark first opened this browser profile.
 *
 * **Version 2** folds sender identities into the address book (change 0006).
 * The `senderProfiles` table stays declared so the upgrade can read it and
 * old backups can still be recognised; after the upgrade it is empty.
 *
 * **Version 3** adds document history: checkpoints, and one working copy per
 * document (changes 0008 and 0009). Both are their own tables so the saved
 * record is never half-written and both show up in the privacy inventory.
 *
 * **Version 4** adds folders and the document indexes for the file manager
 * (change 0024). No record is rewritten: a document without `folderId` lies
 * at the top level and one without `archived` is not archived, which is what
 * the schema defaults say on read. The upgrade is therefore idempotent and
 * safe to fail halfway.
 */

/** Longest search token kept; longer words are truncated rather than dropped. */
const TOKEN_MAX_LENGTH = 40;

/** Most tokens stored per address, so a pathological entry cannot bloat the index. */
const TOKEN_MAX_COUNT = 60;

/**
 * The lowercase words an address should be findable by.
 *
 * Stored rather than derived at query time: IndexedDB can seek a prefix in a
 * `multiEntry` index, and that is what turns "find every Müller in Bremen" into
 * two index seeks instead of a scan.
 */
export function searchTokens(address: Address): readonly string[] {
  const words = searchIndexOf(address)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((token) => token.slice(0, TOKEN_MAX_LENGTH));
  return [...new Set(words)].slice(0, TOKEN_MAX_COUNT);
}

/** An address plus the derived tokens it is searched by. */
export interface AddressRecord extends Address {
  /** Lowercase words from the display name, postal fields, email and tags. */
  readonly searchTokens: readonly string[];
}

/** The bytes of one asset, kept apart from its metadata. */
export interface AssetDataRecord {
  readonly id: string;
  readonly data: Blob;
}

/** Dexie database owned by the configured application slug. */
export class AppDb extends Dexie {
  /** Documents; the definite assignments are provided by Dexie at runtime. */
  public documents!: EntityTable<FoldmarkDocument, 'id'>;

  /** Address book entries with their search tokens. */
  public addresses!: EntityTable<AddressRecord, 'id'>;

  /** Pre-0006 sender identities; empty after the version-2 upgrade. */
  public senderProfiles!: EntityTable<SenderProfile, 'id'>;

  /** User-owned print profiles only. */
  public printProfiles!: EntityTable<PrintProfile, 'id'>;

  /** Asset metadata. */
  public assets!: EntityTable<DocumentAsset, 'id'>;

  /** Asset payloads, keyed by the same id. */
  public assetData!: EntityTable<AssetDataRecord, 'id'>;

  /** Durable document versions. */
  public checkpoints!: EntityTable<Checkpoint, 'id'>;

  /** One automatically written copy per open document. */
  public workingCopies!: EntityTable<WorkingCopy, 'documentId'>;

  /** Workspace folders (change 0024). */
  public folders!: EntityTable<Folder, 'id'>;

  /** Document templates (change 0039). */
  public templates!: EntityTable<DocumentTemplate, 'id'>;

  public constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({
      documents: 'id, updatedAt, kind, title',
      addresses: 'id, displayName, updatedAt, *searchTokens',
      senderProfiles: 'id, name',
      printProfiles: 'id, category, updatedAt',
      assets: 'id, kind, checksum, createdAt',
      assetData: 'id',
    });

    this.version(2)
      .stores({
        addresses: 'id, displayName, updatedAt, lastUsedAt, *roles, *searchTokens',
      })
      .upgrade(async (transaction) => {
        // Every sender identity becomes an address with the sender role, id
        // preserved so documents that reference it keep resolving. The first
        // one becomes primary when no address is primary yet. Addresses that
        // predate roles get the defaults the schema would apply on read.
        const addresses = transaction.table<AddressRecord, string>('addresses');
        const senders = transaction.table<SenderProfile, string>('senderProfiles');
        const existing = await addresses.toArray();
        let hasPrimary = existing.some((record) => record.roles?.includes('primary'));
        for (const record of existing) {
          if (!record.roles || !record.contactVisibility) {
            await addresses.put({
              ...record,
              roles: record.roles ?? ['normal'],
              contactVisibility: record.contactVisibility ?? {},
            });
          }
        }
        for (const profile of await senders.toArray()) {
          const base = addressFromLegacySender(profile);
          const address: Address = hasPrimary ? base : { ...base, roles: ['primary', 'sender'] };
          hasPrimary = true;
          await addresses.put({ ...address, searchTokens: searchTokens(address) });
        }
        await senders.clear();
      });

    this.version(3).stores({
      checkpoints: 'id, documentId, createdAt, [documentId+createdAt]',
      workingCopies: 'documentId, savedAt',
    });

    this.version(4).stores({
      documents: 'id, updatedAt, kind, title, folderId, archived, lastOpenedAt',
      folders: 'id, parentId, updatedAt',
    });

    this.version(5).stores({
      templates: 'id, name, kind, updatedAt',
    });
  }
}
