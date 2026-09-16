import { NotFoundError } from '@/application/errors/FoldmarkErrors';
import type { DocumentRepository } from '@/application/ports/DocumentRepository';
import type {
  CheckpointRepository,
  WorkingCopyStore,
} from '@/application/ports/HistoryRepositories';
import type { MarkdownDocumentCodec } from '@/application/ports/MarkdownDocumentCodec';
import { createId } from '@/domain/common/Ids';
import { reviseDocument, type FoldmarkDocument } from '@/domain/document/FoldmarkDocument';
import {
  automaticCheckpointDue,
  CHECKPOINTS_PER_DOCUMENT,
  createCheckpoint,
  DURABLE_CHECKPOINTS_PER_DOCUMENT,
  hasContentChanged,
  plainCopy,
  selectPrunable,
  type Checkpoint,
  type CheckpointOrigin,
  type WorkingCopy,
} from '@/domain/document/History';

/**
 * Working copies and checkpoints.
 *
 * The rule worth knowing: **restore never destroys the current version.** A
 * restore first takes a checkpoint of what is stored now, then replaces it, so
 * restoring is itself undoable through the same history. Bounds are enforced
 * on every write, which keeps the inventory honest without a background job.
 */
export class HistoryService {
  /**
   * @param retention How many automatic checkpoints to keep per document; read
   *   on every prune so a changed preference applies at once (R13-023). The
   *   durable bound for manual, imported and restore checkpoints stays fixed.
   */
  public constructor(
    private readonly documents: DocumentRepository,
    private readonly checkpoints: CheckpointRepository,
    private readonly workingCopies: WorkingCopyStore,
    private readonly codec: MarkdownDocumentCodec,
    private readonly retention: () => number = () => CHECKPOINTS_PER_DOCUMENT,
  ) {}

  // --- working copy --------------------------------------------------------

  /** Writes the working copy; overwrites the previous one. */
  public async saveWorkingCopy(document: FoldmarkDocument, now = new Date()): Promise<void> {
    await this.workingCopies.put({
      documentId: document.id,
      savedAt: now.toISOString(),
      document: plainCopy(document),
    });
  }

  /**
   * A working copy newer than the stored record, or `null`.
   *
   * "Newer" is decided by content, not by clock: a copy that says the same as
   * the record is not worth recovering.
   */
  public async recoverableCopy(document: FoldmarkDocument): Promise<WorkingCopy | null> {
    const copy = await this.workingCopies.get(document.id);
    if (!copy) return null;
    if (copy.savedAt <= document.updatedAt || !hasContentChanged(copy.document, document)) {
      await this.workingCopies.delete(document.id);
      return null;
    }
    return copy;
  }

  /** Drops the working copy after a save or an explicit discard. */
  public discardWorkingCopy(documentId: string): Promise<void> {
    return this.workingCopies.delete(documentId);
  }

  // --- checkpoints ---------------------------------------------------------

  /** Every checkpoint of a document, newest first. */
  public list(documentId: string): Promise<readonly Checkpoint[]> {
    return this.checkpoints.listFor(documentId);
  }

  /**
   * Takes a checkpoint unless the newest one already says the same.
   *
   * @returns The checkpoint, or `null` when nothing changed since the last one.
   */
  public async checkpoint(
    document: FoldmarkDocument,
    origin: CheckpointOrigin,
    now = new Date(),
  ): Promise<Checkpoint | null> {
    const existing = await this.checkpoints.listFor(document.id);
    const latest = existing[0] ?? null;
    if (latest && !hasContentChanged(latest.document, document)) return null;
    const checkpoint = createCheckpoint(document, origin, now);
    await this.checkpoints.save(checkpoint);
    await this.prune([checkpoint, ...existing]);
    return checkpoint;
  }

  /** The automatic rule: a checkpoint when enough editing time has passed since the newest. */
  public async checkpointIfDue(
    document: FoldmarkDocument,
    now = new Date(),
  ): Promise<Checkpoint | null> {
    const latest = (await this.checkpoints.listFor(document.id))[0] ?? null;
    if (!automaticCheckpointDue(latest, now)) return null;
    return this.checkpoint(document, 'automatic', now);
  }

  /**
   * Makes a checkpoint the current version.
   *
   * @throws {NotFoundError} When the checkpoint or its document is gone.
   */
  public async restore(checkpointId: string, now = new Date()): Promise<FoldmarkDocument> {
    const checkpoint = await this.checkpoints.get(checkpointId);
    if (!checkpoint) throw new NotFoundError('checkpoint');
    const current = await this.documents.get(checkpoint.documentId);
    if (!current) throw new NotFoundError('document');

    // Safety net first: what is stored now becomes a checkpoint of its own.
    await this.checkpoint(current, 'restore', now);

    const restored: FoldmarkDocument = {
      ...checkpoint.document,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: now.toISOString(),
    };
    await this.documents.save(restored);
    await this.workingCopies.delete(current.id);
    return restored;
  }

  /**
   * Opens a checkpoint as a new document, leaving the original untouched.
   *
   * @throws {NotFoundError} When the checkpoint is gone.
   */
  public async openAsCopy(
    checkpointId: string,
    title: string,
    now = new Date(),
  ): Promise<FoldmarkDocument> {
    const checkpoint = await this.checkpoints.get(checkpointId);
    if (!checkpoint) throw new NotFoundError('checkpoint');
    const timestamp = now.toISOString();
    const copy: FoldmarkDocument = reviseDocument(
      { ...checkpoint.document, id: createId(), createdAt: timestamp, updatedAt: timestamp },
      { title },
      now,
    );
    await this.documents.save(copy);
    return copy;
  }

  /** The portable text of a checkpoint, for download. */
  public async export(checkpointId: string): Promise<{ filename: string; content: string }> {
    const checkpoint = await this.checkpoints.get(checkpointId);
    if (!checkpoint) throw new NotFoundError('checkpoint');
    const stamp = checkpoint.createdAt.slice(0, 16).replace('T', ' ').replace(':', '-');
    return {
      filename: `${checkpoint.document.title || 'foldmark'} (${stamp})`,
      content: this.codec.encode(checkpoint.document),
    };
  }

  /** Removes every trace of a document's history, when the document itself goes. */
  public async forget(documentId: string): Promise<void> {
    await this.checkpoints.deleteFor(documentId);
    await this.workingCopies.delete(documentId);
  }

  private async prune(all: readonly Checkpoint[]): Promise<void> {
    const bounds = {
      perDocument: Math.max(1, this.retention()),
      durable: DURABLE_CHECKPOINTS_PER_DOCUMENT,
    };
    for (const id of selectPrunable(all, bounds)) await this.checkpoints.delete(id);
  }
}
