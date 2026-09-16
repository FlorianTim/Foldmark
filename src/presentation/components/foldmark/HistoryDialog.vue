<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import { groupByDay, type Checkpoint } from '@/domain/document/History';
import AppDialog from '@/presentation/components/AppDialog.vue';
import AppIcon from '@/presentation/components/AppIcon.vue';
import type { IconName } from '@/presentation/icons/iconNames.generated';
import { downloadText, safeFilename } from '@/presentation/download';
import {
  appSettings,
  HISTORY_RETENTION_OPTIONS,
  readSetting,
  writeSetting,
} from '@/presentation/settings/settingsRegistry';
import { useLibraryStore } from '@/presentation/stores/libraryStore';
import { useWorkspaceStore } from '@/presentation/stores/workspaceStore';
import PaperSurface from '@/presentation/components/foldmark/PaperSurface.vue';

/**
 * The document history (R13-023): checkpoints by day, with preview, restore,
 * open as copy and export — a centred modal like every other dialog.
 *
 * Manual saves, imports and the safety copy taken before a restore are
 * **durable** and drawn with a mark; automatic checkpoints are the quiet
 * majority and the only ones the retention rule prunes. The rule is chosen
 * here, next to the list it governs.
 *
 * Restore goes through the service, which first checkpoints the current
 * version — so the list grows by one "restore" entry and nothing is lost.
 * The preview is a real render of the checkpoint's document on the current
 * profile, not a text diff: a letter is judged on paper.
 */
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const workspace = useWorkspaceStore();
const library = useLibraryStore();
const { t, locale } = useI18n();

const checkpoints = ref<readonly Checkpoint[]>([]);
const previewing = ref<Checkpoint | null>(null);
const busy = ref(false);
const notice = ref<string | null>(null);
const retention = ref(readSetting(appSettings.historyAutomaticVersions));

const groups = computed(() => groupByDay(checkpoints.value, locale.value));
const timeFormat = computed(() => new Intl.DateTimeFormat(locale.value, { timeStyle: 'short' }));

const ORIGIN_ICON: Readonly<Record<Checkpoint['origin'], IconName>> = {
  manual: 'save',
  automatic: 'history',
  imported: 'import',
  restore: 'restore',
};

/** The checkpoint's plan on the document's current profile; its first page is shown. */
const previewPlan = computed(() => {
  const checkpoint = previewing.value;
  const profile = workspace.profile;
  if (!checkpoint || !profile) return null;
  return services.documents.plan({
    document: checkpoint.document,
    profile,
    sender: workspace.sender ?? undefined,
    assets: workspace.assets,
    target: 'print',
    mode: 'screen',
  });
});
const previewPage = computed(() => previewPlan.value?.pages[0] ?? null);

async function load(): Promise<void> {
  const id = workspace.document?.id;
  if (!id) return;
  checkpoints.value = (await workspace.runQuietly(() => services.history.list(id))) ?? [];
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      notice.value = null;
      previewing.value = null;
      void load();
    }
  },
);

function setRetention(raw: string): void {
  const value = Number(raw);
  if (!HISTORY_RETENTION_OPTIONS.includes(value as (typeof HISTORY_RETENTION_OPTIONS)[number]))
    return;
  retention.value = value as (typeof HISTORY_RETENTION_OPTIONS)[number];
  writeSetting(appSettings.historyAutomaticVersions, retention.value);
}

async function restore(checkpoint: Checkpoint): Promise<void> {
  busy.value = true;
  const restored = await workspace.runQuietly(() => services.history.restore(checkpoint.id));
  if (restored) {
    await workspace.replaceWith(restored);
    notice.value = 'history.restored';
    await load();
  }
  busy.value = false;
}

async function openAsCopy(checkpoint: Checkpoint): Promise<void> {
  busy.value = true;
  const copy = await workspace.runQuietly(() =>
    services.history.openAsCopy(
      checkpoint.id,
      t('documents.copyOf', { title: checkpoint.document.title }),
    ),
  );
  busy.value = false;
  if (!copy) return;
  await library.refreshDocuments();
  emit('close');
  await workspace.open(copy.id);
}

async function exportCheckpoint(checkpoint: Checkpoint): Promise<void> {
  const file = await workspace.runQuietly(() => services.history.export(checkpoint.id));
  if (file) downloadText(file.content, safeFilename(file.filename, 'md'), 'text/markdown');
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="t('history.title')"
    size="xl"
    dialog-class="history-dialog"
    @close="emit('close')"
  >
    <p class="export-note">{{ t('history.explain') }}</p>
    <p v-if="notice" class="alert alert-success" role="status">{{ t(notice) }}</p>
    <p v-if="workspace.error" class="alert alert-error" role="alert">{{ t(workspace.error) }}</p>

    <label class="field history-retention">
      <span>{{ t('history.retention') }}</span>
      <select
        class="select select-bordered select-sm"
        :value="retention"
        @change="setRetention(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in HISTORY_RETENTION_OPTIONS" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
      <small class="field-hint">{{ t('history.retentionHint') }}</small>
    </label>

    <p v-if="groups.length === 0" class="empty-state">{{ t('history.empty') }}</p>

    <div v-else class="history-layout">
      <div class="history-list">
        <section v-for="group in groups" :key="group.day" class="history-day">
          <h3>{{ group.day }}</h3>
          <ul>
            <li
              v-for="checkpoint in group.checkpoints"
              :key="checkpoint.id"
              class="history-entry"
              :class="{
                active: previewing?.id === checkpoint.id,
                'is-durable': checkpoint.origin !== 'automatic',
              }"
            >
              <button type="button" class="history-summary" @click="previewing = checkpoint">
                <AppIcon :name="ORIGIN_ICON[checkpoint.origin]" size="sm" />
                <strong>{{ timeFormat.format(new Date(checkpoint.createdAt)) }}</strong>
                <span>{{ t(`history.origin.${checkpoint.origin}`) }}</span>
              </button>
              <div class="history-actions">
                <button
                  type="button"
                  class="btn btn-xs btn-outline"
                  :disabled="busy"
                  @click="restore(checkpoint)"
                >
                  {{ t('history.restore') }}
                </button>
                <button
                  type="button"
                  class="btn btn-xs btn-ghost"
                  :disabled="busy"
                  @click="openAsCopy(checkpoint)"
                >
                  {{ t('history.openAsCopy') }}
                </button>
                <button
                  type="button"
                  class="btn btn-xs btn-ghost"
                  @click="exportCheckpoint(checkpoint)"
                >
                  {{ t('history.export') }}
                </button>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <div v-if="previewPage" class="history-preview" :aria-label="t('history.preview')">
        <div class="history-preview-sheet">
          <PaperSurface
            :page="previewPage"
            :asset-urls="{}"
            :show-guides="false"
            :theme="previewPlan?.theme"
            :locale="previewPlan?.locale"
            medium="screen"
          />
        </div>
      </div>
      <p v-else class="empty-state history-preview-hint">{{ t('history.pickToPreview') }}</p>
    </div>

    <template #footer>
      <button type="button" class="btn btn-primary" @click="emit('close')">
        {{ t('dialog.close') }}
      </button>
    </template>
  </AppDialog>
</template>
