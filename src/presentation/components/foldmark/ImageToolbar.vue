<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ImageLayoutChange } from '@/application/ports/RichTextEditorPort';
import { IMAGE_ALIGNMENTS, type ImageLayout } from '@/domain/markdown/directives';
import AppIcon from '@/presentation/components/AppIcon.vue';
import type { IconName } from '@/presentation/icons/iconNames.generated';

/**
 * The strip under a selected image (R14-015): alignment, size presets as a
 * share of the text width, smaller / larger steps, and "original size". Every
 * button is one layout change the editor applies to the selected node; the
 * Markdown behind it is the image's attribute block.
 */
const props = defineProps<{ layout: ImageLayout }>();
const emit = defineEmits<{ change: [change: ImageLayoutChange['layout']] }>();
const { t } = useI18n();

const ALIGN_ICON: Readonly<Record<(typeof IMAGE_ALIGNMENTS)[number], IconName>> = {
  left: 'align-left',
  center: 'align-center',
  right: 'align-right',
};

/** The size presets: a quarter, a half, three quarters, the full text width. */
const PRESETS = [25, 50, 75, 100] as const;

const currentAlign = computed(() => props.layout.align ?? 'left');

/** What the size reads right now, for the label between the steps. */
const sizeLabel = computed(() => {
  if (props.layout.widthPercent) return `${props.layout.widthPercent} %`;
  if (props.layout.widthMm) return `${props.layout.widthMm} mm`;
  return t('editor.imageSizeOriginal');
});

/** Smaller or larger: 10 % on a percentage, 10 mm on a millimetre width, from 50 % when unsized. */
function step(direction: -1 | 1): void {
  if (props.layout.widthPercent) {
    emit('change', { widthPercent: props.layout.widthPercent + 10 * direction });
  } else if (props.layout.widthMm) {
    emit('change', { widthMm: props.layout.widthMm + 10 * direction });
  } else {
    emit('change', { widthPercent: direction > 0 ? 100 : 50 });
  }
}
</script>

<template>
  <div class="image-toolbar" role="toolbar" :aria-label="t('editor.imageLayout')">
    <span class="image-toolbar-label">{{ t('editor.imageLayout') }}</span>
    <button
      v-for="align in IMAGE_ALIGNMENTS"
      :key="align"
      type="button"
      class="btn btn-ghost btn-sm btn-square"
      :class="{ 'btn-active': currentAlign === align }"
      :aria-pressed="currentAlign === align"
      :title="t(`editor.imageAlign.${align}`)"
      :aria-label="t(`editor.imageAlign.${align}`)"
      :data-testid="`image-align-${align}`"
      @click="emit('change', { align: align === 'left' ? null : align })"
    >
      <AppIcon :name="ALIGN_ICON[align]" />
    </button>
    <span class="image-toolbar-sep" aria-hidden="true" />
    <button
      v-for="percent in PRESETS"
      :key="percent"
      type="button"
      class="btn btn-ghost btn-sm"
      :class="{ 'btn-active': layout.widthPercent === percent }"
      :aria-pressed="layout.widthPercent === percent"
      :title="
        percent === 100 ? t('editor.imageSizeFull') : t('editor.imageSizePercent', { percent })
      "
      :data-testid="`image-size-${percent}`"
      @click="emit('change', { widthPercent: percent })"
    >
      {{ percent === 100 ? t('editor.imageSizeFull') : `${percent} %` }}
    </button>
    <span class="image-toolbar-sep" aria-hidden="true" />
    <button
      type="button"
      class="btn btn-ghost btn-sm btn-square"
      :title="t('editor.imageSmaller')"
      :aria-label="t('editor.imageSmaller')"
      data-testid="image-smaller"
      @click="step(-1)"
    >
      <span aria-hidden="true">−</span>
    </button>
    <span class="image-toolbar-label" data-testid="image-size-label">{{ sizeLabel }}</span>
    <button
      type="button"
      class="btn btn-ghost btn-sm btn-square"
      :title="t('editor.imageLarger')"
      :aria-label="t('editor.imageLarger')"
      data-testid="image-larger"
      @click="step(1)"
    >
      <span aria-hidden="true">+</span>
    </button>
    <button
      type="button"
      class="btn btn-ghost btn-sm"
      :disabled="!layout.widthMm && !layout.widthPercent"
      :title="t('editor.imageSizeOriginalHint')"
      data-testid="image-size-original"
      @click="emit('change', { widthMm: null, widthPercent: null })"
    >
      {{ t('editor.imageSizeOriginal') }}
    </button>
  </div>
</template>
