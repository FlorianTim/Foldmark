import type { DocumentRepository } from '@/application/ports/DocumentRepository';
import type { FoldmarkDocument } from '@/domain/document/FoldmarkDocument';
import { FoldmarkDocumentSchema } from '@/domain/document/DocumentSchema';
import type { AppDb } from './AppDb';

/**
 * IndexedDB adapter for documents.
 *
 * Records are validated on the way **out** as well as on the way in. IndexedDB
 * is not a trust boundary the app controls: any script running on this origin
 * can write to it, and a browser extension or an earlier version of Foldmark
 * may already have. A record that fails the schema is dropped from the list
 * rather than allowed to reach the renderer with a `NaN` coordinate in it.
 *
 * Dropping rather than throwing is the deliberate half: one corrupted document
 * must not make the whole workspace unopenable.
 */
export class DexieDocumentRepository implements DocumentRepository {
  public constructor(private readonly db: AppDb) {}

  /** One document, or `null` when it is missing or does not survive validation. */
  public async get(id: string): Promise<FoldmarkDocument | null> {
    const record = await this.db.documents.get(id);
    if (!record) return null;
    const parsed = FoldmarkDocumentSchema.safeParse(record);
    return parsed.success ? (parsed.data as FoldmarkDocument) : null;
  }

  /** Every valid document, most recently changed first. */
  public async list(): Promise<readonly FoldmarkDocument[]> {
    const records = await this.db.documents.orderBy('updatedAt').reverse().toArray();
    return records
      .map((record) => FoldmarkDocumentSchema.safeParse(record))
      .filter((result) => result.success)
      .map((result) => result.data as FoldmarkDocument);
  }

  /** Validates a document immediately before persistence. */
  public async save(document: FoldmarkDocument): Promise<void> {
    await this.db.documents.put(FoldmarkDocumentSchema.parse(document) as FoldmarkDocument);
  }

  /** Deletes one document. */
  public async delete(id: string): Promise<void> {
    await this.db.documents.delete(id);
  }

  /** Clears the document table only. */
  public async clear(): Promise<void> {
    await this.db.documents.clear();
  }
}
