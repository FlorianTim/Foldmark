import type { FoldmarkDocument } from '@/domain/document/FoldmarkDocument';
import { isArchivedPath, type Folder } from '@/domain/document/Folder';

/**
 * The document list as a file manager sees it (R13-024): what is shown in a
 * folder, in which order, and what counts as archived.
 */

/** The columns a list can be sorted by. */
export type DocumentSortKey = 'name' | 'updated' | 'opened' | 'kind';

/** A sort order: key and direction. */
export interface DocumentSort {
  readonly key: DocumentSortKey;
  readonly direction: 'asc' | 'desc';
}

/** The sort a fresh list opens with: newest change first. */
export const DEFAULT_DOCUMENT_SORT: DocumentSort = Object.freeze({
  key: 'updated',
  direction: 'desc',
});

/** Whether a document is out of the ordinary lists: its own flag or an archived folder. */
export function isArchivedDocument(
  document: FoldmarkDocument,
  folders: readonly Folder[],
): boolean {
  return document.archived === true || isArchivedPath(folders, document.folderId);
}

/**
 * The documents to show for one folder (or the top level) and one view.
 * The archive view lists everything archived, wherever it lies; the ordinary
 * view lists the documents of the current folder that are not archived.
 */
export function documentsIn(
  documents: readonly FoldmarkDocument[],
  folders: readonly Folder[],
  folderId: string | undefined,
  archive: boolean,
): readonly FoldmarkDocument[] {
  if (archive) return documents.filter((document) => isArchivedDocument(document, folders));
  return documents.filter(
    (document) =>
      !isArchivedDocument(document, folders) &&
      (folderId ? document.folderId === folderId : !document.folderId),
  );
}

/** A locale-aware comparator for one sort order. */
export function compareDocuments(
  sort: DocumentSort,
  locale: string,
): (left: FoldmarkDocument, right: FoldmarkDocument) => number {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  const sign = sort.direction === 'asc' ? 1 : -1;
  return (left, right) => {
    let result = 0;
    switch (sort.key) {
      case 'name':
        result = collator.compare(left.title, right.title);
        break;
      case 'kind':
        result =
          collator.compare(left.kind, right.kind) || collator.compare(left.title, right.title);
        break;
      case 'opened':
        result = (left.lastOpenedAt ?? left.updatedAt).localeCompare(
          right.lastOpenedAt ?? right.updatedAt,
        );
        break;
      default:
        result = left.updatedAt.localeCompare(right.updatedAt);
        break;
    }
    return result * sign;
  };
}

/** The size column: the body length, rounded to what people read as a file size. */
export function documentSizeLabel(document: FoldmarkDocument): string {
  const bytes = new TextEncoder().encode(document.bodyMarkdown).length;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} kB`;
}
