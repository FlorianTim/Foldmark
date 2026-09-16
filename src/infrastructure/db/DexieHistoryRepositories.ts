import type {
  CheckpointRepository,
  WorkingCopyStore,
} from '@/application/ports/HistoryRepositories';
import { CheckpointSchema, WorkingCopySchema } from '@/domain/document/DocumentSchema';
import type { Checkpoint, WorkingCopy } from '@/domain/document/History';
import type { AppDb } from './AppDb';

/**
 * IndexedDB adapters for document history.
 *
 * Validated on read like every other table: a checkpoint holds a whole
 * document, and a document that no longer satisfies the schema must not come
 * back through "restore" any more than through "open".
 */

/** IndexedDB adapter for checkpoints. */
export class DexieCheckpointRepository implements CheckpointRepository {
  public constructor(private readonly db: AppDb) {}

  public async get(id: string): Promise<Checkpoint | null> {
    const record = await this.db.checkpoints.get(id);
    if (!record) return null;
    const parsed = CheckpointSchema.safeParse(record);
    return parsed.success ? (parsed.data as Checkpoint) : null;
  }

  /** Newest first, via the compound index. */
  public async listFor(documentId: string): Promise<readonly Checkpoint[]> {
    const records = await this.db.checkpoints
      .where('[documentId+createdAt]')
      .between([documentId, ''], [documentId, '\uffff'])
      .reverse()
      .toArray();
    return records
      .map((record) => CheckpointSchema.safeParse(record))
      .filter((result) => result.success)
      .map((result) => result.data as Checkpoint);
  }

  public async list(): Promise<readonly Checkpoint[]> {
    const records = await this.db.checkpoints.orderBy('createdAt').reverse().toArray();
    return records
      .map((record) => CheckpointSchema.safeParse(record))
      .filter((result) => result.success)
      .map((result) => result.data as Checkpoint);
  }

  public async save(checkpoint: Checkpoint): Promise<void> {
    await this.db.checkpoints.put(CheckpointSchema.parse(checkpoint) as Checkpoint);
  }

  public async delete(id: string): Promise<void> {
    await this.db.checkpoints.delete(id);
  }

  public async deleteFor(documentId: string): Promise<void> {
    await this.db.checkpoints.where('documentId').equals(documentId).delete();
  }

  public async clear(): Promise<void> {
    await this.db.checkpoints.clear();
  }
}

/** IndexedDB adapter for working copies. */
export class DexieWorkingCopyStore implements WorkingCopyStore {
  public constructor(private readonly db: AppDb) {}

  public async get(documentId: string): Promise<WorkingCopy | null> {
    const record = await this.db.workingCopies.get(documentId);
    if (!record) return null;
    const parsed = WorkingCopySchema.safeParse(record);
    return parsed.success ? (parsed.data as WorkingCopy) : null;
  }

  public async list(): Promise<readonly WorkingCopy[]> {
    const records = await this.db.workingCopies.toArray();
    return records
      .map((record) => WorkingCopySchema.safeParse(record))
      .filter((result) => result.success)
      .map((result) => result.data as WorkingCopy);
  }

  public async put(copy: WorkingCopy): Promise<void> {
    await this.db.workingCopies.put(WorkingCopySchema.parse(copy) as WorkingCopy);
  }

  public async delete(documentId: string): Promise<void> {
    await this.db.workingCopies.delete(documentId);
  }

  public async clear(): Promise<void> {
    await this.db.workingCopies.clear();
  }
}
