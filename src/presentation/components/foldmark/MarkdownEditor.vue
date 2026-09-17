<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  findInText,
  nextMatchIndex,
  replaceMatches,
  selectedMatchIndex,
  type TextSearchOptions,
} from '@/domain/markdown/textSearch';
import { BODY_MAX_LENGTH } from '@/domain/document/FoldmarkDocument';
import { stripInlineMarks } from '@/domain/markdown/clearFormatting';

/**
 * The body editor.
 *
 * A plain textarea with a small formatting toolbar, deliberately. The document
 * body is Markdown *source* — that is what makes a Foldmark file readable
 * without Foldmark — and a rich editor that hides the source would undermine
 * the format the whole product rests on. A syntax-highlighting editor is a
 * later, lazily loaded change; it is not what the first version needs.
 *
 * Input is **debounced** before it reaches the store. Every keystroke otherwise
 * rebuilds the render plan, re-estimates pagination and re-runs validation for
 * a document that may be five pages long. A quarter of a second is below the
 * threshold where typing feels laggy and well above the cost of doing that work
 * per character.
 */
const props = defineProps<{
  modelValue: string;
  label: string;
  /** Whether the textarea shows its own small toolbar (the postcard back); the body's is shared. */
  ownToolbar?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const { t } = useI18n();

/** Milliseconds of quiet before an edit reaches the store. */
const DEBOUNCE_MS = 250;

const draft = ref(props.modelValue);
const editor = ref<HTMLTextAreaElement | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;

// A change from elsewhere — opening another document, an import — replaces the
// draft. A change the user is in the middle of typing does not, which is why
// this compares before assigning.
watch(
  () => props.modelValue,
  (value) => {
    if (value !== draft.value) draft.value = value;
  },
);

function onInput(event: Event): void {
  draft.value = (event.target as HTMLTextAreaElement).value;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => emit('update:modelValue', draft.value), DEBOUNCE_MS);
}

/** Flushes a pending edit immediately, so leaving the field never loses a word. */
function commit(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  if (draft.value !== props.modelValue) emit('update:modelValue', draft.value);
}

async function wrapSelection(prefix: string, suffix = prefix): Promise<void> {
  const field = editor.value;
  if (!field) return;
  const start = field.selectionStart;
  const end = field.selectionEnd;
  const selected = draft.value.slice(start, end);
  draft.value = `${draft.value.slice(0, start)}${prefix}${selected}${suffix}${draft.value.slice(end)}`;
  commit();
  await nextTick();
  field.focus();
  field.setSelectionRange(start + prefix.length, end + prefix.length);
}

/** Inserts text at the cursor, replacing a selection; the convenience commands use this. */
async function insertText(text: string): Promise<void> {
  const field = editor.value;
  if (!field) return;
  const start = field.selectionStart;
  const end = field.selectionEnd;
  draft.value = `${draft.value.slice(0, start)}${text}${draft.value.slice(end)}`;
  commit();
  await nextTick();
  field.focus();
  field.setSelectionRange(start + text.length, start + text.length);
}

/** The lines the selection touches, so a block command applies to whole lines. */
function selectedLines(field: HTMLTextAreaElement): { start: number; end: number } {
  const lineStart = draft.value.lastIndexOf('\n', Math.max(0, field.selectionStart - 1)) + 1;
  const nextBreak = draft.value.indexOf('\n', field.selectionEnd);
  return { start: lineStart, end: nextBreak === -1 ? draft.value.length : nextBreak };
}

async function replaceLines(
  field: HTMLTextAreaElement,
  range: { start: number; end: number },
  replacement: string,
): Promise<void> {
  draft.value = `${draft.value.slice(0, range.start)}${replacement}${draft.value.slice(range.end)}`;
  commit();
  await nextTick();
  field.focus();
  field.setSelectionRange(range.start, range.start + replacement.length);
}

/**
 * Prefixes every selected line, toggling it off when every line already
 * carries the prefix: the source-mode form of a list, a quote or a heading
 * (change 0022, shared toolbar). `numbered` counts the lines.
 */
async function prefixLines(prefix: string, numbered = false): Promise<void> {
  const field = editor.value;
  if (!field) return;
  const range = selectedLines(field);
  const lines = draft.value.slice(range.start, range.end).split('\n');
  const pattern = numbered ? /^\d+\. /u : null;
  const allPrefixed = lines.every((line) =>
    pattern ? pattern.test(line) : line.startsWith(prefix),
  );
  const replacement = lines
    .map((line, index) => {
      if (allPrefixed) return pattern ? line.replace(pattern, '') : line.slice(prefix.length);
      return numbered ? `${index + 1}. ${line}` : `${prefix}${line}`;
    })
    .join('\n');
  await replaceLines(field, range, replacement);
}

/** Wraps the selected lines in a fenced block, e.g. a directive container. */
async function wrapBlock(before: string, after: string): Promise<void> {
  const field = editor.value;
  if (!field) return;
  const range = selectedLines(field);
  const inner = draft.value.slice(range.start, range.end);
  await replaceLines(field, range, `${before}\n${inner}\n${after}`);
}

/** Replaces the selection with (or inserts) a block of its own, separated by blank lines. */
async function insertBlock(text: string): Promise<void> {
  const field = editor.value;
  if (!field) return;
  const start = field.selectionStart;
  const end = field.selectionEnd;
  const before = draft.value.slice(0, start).replace(/\n*$/u, '');
  const after = draft.value.slice(end).replace(/^\n*/u, '');
  draft.value = `${before ? `${before}\n\n` : ''}${text}${after ? `\n\n${after}` : ''}`;
  commit();
  await nextTick();
  field.focus();
  const caret = (before ? before.length + 2 : 0) + text.length;
  field.setSelectionRange(caret, caret);
}

/** The selected text, for prefilling a link dialog. */
function selectedText(): string {
  const field = editor.value;
  return field ? draft.value.slice(field.selectionStart, field.selectionEnd) : '';
}

/** Clear formatting in the source view: the selection loses its character marks (R14-005). */
async function stripMarks(): Promise<void> {
  const field = editor.value;
  if (!field || field.selectionStart === field.selectionEnd) return;
  const start = field.selectionStart;
  const end = field.selectionEnd;
  const plain = stripInlineMarks(draft.value.slice(start, end));
  draft.value = `${draft.value.slice(0, start)}${plain}${draft.value.slice(end)}`;
  commit();
  await nextTick();
  field.focus();
  field.setSelectionRange(start, start + plain.length);
}

/** The whole source, the way Ctrl/Cmd+A does. */
function selectAll(): void {
  editor.value?.select();
}

// --- find and replace (change 0048) ------------------------------------------
function textSelection(field: HTMLTextAreaElement): { from: number; to: number } {
  return { from: field.selectionStart, to: field.selectionEnd };
}

/** Selects the next or previous occurrence in the source; `null` without one. */
function findMatch(
  query: string,
  options: TextSearchOptions,
  direction: 1 | -1,
): { index: number; total: number } | null {
  const field = editor.value;
  if (!field) return null;
  const matches = findInText(draft.value, query, options);
  const index = nextMatchIndex(matches, textSelection(field), direction);
  if (index < 0) return null;
  const match = matches[index]!;
  field.focus();
  field.setSelectionRange(match.from, match.to);
  return { index, total: matches.length };
}

/** Replaces the selected occurrence and moves on to the next; `false` when none is selected. */
function replaceMatch(query: string, replacement: string, options: TextSearchOptions): boolean {
  const field = editor.value;
  if (!field) return false;
  const matches = findInText(draft.value, query, options);
  const index = selectedMatchIndex(matches, textSelection(field));
  if (index < 0) return false;
  const match = matches[index]!;
  draft.value = `${draft.value.slice(0, match.from)}${replacement}${draft.value.slice(match.to)}`;
  commit();
  const caret = match.from + replacement.length;
  field.setSelectionRange(caret, caret);
  findMatch(query, options, 1);
  return true;
}

/** Replaces every occurrence at once and reports how many. */
function replaceAllMatches(query: string, replacement: string, options: TextSearchOptions): number {
  const matches = findInText(draft.value, query, options);
  if (!matches.length) return 0;
  draft.value = replaceMatches(draft.value, matches, replacement);
  commit();
  return matches.length;
}

/** How often the query occurs in the source. */
function countMatches(query: string, options: TextSearchOptions): number {
  return findInText(draft.value, query, options).length;
}

defineExpose({
  insertText,
  wrapSelection,
  prefixLines,
  wrapBlock,
  insertBlock,
  selectedText,
  stripMarks,
  selectAll,
  findMatch,
  replaceMatch,
  replaceAllMatches,
  countMatches,
});

async function makeList(): Promise<void> {
  await prefixLines('- ');
}
</script>

<template>
  <div class="markdown-editor">
    <div
      v-if="ownToolbar"
      class="markdown-toolbar"
      :aria-label="t('editor.toolbar')"
      role="toolbar"
    >
      <button type="button" class="btn btn-ghost btn-sm" @click="wrapSelection('**')">
        {{ t('editor.bold') }}
      </button>
      <button type="button" class="btn btn-ghost btn-sm" @click="wrapSelection('_')">
        {{ t('editor.italic') }}
      </button>
      <button type="button" class="btn btn-ghost btn-sm" @click="wrapSelection('`')">
        {{ t('editor.code') }}
      </button>
      <button type="button" class="btn btn-ghost btn-sm" @click="makeList">
        {{ t('editor.list') }}
      </button>
    </div>
    <label class="sr-only" for="foldmark-body">{{ label }}</label>
    <textarea
      id="foldmark-body"
      ref="editor"
      class="textarea textarea-bordered body-editor"
      :value="draft"
      :maxlength="BODY_MAX_LENGTH"
      :placeholder="t('editor.placeholder')"
      rows="18"
      spellcheck="true"
      @input="onInput"
      @blur="commit"
    />
    <p class="editor-hint">{{ t('editor.hint') }}</p>
  </div>
</template>
