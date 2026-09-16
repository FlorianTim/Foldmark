import { defineStore } from 'pinia';
import { ref } from 'vue';
import { services } from '@/app/compositionRoot';
import { FoldmarkError } from '@/application/errors/FoldmarkErrors';
import type { Address } from '@/domain/address/Address';
import type { SenderProfile } from '@/domain/address/SenderProfile';
import type { DocumentAsset } from '@/domain/asset/DocumentAsset';
import type { FoldmarkDocument } from '@/domain/document/FoldmarkDocument';
import type { DocumentTemplate } from '@/domain/document/DocumentTemplate';
import type { Folder } from '@/domain/document/Folder';
import type { PrintProfile } from '@/domain/print/PrintProfile';
import { i18n } from '@/presentation/i18n';

/**
 * Everything the app lists rather than edits.
 *
 * One store for documents, addresses, senders, profiles and assets, because
 * they are loaded together, invalidated together and shown side by side. Five
 * stores would mean five copies of the same load/error/loading triple and five
 * places to forget a refresh after a delete.
 *
 * It holds **no domain logic**. Every action is a call into a use case; the
 * store's job is caching what came back and telling the UI whether it is
 * waiting or broken.
 */
export const useLibraryStore = defineStore('library', () => {
  const documents = ref<readonly FoldmarkDocument[]>([]);
  const addresses = ref<readonly Address[]>([]);
  const senderProfiles = ref<readonly SenderProfile[]>([]);
  const printProfiles = ref<readonly PrintProfile[]>([]);
  const assets = ref<readonly DocumentAsset[]>([]);
  const folders = ref<readonly Folder[]>([]);
  const templates = ref<readonly DocumentTemplate[]>([]);

  const loading = ref(false);
  /** Translation key of the last failure, or `null`. */
  const error = ref<string | null>(null);

  /**
   * Runs one repository call, turning any failure into a translation key.
   *
   * Storage errors are the common case here — a browser in private mode, a
   * profile with IndexedDB disabled — and they must not reach the console as an
   * unhandled rejection while the UI shows an empty list and no explanation.
   */
  async function run<T>(operation: () => Promise<T>, fallbackKey: string): Promise<T | null> {
    error.value = null;
    try {
      return await operation();
    } catch (caught) {
      error.value = caught instanceof FoldmarkError ? caught.translationKey : fallbackKey;
      return null;
    }
  }

  /** Loads every collection the app lists. */
  async function loadAll(): Promise<void> {
    loading.value = true;
    const result = await run(
      async () =>
        Promise.all([
          services.documents.list(),
          services.addressBook.list(),
          services.addressBook.listSenders(i18n.global.locale.value),
          services.printProfiles.list(),
          services.assets.list(),
          services.folders.list(),
          services.templates.list(),
        ]),
      'errors.storageUnavailable',
    );
    if (result) {
      [
        documents.value,
        addresses.value,
        senderProfiles.value,
        printProfiles.value,
        assets.value,
        folders.value,
        templates.value,
      ] = result;
    }
    loading.value = false;
  }

  /** Reloads the document list only, after a save or delete. */
  async function refreshDocuments(): Promise<void> {
    const result = await run(() => services.documents.list(), 'errors.storageUnavailable');
    if (result) documents.value = result;
  }

  /** Reloads the templates only (change 0039). */
  async function refreshTemplates(): Promise<void> {
    const result = await run(() => services.templates.list(), 'errors.storageUnavailable');
    if (result) templates.value = result;
  }

  /** Reloads the folders only. */
  async function refreshFolders(): Promise<void> {
    const result = await run(() => services.folders.list(), 'errors.storageUnavailable');
    if (result) folders.value = result;
  }

  /** Reloads the address book only. */
  async function refreshAddresses(): Promise<void> {
    const result = await run(() => services.addressBook.list(), 'errors.storageUnavailable');
    if (result) addresses.value = result;
  }

  /** Reloads sender identities only. */
  async function refreshSenders(): Promise<void> {
    const result = await run(
      () => services.addressBook.listSenders(i18n.global.locale.value),
      'errors.storageUnavailable',
    );
    if (result) senderProfiles.value = result;
  }

  /** Reloads the profile catalogue, built-ins included. */
  async function refreshProfiles(): Promise<void> {
    const result = await run(() => services.printProfiles.list(), 'errors.storageUnavailable');
    if (result) printProfiles.value = result;
  }

  /** Reloads asset metadata only; no image bytes are read. */
  async function refreshAssets(): Promise<void> {
    const result = await run(() => services.assets.list(), 'errors.storageUnavailable');
    if (result) assets.value = result;
  }

  /** Clears the cached collections without touching storage. */
  function reset(): void {
    documents.value = [];
    addresses.value = [];
    senderProfiles.value = [];
    assets.value = [];
    folders.value = [];
    error.value = null;
  }

  return {
    documents,
    addresses,
    senderProfiles,
    printProfiles,
    assets,
    folders,
    templates,
    loading,
    error,
    loadAll,
    refreshDocuments,
    refreshFolders,
    refreshTemplates,
    refreshAddresses,
    refreshSenders,
    refreshProfiles,
    refreshAssets,
    reset,
    run,
  };
});
