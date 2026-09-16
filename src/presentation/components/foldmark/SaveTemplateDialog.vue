<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import {
  TEMPLATE_DESCRIPTION_MAX_LENGTH,
  TEMPLATE_NAME_MAX_LENGTH,
  type TemplateOptions,
} from '@/domain/document/DocumentTemplate';
import type { FeatureEntitlement } from '@/domain/entitlement/premiumFeatures';
import AppDialog from '@/presentation/components/AppDialog.vue';
import AppIcon from '@/presentation/components/AppIcon.vue';

/**
 * "Save as template" (change 0039): a name, a description and the three
 * things a template may take from the open document — the sender, the body,
 * the subject. The premium state of one more template is shown as it is:
 * free for the first, "premium, free during the test phase" beyond it. The
 * gate itself is the service's; this dialog only reports it.
 */
const props = defineProps<{ open: boolean; suggestedName: string }>();
const emit = defineEmits<{ close: []; save: [options: TemplateOptions] }>();
const { t } = useI18n();

const name = ref('');
const description = ref('');
const includeSender = ref(true);
const includeBody = ref(true);
const includeSubject = ref(false);
const state = ref<FeatureEntitlement | null>(null);

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    name.value = props.suggestedName;
    description.value = '';
    includeSender.value = true;
    includeBody.value = true;
    includeSubject.value = false;
    state.value = await services.templates.stateForAnother();
  },
);

function submit(): void {
  if (!name.value.trim()) return;
  emit('save', {
    name: name.value,
    description: description.value,
    includeSender: includeSender.value,
    includeBody: includeBody.value,
    includeSubject: includeSubject.value,
  });
  emit('close');
}
</script>

<template>
  <AppDialog :open="open" :title="t('templates.saveTitle')" size="sm" @close="emit('close')">
    <form id="save-template-form" class="link-form" @submit.prevent="submit">
      <p class="editor-hint">{{ t('templates.saveHint') }}</p>
      <label class="field">
        <span>{{ t('templates.name') }}</span>
        <input
          v-model="name"
          class="input input-bordered"
          type="text"
          required
          :maxlength="TEMPLATE_NAME_MAX_LENGTH"
          data-testid="template-name"
        />
      </label>
      <label class="field">
        <span>{{ t('templates.description') }}</span>
        <input
          v-model="description"
          class="input input-bordered"
          type="text"
          :maxlength="TEMPLATE_DESCRIPTION_MAX_LENGTH"
          data-testid="template-description"
        />
      </label>
      <fieldset class="field-radios">
        <legend class="field-legend">{{ t('templates.include') }}</legend>
        <label class="field-inline">
          <input v-model="includeSender" type="checkbox" class="checkbox checkbox-sm" />
          <span>{{ t('templates.includeSender') }}</span>
        </label>
        <label class="field-inline">
          <input v-model="includeBody" type="checkbox" class="checkbox checkbox-sm" />
          <span>{{ t('templates.includeBody') }}</span>
        </label>
        <label class="field-inline">
          <input
            v-model="includeSubject"
            type="checkbox"
            class="checkbox checkbox-sm"
            data-testid="template-include-subject"
          />
          <span>{{ t('templates.includeSubject') }}</span>
        </label>
      </fieldset>
      <!-- Premium in the test phase (C10): said plainly, no purchase button. -->
      <p v-if="state && state.mode !== 'free'" class="premium-note" data-testid="template-premium">
        <AppIcon name="pro" size="sm" />
        <span>{{ t(`premium.mode.${state.mode}`, { limit: state.limit ?? 1 }) }}</span>
      </p>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">
        {{ t('dialog.cancel') }}
      </button>
      <button
        type="submit"
        form="save-template-form"
        class="btn btn-primary"
        :disabled="!name.trim()"
        data-testid="template-save"
      >
        <AppIcon name="template" />
        <span>{{ t('templates.save') }}</span>
      </button>
    </template>
  </AppDialog>
</template>
