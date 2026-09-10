<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { createContactHref, publicResourceLinks } from '@/config/publicResources';
import { resetAllSettings } from '@/presentation/settings/settingsRegistry';
import { useTodoStore } from '@/presentation/stores/todoStore';

/**
 * Privacy and data: what is stored, the published documents, and the two
 * ways to take it all back.
 *
 * This view exists because the app's most reassuring property — that
 * everything stays in this browser — was stated only in a dismissible
 * banner. It is also the answer a published privacy policy points at when
 * it promises an in-app deletion path.
 *
 * It owns **both** destructive actions, and they are deliberately separate:
 * one clears content and keeps preferences, the other clears preferences and
 * keeps content. A shared confirmation is how somebody deletes the wrong
 * thing.
 */
const emit = defineEmits<{ settingsReset: [] }>();

const { t } = useI18n();
const store = useTodoStore();

const deletePending = ref(false);
const deleteDone = ref(false);
const resetPending = ref(false);
const resetDone = ref(false);

const privacyHref = createContactHref('privacy', 'Privacy question');

async function deleteLocalData(): Promise<void> {
  await store.clear();
  if (store.error) return;
  deletePending.value = false;
  deleteDone.value = true;
}

function resetSettings(): void {
  resetAllSettings();
  resetPending.value = false;
  resetDone.value = true;
  // Locale and theme are held in module state; the shell re-reads them.
  emit('settingsReset');
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
            <button class="btn btn-error" type="button" @click="deleteLocalData">
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

      <p v-if="store.error" class="alert alert-error" role="alert">{{ t(store.error) }}</p>
    </div>
  </section>
</template>
