import { ImportRejectedError } from '@/application/errors/FoldmarkErrors';
import type { DocumentRepository } from '@/application/ports/DocumentRepository';
import type { FolderRepository } from '@/application/ports/FolderRepository';
import type { TemplateRepository } from '@/application/ports/TemplateRepository';
import { DocumentTemplateSchema, FolderSchema } from '@/domain/document/DocumentSchema';
import type {
  AddressRepository,
  AssetRepository,
  PrintProfileRepository,
} from '@/application/ports/LibraryRepositories';
import type { SettingsStore } from '@/application/ports/SettingsStore';
import {
  BACKUP_FORMAT_VERSION,
  type BackupAsset,
  type BackupPackage,
  type ImportMode,
  type ImportReport,
} from '@/application/ports/BackupPorts';
import type {
  CheckpointRepository,
  WorkingCopyStore,
} from '@/application/ports/HistoryRepositories';
import { canSend } from '@/domain/address/Address';
import { CheckpointSchema } from '@/domain/document/DocumentSchema';
import { AddressSchema, SenderProfileSchema } from '@/domain/address/AddressSchema';
import { addressFromLegacySender, type SenderProfile } from '@/domain/address/SenderProfile';
import { DocumentAssetSchema } from '@/domain/asset/DocumentAssetSchema';
import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import { FoldmarkDocumentSchema } from '@/domain/document/DocumentSchema';
import { PrintProfileSchema } from '@/domain/print/PrintProfileSchema';

/**
 * Export, import, inventory and deletion of everything stored locally.
 *
 * These four operations are the entire basis of the app's privacy claim, and
 * each has a rule that is easy to get wrong:
 *
 * - **Export must be complete.** A backup missing the address book is not a
 *   backup; it is a surprise on restore day.
 * - **Import must be per-record.** One malformed document must not abort the
 *   restore of five hundred good ones — every record is validated on its own
 *   and the rejected ones are reported.
 * - **Inventory must be honest.** The privacy view counts what is actually
 *   stored, by reading it, not by remembering what was written.
 * - **Deletion must be total.** "Delete my data" clears every table this app
 *   owns, and the caller can verify by asking for the inventory again.
 */
export class BackupService {
  public constructor(
    private readonly documents: DocumentRepository,
    private readonly addresses: AddressRepository,
    private readonly profiles: PrintProfileRepository,
    private readonly assets: AssetRepository,
    private readonly settings: SettingsStore,
    private readonly appVersion: string,
    private readonly history: {
      readonly checkpoints: CheckpointRepository;
      readonly workingCopies: WorkingCopyStore;
    },
    private readonly folders?: FolderRepository,
    private readonly templates?: TemplateRepository,
  ) {}

  /** What is stored right now, by category. */
  public async inventory(): Promise<DataInventory> {
    const [documents, addresses, profiles, assets, checkpoints, workingCopies] = await Promise.all([
      this.documents.list(),
      this.addresses.list(),
      this.profiles.list(),
      this.assets.list(),
      this.history.checkpoints.list(),
      this.history.workingCopies.list(),
    ]);
    return {
      documents: documents.length,
      addresses: addresses.length,
      senderProfiles: addresses.filter(canSend).length,
      printProfiles: profiles.length,
      assets: assets.length,
      assetBytes: assets.reduce((total, asset) => total + asset.byteSize, 0),
      checkpoints: checkpoints.length,
      workingCopies: workingCopies.length,
      folders: (await this.folders?.list())?.length ?? 0,
      templates: (await this.templates?.list())?.length ?? 0,
      settings: Object.keys(this.settings.snapshot()).length,
    };
  }

  /** Everything this installation holds, as one portable package. */
  public async exportAll(now = new Date()): Promise<BackupPackage> {
    const [documents, addresses, printProfiles, assetRecords, checkpoints] = await Promise.all([
      this.documents.list(),
      this.addresses.list(),
      this.profiles.list(),
      this.assets.list(),
      this.history.checkpoints.list(),
    ]);

    const assets: BackupAsset[] = [];
    for (const asset of assetRecords) {
      const data = await this.assets.data(asset.id);
      if (!data) continue;
      assets.push({ asset, dataBase64: await BackupService.toBase64(data) });
    }

    return {
      format: 'foldmark-backup',
      version: BACKUP_FORMAT_VERSION,
      exportedAt: now.toISOString(),
      appVersion: this.appVersion,
      documents: [...documents],
      addresses: [...addresses],
      printProfiles: [...printProfiles],
      assets,
      checkpoints: [...checkpoints],
      folders: [...((await this.folders?.list()) ?? [])],
      templates: [...((await this.templates?.list()) ?? [])],
      settings: this.settings.snapshot(),
    };
  }

  /**
   * Restores a package.
   *
   * @throws {ImportRejectedError} When the file is not a Foldmark backup, or
   *   was written by a format version this build cannot read.
   */
  public async importAll(candidate: unknown, mode: ImportMode = 'merge'): Promise<ImportReport> {
    const backup = BackupService.asBackup(candidate);

    if (mode === 'replace') await this.deleteAll();

    const issues: ValidationIssue[] = [];
    let documents = 0;
    let addresses = 0;
    let senderProfiles = 0;
    let printProfiles = 0;
    let assets = 0;
    let checkpoints = 0;

    for (const record of backup.documents ?? []) {
      const parsed = FoldmarkDocumentSchema.safeParse(record);
      if (!parsed.success) {
        issues.push(BackupService.rejected('document', parsed.error.issues[0]?.message));
        continue;
      }
      await this.documents.save(parsed.data as never);
      documents += 1;
    }

    for (const record of backup.addresses ?? []) {
      const parsed = AddressSchema.safeParse(record);
      if (!parsed.success) {
        issues.push(BackupService.rejected('address', parsed.error.issues[0]?.message));
        continue;
      }
      await this.addresses.save(parsed.data as never);
      addresses += 1;
    }

    // Pre-0006 backups: sender identities become sender-capable addresses.
    for (const record of backup.senderProfiles ?? []) {
      const parsed = SenderProfileSchema.safeParse(record);
      if (!parsed.success) {
        issues.push(BackupService.rejected('senderProfile', parsed.error.issues[0]?.message));
        continue;
      }
      await this.addresses.save(addressFromLegacySender(parsed.data as SenderProfile));
      senderProfiles += 1;
    }

    for (const record of backup.checkpoints ?? []) {
      const parsed = CheckpointSchema.safeParse(record);
      if (!parsed.success) {
        issues.push(BackupService.rejected('checkpoint', parsed.error.issues[0]?.message));
        continue;
      }
      await this.history.checkpoints.save(parsed.data as never);
      checkpoints += 1;
    }

    for (const record of backup.printProfiles ?? []) {
      const parsed = PrintProfileSchema.safeParse(record);
      // A backup may not reintroduce a built-in profile under its own id: the
      // shipped geometry is the app's, not the file's.
      if (!parsed.success || parsed.data.builtIn) {
        issues.push(BackupService.rejected('printProfile', parsed.error?.issues[0]?.message));
        continue;
      }
      await this.profiles.save(parsed.data as never);
      printProfiles += 1;
    }

    for (const record of backup.assets ?? []) {
      const parsed = DocumentAssetSchema.safeParse(record?.asset);
      if (!parsed.success || typeof record?.dataBase64 !== 'string') {
        issues.push(BackupService.rejected('asset', parsed.error?.issues[0]?.message));
        continue;
      }
      const data = BackupService.fromBase64(record.dataBase64, parsed.data.mimeType);
      if (!data || data.size !== parsed.data.byteSize) {
        issues.push(BackupService.rejected('asset', 'payload'));
        continue;
      }
      await this.assets.save({ asset: parsed.data as never, data });
      assets += 1;
    }

    let folders = 0;
    for (const record of backup.folders ?? []) {
      const parsed = FolderSchema.safeParse(record);
      if (!parsed.success) {
        issues.push(BackupService.rejected('folder', parsed.error.issues[0]?.message));
        continue;
      }
      await this.folders?.save(parsed.data as never);
      folders += 1;
    }

    let templates = 0;
    for (const record of backup.templates ?? []) {
      const parsed = DocumentTemplateSchema.safeParse(record);
      if (!parsed.success) {
        issues.push(BackupService.rejected('template', parsed.error.issues[0]?.message));
        continue;
      }
      await this.templates?.save(parsed.data as never);
      templates += 1;
    }

    const settings = backup.settings ? this.settings.restore(backup.settings) : 0;

    return {
      documents,
      addresses,
      senderProfiles,
      printProfiles,
      assets,
      checkpoints,
      folders,
      templates,
      settings,
      issues,
    };
  }

  /**
   * Removes every record this application owns.
   *
   * Preferences are deliberately **not** cleared here. The two destructive
   * actions have different blast radii — this one clears content, resetting
   * settings clears preferences — and merging them is how somebody loses the
   * wrong half.
   */
  /** Removes every document, its folders and its history; contacts and images stay. */
  public async deleteDocuments(): Promise<void> {
    await Promise.all([
      this.documents.clear(),
      this.folders?.clear(),
      this.history.checkpoints.clear(),
      this.history.workingCopies.clear(),
    ]);
  }

  /** Removes the contact directory. Documents keep their snapshots. */
  public deleteAddresses(): Promise<void> {
    return this.addresses.clear();
  }

  /** Removes every image. Documents that refer to one show a missing-image note. */
  public deleteAssets(): Promise<void> {
    return this.assets.clear();
  }

  /** Removes every template; documents made from them stay. */
  public async deleteTemplates(): Promise<void> {
    await this.templates?.clear();
  }

  /** Removes every saved version and automatic copy; the documents themselves stay. */
  public async deleteHistory(): Promise<void> {
    await Promise.all([this.history.checkpoints.clear(), this.history.workingCopies.clear()]);
  }

  public async deleteAll(): Promise<void> {
    await Promise.all([
      this.documents.clear(),
      this.addresses.clear(),
      this.profiles.clear(),
      this.assets.clear(),
      this.history.checkpoints.clear(),
      this.history.workingCopies.clear(),
      this.folders?.clear(),
      this.templates?.clear(),
    ]);
  }

  private static rejected(kind: string, detail?: string): ValidationIssue {
    return {
      severity: 'warning',
      code: 'backup.recordRejected',
      path: kind,
      params: detail ? { kind, detail: detail.slice(0, 120) } : { kind },
    };
  }

  private static asBackup(candidate: unknown): Partial<BackupPackage> {
    if (typeof candidate !== 'object' || candidate === null) {
      throw new ImportRejectedError('notAnObject');
    }
    const backup = candidate as Partial<BackupPackage>;
    if (backup.format !== 'foldmark-backup') throw new ImportRejectedError('wrongFormat');
    if (typeof backup.version !== 'number' || backup.version > BACKUP_FORMAT_VERSION) {
      throw new ImportRejectedError('unsupportedVersion');
    }
    return backup;
  }

  /** Base64 of a blob's bytes, chunked so a large asset cannot blow the call stack. */
  private static async toBase64(data: Blob): Promise<string> {
    const bytes = new Uint8Array(await data.arrayBuffer());
    const chunkSize = 0x8000;
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return globalThis.btoa(binary);
  }

  /** A blob from base64, or `null` when the payload is not decodable. */
  private static fromBase64(value: string, mimeType: string): Blob | null {
    try {
      const binary = globalThis.atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return new Blob([bytes], { type: mimeType });
    } catch {
      return null;
    }
  }
}

/** What is stored locally, by category — the numbers the privacy view shows. */
export interface DataInventory {
  readonly documents: number;
  readonly addresses: number;
  readonly senderProfiles: number;
  readonly printProfiles: number;
  readonly assets: number;
  readonly assetBytes: number;
  /** Durable document versions. */
  readonly checkpoints: number;
  /** Automatically written copies of open documents. */
  readonly workingCopies: number;
  readonly folders: number;
  readonly templates: number;
  readonly settings: number;
}
