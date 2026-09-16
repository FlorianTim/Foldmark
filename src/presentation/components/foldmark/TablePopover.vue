<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppPopover from '@/presentation/components/AppPopover.vue';

/**
 * Picking a table size (R13-022): a grid of cells to sweep over, with the
 * size read out as "3 × 4" while hovering, plus two fields for anyone who
 * wants a table larger than the grid or who is not using a mouse.
 */
defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; insert: [size: { rows: number; cols: number }] }>();

const { t } = useI18n();

const GRID_ROWS = 6;
const GRID_COLS = 6;
const hover = ref({ rows: 3, cols: 3 });
const rows = ref(3);
const cols = ref(3);

function choose(size: { rows: number; cols: number }): void {
  emit('insert', {
    rows: Math.min(Math.max(Math.round(size.rows), 1), 20),
    cols: Math.min(Math.max(Math.round(size.cols), 1), 12),
  });
  emit('close');
}
</script>

<template>
  <AppPopover :open="open" :label="t('editor.tableInsert')" @close="emit('close')">
    <p class="popover-title">{{ t('editor.tableInsert') }}</p>
    <div
      class="table-grid"
      role="group"
      :aria-label="t('editor.tableSize', { rows: hover.rows, cols: hover.cols })"
    >
      <template v-for="row in GRID_ROWS" :key="row">
        <button
          v-for="col in GRID_COLS"
          :key="`${row}-${col}`"
          type="button"
          class="table-grid-cell"
          :class="{ 'is-active': row <= hover.rows && col <= hover.cols }"
          :aria-label="t('editor.tableSize', { rows: row, cols: col })"
          @pointerenter="hover = { rows: row, cols: col }"
          @focus="hover = { rows: row, cols: col }"
          @click="choose({ rows: row, cols: col })"
        />
      </template>
    </div>
    <p class="table-grid-label" aria-live="polite">
      {{ t('editor.tableSize', { rows: hover.rows, cols: hover.cols }) }}
    </p>
    <form class="table-fields" @submit.prevent="choose({ rows, cols })">
      <label class="field">
        <span>{{ t('editor.tableRows') }}</span>
        <input
          v-model.number="rows"
          class="input input-bordered input-sm"
          type="number"
          min="1"
          max="20"
        />
      </label>
      <label class="field">
        <span>{{ t('editor.tableCols') }}</span>
        <input
          v-model.number="cols"
          class="input input-bordered input-sm"
          type="number"
          min="1"
          max="12"
        />
      </label>
      <button type="submit" class="btn btn-sm btn-primary">
        {{ t('editor.tableInsertButton') }}
      </button>
    </form>
  </AppPopover>
</template>
