<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import {
  TEMPLATE_DESCRIPTION_MAX_LENGTH,
  TEMPLATE_NAME_MAX_LENGTH,
  type DocumentTemplate,
} from '@/domain/document/DocumentTemplate';
import AppDialog from '@/presentation/components/AppDialog.vue';
import AppIcon from '@/presentation/components/AppIcon.vue';
import ConfirmDialog from '@/presentation/components/ConfirmDialog.vue';
import { useLibraryStore } from '@/presentation/stores/libraryStore';

/**
 * The templates a person keeps (change 0039): use one, rename or describe it,
 * delete it. A template is used by making a new document from it — the
 * workspace does that; this dialog only says which one.
 */
defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; use: [templateId: string] }>();
const { t, locale } = useI18n();
const library = useLibraryStore();

const editing = ref<{ id: string; name: string; description: string } | null>(null);
const deleting = ref<DocumentTemplate | null>(null);

const templates = computed(() => library.templates);

function profileName(id: string): string {
  const profile = library.printProfiles.find((candidate) => candidate.id === id);
  return profile ? profile.name[locale.value === 'de' ? 'de' : 'en'] : id;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function startEdit(template: DocumentTemplate): void {
  editing.value = {
    id: template.id,
    name: template.name,
    description: template.description ?? '',
  };
}

async function saveEdit(): Promise<void> {
  const draft = editing.value;
  if (!draft || !draft.name.trim()) return;
  const saved = await library.run(
    () => services.templates.update(draft.id, { name: draft.name, description: draft.description }),
    'errors.storageUnavailable',
  );
  if (saved) {
    editing.value = null;
    await library.refreshTemplates();
  }
}

async function confirmDelete(): Promise<void> {
  const target = deleting.value;
  deleting.value = null;
  if (!target) return;
  const done = await library.run(
    () => services.templates.remove(target.id),
    'errors.storageUnavailable',
  );
  if (done !== null) await library.refreshTemplates();
}
</script>

<template>
  <AppDialog :open="open" :title="t('templates.title')" size="md" @close="emit('close')">
    <p class="editor-hint">{{ t('templates.hint') }}</p>
    <p v-if="templates.length === 0" class="empty-state">{{ t('templates.empty') }}</p>
    <ul v-else class="template-list" data-testid="template-list">
      <li v-for="template in templates" :key="template.id" class="template-row">
        <form v-if="editing?.id === template.id" class="template-edit" @submit.prevent="saveEdit">
          <label class="field">
            <span>{{ t('templates.name') }}</span>
            <input
              v-model="editing.name"
              class="input input-bordered input-sm"
              type="text"
              required
              :maxlength="TEMPLATE_NAME_MAX_LENGTH"
              data-testid="template-edit-name"
            />
          </label>
          <label class="field">
            <span>{{ t('templates.description') }}</span>
            <input
              v-model="editing.description"
              class="input input-bordered input-sm"
              type="text"
              :maxlength="TEMPLATE_DESCRIPTION_MAX_LENGTH"
            />
          </label>
          <span class="template-actions">
            <button type="submit" class="btn btn-primary btn-sm" data-testid="template-edit-save">
              {{ t('dialog.save') }}
            </button>
            <button type="button" class="btn btn-ghost btn-sm" @click="editing = null">
              {{ t('dialog.cancel') }}
            </button>
          </span>
        </form>
        <template v-else>
          <span class="template-facts">
            <AppIcon name="template" />
            <span>
              <strong>{{ template.name }}</strong>
              <small>
                {{ t(`documents.kind.${template.kind}`) }} ·
                {{ profileName(template.printProfileId) }} · {{ formatDate(template.updatedAt) }}
              </small>
              <small v-if="template.description">{{ template.description }}</small>
            </span>
          </span>
          <span class="template-actions">
            <button
              type="button"
              class="btn btn-primary btn-sm"
              :data-testid="`template-use-${template.id}`"
              @click="emit('use', template.id)"
            >
              <AppIcon name="add" size="sm" />
              <span>{{ t('templates.use') }}</span>
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              :title="t('templates.rename')"
              :aria-label="`${t('templates.rename')}: ${template.name}`"
              @click="startEdit(template)"
            >
              <AppIcon name="rename" />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              :title="t('templates.delete')"
              :aria-label="`${t('templates.delete')}: ${template.name}`"
              @click="deleting = template"
            >
              <AppIcon name="delete" />
            </button>
          </span>
        </template>
      </li>
    </ul>
    <template #footer>
      <button type="button" class="btn btn-primary" @click="emit('close')">
        {{ t('dialog.close') }}
      </button>
    </template>
  </AppDialog>
  <ConfirmDialog
    :open="deleting !== null"
    :title="t('templates.deleteTitle')"
    :text="t('templates.deleteText', { name: deleting?.name ?? '' })"
    :confirm-label="t('templates.delete')"
    danger
    @close="deleting = null"
    @confirm="confirmDelete"
  />
</template>
