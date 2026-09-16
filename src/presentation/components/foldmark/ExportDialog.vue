<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import AppDialog from '@/presentation/components/AppDialog.vue';
import AppIcon from '@/presentation/components/AppIcon.vue';
import type { IconName } from '@/presentation/icons/iconNames.generated';
import { downloadText, safeFilename } from '@/presentation/download';
import { useWorkspaceStore } from '@/presentation/stores/workspaceStore';

/**
 * Export (R13-009): the formats a document can leave the app in, one per row.
 *
 * - **PDF** hands over to the print dialog with the "save as PDF" hint — the
 *   browser makes the PDF, Foldmark lays out the page.
 * - **Markdown** downloads the canonical file: front matter plus body,
 *   readable without Foldmark and importable without loss.
 * - **ODT** and a full **backup** are listed so a reader knows they are
 *   planned (roadmap R09-005, R13-033), and disabled so nobody hunts for them.
 */
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; printAsPdf: [] }>();

const workspace = useWorkspaceStore();
const { t } = useI18n();

const document = computed(() => workspace.document);
const choice = ref<'pdf' | 'markdown'>('pdf');

/** The rows of the dialog: what each one is, whether it is available yet. */
const FORMATS: readonly {
  id: 'pdf' | 'markdown' | 'odt' | 'backup';
  icon: IconName;
  ready: boolean;
}[] = [
  { id: 'pdf', icon: 'pdf', ready: true },
  { id: 'markdown', icon: 'free-document', ready: true },
  { id: 'odt', icon: 'letter', ready: false },
  { id: 'backup', icon: 'archive', ready: false },
];

watch(
  () => props.open,
  (open) => {
    if (open) workspace.target = choice.value === 'markdown' ? 'markdown' : 'pdf';
  },
  { immediate: true },
);

watch(choice, (next) => {
  workspace.target = next === 'markdown' ? 'markdown' : 'pdf';
});

/** Free asset placements do not travel in a Markdown file; the user is told. */
const placementsNotPortable = computed(
  () => choice.value === 'markdown' && (document.value?.assetPlacements.length ?? 0) > 0,
);

function exportMarkdown(): void {
  const current = document.value;
  if (!current) return;
  // The profile's sheet travels as Pandoc's `papersize`/`geometry` (change 0017).
  const profile = workspace.profile;
  downloadText(
    services.documents.encode(
      current,
      profile ? { page: profile.page, margins: profile.margins } : undefined,
    ),
    safeFilename(current.title, 'md'),
    'text/markdown',
  );
  emit('close');
}

function run(): void {
  if (choice.value === 'markdown') exportMarkdown();
  else emit('printAsPdf');
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="t('exportDialog.title')"
    size="sm"
    dialog-class="export-format-dialog"
    @close="emit('close')"
  >
    <template v-if="document">
      <fieldset class="export-formats">
        <legend class="sr-only">{{ t('exportDialog.formatLabel') }}</legend>
        <label
          v-for="format in FORMATS"
          :key="format.id"
          class="export-format"
          :class="{ 'is-disabled': !format.ready, 'is-active': choice === format.id }"
        >
          <input
            type="radio"
            class="radio radio-sm"
            name="export-format"
            :value="format.id"
            :checked="choice === format.id"
            :disabled="!format.ready"
            @change="choice = format.id as 'pdf' | 'markdown'"
          />
          <AppIcon :name="format.icon" size="lg" />
          <span class="export-format-text">
            <strong>{{ t(`exportDialog.format.${format.id}.name`) }}</strong>
            <small>{{ t(`exportDialog.format.${format.id}.hint`) }}</small>
          </span>
        </label>
      </fieldset>

      <p v-if="placementsNotPortable" class="alert alert-warning" role="status">
        {{ t('export.placementsNotPortable') }}
      </p>
    </template>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">
        {{ t('dialog.cancel') }}
      </button>
      <button type="button" class="btn btn-primary" data-testid="export-confirm" @click="run">
        <AppIcon name="export" />
        <span>{{
          choice === 'markdown' ? t('export.downloadMarkdown') : t('exportDialog.continueToPdf')
        }}</span>
      </button>
    </template>
  </AppDialog>
</template>
