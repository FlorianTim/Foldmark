import type { Folder } from '@/domain/document/Folder';

/** Persistence for the workspace folders (change 0024). */
export interface FolderRepository {
  get(id: string): Promise<Folder | null>;
  /** Every folder, in no particular order; the domain sorts by name. */
  list(): Promise<readonly Folder[]>;
  save(folder: Folder): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
