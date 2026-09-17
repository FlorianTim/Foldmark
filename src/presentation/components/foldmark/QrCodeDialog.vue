<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import { FoldmarkError } from '@/application/errors/FoldmarkErrors';
import type { FeatureEntitlement } from '@/domain/entitlement/premiumFeatures';
import { IMAGE_ALIGNMENTS, QR_SIZE_MM, type ImageAlignment } from '@/domain/markdown/directives';
import {
  composeQrPayload,
  decomposeQrPayload,
  encodeQrMatrix,
  qrModuleSizeMm,
  qrPrintQuality,
  QR_ERROR_CORRECTION_LEVELS,
  type QrCodeSpec,
  type QrErrorCorrection,
  type QrPayloadKind,
} from '@/domain/qr/qrCode';
import AppDialog from '@/presentation/components/AppDialog.vue';
import AppIcon from '@/presentation/components/AppIcon.vue';
import QrCodeFigure from '@/presentation/components/QrCodeFigure.vue';

/**
 * Inserting or editing a QR code (R15-011, change 0040). The writer picks
 * what the code carries — a web address, an e-mail address with an optional
 * subject, a phone number, or a line of text — and sees the code as it will
 * print, with the module size and a warning when a printer would not resolve
 * it. The premium state is shown as the service reports it; whether a new
 * code counts is the service's decision, taken on insert, never on preview.
 */
const props = defineProps<{ open: boolean; initial: QrCodeSpec | null }>();
const emit = defineEmits<{ close: []; insert: [spec: QrCodeSpec]; update: [spec: QrCodeSpec] }>();
const { t } = useI18n();

const KINDS: readonly QrPayloadKind[] = ['url', 'email', 'phone', 'text'];

const kind = ref<QrPayloadKind>('url');
const text = ref('');
const subject = ref('');
const sizeMm = ref<number>(QR_SIZE_MM.fallback);
const align = ref<ImageAlignment>('left');
const errorCorrection = ref<QrErrorCorrection>('M');
const state = ref<FeatureEntitlement | null>(null);
const submitted = ref(false);

const editing = computed(() => props.initial !== null);
const payload = computed(() =>
  composeQrPayload({ kind: kind.value, text: text.value, subject: subject.value }),
);
const size = computed(() =>
  Math.min(Math.max(Math.round(sizeMm.value || 0), QR_SIZE_MM.min), QR_SIZE_MM.max),
);

/** What the service says about the request right now: the spec, or the field that fails. */
const check = computed<{ spec: QrCodeSpec } | { error: string }>(() => {
  try {
    return {
      spec: services.qrCodes.prepare({
        payload: payload.value,
        sizeMm: size.value,
        align: align.value,
        errorCorrection: errorCorrection.value,
      }),
    };
  } catch (error) {
    return {
      error:
        error instanceof FoldmarkError && typeof error.params?.field === 'string'
          ? error.params.field
          : 'payload.empty',
    };
  }
});
const spec = computed(() => ('spec' in check.value ? check.value.spec : null));
const problem = computed(() => ('error' in check.value ? check.value.error : null));
const matrix = computed(() =>
  spec.value ? encodeQrMatrix(spec.value.payload, spec.value.errorCorrection) : null,
);
const moduleMm = computed(() => (matrix.value ? qrModuleSizeMm(size.value, matrix.value) : 0));
const quality = computed(() => (matrix.value ? qrPrintQuality(size.value, matrix.value) : 'ok'));

/** The premium wording: the free allowance left, or the test-phase note. */
const premiumText = computed(() => {
  const current = state.value;
  if (!current || editing.value) return null;
  if (current.mode === 'free' && current.limit !== undefined) {
    return t('premium.qr.free', {
      remaining: current.limit - (current.used ?? 0),
      limit: current.limit,
    });
  }
  return t(`premium.qr.${current.mode}`, { limit: current.limit ?? 0 });
});

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    submitted.value = false;
    state.value = services.qrCodes.state();
    const initial = props.initial;
    if (initial) {
      const fields = decomposeQrPayload(initial.payload);
      kind.value = fields.kind;
      text.value = fields.text;
      subject.value = fields.subject ?? '';
      sizeMm.value = initial.sizeMm;
      align.value = initial.align;
      errorCorrection.value = initial.errorCorrection;
    } else {
      kind.value = 'url';
      text.value = '';
      subject.value = '';
      sizeMm.value = QR_SIZE_MM.fallback;
      align.value = 'left';
      errorCorrection.value = 'M';
    }
  },
);

function submit(): void {
  submitted.value = true;
  if (!spec.value) return;
  const request = {
    payload: spec.value.payload,
    sizeMm: spec.value.sizeMm,
    align: spec.value.align,
    errorCorrection: spec.value.errorCorrection,
  };
  try {
    if (editing.value) emit('update', services.qrCodes.prepare(request));
    else emit('insert', services.qrCodes.generate(request));
  } catch {
    // The gate or a late check refused: the state shown is refreshed, nothing is inserted.
    state.value = services.qrCodes.state();
    return;
  }
  emit('close');
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="editing ? t('editor.qrEditTitle') : t('editor.qrTitle')"
    size="lg"
    @close="emit('close')"
  >
    <!-- `novalidate`: the service validates, and a bare `example.org` is a valid address here. -->
    <form id="qr-code-form" class="qr-form" novalidate @submit.prevent="submit">
      <div class="qr-fields">
        <fieldset class="field-radios">
          <legend class="field-legend">{{ t('editor.qrKind') }}</legend>
          <label v-for="option in KINDS" :key="option" class="field-inline">
            <input
              v-model="kind"
              type="radio"
              class="radio radio-sm"
              :value="option"
              :data-testid="`qr-kind-${option}`"
            />
            <span>{{ t(`editor.qrKinds.${option}`) }}</span>
          </label>
        </fieldset>

        <label class="field">
          <span>{{ t(`editor.qrContent.${kind}`) }}</span>
          <input
            v-model="text"
            class="input input-bordered input-sm"
            :type="
              kind === 'url'
                ? 'url'
                : kind === 'email'
                  ? 'email'
                  : kind === 'phone'
                    ? 'tel'
                    : 'text'
            "
            :inputmode="kind === 'phone' ? 'tel' : undefined"
            autocomplete="off"
            data-testid="qr-content"
          />
        </label>
        <label v-if="kind === 'email'" class="field">
          <span>{{ t('editor.qrEmailSubject') }}</span>
          <input v-model="subject" class="input input-bordered input-sm" type="text" />
        </label>
        <p v-if="problem && (submitted || text.trim())" class="field-error" role="alert">
          {{ t(`editor.qrInvalid.${problem.replace('payload.', '')}`) }}
        </p>

        <div class="qr-layout">
          <label class="field">
            <span>{{ t('editor.qrSize') }}</span>
            <input
              v-model.number="sizeMm"
              class="input input-bordered input-sm image-width"
              type="number"
              :min="QR_SIZE_MM.min"
              :max="QR_SIZE_MM.max"
              step="1"
              data-testid="qr-size"
            />
          </label>
          <label class="field">
            <span>{{ t('editor.qrErrorCorrection') }}</span>
            <select
              v-model="errorCorrection"
              class="select select-bordered select-sm"
              data-testid="qr-ec"
            >
              <option v-for="level in QR_ERROR_CORRECTION_LEVELS" :key="level" :value="level">
                {{ t(`editor.qrEc.${level}`) }}
              </option>
            </select>
          </label>
        </div>
        <fieldset class="field-radios">
          <legend class="field-legend">{{ t('editor.qrAlign') }}</legend>
          <label v-for="option in IMAGE_ALIGNMENTS" :key="option" class="field-inline">
            <input
              v-model="align"
              type="radio"
              class="radio radio-sm"
              :value="option"
              :data-testid="`qr-align-${option}`"
            />
            <span>{{ t(`editor.imageAlign.${option}`) }}</span>
          </label>
        </fieldset>
        <p class="qr-hint">{{ t('editor.qrHint') }}</p>
      </div>

      <div class="qr-preview" data-testid="qr-preview">
        <span class="field-legend">{{ t('editor.qrPreview') }}</span>
        <div class="qr-preview-sheet">
          <QrCodeFigure
            v-if="spec && matrix"
            :payload="spec.payload"
            :size-mm="spec.sizeMm"
            align="left"
            :error-correction="spec.errorCorrection"
          />
          <span v-else class="qr-preview-empty">{{ t('editor.qrEmpty') }}</span>
        </div>
        <p v-if="matrix" class="qr-facts" data-testid="qr-facts">
          {{ t('editor.qrModule', { size: moduleMm.toFixed(2), version: matrix.version }) }}
        </p>
        <p v-if="quality === 'small'" class="alert alert-warning qr-warning" role="status">
          {{ t('editor.qrSmall') }}
        </p>
        <p v-if="premiumText" class="premium-note" data-testid="qr-premium">
          <AppIcon name="pro" size="sm" />
          <span>{{ premiumText }}</span>
        </p>
      </div>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">
        {{ t('dialog.cancel') }}
      </button>
      <button
        type="submit"
        form="qr-code-form"
        class="btn btn-primary"
        :disabled="!spec"
        data-testid="qr-insert"
      >
        <AppIcon name="qr-code" />
        <span>{{ editing ? t('editor.qrUpdate') : t('editor.qrInsert') }}</span>
      </button>
    </template>
  </AppDialog>
</template>
