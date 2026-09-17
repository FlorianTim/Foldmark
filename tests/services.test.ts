import { describe, expect, it } from 'vitest';
import {
  AssetRejectedError,
  ImmutableRecordError,
  ImportRejectedError,
  InvalidInputError,
  LimitReachedError,
  NotFoundError,
} from '@/application/errors/FoldmarkErrors';
import { AddressBookService } from '@/application/usecases/AddressBookService';
import { AssetService } from '@/application/usecases/AssetService';
import { BackupService } from '@/application/usecases/BackupService';
import { DocumentService } from '@/application/usecases/DocumentService';
import { PrintProfileService } from '@/application/usecases/PrintProfileService';
import { createSenderProfile } from '@/domain/address/SenderProfile';
import { createFolder } from '@/domain/document/Folder';
import { ASSET_MAX_BYTES } from '@/domain/asset/DocumentAsset';
import { BUILT_IN_PROFILES, findBuiltInProfile } from '@/domain/print/builtInProfiles';
import { MarkdownDocumentCodecImpl } from '@/infrastructure/codec/MarkdownDocumentCodecImpl';
import {
  FakeAddressRepository,
  fakeHistory,
  FakeAssetRepository,
  FakeDocumentRepository,
  FakeFolderRepository,
  FakePrintProfileRepository,
  FakeSettingsStore,
  StubImageProbe,
  letterFixture,
} from './helpers/fakes';

function documentService(): { service: DocumentService; repository: FakeDocumentRepository } {
  const repository = new FakeDocumentRepository();
  return { service: new DocumentService(repository, new MarkdownDocumentCodecImpl()), repository };
}

describe('DocumentService', () => {
  it('creates, updates and duplicates', async () => {
    const { service } = documentService();
    const created = await service.create({
      kind: 'letter',
      title: 'Antrag',
      locale: 'de-DE',
      printProfileId: 'din5008-b',
    });

    const updated = await service.update(created.id, { title: 'Antrag v2' });
    expect(updated.title).toBe('Antrag v2');
    expect(updated.updatedAt >= created.updatedAt).toBe(true);

    const copy = await service.duplicate(created.id, 'Kopie');
    expect(copy.id).not.toBe(created.id);
    expect(copy.title).toBe('Kopie');
    expect(await service.list()).toHaveLength(2);
  });

  it('gives a copy its own asset placements, so deleting one cannot reach the original', async () => {
    const { service, repository } = documentService();
    const original = letterFixture({
      assetPlacements: [
        {
          id: 'placement-1',
          assetId: 'logo',
          surface: 'all',
          xMm: 10,
          yMm: 10,
          widthMm: 40,
          rotationDeg: 0,
          opacity: 1,
          layer: 'content',
          fit: 'contain',
        },
      ],
    });
    await repository.save(original);

    const copy = await service.duplicate(original.id, 'Kopie');
    expect(copy.assetPlacements[0].id).not.toBe('placement-1');
    expect(copy.assetPlacements[0].assetId).toBe('logo');
  });

  it('refuses to exceed the bounded collection', async () => {
    const { service, repository } = documentService();
    for (let index = 0; index < DocumentService.MAX_DOCUMENTS; index += 1) {
      await repository.save(letterFixture({ id: `doc-${index}` }));
    }
    await expect(
      service.create({ kind: 'letter', title: 'x', locale: 'de-DE', printProfileId: 'a4-blank' }),
    ).rejects.toThrowError(LimitReachedError);
  });

  it('reports a missing document rather than returning nothing', async () => {
    const { service } = documentService();
    await expect(service.require('nope')).rejects.toThrowError(NotFoundError);
    expect(await service.get('nope')).toBeNull();
  });

  it('refuses to store a document that would not satisfy the schema', async () => {
    const { service, repository } = documentService();
    await repository.save(letterFixture({ id: 'doc-1' }));
    await expect(
      service.update('doc-1', { locale: 'not a locale tag at all' }),
    ).rejects.toThrowError(InvalidInputError);
  });
});

describe('PrintProfileService', () => {
  function service(): { service: PrintProfileService; repository: FakePrintProfileRepository } {
    const repository = new FakePrintProfileRepository();
    return { service: new PrintProfileService(repository), repository };
  }

  it('presents built-ins and user profiles as one catalogue', async () => {
    const { service: profiles } = service();
    const all = await profiles.list();
    expect(all).toHaveLength(BUILT_IN_PROFILES.length);
    expect(all[0].builtIn).toBe(true);
  });

  it('never writes a built-in profile', async () => {
    const { service: profiles } = service();
    const builtIn = findBuiltInProfile('din5008-b')!;
    await expect(profiles.save(builtIn)).rejects.toThrowError(ImmutableRecordError);
    await expect(profiles.remove('din5008-b')).rejects.toThrowError(ImmutableRecordError);
  });

  it('turns a plain copy sideways and back, the body following the margins (change 0045)', async () => {
    const { service: profiles } = service();
    const copy = await profiles.clone('a4-blank', { de: 'Quer', en: 'Wide' });
    const wide = await profiles.update(copy.id, { orientation: 'landscape' });
    expect(wide.page).toEqual({ widthMm: 297, heightMm: 210, orientation: 'landscape' });
    expect(wide.regions.body).toEqual({
      xMm: 20,
      yMm: 20,
      widthMm: 257,
      heightMm: 170,
      surface: 'all',
    });
    // Margins and the turn in one update: the body follows both.
    const narrow = await profiles.update(copy.id, {
      orientation: 'portrait',
      margins: { topMm: 10, rightMm: 10, bottomMm: 10, leftMm: 10 },
    });
    expect(narrow.page.orientation).toBe('portrait');
    expect(narrow.regions.body).toMatchObject({ xMm: 10, yMm: 10, widthMm: 190, heightMm: 277 });
    // The same orientation is a no-op for the page.
    const same = await profiles.update(copy.id, { orientation: 'portrait' });
    expect(same.page).toEqual(narrow.page);
  });

  it('refuses to turn a copy whose marks would leave the sheet', async () => {
    const { service: profiles } = service();
    const copy = await profiles.clone('din5008-b', { de: 'DIN quer', en: 'DIN wide' });
    await expect(profiles.update(copy.id, { orientation: 'landscape' })).rejects.toThrowError(
      InvalidInputError,
    );
    const stored = await profiles.get(copy.id);
    expect(stored?.page.orientation).toBe('portrait');
  });

  it('clones into a free identifier and stores the copy', async () => {
    const { service: profiles, repository } = service();
    const copy = await profiles.clone('din5008-b', { de: 'Mein Brief', en: 'My letter' });

    expect(copy.builtIn).toBe(false);
    expect(repository.records.has(copy.id)).toBe(true);

    const second = await profiles.clone('din5008-b', { de: 'Mein Brief', en: 'My letter' });
    expect(second.id).not.toBe(copy.id);
  });

  it('refuses to store a profile whose geometry does not hold together', async () => {
    const { service: profiles } = service();
    const broken = {
      ...findBuiltInProfile('a4-blank')!,
      id: 'broken',
      builtIn: false,
      margins: { topMm: 300, rightMm: 0, bottomMm: 300, leftMm: 0 },
    };
    await expect(profiles.save(broken)).rejects.toThrowError(InvalidInputError);
  });

  it('falls back to the default profile instead of losing the document', async () => {
    const { service: profiles } = service();
    const resolved = await profiles.resolve('a-profile-that-was-deleted');
    expect(resolved.fallback).toBe(true);
    expect(resolved.profile.id).toBe('din5008-b');

    const known = await profiles.resolve('a4-blank');
    expect(known.fallback).toBe(false);
  });
});

describe('AddressBookService', () => {
  function service(): AddressBookService {
    return new AddressBookService(new FakeAddressRepository());
  }

  it('derives a display name when none is given', async () => {
    const book = service();
    const { address } = await book.add({
      postal: { organization: 'Stadt Beispielstadt', department: 'Bürgerbüro' },
    });
    expect(address.displayName).toBe('Stadt Beispielstadt – Bürgerbüro');
  });

  it('reports likely duplicates and stores both anyway', async () => {
    const book = service();
    const postal = { person: 'Erika Beispiel', street: 'Beispielweg 12', city: 'Musterort' };
    await book.add({ postal });
    const second = await book.add({ postal });

    expect(second.possibleDuplicates).toHaveLength(1);
    // Reported, never merged: two entries that look alike are often two people.
    expect(await book.list()).toHaveLength(2);
  });

  it('searches across every indexed field', async () => {
    const book = service();
    await book.add({ postal: { person: 'Erika Beispiel', city: 'Musterort' }, tags: ['Privat'] });
    await book.add({ postal: { organization: 'Stadt Beispielstadt', city: 'Beispielstadt' } });

    expect(await book.search('musterort')).toHaveLength(1);
    expect(await book.search('privat')).toHaveLength(1);
    expect(await book.search('')).toHaveLength(2);
  });

  it('keeps a single primary and a single home address', async () => {
    const book = service();
    const { address: first } = await book.add({
      displayName: 'Privat',
      postal: { city: 'Berlin' },
      roles: ['primary'],
    });
    const { address: second } = await book.add({
      displayName: 'Verein',
      postal: { city: 'Bremen' },
    });

    await book.setRole(second.id, 'primary', true);
    const all = await book.list();
    expect(all.find((a) => a.id === first.id)?.roles).not.toContain('primary');
    expect(all.find((a) => a.id === second.id)?.roles).toEqual(['primary', 'sender']);
    expect((await book.primary())?.id).toBe(second.id);
  });

  it('lists senders in picker order and projects them for the renderer', async () => {
    const book = service();
    await book.add({ displayName: 'Zeta e.V.', postal: { city: 'Berlin' }, roles: ['sender'] });
    await book.add({ displayName: 'Privat', postal: { city: 'Berlin' }, roles: ['home'] });
    await book.add({ displayName: 'Alpha GmbH', postal: { city: 'Berlin' }, roles: ['primary'] });
    await book.add({ displayName: 'Nur Empfänger', postal: { city: 'Berlin' } });

    const senders = await book.listSenders('de');
    expect(senders.map((sender) => sender.name)).toEqual(['Alpha GmbH', 'Privat', 'Zeta e.V.']);
    expect(senders[0].footerLines).toEqual([]);
  });

  it('projects contact details only when the address releases them', async () => {
    const book = service();
    const { address } = await book.add({
      displayName: 'Privat',
      postal: { city: 'Berlin' },
      email: 'max@example.org',
      phone: '030 1234',
      contactVisibility: { email: true },
      roles: ['sender'],
    });
    const sender = await book.getSender(address.id);
    expect(sender?.email).toBe('max@example.org');
    expect(sender?.phone).toBeUndefined();
  });

  it('duplicates without the single-holder roles and records use', async () => {
    const book = service();
    const { address } = await book.add({
      displayName: 'Privat',
      postal: { city: 'Berlin' },
      roles: ['primary', 'favorite'],
    });
    const copy = await book.duplicate(address.id, (name) => `Kopie von ${name}`);
    expect(copy.displayName).toBe('Kopie von Privat');
    expect(copy.roles).toEqual(['sender', 'favorite']);

    await book.touch(copy.id, new Date('2026-09-11T10:00:00Z'));
    expect((await book.get(copy.id))?.lastUsedAt).toBe('2026-09-11T10:00:00.000Z');
  });

  it('bounds the address book', async () => {
    const repository = new FakeAddressRepository();
    const book = new AddressBookService(repository);
    for (let index = 0; index < 5; index += 1) {
      await book.add({ postal: { city: `Stadt ${index}` } });
    }
    // The limit is enforced against the real count; simulate a full book.
    const full = { ...repository, list: async () => new Array(5_000).fill(null) } as never;
    await expect(new AddressBookService(full).add({ postal: { city: 'x' } })).rejects.toThrowError(
      LimitReachedError,
    );
  });

  it('reports an update to a record that is gone', async () => {
    const book = service();
    await expect(book.update('missing', { notes: 'x' })).rejects.toThrowError(NotFoundError);
  });
});

describe('AssetService', () => {
  const png = (size = 1_024): Blob => new Blob([new Uint8Array(size)], { type: 'image/png' });

  function service(
    probe = new StubImageProbe({ widthPx: 800, heightPx: 600, mimeType: 'image/png' }),
  ) {
    const assets = new FakeAssetRepository();
    const documents = new FakeDocumentRepository();
    return { service: new AssetService(assets, probe, documents), assets, documents };
  }

  it('stores what the decoder reported, not what the file claimed', async () => {
    // The blob says `image/png`; the probe says JPEG. The record must follow the
    // probe, because that is what an `<img>` will actually decode.
    const probe = new StubImageProbe({ widthPx: 800, heightPx: 600, mimeType: 'image/jpeg' });
    const { service: assets } = service(probe);
    const asset = await assets.import(png(), { kind: 'image', filename: 'photo.png' });

    expect(asset.mimeType).toBe('image/jpeg');
    expect(asset.widthPx).toBe(800);
    expect(asset.checksum).toMatch(/^[0-9a-f]{64}$/u);
  });

  it('rejects an empty file', async () => {
    const { service: assets } = service();
    await expect(
      assets.import(new Blob([], { type: 'image/png' }), { kind: 'image' }),
    ).rejects.toThrowError(AssetRejectedError);
  });

  it('rejects a file over the size ceiling before decoding it', async () => {
    const { service: assets } = service();
    const huge = { size: ASSET_MAX_BYTES + 1, type: 'image/png' } as Blob;
    await expect(assets.import(huge, { kind: 'image' })).rejects.toThrowError(AssetRejectedError);
  });

  it('rejects SVG, which is a document rather than a picture', async () => {
    const { service: assets } = service();
    await expect(
      assets.import(new Blob(['<svg/>'], { type: 'image/svg+xml' }), { kind: 'image' }),
    ).rejects.toThrowError(AssetRejectedError);
  });

  it('rejects a decompression bomb on its decoded size', async () => {
    const probe = new StubImageProbe({ widthPx: 30_000, heightPx: 30_000, mimeType: 'image/png' });
    const { service: assets } = service(probe);
    await expect(assets.import(png(40_000), { kind: 'image' })).rejects.toThrowError(
      AssetRejectedError,
    );
  });

  it('rejects a wide-and-short bomb on its pixel count', async () => {
    const probe = new StubImageProbe({ widthPx: 11_000, heightPx: 11_000, mimeType: 'image/png' });
    const { service: assets } = service(probe);
    await expect(assets.import(png(), { kind: 'image' })).rejects.toThrowError(AssetRejectedError);
  });

  it('rejects bytes that do not decode at all', async () => {
    const { service: assets } = service(new StubImageProbe(null));
    await expect(assets.import(png(), { kind: 'image' })).rejects.toThrowError(AssetRejectedError);
  });

  it('lists the documents that would break before a deletion', async () => {
    const { service: assets, documents } = service();
    const asset = await assets.import(png(), { kind: 'logo' });
    await documents.save(letterFixture({ id: 'doc-1', metadata: { signatureId: asset.id } }));
    await documents.save(letterFixture({ id: 'doc-2' }));

    const usage = await assets.usage(asset.id);
    expect(usage.map((document) => document.id)).toEqual(['doc-1']);

    await assets.remove(asset.id);
    expect(await assets.get(asset.id)).toBeNull();
    await expect(assets.remove(asset.id)).rejects.toThrowError(NotFoundError);
  });
});

describe('BackupService', () => {
  async function populated() {
    const documents = new FakeDocumentRepository();
    const addresses = new FakeAddressRepository();
    const profiles = new FakePrintProfileRepository();
    const assets = new FakeAssetRepository();
    const settings = new FakeSettingsStore();
    settings.values = { locale: 'de', theme: 'paper' };

    const history = fakeHistory();
    const folders = new FakeFolderRepository();
    const service = new BackupService(
      documents,
      addresses,
      profiles,
      assets,
      settings,
      '0.1.0',
      history,
      folders,
    );

    await folders.save(createFolder({ name: 'Privat', id: 'folder-1' }));
    await documents.save(letterFixture({ id: 'doc-1', folderId: 'folder-1' }));
    const book = new AddressBookService(addresses);
    await book.add({ postal: { person: 'Erika Beispiel', city: 'Musterort' } });
    await book.add({ displayName: 'Privat', postal: { city: 'Berlin' }, roles: ['sender'] });

    const assetService = new AssetService(
      assets,
      new StubImageProbe({ widthPx: 100, heightPx: 80, mimeType: 'image/png' }),
      documents,
    );
    await assetService.import(new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' }), {
      kind: 'logo',
    });

    return { service, documents, addresses, profiles, assets, settings, history, folders };
  }

  it('counts what is actually stored', async () => {
    const { service } = await populated();
    const inventory = await service.inventory();
    expect(inventory).toMatchObject({
      documents: 1,
      addresses: 2,
      senderProfiles: 1,
      printProfiles: 0,
      assets: 1,
      settings: 2,
      folders: 1,
    });
    expect(inventory.assetBytes).toBe(4);
  });

  it('exports and restores everything, bytes included', async () => {
    const source = await populated();
    const backup = await source.service.exportAll();

    expect(backup.format).toBe('foldmark-backup');
    expect(backup.assets[0].dataBase64.length).toBeGreaterThan(0);

    const target = await populated();
    await target.service.deleteAll();
    target.settings.clear();

    const report = await target.service.importAll(JSON.parse(JSON.stringify(backup)) as unknown);
    // Senders travel as addresses now; the legacy counter stays at zero.
    expect(report).toMatchObject({
      documents: 1,
      addresses: 2,
      senderProfiles: 0,
      assets: 1,
      folders: 1,
    });
    expect(report.issues).toEqual([]);

    const restored = await target.service.inventory();
    expect(restored).toMatchObject({
      documents: 1,
      addresses: 2,
      senderProfiles: 1,
      assets: 1,
      folders: 1,
    });
    // The folder link survives the round trip (change 0024).
    expect((await target.documents.get('doc-1'))?.folderId).toBe('folder-1');
    expect(await target.assets.data(backup.assets[0].asset.id)).not.toBeNull();
    expect(target.settings.values.theme).toBe('paper');
  });

  it('folds a pre-0006 backup with sender identities into the address book', async () => {
    const target = await populated();
    await target.service.deleteAll();
    const legacy = createSenderProfile({
      name: 'Verein',
      postal: { organization: 'Beispiel e.V.', city: 'Bremen' },
      email: 'info@example.org',
      footerLines: ['IBAN DE00'],
    });
    const report = await target.service.importAll({
      format: 'foldmark-backup',
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      appVersion: '0.1.0',
      documents: [],
      addresses: [],
      senderProfiles: [legacy],
      printProfiles: [],
      assets: [],
      settings: {},
    });
    expect(report.senderProfiles).toBe(1);
    const migrated = await target.addresses.get(legacy.id);
    expect(migrated?.roles).toEqual(['sender']);
    expect(migrated?.stationery?.footerLines).toEqual(['IBAN DE00']);
    expect(migrated?.contactVisibility.email).toBe(true);
  });

  it('skips one bad record instead of abandoning the restore', async () => {
    const { service } = await populated();
    const backup = await service.exportAll();
    await service.deleteAll();

    const damaged = {
      ...JSON.parse(JSON.stringify(backup)),
      documents: [{ id: 'broken' }, ...backup.documents],
    };

    const report = await service.importAll(damaged as unknown);
    expect(report.documents).toBe(1);
    expect(report.issues.some((issue) => issue.code === 'backup.recordRejected')).toBe(true);
  });

  it('refuses a file that is not a Foldmark backup', async () => {
    const { service } = await populated();
    await expect(service.importAll('nope' as unknown)).rejects.toThrowError(ImportRejectedError);
    await expect(service.importAll({ format: 'something-else' })).rejects.toThrowError(
      ImportRejectedError,
    );
    await expect(
      service.importAll({ format: 'foldmark-backup', version: 99 }),
    ).rejects.toThrowError(ImportRejectedError);
  });

  it('will not let a backup reintroduce a built-in profile under its own id', async () => {
    const { service } = await populated();
    const backup = await service.exportAll();
    const hostile = {
      ...JSON.parse(JSON.stringify(backup)),
      printProfiles: [{ ...findBuiltInProfile('din5008-b')!, builtIn: true }],
    };

    const report = await service.importAll(hostile as unknown);
    expect(report.printProfiles).toBe(0);
    expect(report.issues.some((issue) => issue.code === 'backup.recordRejected')).toBe(true);
  });

  it('clears content and leaves preferences alone', async () => {
    const { service, settings } = await populated();
    await service.deleteAll();

    const inventory = await service.inventory();
    expect(inventory).toMatchObject({ documents: 0, addresses: 0, assets: 0 });
    // The two destructive actions have different blast radii on purpose.
    expect(settings.values.locale).toBe('de');
  });
});
