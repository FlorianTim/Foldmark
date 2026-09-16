<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import { EmailHandoffService, type EmailHandoff } from '@/application/usecases/EmailHandoffService';
import { HeaderInjectionError, isValidEmailAddress } from '@/domain/email/EmailHeaders';
import type { ExportTarget } from '@/domain/export/ExportTarget';
import AppDialog from '@/presentation/components/AppDialog.vue';
import AppIcon from '@/presentation/components/AppIcon.vue';
import type { IconName } from '@/presentation/icons/iconNames.generated';
import { copyToClipboard, downloadBlob } from '@/presentation/download';
import { useWorkspaceStore } from '@/presentation/stores/workspaceStore';

/**
 * Email (R13-009, R13-010): the message is prepared and handed to the user's
 * mail client. Nothing is sent, and the wording says so.
 *
 * Three ways, one per row: a **PDF attachment** (the print dialog makes the
 * PDF; the mail client gets subject and recipient), an **HTML mail** and a
 * **plain-text mail**. The recipient address comes from the document — set
 * when a contact with an email address is chosen as recipient, editable here.
 * A missing address is a warning, never a blocker: the mail client opens
 * without a recipient, which is exactly what a person who wants to look
 * the address up there expects (AC-OUT-005).
 */
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; printAsPdf: [] }>();

const workspace = useWorkspaceStore();
const { t } = useI18n();

type Mode = 'pdf-attachment' | 'html' | 'plain-text';
const MODES: readonly { id: Mode; icon: IconName; target: ExportTarget }[] = [
  { id: 'pdf-attachment', icon: 'pdf-attachment', target: 'email-pdf' },
  { id: 'html', icon: 'html-mail', target: 'email-html' },
  { id: 'plain-text', icon: 'plain-mail', target: 'email-text' },
];

const document = computed(() => workspace.document);
const mode = ref<Mode>('pdf-attachment');
const handoff = ref<EmailHandoff | null>(null);
const handoffError = ref<string | null>(null);
const copied = ref(false);
const busy = ref(false);

const to = computed(() => document.value?.metadata.emailTo ?? '');
const toMissing = computed(() => !to.value.trim());
const toInvalid = computed(() => !toMissing.value && !isValidEmailAddress(to.value.trim()));
const blocked = computed(() => workspace.blockingIssues.length > 0);

/** The document's preferred mode is remembered on the document itself. */
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    const preferred = document.value?.exportPreferences.emailMode;
    mode.value = preferred === 'eml' || preferred === undefined ? 'pdf-attachment' : preferred;
    workspace.target = MODES.find((entry) => entry.id === mode.value)?.target ?? 'email-pdf';
    prepare();
  },
  { immediate: true },
);

watch(mode, (next) => {
  workspace.target = MODES.find((entry) => entry.id === next)?.target ?? 'email-pdf';
  if (document.value) {
    workspace.patch({
      exportPreferences: { ...document.value.exportPreferences, emailMode: next },
    });
  }
});

watch(document, () => prepare(), { deep: true });

function prepare(): void {
  const current = document.value;
  if (!current) return;
  copied.value = false;
  try {
    handoff.value = services.email.prepare(current, {
      sender: workspace.sender ?? undefined,
      fallbackSubject: t('export.defaultSubject'),
    });
    handoffError.value = null;
  } catch (error) {
    handoff.value = null;
    handoffError.value =
      error instanceof HeaderInjectionError ? 'export.headerUnsafe' : 'errors.unexpected';
  }
}

function setTo(value: string): void {
  workspace.patchMetadata({ emailTo: value.trim() || undefined });
}

function toggleEmailPdfMarks(value: boolean): void {
  if (!document.value) return;
  workspace.patch({
    exportPreferences: {
      ...document.value.exportPreferences,
      emailPdfIncludesPhysicalMarks: value,
    },
  });
}

/** For the attachment: a mailto with subject only, since the PDF is attached by hand. */
const subjectOnlyMailto = computed(() => {
  const current = handoff.value;
  if (!current) return null;
  const address = toMissing.value || toInvalid.value ? '' : to.value.trim();
  return `mailto:${encodeURIComponent(address)}?subject=${encodeURIComponent(current.subject)}`;
});

const bodyText = computed(() =>
  mode.value === 'html' ? (handoff.value?.html ?? '') : (handoff.value?.plainText ?? ''),
);

async function copyBody(): Promise<void> {
  copied.value = await copyToClipboard(bodyText.value);
}

async function downloadEml(): Promise<void> {
  const current = handoff.value;
  if (!current) return;
  busy.value = true;
  try {
    const blob = await services.email.buildEml(current, { from: workspace.sender?.email });
    downloadBlob(blob, EmailHandoffService.filenameFor(current.subject, 'eml'));
    handoffError.value = null;
  } catch (error) {
    handoffError.value =
      error instanceof HeaderInjectionError ? 'export.headerUnsafe' : 'errors.unexpected';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="t('emailDialog.title')"
    size="md"
    dialog-class="email-dialog"
    @close="emit('close')"
  >
    <template v-if="document">
      <p>{{ t('export.emailExplain') }}</p>

      <fieldset class="export-formats">
        <legend class="sr-only">{{ t('emailDialog.modeLabel') }}</legend>
        <label
          v-for="entry in MODES"
          :key="entry.id"
          class="export-format"
          :class="{ 'is-active': mode === entry.id }"
        >
          <input
            type="radio"
            class="radio radio-sm"
            name="email-mode"
            :value="entry.id"
            :checked="mode === entry.id"
            @change="mode = entry.id"
          />
          <AppIcon :name="entry.icon" size="lg" />
          <span class="export-format-text">
            <strong>{{ t(`emailDialog.mode.${entry.id}.name`) }}</strong>
            <small>{{ t(`emailDialog.mode.${entry.id}.hint`) }}</small>
          </span>
        </label>
      </fieldset>

      <label class="field">
        <span>{{ t('emailDialog.to') }}</span>
        <input
          class="input input-bordered"
          type="email"
          :value="to"
          maxlength="254"
          autocomplete="off"
          @change="setTo(($event.target as HTMLInputElement).value)"
        />
      </label>
      <p v-if="toMissing" class="alert alert-warning" role="status">
        {{ t('emailDialog.toMissing') }}
      </p>
      <p v-else-if="toInvalid" class="alert alert-error" role="alert">
        {{ t('validation.document.emailToInvalid') }}
      </p>

      <p v-if="handoffError" class="alert alert-error" role="alert">{{ t(handoffError) }}</p>

      <template v-if="handoff">
        <label class="field">
          <span>{{ t('export.subject') }}</span>
          <input class="input input-bordered" type="text" :value="handoff.subject" readonly />
        </label>

        <template v-if="mode === 'pdf-attachment'">
          <ol class="export-checklist">
            <li>{{ t('emailDialog.pdfStep1') }}</li>
            <li>{{ t('emailDialog.pdfStep2') }}</li>
            <li>{{ t('emailDialog.pdfStep3') }}</li>
          </ol>
          <label class="field-inline">
            <input
              type="checkbox"
              class="checkbox"
              :checked="document.exportPreferences.emailPdfIncludesPhysicalMarks"
              @change="toggleEmailPdfMarks(($event.target as HTMLInputElement).checked)"
            />
            <span>{{ t('export.emailPdfMarks') }}</span>
          </label>
        </template>

        <label v-else class="field">
          <span>{{ mode === 'html' ? t('export.html') : t('export.plainText') }}</span>
          <textarea class="textarea textarea-bordered" rows="8" :value="bodyText" readonly />
        </label>

        <p v-if="copied" class="alert alert-success" role="status">{{ t('export.copied') }}</p>
      </template>

      <p class="export-note">{{ t('export.notSentNote') }}</p>
    </template>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">
        {{ t('dialog.cancel') }}
      </button>
      <template v-if="mode === 'pdf-attachment'">
        <a
          v-if="subjectOnlyMailto"
          class="btn btn-outline"
          :href="subjectOnlyMailto"
          data-testid="email-open-client"
        >
          <AppIcon name="mail" />
          <span>{{ t('export.openMailClient') }}</span>
        </a>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="blocked"
          @click="emit('printAsPdf')"
        >
          <AppIcon name="pdf" />
          <span>{{ t('emailDialog.makePdf') }}</span>
        </button>
      </template>
      <template v-else-if="handoff">
        <button type="button" class="btn btn-outline" :disabled="busy" @click="downloadEml">
          {{ t('export.downloadEml') }}
        </button>
        <button type="button" class="btn btn-outline" @click="copyBody">
          {{ t('export.copyBody') }}
        </button>
        <a
          v-if="mode === 'plain-text' && handoff.mailtoUrl && !toInvalid"
          class="btn btn-primary"
          :href="handoff.mailtoUrl"
          data-testid="email-open-client"
        >
          <AppIcon name="mail" />
          <span>{{ t('export.openMailClient') }}</span>
        </a>
        <span v-else-if="mode === 'plain-text'" class="export-note">
          {{ t('export.mailtoTooLong') }}
        </span>
      </template>
    </template>
  </AppDialog>
</template>
