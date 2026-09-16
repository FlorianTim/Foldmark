<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppIcon from '@/presentation/components/AppIcon.vue';
import type { EditorView } from '@/presentation/settings/settingsRegistry';

/**
 * Visual / Markdown as one control (R14-006): a `switch` with a label on
 * either side and the thumb on the active one — not two buttons that happen
 * to be exclusive. Space and Enter flip it; Left and Right choose a side, so
 * the keyboard can name the view rather than toggle blindly. The one-line
 * explanation of each view is the control's tooltip, not permanent text.
 */
const props = defineProps<{ modelValue: EditorView }>();
const emit = defineEmits<{ 'update:modelValue': [value: EditorView] }>();
const { t } = useI18n();

function set(next: EditorView): void {
  if (next !== props.modelValue) emit('update:modelValue', next);
}

function toggle(): void {
  set(props.modelValue === 'visual' ? 'source' : 'visual');
}

function onKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowLeft':
      set('visual');
      break;
    case 'ArrowRight':
      set('source');
      break;
    default:
      return;
  }
  event.preventDefault();
}
</script>

<template>
  <button
    type="button"
    role="switch"
    class="editor-mode-switch"
    :aria-checked="modelValue === 'source'"
    :aria-label="t('editor.view')"
    :title="modelValue === 'visual' ? t('editor.visualHint') : t('editor.sourceHint')"
    :data-view="modelValue"
    data-testid="view-switch"
    @click="toggle"
    @keydown="onKeydown"
  >
    <span class="editor-mode-label" :class="{ 'is-active': modelValue === 'visual' }">
      <AppIcon name="visual-mode" size="sm" />
      {{ t('editor.visual') }}
    </span>
    <span class="editor-mode-track" aria-hidden="true">
      <span class="editor-mode-thumb" />
    </span>
    <span class="editor-mode-label" :class="{ 'is-active': modelValue === 'source' }">
      <AppIcon name="markdown-mode" size="sm" />
      {{ t('editor.source') }}
    </span>
  </button>
</template>
