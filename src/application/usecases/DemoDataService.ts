import { buildDemoDataSet } from '@/application/demo/demoData';
import type { DocumentRepository } from '@/application/ports/DocumentRepository';
import type { FolderRepository } from '@/application/ports/FolderRepository';
import type { AddressRepository, AssetRepository } from '@/application/ports/LibraryRepositories';

/**
 * Puts the demo data in and takes it out again (change 0026).
 *
 * Inserting is idempotent: every record has a fixed id, so a second insert
 * overwrites the first and nothing doubles. Removing deletes exactly the
 * records that carry `demoData: true` — never by id prefix alone and never
 * anything a person created — so a screenshot run can seed, shoot and clean
 * up without leaving a trace, and a developer can reset the set after
 * editing a demo letter by inserting again.
 */
export class DemoDataService {
  public constructor(
    private readonly documents: DocumentRepository,
    private readonly addresses: AddressRepository,
    private readonly assets: AssetRepository,
    private readonly folders: FolderRepository,
    private readonly checksum: (data: Blob) => Promise<string>,
  ) {}

  /** How many demo records are stored right now, by kind. */
  public async count(): Promise<DemoDataCount> {
    const [documents, addresses, assets, folders] = await Promise.all([
      this.documents.list(),
      this.addresses.list(),
      this.assets.list(),
      this.folders.list(),
    ]);
    return {
      documents: documents.filter((document) => document.demoData).length,
      contacts: addresses.filter((address) => address.demoData).length,
      assets: assets.filter((asset) => asset.demoData).length,
      folders: folders.filter((folder) => folder.demoData).length,
    };
  }

  /** Writes the whole set; existing demo records are replaced in place. */
  public async insert(): Promise<DemoDataCount> {
    const set = await buildDemoDataSet(this.checksum);
    for (const folder of set.folders) await this.folders.save(folder);
    for (const contact of set.contacts) await this.addresses.save(contact);
    await this.assets.save(set.asset);
    for (const document of set.documents) await this.documents.save(document);
    return this.count();
  }

  /** Deletes every record marked as demo data and nothing else. */
  public async remove(): Promise<DemoDataCount> {
    const [documents, addresses, assets, folders] = await Promise.all([
      this.documents.list(),
      this.addresses.list(),
      this.assets.list(),
      this.folders.list(),
    ]);
    for (const document of documents) {
      if (document.demoData) await this.documents.delete(document.id);
    }
    for (const address of addresses) {
      if (address.demoData) await this.addresses.delete(address.id);
    }
    for (const asset of assets) {
      if (asset.demoData) await this.assets.delete(asset.id);
    }
    for (const folder of folders) {
      if (folder.demoData) await this.folders.delete(folder.id);
    }
    return this.count();
  }
}

/** Demo records by kind. */
export interface DemoDataCount {
  readonly documents: number;
  readonly contacts: number;
  readonly assets: number;
  readonly folders: number;
}
