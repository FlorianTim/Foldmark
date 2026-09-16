import { describe, expect, it } from 'vitest';
import { BackupService } from '@/application/usecases/BackupService';
import { createAddress } from '@/domain/address/Address';
import { formatIsoDate } from '@/domain/markdown/dateToken';
import { MarkdownDocumentCodecImpl } from '@/infrastructure/codec/MarkdownDocumentCodecImpl';
import {
  decodeDocumentDefaults,
  encodeDocumentDefaults,
  FACTORY_DOCUMENT_DEFAULTS,
  printOptionsFromDefaults,
} from '@/presentation/settings/documentDefaults';
import {
  FakeAddressRepository,
  FakeAssetRepository,
  FakeDocumentRepository,
  FakeFolderRepository,
  FakePrintProfileRepository,
  FakeSettingsStore,
  fakeHistory,
  letterFixture,
} from './helpers/fakes';

/** Change 0028: document defaults, the date format, and the per-collection deletes. */
describe('document defaults', () => {
  it('round-trip through the preference and fall back field by field', () => {
    const custom = {
      ...FACTORY_DOCUMENT_DEFAULTS,
      locale: 'en-GB' as const,
      dateFormat: 'numeric' as const,
      fontSizePt: 12,
    };
    expect(decodeDocumentDefaults(encodeDocumentDefaults(custom))).toEqual(custom);
    // A corrupted field falls back; a corrupted document falls back entirely.
    expect(
      decodeDocumentDefaults(JSON.stringify({ ...custom, fontSizePt: 400, locale: 'xx' })),
    ).toEqual({ ...custom, fontSizePt: FACTORY_DOCUMENT_DEFAULTS.fontSizePt, locale: 'de-DE' });
    expect(decodeDocumentDefaults('not json')).toBeNull();
    expect(decodeDocumentDefaults('[]')).toBeNull();
  });

  it('write only deviations into a new document', () => {
    expect(printOptionsFromDefaults(FACTORY_DOCUMENT_DEFAULTS)).toEqual({
      pageNumbers: { format: 'none', position: 'bottom-center', hideOnFirstPage: false },
    });
    const options = printOptionsFromDefaults({
      ...FACTORY_DOCUMENT_DEFAULTS,
      fontFamily: 'serif',
      dateFormat: 'medium',
      pageNumberFormat: 'page-of',
    });
    expect(options).toEqual({
      pageNumbers: { format: 'page-of', position: 'bottom-center', hideOnFirstPage: false },
      dateFormat: 'medium',
      theme: { fontFamily: 'serif' },
    });
  });

  it('carry the semantic colours as global defaults and write only the changed ones (R14-009)', () => {
    const custom = {
      ...FACTORY_DOCUMENT_DEFAULTS,
      aliases: { ...FACTORY_DOCUMENT_DEFAULTS.aliases, warning: 'orange' as const },
    };
    expect(decodeDocumentDefaults(encodeDocumentDefaults(custom))).toEqual(custom);
    // An unknown tone falls back to the palette's own; a missing map does too.
    expect(
      decodeDocumentDefaults(JSON.stringify({ ...custom, aliases: { warning: 'gold' } })),
    ).toEqual(FACTORY_DOCUMENT_DEFAULTS);
    expect(decodeDocumentDefaults(JSON.stringify({ locale: 'en-GB' }))?.aliases).toEqual(
      FACTORY_DOCUMENT_DEFAULTS.aliases,
    );
    // A new document gets the deviation, and nothing when there is none.
    expect(printOptionsFromDefaults(custom).theme).toEqual({ aliases: { warning: 'orange' } });
    expect(printOptionsFromDefaults(FACTORY_DOCUMENT_DEFAULTS).theme).toBeUndefined();
  });

  it('format the date in the document language and the chosen format', () => {
    expect(formatIsoDate('2026-09-15', 'de-DE')).toBe('15. September 2026');
    expect(formatIsoDate('2026-09-15', 'de-DE', 'medium')).toBe('15.09.2026');
    expect(formatIsoDate('2026-09-15', 'de-DE', 'numeric')).toBe('15.9.2026');
    expect(formatIsoDate('2026-09-15', 'en-US', 'numeric')).toBe('9/15/2026');
    expect(formatIsoDate('2026-09-15', 'en-GB', 'long')).toBe('15 September 2026');
  });

  it('keep the date format in the portable file, absent when it is the default', () => {
    const codec = new MarkdownDocumentCodecImpl();
    const plain = letterFixture();
    expect(codec.encode(plain)).not.toContain('dateFormat');
    const numeric = letterFixture({
      printOptions: { ...plain.printOptions, dateFormat: 'numeric' },
    });
    const text = codec.encode(numeric);
    expect(text).toContain('dateFormat: numeric');
    const back = codec.decode(text, {
      id: 'imported-document',
      locale: 'de-DE',
      printProfileId: 'din5008-b',
      now: new Date('2026-09-15T00:00:00Z'),
    });
    expect(back.ok && back.document.printOptions.dateFormat).toBe('numeric');
  });
});

describe('data management', () => {
  function setup() {
    const documents = new FakeDocumentRepository();
    const addresses = new FakeAddressRepository();
    const assets = new FakeAssetRepository();
    const folders = new FakeFolderRepository();
    const history = fakeHistory();
    const service = new BackupService(
      documents,
      addresses,
      new FakePrintProfileRepository(),
      assets,
      new FakeSettingsStore(),
      '1.3.0',
      history,
      folders,
    );
    return { documents, addresses, assets, folders, history, service };
  }

  it('deletes one collection at a time and leaves the others (AC 0028)', async () => {
    const { documents, addresses, assets, folders, history, service } = setup();
    await documents.save(letterFixture({ id: 'd1' }));
    await folders.save({
      id: 'f1',
      name: 'F',
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await addresses.save(createAddress({ displayName: 'A', postal: { city: 'B' } }));
    await assets.save({
      asset: {
        id: 'a1',
        kind: 'image',
        mimeType: 'image/png',
        byteSize: 4,
        checksum: 'a'.repeat(64),
        widthPx: 10,
        heightPx: 10,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      data: new Blob([new Uint8Array([1, 2, 3, 4])]),
    });
    await history.checkpoints.save({
      id: 'c1',
      documentId: 'd1',
      createdAt: '2026-01-01T00:00:00.000Z',
      origin: 'manual',
      document: letterFixture({ id: 'd1' }),
    });

    await service.deleteHistory();
    expect(await history.checkpoints.list()).toEqual([]);
    expect((await documents.list()).length).toBe(1);

    await service.deleteAssets();
    expect(await assets.list()).toEqual([]);
    expect((await addresses.list()).length).toBe(1);

    await service.deleteAddresses();
    expect(await addresses.list()).toEqual([]);
    expect((await documents.list()).length).toBe(1);

    await service.deleteDocuments();
    expect(await documents.list()).toEqual([]);
    expect(await folders.list()).toEqual([]);
  });
});
