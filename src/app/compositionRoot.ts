import { appConfig } from '@/config';
import { AddressBookService } from '@/application/usecases/AddressBookService';
import { AssetService } from '@/application/usecases/AssetService';
import { BackupService } from '@/application/usecases/BackupService';
import { DocumentService } from '@/application/usecases/DocumentService';
import { EmailHandoffService } from '@/application/usecases/EmailHandoffService';
import { FolderService } from '@/application/usecases/FolderService';
import { TemplateService } from '@/application/usecases/TemplateService';
import { HistoryService } from '@/application/usecases/HistoryService';
import { EntitlementService } from '@/application/usecases/EntitlementService';
import { PrintProfileService } from '@/application/usecases/PrintProfileService';
import type { RichTextEditorFactory } from '@/application/ports/RichTextEditorPort';
import { BrowserImageProbe } from '@/infrastructure/assets/BrowserImageProbe';
import { MarkdownDocumentCodecImpl } from '@/infrastructure/codec/MarkdownDocumentCodecImpl';
import { AppDb } from '@/infrastructure/db/AppDb';
import { DexieDocumentRepository } from '@/infrastructure/db/DexieDocumentRepository';
import {
  DexieCheckpointRepository,
  DexieWorkingCopyStore,
} from '@/infrastructure/db/DexieHistoryRepositories';
import {
  DexieAddressRepository,
  DexieAssetRepository,
  DexieFolderRepository,
  DexieTemplateRepository,
  DexiePrintProfileRepository,
} from '@/infrastructure/db/DexieLibraryRepositories';
import { DemoDataService } from '@/application/usecases/DemoDataService';
import { DefaultEmailRenderer } from '@/infrastructure/email/DefaultEmailRenderer';
import { MimeEmlBuilder } from '@/infrastructure/email/MimeEmlBuilder';
import { UnavailablePurchaseGateway } from '@/infrastructure/purchase/UnavailablePurchaseGateway';
import { RegistrySettingsStore } from '@/presentation/settings/registrySettingsStore';
import { appSettings, readSetting, writeSetting } from '@/presentation/settings/settingsRegistry';

/**
 * One place where interfaces meet implementations.
 *
 * Every service above is constructed from ports; every adapter below is a
 * browser detail. Swapping IndexedDB for something else, or the bounded YAML
 * subset for a different codec, is an edit in this file and nowhere else — which
 * is the whole return on the ports-and-adapters discipline.
 *
 * The database name comes from the configured slug, so two LumbreCode apps
 * served from the same origin cannot collide.
 */
const db = new AppDb(`${appConfig.slug}-db`);

const documentRepository = new DexieDocumentRepository(db);
const addressRepository = new DexieAddressRepository(db);
const printProfileRepository = new DexiePrintProfileRepository(db);
const assetRepository = new DexieAssetRepository(db);
const folderRepository = new DexieFolderRepository(db);
const templateRepository = new DexieTemplateRepository(db);
const checkpointRepository = new DexieCheckpointRepository(db);
const workingCopyStore = new DexieWorkingCopyStore(db);
const codec = new MarkdownDocumentCodecImpl();
const settingsStore = new RegistrySettingsStore();

/**
 * The entitlement cache, backed by the settings registry.
 *
 * The service takes this as a port rather than reaching for browser storage
 * itself, so it stays testable without a DOM — and so the two keys are
 * always written together.
 */
const entitlementCache = {
  read: (): string | null => readSetting(appSettings.entitlement),
  write: (entitlement: string, checkedAt: string): boolean =>
    writeSetting(appSettings.entitlement, entitlement as never) &&
    writeSetting(appSettings.entitlementCheckedAt, checkedAt),
};

/**
 * The rich-text editor, loaded on first use.
 *
 * Milkdown and ProseMirror are the largest dependency Foldmark has; the
 * document list, the address book and the print profiles must not pay for
 * them. The chunk is fetched from the app's own origin like any other.
 */
const richTextEditor: RichTextEditorFactory = {
  create: async (options) =>
    (await import('@/infrastructure/editor/MilkdownEditorAdapter')).milkdownEditorFactory.create(
      options,
    ),
};

/** Application services wired to concrete browser adapters in one composition root. */
export const services = {
  richTextEditor,
  documents: new DocumentService(documentRepository, codec),
  folders: new FolderService(folderRepository, documentRepository),
  templates: new TemplateService(templateRepository),
  history: new HistoryService(
    documentRepository,
    checkpointRepository,
    workingCopyStore,
    codec,
    () => readSetting(appSettings.historyAutomaticVersions),
  ),
  printProfiles: new PrintProfileService(printProfileRepository),
  addressBook: new AddressBookService(addressRepository),
  assets: new AssetService(assetRepository, new BrowserImageProbe(), documentRepository),
  demoData: new DemoDataService(
    documentRepository,
    addressRepository,
    assetRepository,
    folderRepository,
    AssetService.checksum,
  ),
  email: new EmailHandoffService(new DefaultEmailRenderer(), new MimeEmlBuilder()),
  backup: new BackupService(
    documentRepository,
    addressRepository,
    printProfileRepository,
    assetRepository,
    settingsStore,
    appConfig.version,
    { checkpoints: checkpointRepository, workingCopies: workingCopyStore },
    folderRepository,
    templateRepository,
  ),
  /**
   * The purchase gateway is the store-less default (see ADR on the purchase
   * seam). Swapping in a real channel is one line here plus one adapter —
   * no call site changes, because views ask `isUnlocked(key)` and nothing
   * else.
   */
  entitlement: new EntitlementService(new UnavailablePurchaseGateway(), entitlementCache),
} as const;
