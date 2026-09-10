<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { TODO_TITLE_MAX_LENGTH } from '@/domain/todo/Todo';
import { useTodoStore } from '@/presentation/stores/todoStore';
import SafeMarkdown from '@/presentation/components/SafeMarkdown.vue';

const store = useTodoStore();
const title = ref('');
const editor = ref<HTMLTextAreaElement | null>(null);
const { t } = useI18n();

async function submit(): Promise<void> {
  const value = title.value;
  if (!value.trim()) return;
  await store.add(value);
  if (!store.error) title.value = '';
}

async function wrapSelection(prefix: string, suffix = prefix): Promise<void> {
  const field = editor.value;
  if (!field) return;
  const start = field.selectionStart;
  const end = field.selectionEnd;
  const selected = title.value.slice(start, end);
  title.value = `${title.value.slice(0, start)}${prefix}${selected}${suffix}${title.value.slice(end)}`;
  await nextTick();
  field.focus();
  field.setSelectionRange(start + prefix.length, end + prefix.length);
}

async function makeList(): Promise<void> {
  const field = editor.value;
  if (!field) return;
  const start = field.selectionStart;
  const end = field.selectionEnd;
  const lineStart = title.value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const nextBreak = title.value.indexOf('\n', end);
  const lineEnd = nextBreak === -1 ? title.value.length : nextBreak;
  const selectedLines = title.value.slice(lineStart, lineEnd);
  const replacement = selectedLines
    .split('\n')
    .map((line) => (line.startsWith('- ') ? line : `- ${line}`))
    .join('\n');
  title.value = `${title.value.slice(0, lineStart)}${replacement}${title.value.slice(lineEnd)}`;
  await nextTick();
  field.focus();
  field.setSelectionRange(lineStart, lineStart + replacement.length);
}

onMounted(() => void store.load());
</script>

<template>
  <section class="panel" aria-labelledby="todo-title">
    <div class="section-heading">
      <div>
        <p class="eyebrow">{{ t('app.demo') }}</p>
        <h1 id="todo-title">{{ t('todo.title') }}</h1>
        <p>{{ t('todo.description') }}</p>
      </div>
      <span class="badge badge-outline">
        {{ t('todo.remaining', { count: store.remaining }) }}
      </span>
    </div>

    <form class="todo-form" @submit.prevent="submit">
      <label class="sr-only" for="todo-title-input">{{ t('todo.inputLabel') }}</label>
      <div class="markdown-editor">
        <div class="markdown-toolbar" :aria-label="t('todo.markdownToolbar')" role="toolbar">
          <button type="button" class="btn btn-ghost btn-sm" @click="wrapSelection('**')">
            {{ t('todo.bold') }}
          </button>
          <button type="button" class="btn btn-ghost btn-sm" @click="wrapSelection('_')">
            {{ t('todo.italic') }}
          </button>
          <button type="button" class="btn btn-ghost btn-sm" @click="wrapSelection('`')">
            {{ t('todo.code') }}
          </button>
          <button type="button" class="btn btn-ghost btn-sm" @click="makeList">
            {{ t('todo.list') }}
          </button>
        </div>
        <textarea
          id="todo-title-input"
          ref="editor"
          v-model="title"
          class="textarea textarea-bordered w-full"
          rows="3"
          :maxlength="TODO_TITLE_MAX_LENGTH"
          :placeholder="t('todo.placeholder')"
          autocomplete="off"
        />
        <div v-if="title.trim()" class="markdown-preview" :aria-label="t('todo.preview')">
          <SafeMarkdown :source="title" />
        </div>
      </div>
      <button class="btn btn-primary" type="submit">{{ t('todo.add') }}</button>
    </form>

    <p v-if="store.error" class="alert alert-error" role="alert">{{ t(store.error) }}</p>
    <p v-if="store.loading" aria-live="polite">{{ t('todo.loading') }}</p>
    <p v-else-if="store.todos.length === 0" class="empty-state">{{ t('todo.empty') }}</p>
    <ul v-else class="todo-list">
      <li v-for="todo in store.todos" :key="todo.id" class="todo-row">
        <label class="todo-label">
          <input
            class="checkbox"
            type="checkbox"
            :checked="todo.completed"
            @change="store.toggle(todo)"
          />
          <SafeMarkdown :class="{ completed: todo.completed }" :source="todo.title" />
        </label>
        <button class="btn btn-ghost btn-sm" type="button" @click="store.remove(todo.id)">
          {{ t('todo.delete') }}
        </button>
      </li>
    </ul>
    <button
      v-if="store.todos.length"
      class="btn btn-outline btn-sm"
      type="button"
      @click="store.clear"
    >
      {{ t('todo.clear') }}
    </button>
  </section>
</template>
