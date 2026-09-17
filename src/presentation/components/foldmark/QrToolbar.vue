<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IMAGE_ALIGNMENTS } from '@/domain/markdown/directives';
import type { QrCodeSpec } from '@/domain/qr/qrCode';
import AppIcon from '@/presentation/components/AppIcon.vue';
import type { IconName } from '@/presentation/icons/iconNames.generated';

/**
 * The strip under a selected QR code (change 0040): what it encodes, its
 * alignment, and the way into the dialog for everything else. Alignment is
 * applied to the selected node directly, like the image toolbar does; a
 * change of the payload or the size goes through the dialog, where the
 * preview and the print check are.
 */
const props = defineProps<{ spec: QrCodeSpec }>();
const emit = defineEmits<{ change: [spec: QrCodeSpec]; edit: [] }>();
const { t } = useI18n();

const ALIGN_ICON: Readonly<Record<(typeof IMAGE_ALIGNMENTS)[number], IconName>> = {
  left: 'align-left',
  center: 'align-center',
  right: 'align-right',
};

/** The payload, shortened so the strip stays one line. */
const summary = computed(() =>
  props.spec.payload.length > 48 ? `${props.spec.payload.slice(0, 47)}…` : props.spec.payload,
);
</script>

<template>
  <div class="image-toolbar" role="toolbar" :aria-label="t('editor.qr')">
    <span class="image-toolbar-label" data-testid="qr-toolbar-summary">
      {{ t('editor.qr') }}: {{ summary }} · {{ spec.sizeMm }} mm
    </span>
    <button
      v-for="align in IMAGE_ALIGNMENTS"
      :key="align"
      type="button"
      class="btn btn-ghost btn-sm btn-square"
      :class="{ 'btn-active': spec.align === align }"
      :aria-pressed="spec.align === align"
      :title="t(`editor.imageAlign.${align}`)"
      :aria-label="t(`editor.imageAlign.${align}`)"
      :data-testid="`qr-align-toolbar-${align}`"
      @click="emit('change', { ...spec, align })"
    >
      <AppIcon :name="ALIGN_ICON[align]" />
    </button>
    <span class="image-toolbar-sep" aria-hidden="true" />
    <button type="button" class="btn btn-ghost btn-sm" data-testid="qr-edit" @click="emit('edit')">
      <AppIcon name="qr-code" size="sm" />
      <span>{{ t('editor.qrEdit') }}</span>
    </button>
  </div>
</template>
