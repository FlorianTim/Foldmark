import { describe, expect, it } from 'vitest';
import { LimitReachedError } from '@/application/errors/FoldmarkErrors';
import { BackupService } from '@/application/usecases/BackupService';
import { TemplateService } from '@/application/usecases/TemplateService';
import { DocumentTemplateSchema } from '@/domain/document/DocumentSchema';
import {
  createTemplateFromDocument,
  documentFromTemplate,
  TEMPLATES_MAX_COUNT,
} from '@/domain/document/DocumentTemplate';
import { canUseFeature, featureState } from '@/domain/entitlement/premiumFeatures';
import {
  FakeAddressRepository,
  FakeAssetRepository,
  FakeDocumentRepository,
  FakeFolderRepository,
  FakePrintProfileRepository,
  FakeSettingsStore,
  FakeTemplateRepository,
  fakeHistory,
  letterFixture,
} from './helpers/fakes';

const letter = letterFixture({
  metadata: {
    ...letterFixture().metadata,
    sender: {
      name: 'Erika Beispiel',
      postal: { street: 'Lindenallee 12', postalCode: '10115', city: 'Berlin' },
      footerLines: [],
    },
    senderProfileId: 'contact-erika',
    recipientContactId: 'contact-stadt',
    salutation: 'Sehr geehrte Damen und Herren,',
    closing: 'Mit freundlichen Grüßen',
    signerName: 'Erika Beispiel',
    emailTo: 'amt@example.org',
  },
  printOptions: {
    pageNumbers: { format: 'page-of', position: 'bottom-center', hideOnFirstPage: true },
    subjectBold: false,
    theme: { fontFamily: 'serif' },
  },
  tags: ['behörde'],
  folderId: 'folder-1',
  archived: true,
});

describe('document templates (change 0039)', () => {
  it('keeps what a template is for and drops what belongs to one letter', () => {
    const template = createTemplateFromDocument(letter, {
      name: '  Behördenbrief  ',
      description: 'Standard für Ämter',
    });
    expect(template.name).toBe('Behördenbrief');
    expect(template.description).toBe('Standard für Ämter');
    expect(template.kind).toBe('letter');
    expect(template.printProfileId).toBe('din5008-b');
    expect(template.bodyMarkdown).toBe(letter.bodyMarkdown);
    expect(template.metadata).toEqual({
      sender: letter.metadata.sender,
      senderProfileId: 'contact-erika',
      salutation: 'Sehr geehrte Damen und Herren,',
      closing: 'Mit freundlichen Grüßen',
      signerName: 'Erika Beispiel',
      emailTo: 'amt@example.org',
    });
    expect(template).not.toHaveProperty('folderId');
    expect(template).not.toHaveProperty('archived');
    expect(template.printOptions.subjectBold).toBe(false);
    expect(template.tags).toEqual(['behörde']);
    expect(DocumentTemplateSchema.safeParse(template).success).toBe(true);
  });

  it('honours the three switches: sender, body, subject', () => {
    const bare = createTemplateFromDocument(letter, {
      name: 'Leer',
      includeSender: false,
      includeBody: false,
      includeSubject: true,
    });
    expect(bare.bodyMarkdown).toBe('');
    expect(bare.metadata.sender).toBeUndefined();
    expect(bare.metadata.senderProfileId).toBeUndefined();
    expect(bare.metadata.subject).toBe('Antrag auf Bescheinigung');
  });

  it('makes a fresh document that shares nothing with the template', () => {
    const template = createTemplateFromDocument(letter, { name: 'Behördenbrief' });
    const created = documentFromTemplate(
      template,
      { title: 'Neuer Brief', date: '2026-09-17', folderId: 'folder-2' },
      new Date('2026-09-17T08:00:00.000Z'),
    );
    expect(created.id).not.toBe(template.id);
    expect(created.id).not.toBe(letter.id);
    expect(created.metadata.date).toBe('2026-09-17');
    expect(created.metadata.recipient).toBeUndefined();
    expect(created.metadata.sender).toEqual(letter.metadata.sender);
    expect(created.folderId).toBe('folder-2');
    expect(created.printOptions).toEqual(letter.printOptions);
    expect(created.createdAt).toBe('2026-09-17T08:00:00.000Z');
    // A gone profile is replaced by the caller's fallback.
    expect(
      documentFromTemplate(template, { title: 'x', printProfileId: 'a4-blank' }).printProfileId,
    ).toBe('a4-blank');
  });

  it('gates a second template as beta-free during the test phase, locked live', () => {
    expect(featureState('template.custom.multiple', 0)).toEqual({
      mode: 'free',
      used: 0,
      limit: 1,
    });
    expect(featureState('template.custom.multiple', 1)).toEqual({
      mode: 'beta-free',
      used: 1,
      limit: 1,
    });
    expect(featureState('template.custom.multiple', 3, 'live').mode).toBe('locked');
    expect(canUseFeature(featureState('template.custom.multiple', 3, 'live'))).toBe(false);
    expect(featureState('template.custom.save', 99)).toEqual({ mode: 'free' });
    expect(featureState('export.docx', 0)).toEqual({ mode: 'beta-free' });
  });

  it('saves, lists by name, renames and deletes through the service', async () => {
    const repository = new FakeTemplateRepository();
    const service = new TemplateService(repository);
    expect((await service.stateForAnother()).mode).toBe('free');
    const second = await service.saveFromDocument(letter, { name: 'Zweiter' });
    const first = await service.saveFromDocument(letter, { name: 'Erster' });
    expect((await service.stateForAnother()).mode).toBe('beta-free');
    expect((await service.list()).map((template) => template.name)).toEqual(['Erster', 'Zweiter']);

    const renamed = await service.update(second.id, { name: 'Amt', description: 'Für Ämter' });
    expect(renamed.name).toBe('Amt');
    expect(renamed.description).toBe('Für Ämter');
    const cleared = await service.update(second.id, { description: '' });
    expect(cleared).not.toHaveProperty('description');

    await service.remove(first.id);
    expect((await service.list()).map((template) => template.id)).toEqual([second.id]);
    await expect(service.remove('missing')).rejects.toThrow();
    await expect(service.saveFromDocument(letter, { name: '   ' })).rejects.toThrow();
  });

  it('refuses beyond the collection bound', async () => {
    const repository = new FakeTemplateRepository();
    for (let index = 0; index < TEMPLATES_MAX_COUNT; index += 1) {
      await repository.save(createTemplateFromDocument(letter, { name: `T${index}` }));
    }
    await expect(
      new TemplateService(repository).saveFromDocument(letter, { name: 'Eins zu viel' }),
    ).rejects.toBeInstanceOf(LimitReachedError);
  });

  it('travels in the backup and is counted, deleted on its own and with everything', async () => {
    const templates = new FakeTemplateRepository();
    const service = new BackupService(
      new FakeDocumentRepository(),
      new FakeAddressRepository(),
      new FakePrintProfileRepository(),
      new FakeAssetRepository(),
      new FakeSettingsStore(),
      '1.4.0',
      fakeHistory(),
      new FakeFolderRepository(),
      templates,
    );
    await templates.save(createTemplateFromDocument(letter, { name: 'Behördenbrief' }));
    expect((await service.inventory()).templates).toBe(1);

    const backup = await service.exportAll();
    expect(backup.templates).toHaveLength(1);
    await service.deleteTemplates();
    expect((await service.inventory()).templates).toBe(0);

    const report = await service.importAll(backup, 'merge');
    expect(report.templates).toBe(1);
    expect((await templates.list())[0]?.name).toBe('Behördenbrief');
    // A corrupt template record is rejected on its own, the rest imports.
    const corrupt = { ...backup, templates: [{ id: 'x' }, ...backup.templates!] };
    const second = await service.importAll(corrupt, 'replace');
    expect(second.templates).toBe(1);
    expect(second.issues.some((issue) => issue.path === 'template')).toBe(true);

    await service.deleteAll();
    expect((await service.inventory()).templates).toBe(0);
  });
});
