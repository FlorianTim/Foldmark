<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDialog from '@/presentation/components/AppDialog.vue';

/** One text field with a title: rename, new folder, and the like. */
const props = defineProps<{
  open: boolean;
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel: string;
  maxlength?: number;
}>();
const emit = defineEmits<{ close: []; submit: [value: string] }>();
const { t } = useI18n();
const value = ref('');

watch(
  () => props.open,
  (open) => {
    if (open) value.value = props.initialValue ?? '';
  },
);

function submit(): void {
  if (!value.value.trim()) return;
  emit('submit', value.value.trim());
  emit('close');
}
</script>

<template>
  <AppDialog :open="open" :title="title" size="sm" @close="emit('close')">
    <form id="prompt-form" class="link-form" @submit.prevent="submit">
      <label class="field">
        <span>{{ label }}</span>
        <input
          v-model="value"
          class="input input-bordered"
          type="text"
          :maxlength="maxlength ?? 200"
          autocomplete="off"
          autofocus
          data-testid="prompt-value"
          @keydown.enter.prevent="submit"
        />
      </label>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">
        {{ t('dialog.cancel') }}
      </button>
      <button type="submit" form="prompt-form" class="btn btn-primary" :disabled="!value.trim()">
        {{ confirmLabel }}
      </button>
    </template>
  </AppDialog>
</template>
