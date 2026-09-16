import type { FoldmarkDocument } from '@/domain/document/FoldmarkDocument';

/**
 * Persistence for documents.
 *
 * Deliberately small. Everything a repository could plausibly grow — search,
 * sorting rules, "recent" — either belongs to the use case that wants it or is
 * an index concern of the adapter. A port that mirrors the UI ends up with a
 * method per screen.
 */
export interface DocumentRepository {
  /** One document, or `null` when nothing is stored under that id. */
  get(id: string): Promise<FoldmarkDocument | null>;

  /** Every document, most recently changed first. */
  list(): Promise<readonly FoldmarkDocument[]>;

  /** Inserts or replaces one validated document. */
  save(document: FoldmarkDocument): Promise<void>;

  /** Removes one document. */
  delete(id: string): Promise<void>;

  /** Removes every document this application owns. */
  clear(): Promise<void>;
}
