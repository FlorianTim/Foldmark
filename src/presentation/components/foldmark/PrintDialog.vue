<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { appConfig } from '@/config';
import AppDialog from '@/presentation/components/AppDialog.vue';
import AppIcon from '@/presentation/components/AppIcon.vue';
import { printPage } from '@/presentation/printPage';
import { useWorkspaceStore } from '@/presentation/stores/workspaceStore';

/**
 * Print — and nothing else (R13-009). The profile, the printed marks, the
 * page numbers and the one reminder a browser cannot give itself: scaling at
 * 100 %. No address check: a letter without a recipient prints fine, and an
 * empty sheet through the printer is how fold marks are verified.
 *
 * "Save as PDF" is a destination inside the browser's print dialog, which is
 * why the export dialog sends PDF here with a hint rather than pretending to
 * generate one.
 */
const props = defineProps<{ open: boolean; pdfHint?: boolean }>();
const emit = defineEmits<{ close: [] }>();

const workspace = useWorkspaceStore();
const { t, locale } = useI18n();
const dialog = ref<InstanceType<typeof AppDialog> | null>(null);

const document = computed(() => workspace.document);
const profileName = computed(() =>
  workspace.profile ? workspace.profile.name[locale.value === 'de' ? 'de' : 'en'] : '',
);
const blocked = computed(() => workspace.blockingIssues.length > 0);
const pageCount = computed(() => workspace.printPlan?.pages.length ?? 0);

/** The findings are computed for the print target while the dialog is open. */
watch(
  () => props.open,
  (open) => {
    if (open) workspace.target = 'print';
  },
  { immediate: true },
);

function setMarks(on: boolean): void {
  if (!document.value) return;
  workspace.patch({
    exportPreferences: { ...document.value.exportPreferences, pdfIncludesPhysicalMarks: on },
  });
}

async function print(): Promise<void> {
  const host = dialog.value;
  const run = (): Promise<void> => printPage({ document: document.value, appName: appConfig.name });
  if (host) await host.withClosed(run);
  else await run();
}
</script>

<template>
  <AppDialog
    ref="dialog"
    :open="open"
    :title="pdfHint ? t('print.titlePdf') : t('print.title')"
    size="sm"
    dialog-class="print-dialog"
    @close="emit('close')"
  >
    <template v-if="document">
      <p v-if="pdfHint" class="alert alert-info" role="status">{{ t('print.pdfExplain') }}</p>
      <p v-else>{{ t('print.explain') }}</p>

      <dl class="print-facts">
        <dt>{{ t('print.profile') }}</dt>
        <dd>{{ profileName }}</dd>
        <dt>{{ t('print.pages') }}</dt>
        <dd>{{ t('print.pageCount', { count: pageCount }) }}</dd>
        <dt>{{ t('print.pageNumbers') }}</dt>
        <dd>
          {{ t(`metadata.pageNumbers.formats.${document.printOptions.pageNumbers.format}`) }}
        </dd>
      </dl>

      <label class="field-inline">
        <input
          type="checkbox"
          class="checkbox"
          :checked="document.exportPreferences.pdfIncludesPhysicalMarks"
          @change="setMarks(($event.target as HTMLInputElement).checked)"
        />
        <span>{{ t('export.includeMarks') }}</span>
      </label>

      <ul class="export-checklist">
        <li>{{ t('export.printScaling') }}</li>
        <li>{{ t('export.printBackground') }}</li>
        <li v-if="workspace.profile?.duplex">
          {{ t(`export.duplex.${workspace.profile.duplex.flip}`) }}
        </li>
      </ul>

      <p v-if="blocked" class="alert alert-error" role="alert">{{ t('print.blocked') }}</p>
    </template>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">
        {{ t('dialog.cancel') }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="blocked"
        data-testid="print-confirm"
        @click="print"
      >
        <AppIcon name="print" />
        <span>{{ pdfHint ? t('print.openForPdf') : t('print.print') }}</span>
      </button>
    </template>
  </AppDialog>
</template>
