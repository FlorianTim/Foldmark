<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppDialog from '@/presentation/components/AppDialog.vue';

/**
 * A yes/no question before something destructive (R13-011). Not dismissible
 * by a backdrop click: a confirmation that vanishes under a stray click is
 * one nobody can be sure they answered.
 */
defineProps<{
  open: boolean;
  title: string;
  text?: string;
  confirmLabel: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
}>();
const emit = defineEmits<{ close: []; confirm: [] }>();
const { t } = useI18n();
</script>

<template>
  <AppDialog :open="open" :title="title" size="sm" :dismissible="false" @close="emit('close')">
    <p v-if="text">{{ text }}</p>
    <slot />
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">
        {{ t('dialog.cancel') }}
      </button>
      <button
        type="button"
        class="btn"
        :class="danger ? 'btn-error' : 'btn-primary'"
        data-testid="confirm"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
    </template>
  </AppDialog>
</template>
