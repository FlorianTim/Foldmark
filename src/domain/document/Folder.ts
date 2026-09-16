import { createId } from '@/domain/common/Ids';

/**
 * Folders — how the workspace is organised (R13-024, R13-025).
 *
 * A folder is a name with an optional parent; documents point at a folder by
 * id. That is deliberately all: a folder carries no defaults yet (project
 * defaults are a 2.x idea, R13-033) and no content of its own. Renaming or
 * moving a folder is one write, because nothing else stores its path.
 *
 * Archiving hides without deleting: an archived folder takes everything
 * inside it out of the ordinary lists, and restoring it brings everything
 * back exactly as it was. The documents keep their own `archived` flag, so a
 * document archived on its own stays archived when its folder is restored.
 */

/** Longest folder name. */
export const FOLDER_NAME_MAX_LENGTH = 80;

/** Deepest nesting a folder tree may have; deeper trees are a sign of a cycle or a mistake. */
export const FOLDER_MAX_DEPTH = 8;

/** One folder. */
export interface Folder {
  readonly id: string;
  readonly name: string;
  /** The parent folder, or absent at the top level. */
  readonly parentId?: string;
  readonly archived: boolean;
  /** Set on records the demo-data manager created (change 0026). */
  readonly demoData?: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Creates a folder at the top level or under a parent. */
export function createFolder(
  input: { name: string; parentId?: string; id?: string; demoData?: boolean },
  now = new Date(),
): Folder {
  const timestamp = now.toISOString();
  return {
    id: input.id ?? createId(),
    name: input.name.trim().slice(0, FOLDER_NAME_MAX_LENGTH),
    ...(input.parentId ? { parentId: input.parentId } : {}),
    archived: false,
    ...(input.demoData ? { demoData: true } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** The folder with the given id, or `null`. */
export function findFolder(folders: readonly Folder[], id: string | undefined): Folder | null {
  return id ? (folders.find((folder) => folder.id === id) ?? null) : null;
}

/**
 * The path from the top level down to a folder, for a breadcrumb. A broken
 * parent link ends the path where it breaks rather than throwing: a folder
 * whose parent was deleted is shown at the top level, not lost.
 */
export function folderPath(folders: readonly Folder[], id: string | undefined): readonly Folder[] {
  const path: Folder[] = [];
  let current = findFolder(folders, id);
  const seen = new Set<string>();
  while (current && !seen.has(current.id) && path.length < FOLDER_MAX_DEPTH + 1) {
    seen.add(current.id);
    path.unshift(current);
    current = findFolder(folders, current.parentId);
  }
  return path;
}

/** Whether `candidateId` is `ancestorId` or lies below it — the cycle guard for moves. */
export function isWithin(
  folders: readonly Folder[],
  candidateId: string | undefined,
  ancestorId: string,
): boolean {
  return folderPath(folders, candidateId).some((folder) => folder.id === ancestorId);
}

/** Whether a folder or any of its ancestors is archived. */
export function isArchivedPath(folders: readonly Folder[], id: string | undefined): boolean {
  return folderPath(folders, id).some((folder) => folder.archived);
}

/** The direct children of a folder (or of the top level), by name. */
export function childFolders(
  folders: readonly Folder[],
  parentId: string | undefined,
  locale: string,
): readonly Folder[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  return folders
    .filter((folder) => (parentId ? folder.parentId === parentId : !folder.parentId))
    .slice()
    .sort((left, right) => collator.compare(left.name, right.name));
}

/** Every folder below `id`, at any depth, including `id` itself. */
export function subtree(folders: readonly Folder[], id: string): readonly Folder[] {
  const result: Folder[] = [];
  const queue = [id];
  const seen = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    const folder = findFolder(folders, current);
    if (folder) result.push(folder);
    for (const child of folders) if (child.parentId === current) queue.push(child.id);
  }
  return result;
}
