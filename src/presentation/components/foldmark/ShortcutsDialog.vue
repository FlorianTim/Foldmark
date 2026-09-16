<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDialog from '@/presentation/components/AppDialog.vue';
import {
  detectPlatform,
  formatShortcut,
  SHORTCUTS,
  type ShortcutScope,
} from '@/presentation/shortcuts/shortcutRegistry';

/**
 * Help → Shortcuts, generated from the registry (R14-008): the table cannot
 * list a key the app does not answer to, or miss one it does. The navigation
 * keys at the end are not shortcuts in the registry's sense — they are how the
 * dialogs, the splitters and the menu bar work — and are listed as such.
 */
defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();

const platform = detectPlatform();

const groups = computed(() =>
  (['workspace', 'editor'] as const).map((scope: ShortcutScope) => ({
    scope,
    entries: SHORTCUTS.filter((definition) => definition.scope === scope).map((definition) => ({
      id: definition.id,
      keys: formatShortcut(definition, platform),
      description: t(definition.descriptionKey),
    })),
  })),
);

const NAVIGATION: readonly { keys: string; id: string }[] = [
  { keys: 'Esc', id: 'escape' },
  { keys: '← → / Home / End', id: 'splitter' },
  { keys: 'Alt+↑ ↓ / Enter', id: 'menu' },
];
</script>

<template>
  <AppDialog :open="open" :title="t('shortcuts.title')" size="sm" @close="emit('close')">
    <table v-for="group in groups" :key="group.scope" class="shortcuts-table">
      <caption>
        {{
          t(`shortcuts.scope.${group.scope}`)
        }}
      </caption>
      <tbody>
        <tr v-for="entry in group.entries" :key="entry.id">
          <th scope="row">
            <kbd>{{ entry.keys }}</kbd>
          </th>
          <td>{{ entry.description }}</td>
        </tr>
      </tbody>
    </table>
    <table class="shortcuts-table">
      <caption>
        {{
          t('shortcuts.scope.navigation')
        }}
      </caption>
      <tbody>
        <tr v-for="entry in NAVIGATION" :key="entry.id">
          <th scope="row">
            <kbd>{{ entry.keys }}</kbd>
          </th>
          <td>{{ t(`shortcuts.${entry.id}`) }}</td>
        </tr>
      </tbody>
    </table>
    <template #footer>
      <button type="button" class="btn btn-primary" @click="emit('close')">
        {{ t('dialog.close') }}
      </button>
    </template>
  </AppDialog>
</template>
