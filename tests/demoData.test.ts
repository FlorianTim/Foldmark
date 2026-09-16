import { describe, expect, it } from 'vitest';
import { buildDemoDataSet } from '@/application/demo/demoData';
import { renderDemoPng } from '@/application/demo/demoPng';
import { AssetService } from '@/application/usecases/AssetService';
import { DemoDataService } from '@/application/usecases/DemoDataService';
import { AddressSchema } from '@/domain/address/AddressSchema';
import { DocumentAssetSchema } from '@/domain/asset/DocumentAssetSchema';
import { FoldmarkDocumentSchema, FolderSchema } from '@/domain/document/DocumentSchema';
import { MarkdownDocumentCodecImpl } from '@/infrastructure/codec/MarkdownDocumentCodecImpl';
import {
  FakeAddressRepository,
  FakeAssetRepository,
  FakeDocumentRepository,
  FakeFolderRepository,
  letterFixture,
} from './helpers/fakes';

/** Change 0026: the demo set is valid, deterministic, and leaves user data alone. */
describe('the demo data set', () => {
  it('is valid against every schema and carries the marker', async () => {
    const set = await buildDemoDataSet(AssetService.checksum);
    expect(set.contacts).toHaveLength(20);
    for (const contact of set.contacts) {
      expect(AddressSchema.safeParse(contact).success).toBe(true);
      expect(contact.demoData).toBe(true);
      expect(contact.id).toMatch(/^demo-contact-\d{3}$/u);
    }
    for (const document of set.documents) {
      const parsed = FoldmarkDocumentSchema.safeParse(document);
      expect(parsed.success, JSON.stringify(parsed.success ? '' : parsed.error.issues)).toBe(true);
      expect(document.demoData).toBe(true);
    }
    for (const folder of set.folders) expect(FolderSchema.safeParse(folder).success).toBe(true);
    expect(DocumentAssetSchema.safeParse(set.asset.asset).success).toBe(true);
    // Every kind the feedback asked for is there.
    const kinds = new Set(set.documents.map((document) => document.kind));
    expect(kinds).toEqual(new Set(['letter', 'postcard', 'custom']));
    expect(set.documents.some((document) => document.archived)).toBe(true);
    expect(set.documents.some((document) => document.bodyMarkdown.includes('::page-break'))).toBe(
      true,
    );
    expect(set.documents.some((document) => document.bodyMarkdown.includes('| Position |'))).toBe(
      true,
    );
    expect(
      set.documents.some((document) =>
        document.bodyMarkdown.includes(`asset:${set.asset.asset.id}`),
      ),
    ).toBe(true);
    expect(set.documents.filter((document) => document.folderId).length).toBeGreaterThan(3);
    // Roles the directory relies on.
    expect(set.contacts.filter((contact) => contact.roles.includes('primary'))).toHaveLength(1);
    expect(set.contacts.filter((contact) => contact.roles.includes('home'))).toHaveLength(1);
    expect(set.contacts.some((contact) => contact.addresses.length > 2)).toBe(true);
    expect(set.contacts.some((contact) => contact.emails.length > 1)).toBe(true);
    expect(new Set(set.contacts.map((contact) => contact.postal.countryCode)).size).toBeGreaterThan(
      10,
    );
  });

  it('renders the same PNG every time', async () => {
    const first = new Uint8Array(await (await renderDemoPng(32, 20)).arrayBuffer());
    const second = new Uint8Array(await (await renderDemoPng(32, 20)).arrayBuffer());
    expect(first).toEqual(second);
    expect([...first.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it('inserts idempotently and removes only what it inserted (AC-CONTACT-001/002)', async () => {
    const documents = new FakeDocumentRepository();
    const addresses = new FakeAddressRepository();
    const assets = new FakeAssetRepository();
    const folders = new FakeFolderRepository();
    const service = new DemoDataService(
      documents,
      addresses,
      assets,
      folders,
      AssetService.checksum,
    );
    const own = letterFixture({ title: 'Mein Brief' });
    await documents.save(own);

    const first = await service.insert();
    expect(first).toEqual({ documents: 9, contacts: 20, assets: 1, folders: 2 });
    const second = await service.insert();
    expect(second).toEqual(first);
    expect((await documents.list()).length).toBe(10);

    // A demo document survives the portable round trip like any other.
    const codec = new MarkdownDocumentCodecImpl();
    const demo = (await documents.list()).find((document) => document.demoData)!;
    expect(codec.encode(demo)).not.toContain('demoData');

    const after = await service.remove();
    expect(after).toEqual({ documents: 0, contacts: 0, assets: 0, folders: 0 });
    expect(await documents.list()).toEqual([own]);
  });
});
