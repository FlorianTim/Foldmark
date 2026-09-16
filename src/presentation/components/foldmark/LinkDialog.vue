<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDialog from '@/presentation/components/AppDialog.vue';

/**
 * Inserting a link (R13-022): text and address, the text prefilled from the
 * selection. Only `http(s):` and `mailto:` are accepted — the same schemes
 * every renderer keeps — so a `javascript:` link cannot even be typed into
 * the document from here.
 */
const props = defineProps<{ open: boolean; initialText?: string; initialHref?: string }>();
const emit = defineEmits<{ close: []; insert: [link: { href: string; text: string }] }>();

const { t } = useI18n();
const text = ref('');
const href = ref('');

watch(
  () => props.open,
  (open) => {
    if (open) {
      text.value = props.initialText ?? '';
      href.value = props.initialHref ?? '';
    }
  },
);

const valid = computed(() => /^(https?:\/\/|mailto:)\S+/iu.test(href.value.trim()));

function submit(): void {
  if (!valid.value) return;
  emit('insert', { href: href.value.trim(), text: text.value.trim() || href.value.trim() });
  emit('close');
}
</script>

<template>
  <AppDialog :open="open" :title="t('editor.linkTitle')" size="sm" @close="emit('close')">
    <form id="link-form" class="link-form" @submit.prevent="submit">
      <label class="field">
        <span>{{ t('editor.linkText') }}</span>
        <input
          v-model="text"
          class="input input-bordered"
          type="text"
          maxlength="200"
          autocomplete="off"
          autofocus
          data-testid="link-text"
        />
      </label>
      <label class="field">
        <span>{{ t('editor.linkUrl') }}</span>
        <input
          v-model="href"
          class="input input-bordered"
          type="url"
          placeholder="https://"
          autocomplete="off"
          data-testid="link-url"
        />
        <small v-if="href && !valid" class="field-hint field-error">{{
          t('editor.linkInvalid')
        }}</small>
      </label>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">
        {{ t('dialog.cancel') }}
      </button>
      <button type="submit" form="link-form" class="btn btn-primary" :disabled="!valid">
        {{ t('editor.linkApply') }}
      </button>
    </template>
  </AppDialog>
</template>
