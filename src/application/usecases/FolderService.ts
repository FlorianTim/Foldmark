import { InvalidInputError, NotFoundError } from '@/application/errors/FoldmarkErrors';
import type { DocumentRepository } from '@/application/ports/DocumentRepository';
import type { FolderRepository } from '@/application/ports/FolderRepository';
import { FolderSchema } from '@/domain/document/DocumentSchema';
import { createFolder, isWithin, subtree, type Folder } from '@/domain/document/Folder';

/**
 * Folder use cases (R13-025): create, rename, move, archive, restore, delete.
 *
 * The one rule with teeth is the cycle guard: a folder can never be moved
 * into itself or into one of its descendants, because a breadcrumb over a
 * cycle never ends. Deleting a folder moves its documents to the parent and
 * deletes its subfolders the same way — nothing a folder contained is ever
 * deleted with it.
 */
export class FolderService {
  /** How many folders one browser profile may hold. */
  public static readonly MAX_FOLDERS = 500;

  public constructor(
    private readonly folders: FolderRepository,
    private readonly documents: DocumentRepository,
  ) {}

  public list(): Promise<readonly Folder[]> {
    return this.folders.list();
  }

  /**
   * @throws {InvalidInputError} When the name is empty or the parent does not exist.
   */
  public async create(input: { name: string; parentId?: string }): Promise<Folder> {
    const all = await this.folders.list();
    if (all.length >= FolderService.MAX_FOLDERS) throw new InvalidInputError('folders');
    if (input.parentId && !all.some((folder) => folder.id === input.parentId)) {
      throw new InvalidInputError('parentId');
    }
    const folder = createFolder(input);
    this.assertValid(folder);
    await this.folders.save(folder);
    return folder;
  }

  public async rename(id: string, name: string, now = new Date()): Promise<Folder> {
    const current = await this.require(id);
    const next: Folder = { ...current, name: name.trim(), updatedAt: now.toISOString() };
    this.assertValid(next);
    await this.folders.save(next);
    return next;
  }

  /**
   * Moves a folder under another one, or to the top level.
   *
   * @throws {InvalidInputError} When the target is the folder itself or lies below it.
   */
  public async move(id: string, parentId: string | undefined, now = new Date()): Promise<Folder> {
    const current = await this.require(id);
    const all = await this.folders.list();
    if (parentId && isWithin(all, parentId, id)) throw new InvalidInputError('parentId');
    if (parentId && !all.some((folder) => folder.id === parentId)) {
      throw new InvalidInputError('parentId');
    }
    const next: Folder = {
      ...current,
      parentId: parentId || undefined,
      updatedAt: now.toISOString(),
    };
    if (!parentId) delete (next as { parentId?: string }).parentId;
    await this.folders.save(next);
    return next;
  }

  /** Archives or restores a folder; what lies inside follows through the path rule. */
  public async setArchived(id: string, archived: boolean, now = new Date()): Promise<Folder> {
    const current = await this.require(id);
    const next: Folder = { ...current, archived, updatedAt: now.toISOString() };
    await this.folders.save(next);
    return next;
  }

  /**
   * Deletes a folder. Its documents and subfolders move up to its parent
   * first, so a delete never takes content with it.
   */
  public async remove(id: string, now = new Date()): Promise<void> {
    const current = await this.require(id);
    const parentId = current.parentId;
    for (const document of await this.documents.list()) {
      if (document.folderId === id) {
        const moved = { ...document, folderId: parentId, updatedAt: now.toISOString() };
        if (!parentId) delete (moved as { folderId?: string }).folderId;
        await this.documents.save(moved);
      }
    }
    for (const folder of await this.folders.list()) {
      if (folder.parentId === id) await this.move(folder.id, parentId, now);
    }
    await this.folders.delete(id);
  }

  /** Every folder below one, itself included — for confirmations and for archiving views. */
  public async subtreeOf(id: string): Promise<readonly Folder[]> {
    return subtree(await this.folders.list(), id);
  }

  public clear(): Promise<void> {
    return this.folders.clear();
  }

  private async require(id: string): Promise<Folder> {
    const folder = await this.folders.get(id);
    if (!folder) throw new NotFoundError('folder');
    return folder;
  }

  private assertValid(folder: Folder): void {
    const parsed = FolderSchema.safeParse(folder);
    if (!parsed.success) throw new InvalidInputError(parsed.error.issues[0]?.path.join('.'));
  }
}
