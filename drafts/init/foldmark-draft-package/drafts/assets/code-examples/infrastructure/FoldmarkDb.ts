import Dexie, { type EntityTable } from 'dexie';

interface DocumentRecord { id: string; title: string; kind: string; updatedAt: string; payload: unknown }
interface AddressRecord { id: string; displayName: string; city?: string; postalCode?: string; payload: unknown }
interface AssetRecord { id: string; kind: string; mimeType: string; checksum: string; blob: Blob; createdAt: string }

export class FoldmarkDb extends Dexie {
  documents!: EntityTable<DocumentRecord, 'id'>;
  addresses!: EntityTable<AddressRecord, 'id'>;
  assets!: EntityTable<AssetRecord, 'id'>;

  constructor() {
    super('foldmark');
    this.version(1).stores({
      documents: 'id, title, kind, updatedAt',
      addresses: 'id, displayName, city, postalCode',
      assets: 'id, kind, mimeType, checksum, createdAt',
      settings: 'key',
      senderProfiles: 'id, name',
      printProfiles: 'id, category, updatedAt',
      consentAudit: '++sequence, capabilityId, timestamp',
    });
  }
}
