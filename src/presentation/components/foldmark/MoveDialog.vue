<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { childFolders, folderPath, isWithin, type Folder } from '@/domain/document/Folder';
import AppDialog from '@/presentation/components/AppDialog.vue';

/**
 * Choosing a folder to move something into (R13-025): the tree, flattened
 * with indentation, plus the top level. A folder can never be offered its own
 * subtree as a target — the cycle guard lives in the service, but a target
 * that would be refused should not be selectable in the first place.
 */
const props = defineProps<{
  open: boolean;
  folders: readonly Folder[];
  /** The current folder of the item, preselected. */
  currentId?: string;
  /** When moving a folder: its id, so it and its descendants are excluded. */
  movingFolderId?: string;
}>();
const emit = defineEmits<{ close: []; move: [folderId: string | undefined] }>();
const { t, locale } = useI18n();
const picked = ref('');

watch(
  () => props.open,
  (open) => {
    if (open) picked.value = props.currentId ?? '';
  },
);

/** The tree as rows with a depth, in name order, minus the excluded subtree. */
const rows = computed(() => {
  const result: { folder: Folder; depth: number }[] = [];
  const walk = (parentId: string | undefined, depth: number): void => {
    for (const folder of childFolders(props.folders, parentId, locale.value)) {
      if (folder.archived) continue;
      if (props.movingFolderId && isWithin(props.folders, folder.id, props.movingFolderId))
        continue;
      result.push({ folder, depth });
      if (depth < 8) walk(folder.id, depth + 1);
    }
  };
  walk(undefined, 0);
  return result;
});

function label(folder: Folder): string {
  return folderPath(props.folders, folder.id)
    .map((entry) => entry.name)
    .join(' / ');
}
</script>

<template>
  <AppDialog :open="open" :title="t('documents.moveTitle')" size="sm" @close="emit('close')">
    <label class="field">
      <span>{{ t('documents.moveTarget') }}</span>
      <select v-model="picked" class="select select-bordered" autofocus data-testid="move-target">
        <option value="">{{ t('documents.topLevel') }}</option>
        <option
          v-for="row in rows"
          :key="row.folder.id"
          :value="row.folder.id"
          :title="label(row.folder)"
        >
          {{ '\u00a0\u00a0'.repeat(row.depth) }}{{ row.folder.name }}
        </option>
      </select>
    </label>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">
        {{ t('dialog.cancel') }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        data-testid="move-confirm"
        @click="emit('move', picked || undefined)"
      >
        {{ t('documents.action.move') }}
      </button>
    </template>
  </AppDialog>
</template>
