import type { Checkpoint, WorkingCopy } from '@/domain/document/History';

/**
 * Persistence for document history.
 *
 * Two ports, because the two records have different lifecycles: a working copy
 * is one row per document that is overwritten and cleared, a checkpoint is
 * append-only until pruned. A store that pretended they were the same table
 * would have to explain why one of them has a delete-by-document and the
 * other has a count.
 */

/** Persistence for checkpoints. */
export interface CheckpointRepository {
  get(id: string): Promise<Checkpoint | null>;
  /** Every checkpoint of one document, newest first. */
  listFor(documentId: string): Promise<readonly Checkpoint[]>;
  /** Every checkpoint, for backup and inventory. */
  list(): Promise<readonly Checkpoint[]>;
  save(checkpoint: Checkpoint): Promise<void>;
  delete(id: string): Promise<void>;
  deleteFor(documentId: string): Promise<void>;
  clear(): Promise<void>;
}

/** Persistence for working copies. */
export interface WorkingCopyStore {
  get(documentId: string): Promise<WorkingCopy | null>;
  list(): Promise<readonly WorkingCopy[]>;
  put(copy: WorkingCopy): Promise<void>;
  delete(documentId: string): Promise<void>;
  clear(): Promise<void>;
}
