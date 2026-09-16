import type { DocumentRepository } from '@/application/ports/DocumentRepository';
import type { FolderRepository } from '@/application/ports/FolderRepository';
import type { TemplateRepository } from '@/application/ports/TemplateRepository';
import type { DocumentTemplate } from '@/domain/document/DocumentTemplate';
import type {
  CheckpointRepository,
  WorkingCopyStore,
} from '@/application/ports/HistoryRepositories';
import type {
  AddressRepository,
  AssetRepository,
  PrintProfileRepository,
  StoredAsset,
} from '@/application/ports/LibraryRepositories';
import type { ImageProbe, ProbedImage } from '@/application/ports/ImageProbe';
import type { SettingsStore } from '@/application/ports/SettingsStore';
import { searchIndexOf, type Address } from '@/domain/address/Address';
import type { DocumentAsset } from '@/domain/asset/DocumentAsset';
import type { Folder } from '@/domain/document/Folder';
import type { Checkpoint, WorkingCopy } from '@/domain/document/History';
import {
  createDocument,
  DEFAULT_EXPORT_PREFERENCES,
  type FoldmarkDocument,
} from '@/domain/document/FoldmarkDocument';
import type { PrintProfile } from '@/domain/print/PrintProfile';

/**
 * In-memory doubles for the ports.
 *
 * Deliberately real implementations rather than mocks: they store, they return
 * what was stored, and they order the way the Dexie adapters do. A service test
 * that passes against a mock returning `undefined` proves nothing about the
 * service; one that passes against these proves the logic.
 */

/** A document repository backed by a Map. */
export class FakeFolderRepository implements FolderRepository {
  public readonly records = new Map<string, Folder>();

  public async get(id: string): Promise<Folder | null> {
    return this.records.get(id) ?? null;
  }

  public async list(): Promise<readonly Folder[]> {
    return [...this.records.values()];
  }

  public async save(folder: Folder): Promise<void> {
    this.records.set(folder.id, folder);
  }

  public async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  public async clear(): Promise<void> {
    this.records.clear();
  }
}

/** A template repository backed by a Map (change 0039). */
export class FakeTemplateRepository implements TemplateRepository {
  public readonly records = new Map<string, DocumentTemplate>();

  public async get(id: string): Promise<DocumentTemplate | null> {
    return this.records.get(id) ?? null;
  }

  public async list(): Promise<readonly DocumentTemplate[]> {
    return [...this.records.values()];
  }

  public async save(template: DocumentTemplate): Promise<void> {
    this.records.set(template.id, template);
  }

  public async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  public async clear(): Promise<void> {
    this.records.clear();
  }
}

export class FakeDocumentRepository implements DocumentRepository {
  public readonly records = new Map<string, FoldmarkDocument>();

  public async get(id: string): Promise<FoldmarkDocument | null> {
    return this.records.get(id) ?? null;
  }

  public async list(): Promise<readonly FoldmarkDocument[]> {
    return [...this.records.values()].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  public async save(document: FoldmarkDocument): Promise<void> {
    this.records.set(document.id, document);
  }

  public async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  public async clear(): Promise<void> {
    this.records.clear();
  }
}

/** An address repository with the same substring search the UI expects. */
export class FakeAddressRepository implements AddressRepository {
  public readonly records = new Map<string, Address>();

  public async get(id: string): Promise<Address | null> {
    return this.records.get(id) ?? null;
  }

  public async list(): Promise<readonly Address[]> {
    return [...this.records.values()];
  }

  public async search(query: string, limit = 50): Promise<readonly Address[]> {
    const terms = query.toLowerCase().split(/\s+/u).filter(Boolean);
    return [...this.records.values()]
      .filter((address) => terms.every((term) => searchIndexOf(address).includes(term)))
      .slice(0, limit);
  }

  public async save(address: Address): Promise<void> {
    this.records.set(address.id, address);
  }

  public async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  public async clear(): Promise<void> {
    this.records.clear();
  }
}

/** A user-profile repository backed by a Map. Built-ins never reach it. */
export class FakePrintProfileRepository implements PrintProfileRepository {
  public readonly records = new Map<string, PrintProfile>();

  public async get(id: string): Promise<PrintProfile | null> {
    return this.records.get(id) ?? null;
  }

  public async list(): Promise<readonly PrintProfile[]> {
    return [...this.records.values()];
  }

  public async save(profile: PrintProfile): Promise<void> {
    this.records.set(profile.id, profile);
  }

  public async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  public async clear(): Promise<void> {
    this.records.clear();
  }
}

/** An asset repository that keeps metadata and bytes apart, like the real one. */
export class FakeAssetRepository implements AssetRepository {
  public readonly records = new Map<string, DocumentAsset>();
  public readonly payloads = new Map<string, Blob>();

  public async get(id: string): Promise<DocumentAsset | null> {
    return this.records.get(id) ?? null;
  }

  public async list(): Promise<readonly DocumentAsset[]> {
    return [...this.records.values()];
  }

  public async data(id: string): Promise<Blob | null> {
    return this.payloads.get(id) ?? null;
  }

  public async save(stored: StoredAsset): Promise<void> {
    this.records.set(stored.asset.id, stored.asset);
    this.payloads.set(stored.asset.id, stored.data);
  }

  public async delete(id: string): Promise<void> {
    this.records.delete(id);
    this.payloads.delete(id);
  }

  public async clear(): Promise<void> {
    this.records.clear();
    this.payloads.clear();
  }
}

/** A settings store backed by a plain object. */
export class FakeSettingsStore implements SettingsStore {
  public values: Record<string, string> = {};

  public snapshot(): Readonly<Record<string, string>> {
    return { ...this.values };
  }

  public restore(values: Readonly<Record<string, string>>): number {
    this.values = { ...this.values, ...values };
    return Object.keys(values).length;
  }

  public clear(): void {
    this.values = {};
  }
}

/**
 * An image probe that reports whatever the test tells it to.
 *
 * This is the point of the port: the decompression-bomb case is a probe that
 * claims 30 000 × 30 000 pixels, which no fixture file could produce.
 */
export class StubImageProbe implements ImageProbe {
  public constructor(private readonly result: ProbedImage | null) {}

  public async probe(): Promise<ProbedImage | null> {
    return this.result;
  }
}

/** A minimal letter, ready to be adapted per test. */
export function letterFixture(
  overrides: Partial<FoldmarkDocument> = {},
  now = new Date('2026-08-03T10:00:00.000Z'),
): FoldmarkDocument {
  const base = createDocument(
    {
      kind: 'letter',
      title: 'Antrag',
      locale: 'de-DE',
      printProfileId: 'din5008-b',
      bodyMarkdown: 'Sehr geehrte Damen und Herren,\n\nhiermit beantrage ich etwas.',
    },
    now,
  );
  return {
    ...base,
    metadata: {
      subject: 'Antrag auf Bescheinigung',
      date: '2026-08-03',
      recipient: {
        organization: 'Stadt Beispielstadt',
        street: 'Rathausplatz 1',
        postalCode: '12345',
        city: 'Beispielstadt',
        countryCode: 'DE',
      },
    },
    exportPreferences: DEFAULT_EXPORT_PREFERENCES,
    ...overrides,
  };
}

/** A checkpoint repository backed by a Map. */
export class FakeCheckpointRepository implements CheckpointRepository {
  public readonly records = new Map<string, Checkpoint>();

  public async get(id: string): Promise<Checkpoint | null> {
    return this.records.get(id) ?? null;
  }

  public async listFor(documentId: string): Promise<readonly Checkpoint[]> {
    return (await this.list()).filter((checkpoint) => checkpoint.documentId === documentId);
  }

  public async list(): Promise<readonly Checkpoint[]> {
    return [...this.records.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async save(checkpoint: Checkpoint): Promise<void> {
    this.records.set(checkpoint.id, checkpoint);
  }

  public async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  public async deleteFor(documentId: string): Promise<void> {
    for (const [id, checkpoint] of this.records) {
      if (checkpoint.documentId === documentId) this.records.delete(id);
    }
  }

  public async clear(): Promise<void> {
    this.records.clear();
  }
}

/** A working-copy store backed by a Map. */
export class FakeWorkingCopyStore implements WorkingCopyStore {
  public readonly records = new Map<string, WorkingCopy>();

  public async get(documentId: string): Promise<WorkingCopy | null> {
    return this.records.get(documentId) ?? null;
  }

  public async list(): Promise<readonly WorkingCopy[]> {
    return [...this.records.values()];
  }

  public async put(copy: WorkingCopy): Promise<void> {
    this.records.set(copy.documentId, copy);
  }

  public async delete(documentId: string): Promise<void> {
    this.records.delete(documentId);
  }

  public async clear(): Promise<void> {
    this.records.clear();
  }
}

/** The history pair the backup service takes. */
export function fakeHistory() {
  return { checkpoints: new FakeCheckpointRepository(), workingCopies: new FakeWorkingCopyStore() };
}
