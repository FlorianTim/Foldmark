<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import { ImportRejectedError } from '@/application/errors/FoldmarkErrors';
import type { ImportReport } from '@/application/ports/BackupPorts';
import type { DataInventory } from '@/application/usecases/BackupService';
import { createContactHref, publicResourceLinks } from '@/config/publicResources';
import { downloadText, safeFilename } from '@/presentation/download';
import { resetAllSettings } from '@/presentation/settings/settingsRegistry';
import { useLibraryStore } from '@/presentation/stores/libraryStore';
import { useWorkspaceStore } from '@/presentation/stores/workspaceStore';

/**
 * Privacy and data: what is stored, the published documents, and the ways to
 * take it all back.
 *
 * This view exists because the app's most reassuring property — that
 * everything stays in this browser — was stated only in a dismissible
 * banner. It is also the answer a published privacy policy points at when
 * it promises an in-app deletion path.
 *
 * The inventory is **counted, not remembered**: it reads the tables every time
 * the view opens. A number the app merely believes is not evidence, and this
 * screen exists to be evidence.
 *
 * It owns **both** destructive actions, and they are deliberately separate:
 * one clears content and keeps preferences, the other clears preferences and
 * keeps content. A shared confirmation is how somebody deletes the wrong
 * thing.
 */
const emit = defineEmits<{ settingsReset: [] }>();

const { t, locale } = useI18n();
const library = useLibraryStore();
const workspace = useWorkspaceStore();

const inventory = ref<DataInventory | null>(null);
const deletePending = ref(false);
const deleteDone = ref(false);
const resetPending = ref(false);
const resetDone = ref(false);
const busy = ref(false);
const importReport = ref<ImportReport | null>(null);
const importError = ref<string | null>(null);
const backupInput = ref<HTMLInputElement | null>(null);

const privacyHref = createContactHref('privacy', 'Privacy question');

onMounted(() => void refreshInventory());

async function refreshInventory(): Promise<void> {
  inventory.value = await library.run(
    () => services.backup.inventory(),
    'errors.storageUnavailable',
  );
}

async function exportBackup(): Promise<void> {
  busy.value = true;
  const backup = await library.run(() => services.backup.exportAll(), 'errors.storageUnavailable');
  if (backup) {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(
      JSON.stringify(backup, null, 2),
      safeFilename(`foldmark-backup-${stamp}`, 'json'),
      'application/json',
    );
  }
  busy.value = false;
}

async function onBackupSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  busy.value = true;
  importReport.value = null;
  importError.value = null;
  try {
    const parsed: unknown = JSON.parse(await file.text());
    importReport.value = await services.backup.importAll(parsed, 'merge');
    await library.loadAll();
    await refreshInventory();
  } catch (error) {
    importError.value =
      error instanceof ImportRejectedError
        ? `backup.rejected.${error.params?.reason ?? 'unknown'}`
        : 'backup.rejected.notJson';
  } finally {
    busy.value = false;
  }
}

async function deleteLocalData(): Promise<void> {
  busy.value = true;
  const done = await library.run(() => services.backup.deleteAll(), 'errors.storageUnavailable');
  busy.value = false;
  if (done === null) return;
  workspace.close();
  library.reset();
  deletePending.value = false;
  deleteDone.value = true;
  await refreshInventory();
}

function resetSettings(): void {
  resetAllSettings();
  resetPending.value = false;
  resetDone.value = true;
  // Locale and theme are held in module state; the shell re-reads them.
  emit('settingsReset');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale.value).format(value);
}
</script>

<template>
  <section class="panel" aria-labelledby="privacy-panel-title">
    <h1 id="privacy-panel-title">{{ t('privacyPanel.title') }}</h1>

    <div class="privacy-card">
      <h2>{{ t('privacyPanel.localTitle') }}</h2>
      <p>{{ t('privacyPanel.localBody') }}</p>
    </div>

    <div class="privacy-card">
      <h2>{{ t('privacyPanel.inventory') }}</h2>
      <p>{{ t('privacyPanel.inventoryHint') }}</p>
      <dl v-if="inventory" class="inventory-grid">
        <div>
          <dt>{{ t('privacyPanel.categories.documents') }}</dt>
          <dd>{{ formatNumber(inventory.documents) }}</dd>
        </div>
        <div>
          <dt>{{ t('privacyPanel.categories.addresses') }}</dt>
          <dd>{{ formatNumber(inventory.addresses) }}</dd>
        </div>
        <div>
          <dt>{{ t('privacyPanel.categories.senderProfiles') }}</dt>
          <dd>{{ formatNumber(inventory.senderProfiles) }}</dd>
        </div>
        <div>
          <dt>{{ t('privacyPanel.categories.checkpoints') }}</dt>
          <dd>{{ formatNumber(inventory.checkpoints) }}</dd>
        </div>
        <div>
          <dt>{{ t('privacyPanel.categories.workingCopies') }}</dt>
          <dd>{{ formatNumber(inventory.workingCopies) }}</dd>
        </div>
        <div>
          <dt>{{ t('privacyPanel.categories.printProfiles') }}</dt>
          <dd>{{ formatNumber(inventory.printProfiles) }}</dd>
        </div>
        <div>
          <dt>{{ t('privacyPanel.categories.assets') }}</dt>
          <dd>{{ formatNumber(inventory.assets) }} · {{ formatBytes(inventory.assetBytes) }}</dd>
        </div>
        <div>
          <dt>{{ t('privacyPanel.categories.folders') }}</dt>
          <dd>{{ formatNumber(inventory.folders) }}</dd>
          <dt>{{ t('privacyPanel.categories.templates') }}</dt>
          <dd>{{ formatNumber(inventory.templates) }}</dd>
        </div>
        <div>
          <dt>{{ t('privacyPanel.categories.settings') }}</dt>
          <dd>{{ formatNumber(inventory.settings) }}</dd>
        </div>
      </dl>
      <p v-else aria-live="polite">{{ t('privacyPanel.inventoryLoading') }}</p>
    </div>

    <div class="privacy-card">
      <h2>{{ t('privacyPanel.backup') }}</h2>
      <p>{{ t('privacyPanel.backupHint') }}</p>
      <div class="settings-actions">
        <button class="btn btn-primary" type="button" :disabled="busy" @click="exportBackup">
          {{ t('privacyPanel.exportAll') }}
        </button>
        <button
          class="btn btn-outline"
          type="button"
          :disabled="busy"
          @click="backupInput?.click()"
        >
          {{ t('privacyPanel.importBackup') }}
        </button>
        <input
          ref="backupInput"
          class="sr-only"
          type="file"
          accept="application/json,.json"
          :aria-label="t('privacyPanel.importBackup')"
          @change="onBackupSelected"
        />
      </div>

      <p v-if="importError" class="alert alert-error" role="alert">{{ t(importError) }}</p>
      <div v-if="importReport" class="alert alert-success" role="status">
        {{
          t('privacyPanel.importDone', {
            documents: importReport.documents,
            addresses: importReport.addresses,
            assets: importReport.assets,
          })
        }}
        <span v-if="importReport.issues.length">
          {{ t('privacyPanel.importSkipped', { count: importReport.issues.length }) }}
        </span>
      </div>
    </div>

    <div class="privacy-card">
      <h2>{{ t('privacyPanel.documents') }}</h2>
      <ul class="resource-links">
        <li>
          <a :href="publicResourceLinks.privacy">{{ t('settings.privacyPolicy') }}</a>
        </li>
        <li>
          <a :href="publicResourceLinks.dataDeletion">{{ t('settings.deletionGuide') }}</a>
        </li>
        <li>
          <a :href="privacyHref">{{ t('settings.privacyContact') }}</a>
        </li>
      </ul>
    </div>

    <div class="privacy-card">
      <h2 class="danger-heading">{{ t('privacyPanel.dangerZone') }}</h2>

      <div class="danger-action">
        <strong>{{ t('settings.deleteData') }}</strong>
        <p>{{ t('privacyPanel.deleteDataHint') }}</p>
        <div v-if="!deletePending" class="settings-actions">
          <button class="btn btn-error" type="button" @click="deletePending = true">
            {{ t('settings.deleteData') }}
          </button>
        </div>
        <div
          v-else
          class="deletion-confirmation"
          role="group"
          :aria-label="t('settings.confirmTitle')"
        >
          <strong>{{ t('settings.confirmTitle') }}</strong>
          <p>{{ t('settings.confirmText') }}</p>
          <div class="settings-actions">
            <button class="btn btn-error" type="button" :disabled="busy" @click="deleteLocalData">
              {{ t('settings.confirmDelete') }}
            </button>
            <button class="btn btn-outline" type="button" @click="deletePending = false">
              {{ t('settings.cancel') }}
            </button>
          </div>
        </div>
        <p v-if="deleteDone" class="alert alert-success" role="status">
          {{ t('settings.deleted') }}
        </p>
      </div>

      <div class="danger-action">
        <strong>{{ t('privacyPanel.resetSettings') }}</strong>
        <p>{{ t('privacyPanel.resetSettingsHint') }}</p>
        <div v-if="!resetPending" class="settings-actions">
          <button class="btn btn-error btn-outline" type="button" @click="resetPending = true">
            {{ t('privacyPanel.resetSettings') }}
          </button>
        </div>
        <div
          v-else
          class="deletion-confirmation"
          role="group"
          :aria-label="t('privacyPanel.resetConfirmTitle')"
        >
          <strong>{{ t('privacyPanel.resetConfirmTitle') }}</strong>
          <p>{{ t('privacyPanel.resetConfirmText') }}</p>
          <div class="settings-actions">
            <button class="btn btn-error" type="button" @click="resetSettings">
              {{ t('privacyPanel.resetConfirm') }}
            </button>
            <button class="btn btn-outline" type="button" @click="resetPending = false">
              {{ t('settings.cancel') }}
            </button>
          </div>
        </div>
        <p v-if="resetDone" class="alert alert-success" role="status">
          {{ t('privacyPanel.resetDone') }}
        </p>
      </div>

      <p v-if="library.error" class="alert alert-error" role="alert">{{ t(library.error) }}</p>
    </div>
  </section>
</template>
