import { describe, expect, it } from 'vitest';
import { DocumentService } from '@/application/usecases/DocumentService';
import { FolderService } from '@/application/usecases/FolderService';
import {
  compareDocuments,
  documentsIn,
  documentSizeLabel,
  isArchivedDocument,
} from '@/domain/document/documentList';
import {
  childFolders,
  createFolder,
  folderPath,
  isArchivedPath,
  isWithin,
  subtree,
} from '@/domain/document/Folder';
import { FoldmarkDocumentSchema } from '@/domain/document/DocumentSchema';
import { MarkdownDocumentCodecImpl } from '@/infrastructure/codec/MarkdownDocumentCodecImpl';
import { FakeDocumentRepository, FakeFolderRepository, letterFixture } from './helpers/fakes';

/** Change 0024: folders, archive and the file-manager list. */
describe('the folder tree', () => {
  const privat = createFolder({ name: 'Privat', id: 'privat' });
  const versicherungen = createFolder({ name: 'Versicherungen', id: 'vers', parentId: 'privat' });
  const rente = createFolder({ name: 'Rentenversicherung', id: 'rente', parentId: 'vers' });
  const arbeit = createFolder({ name: 'Arbeit', id: 'arbeit' });
  const folders = [privat, versicherungen, rente, arbeit];

  it('walks a breadcrumb up to the top and lists children by name', () => {
    expect(folderPath(folders, 'rente').map((folder) => folder.name)).toEqual([
      'Privat',
      'Versicherungen',
      'Rentenversicherung',
    ]);
    expect(folderPath(folders, undefined)).toEqual([]);
    expect(childFolders(folders, undefined, 'de').map((folder) => folder.name)).toEqual([
      'Arbeit',
      'Privat',
    ]);
    expect(subtree(folders, 'privat').map((folder) => folder.id)).toEqual([
      'privat',
      'vers',
      'rente',
    ]);
  });

  it('guards against cycles and survives a broken parent link', () => {
    expect(isWithin(folders, 'rente', 'privat')).toBe(true);
    expect(isWithin(folders, 'arbeit', 'privat')).toBe(false);
    const orphan = createFolder({ name: 'Waise', id: 'waise', parentId: 'gone' });
    expect(folderPath([...folders, orphan], 'waise').map((folder) => folder.id)).toEqual(['waise']);
  });

  it('archives a whole subtree through the path', () => {
    const archived = folders.map((folder) =>
      folder.id === 'privat' ? { ...folder, archived: true } : folder,
    );
    expect(isArchivedPath(archived, 'rente')).toBe(true);
    expect(isArchivedPath(archived, 'arbeit')).toBe(false);
    const inRente = letterFixture({ folderId: 'rente' });
    expect(isArchivedDocument(inRente, archived)).toBe(true);
    expect(documentsIn([inRente], archived, 'rente', false)).toEqual([]);
    expect(documentsIn([inRente], archived, undefined, true)).toEqual([inRente]);
  });
});

describe('the document list', () => {
  const older = letterFixture({ title: 'Beta' }, new Date('2026-01-01T10:00:00Z'));
  const newer = letterFixture(
    { title: 'alpha', kind: 'postcard' },
    new Date('2026-02-01T10:00:00Z'),
  );
  const opened = {
    ...letterFixture({ title: 'Gamma' }, new Date('2025-12-01T10:00:00Z')),
    lastOpenedAt: '2026-03-01T10:00:00.000Z',
  };

  it('sorts by name, change, opening and kind', () => {
    const byName = [older, newer].sort(compareDocuments({ key: 'name', direction: 'asc' }, 'de'));
    expect(byName.map((document) => document.title)).toEqual(['alpha', 'Beta']);
    const byUpdated = [older, newer].sort(
      compareDocuments({ key: 'updated', direction: 'desc' }, 'de'),
    );
    expect(byUpdated[0].title).toBe('alpha');
    const byOpened = [older, opened, newer].sort(
      compareDocuments({ key: 'opened', direction: 'desc' }, 'de'),
    );
    expect(byOpened[0].title).toBe('Gamma');
    const byKind = [newer, older].sort(compareDocuments({ key: 'kind', direction: 'asc' }, 'de'));
    expect(byKind.map((document) => document.kind)).toEqual(['letter', 'postcard']);
  });

  it('shows only the current folder outside the archive', () => {
    const top = letterFixture({ title: 'Oben' });
    const inFolder = letterFixture({ title: 'Drin', folderId: 'f1' });
    const archived = letterFixture({ title: 'Weg', archived: true });
    const folders = [createFolder({ name: 'F', id: 'f1' })];
    expect(documentsIn([top, inFolder, archived], folders, undefined, false)).toEqual([top]);
    expect(documentsIn([top, inFolder, archived], folders, 'f1', false)).toEqual([inFolder]);
    expect(documentsIn([top, inFolder, archived], folders, undefined, true)).toEqual([archived]);
    expect(documentSizeLabel(letterFixture({ bodyMarkdown: 'ab' }))).toBe('2 B');
  });

  it('keeps folder, archive and opened stamps out of the portable file', () => {
    const codec = new MarkdownDocumentCodecImpl();
    const document = {
      ...letterFixture({ folderId: 'f1', archived: true }),
      lastOpenedAt: '2026-01-01T00:00:00.000Z',
    };
    const text = codec.encode(document);
    expect(text).not.toContain('folderId');
    expect(text).not.toContain('archived');
    expect(text).not.toContain('lastOpenedAt');
    // A 1.0 record without the fields still validates.
    expect(FoldmarkDocumentSchema.safeParse(letterFixture()).success).toBe(true);
  });
});

describe('FolderService', () => {
  function setup() {
    const folders = new FakeFolderRepository();
    const documents = new FakeDocumentRepository();
    return {
      folders,
      documents,
      service: new FolderService(folders, documents),
      documentService: new DocumentService(documents, new MarkdownDocumentCodecImpl()),
    };
  }

  it('creates, renames, moves and refuses a cycle (AC-WORK-004)', async () => {
    const { service } = setup();
    const privat = await service.create({ name: 'Privat' });
    const vers = await service.create({ name: 'Versicherungen', parentId: privat.id });
    await expect(service.move(privat.id, vers.id)).rejects.toThrow();
    await expect(service.move(privat.id, privat.id)).rejects.toThrow();
    const renamed = await service.rename(vers.id, 'Policen');
    expect(renamed.name).toBe('Policen');
    const moved = await service.move(vers.id, undefined);
    expect(moved.parentId).toBeUndefined();
    await expect(service.create({ name: '   ' })).rejects.toThrow();
    await expect(service.create({ name: 'X', parentId: 'nope' })).rejects.toThrow();
  });

  it('deletes a folder without deleting what it held', async () => {
    const { service, documentService, documents } = setup();
    const top = await service.create({ name: 'Oben' });
    const inner = await service.create({ name: 'Innen', parentId: top.id });
    const document = await documentService.create({
      kind: 'letter',
      title: 'Brief',
      locale: 'de-DE',
      printProfileId: 'din5008-b',
    });
    await documentService.move(document.id, inner.id);
    await service.remove(inner.id);
    expect((await documents.get(document.id))?.folderId).toBe(top.id);
    expect(await service.list()).toHaveLength(1);
    await service.remove(top.id);
    expect((await documents.get(document.id))?.folderId).toBeUndefined();
  });

  it('archives and restores documents and folders (AC-WORK-003)', async () => {
    const { service, documentService, documents } = setup();
    const document = await documentService.create({
      kind: 'letter',
      title: 'Brief',
      locale: 'de-DE',
      printProfileId: 'din5008-b',
    });
    await documentService.setArchived(document.id, true);
    expect((await documents.get(document.id))?.archived).toBe(true);
    await documentService.setArchived(document.id, false);
    expect((await documents.get(document.id))?.archived).toBe(false);
    const folder = await service.create({ name: 'Alt' });
    expect((await service.setArchived(folder.id, true)).archived).toBe(true);
    // Opening is not an edit: the modification time does not move.
    const before = (await documents.get(document.id))!.updatedAt;
    await documentService.touchOpened(document.id, new Date('2030-01-01T00:00:00Z'));
    const after = (await documents.get(document.id))!;
    expect(after.lastOpenedAt).toBe('2030-01-01T00:00:00.000Z');
    expect(after.updatedAt).toBe(before);
  });
});
