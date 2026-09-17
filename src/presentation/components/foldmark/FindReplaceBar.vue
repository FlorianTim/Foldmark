<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { SEARCH_QUERY_MAX_LENGTH, type TextSearchOptions } from '@/domain/markdown/textSearch';
import AppIcon from '@/presentation/components/AppIcon.vue';

/**
 * Find and replace in the body (change 0048): a bar above the writing area,
 * never a modal, so the text stays visible while it is searched. The bar
 * knows nothing about the editors: the parent answers `find`, `replace` and
 * `replaceAll` for whichever view is open and reports the count back.
 */
const props = defineProps<{
  open: boolean;
  /** `index` is zero-based; `total` 0 means no match. */
  result: { readonly index: number; readonly total: number } | null;
}>();
const emit = defineEmits<{
  close: [];
  find: [query: string, options: TextSearchOptions, direction: 1 | -1];
  replace: [query: string, replacement: string, options: TextSearchOptions];
  replaceAll: [query: string, replacement: string, options: TextSearchOptions];
}>();
const { t } = useI18n();

const query = ref('');
const replacement = ref('');
const caseSensitive = ref(false);
const wholeWord = ref(false);
const queryInput = ref<HTMLInputElement | null>(null);

function options(): TextSearchOptions {
  return { caseSensitive: caseSensitive.value, wholeWord: wholeWord.value };
}

function find(direction: 1 | -1 = 1): void {
  if (!query.value) return;
  emit('find', query.value, options(), direction);
}

function onQueryKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault();
    find(event.shiftKey ? -1 : 1);
  }
}

function onReplaceKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault();
    emit('replace', query.value, replacement.value, options());
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    void nextTick(() => {
      queryInput.value?.focus();
      queryInput.value?.select();
    });
  },
);

// A changed query or option searches at once, from the current position.
watch([query, caseSensitive, wholeWord], () => {
  if (props.open && query.value) find(1);
});
</script>

<template>
  <div
    v-if="open"
    class="find-bar"
    role="search"
    :aria-label="t('editor.find.title')"
    data-testid="find-bar"
    @keydown.escape.stop.prevent="emit('close')"
  >
    <div class="find-bar-row">
      <label class="find-bar-field">
        <span class="sr-only">{{ t('editor.find.query') }}</span>
        <input
          ref="queryInput"
          v-model="query"
          class="input input-bordered input-sm"
          type="search"
          :maxlength="SEARCH_QUERY_MAX_LENGTH"
          :placeholder="t('editor.find.query')"
          autocomplete="off"
          data-testid="find-query"
          @keydown="onQueryKeydown"
        />
      </label>
      <span class="find-bar-count" data-testid="find-count" aria-live="polite">
        <template v-if="query && result">
          {{
            result.total
              ? t('editor.find.count', { index: result.index + 1, total: result.total })
              : t('editor.find.none')
          }}
        </template>
      </span>
      <button
        type="button"
        class="btn btn-ghost btn-xs"
        :disabled="!query"
        :aria-label="t('editor.find.previous')"
        :title="t('editor.find.previous')"
        data-testid="find-previous"
        @click="find(-1)"
      >
        <AppIcon name="chevron-up" size="sm" />
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-xs"
        :disabled="!query"
        :aria-label="t('editor.find.next')"
        :title="t('editor.find.next')"
        data-testid="find-next"
        @click="find(1)"
      >
        <AppIcon name="chevron-down" size="sm" />
      </button>
      <label class="field-inline find-bar-option">
        <input v-model="caseSensitive" type="checkbox" class="checkbox checkbox-sm" />
        <span>{{ t('editor.find.caseSensitive') }}</span>
      </label>
      <label class="field-inline find-bar-option">
        <input v-model="wholeWord" type="checkbox" class="checkbox checkbox-sm" />
        <span>{{ t('editor.find.wholeWord') }}</span>
      </label>
      <button
        type="button"
        class="btn btn-ghost btn-xs find-bar-close"
        :aria-label="t('dialog.close')"
        :title="t('dialog.close')"
        data-testid="find-close"
        @click="emit('close')"
      >
        <AppIcon name="close" size="sm" />
      </button>
    </div>
    <div class="find-bar-row">
      <label class="find-bar-field">
        <span class="sr-only">{{ t('editor.find.replacement') }}</span>
        <input
          v-model="replacement"
          class="input input-bordered input-sm"
          type="text"
          :maxlength="SEARCH_QUERY_MAX_LENGTH"
          :placeholder="t('editor.find.replacement')"
          autocomplete="off"
          data-testid="find-replacement"
          @keydown="onReplaceKeydown"
        />
      </label>
      <button
        type="button"
        class="btn btn-outline btn-xs"
        :disabled="!query || !result?.total"
        data-testid="find-replace"
        @click="emit('replace', query, replacement, options())"
      >
        {{ t('editor.find.replace') }}
      </button>
      <button
        type="button"
        class="btn btn-outline btn-xs"
        :disabled="!query || !result?.total"
        data-testid="find-replace-all"
        @click="emit('replaceAll', query, replacement, options())"
      >
        {{ t('editor.find.replaceAll') }}
      </button>
    </div>
  </div>
</template>
