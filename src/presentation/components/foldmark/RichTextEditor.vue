<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import type {
  EditorCommand,
  EditorCommandArgument,
  EditorSelectionState,
  ImageLayoutChange,
  RichTextEditorPort,
} from '@/application/ports/RichTextEditorPort';
import { serializeImageLayout, type ImageAlignment } from '@/domain/markdown/directives';
import { serializeQrDirective, type QrCodeSpec } from '@/domain/qr/qrCode';
import type { DocumentAsset } from '@/domain/asset/DocumentAsset';
import {
  COLOR_ALIASES,
  COLOR_TONES,
  DEFAULT_DOCUMENT_THEME,
  resolveColor,
  shadedName,
  type ColorTone,
  type DocumentTheme,
} from '@/domain/document/DocumentTheme';
import { dateToken, todayIso } from '@/domain/markdown/dateToken';
import AppIcon from '@/presentation/components/AppIcon.vue';
import AppPopover from '@/presentation/components/AppPopover.vue';
import type { IconName } from '@/presentation/icons/iconNames.generated';
import EditorModeSwitch from '@/presentation/components/foldmark/EditorModeSwitch.vue';
import ImageDialog from '@/presentation/components/foldmark/ImageDialog.vue';
import ImageToolbar from '@/presentation/components/foldmark/ImageToolbar.vue';
import LinkDialog from '@/presentation/components/foldmark/LinkDialog.vue';
import type { TextSearchOptions } from '@/domain/markdown/textSearch';
import FindReplaceBar from '@/presentation/components/foldmark/FindReplaceBar.vue';
import MarkdownEditor from '@/presentation/components/foldmark/MarkdownEditor.vue';
import QrCodeDialog from '@/presentation/components/foldmark/QrCodeDialog.vue';
import QrToolbar from '@/presentation/components/foldmark/QrToolbar.vue';
import TablePopover from '@/presentation/components/foldmark/TablePopover.vue';
import { themeVariables } from '@/presentation/markdown/themeVariables';
import {
  appSettings,
  readSetting,
  writeSetting,
  type EditorView,
} from '@/presentation/settings/settingsRegistry';
import {
  detectPlatform,
  findShortcut,
  shortcutLabel,
} from '@/presentation/shortcuts/shortcutRegistry';

/**
 * The body editor: rich text and Markdown source as two views of one string
 * (ADR 0016), under **one** toolbar (R13-021).
 *
 * The mode switch is the first row. Below it every button speaks in commands:
 * in the visual view the port maps them onto the ProseMirror editor; in the
 * source view the same command becomes a text transform on the textarea —
 * `**` around the selection, `- ` in front of the lines, a directive fence
 * around the block. What a mode or the current node cannot do is disabled,
 * visibly and with `disabled` set: undo lives in the editor's history, so the
 * source view has none; a table inside a table cell is not a thing; a heading
 * inside a list item is not a thing either.
 *
 * Colour and highlight are popovers with a reset (R13-022); the table size is
 * picked from a grid; link and image open dialogs. Every one of them is
 * Markdown in the file (ADR 0019); the colour swatches show the document
 * theme's screen values, the same values the preview paints.
 */
const props = defineProps<{
  modelValue: string;
  label: string;
  /** The document theme, for colour swatches and the editor's own rendering. */
  theme?: DocumentTheme;
  /** The document's language, for showing dates. */
  locale?: string;
  /** Local images the body may reference. */
  assets?: readonly DocumentAsset[];
}>();
const emit = defineEmits<{
  'update:modelValue': [value: string];
  /** The highlight tone chosen for the document, as a palette tone. */
  highlightTone: [tone: ColorTone];
  /** Which of the two surfaces has the writer's attention (R14-003). */
  focusTarget: [target: 'rich-editor' | 'markdown-editor'];
}>();

const { t } = useI18n();

const view = ref<EditorView>(readSetting(appSettings.editorView));
const source = ref<InstanceType<typeof MarkdownEditor> | null>(null);
const host = ref<HTMLDivElement | null>(null);
const editor = ref<RichTextEditorPort | null>(null);
const loading = ref(false);
const failed = ref(false);

const dateOpen = ref(false);
const pickedDate = ref(todayIso());
const colorOpen = ref(false);
const highlightOpen = ref(false);
const tableOpen = ref(false);
const layoutOpen = ref(false);
const linkOpen = ref(false);
const imageOpen = ref(false);
const qrOpen = ref(false);
/** Find and replace (change 0048): the bar and the last result it shows. */
const findOpen = ref(false);
const findResult = ref<{ readonly index: number; readonly total: number } | null>(null);
/** The code the QR dialog edits; `null` when it inserts a new one (change 0040). */
const qrEditing = ref<QrCodeSpec | null>(null);

const canUndo = ref(false);
const canRedo = ref(false);
const selection = ref<EditorSelectionState>({
  bold: false,
  italic: false,
  strikethrough: false,
  link: false,
  color: null,
  highlight: false,
  underline: false,
  small: false,
  superscript: false,
  subscript: false,
  block: null,
  heading: 0,
  inTable: false,
  inList: false,
  selectedText: '',
  linkHref: null,
  image: null,
  qr: null,
});

/** What the editor last reported; a prop equal to it is our own echo, not an external change. */
let lastEmitted = props.modelValue;

const visual = computed(() => view.value === 'visual');
const theme = computed(() => props.theme ?? DEFAULT_DOCUMENT_THEME);
const hostStyle = computed(() => themeVariables(theme.value, 'screen'));

/** The block select: paragraph and the six headings. */
const BLOCKS: readonly { command: EditorCommand; level: number }[] = [
  { command: 'paragraph', level: 0 },
  { command: 'heading1', level: 1 },
  { command: 'heading2', level: 2 },
  { command: 'heading3', level: 3 },
  { command: 'heading4', level: 4 },
  { command: 'heading5', level: 5 },
  { command: 'heading6', level: 6 },
];

/** The layout directives, as command plus argument, and how the source view spells them. */
const LAYOUTS: readonly {
  id: string;
  command: EditorCommand;
  argument?: string;
  icon: IconName;
  fence: string;
}[] = [
  { id: 'indent1', command: 'indent', argument: '1', icon: 'indent', fence: ':::indent{level=1}' },
  { id: 'indent2', command: 'indent', argument: '2', icon: 'indent', fence: ':::indent{level=2}' },
  { id: 'indent3', command: 'indent', argument: '3', icon: 'indent', fence: ':::indent{level=3}' },
  { id: 'noteInfo', command: 'note', argument: 'info', icon: 'note', fence: ':::note{type=info}' },
  {
    id: 'noteWarning',
    command: 'note',
    argument: 'warning',
    icon: 'warning',
    fence: ':::note{type=warning}',
  },
  {
    id: 'signature',
    command: 'signature',
    argument: '3',
    icon: 'signature',
    fence: ':::signature{lines=3}',
  },
  { id: 'small', command: 'smallBlock', icon: 'small-text', fence: ':::small' },
];

const ALIGNMENTS: readonly { to: 'left' | 'center' | 'right' | 'justify'; icon: IconName }[] = [
  { to: 'left', icon: 'align-left' },
  { to: 'center', icon: 'align-center' },
  { to: 'right', icon: 'align-right' },
  { to: 'justify', icon: 'align-justify' },
];

/** The swatch grid: every tone in three shades, then the semantic aliases. */
const swatches = computed(() => ({
  tones: COLOR_TONES.map((tone) => ({
    tone,
    shades: (['light', 'base', 'dark'] as const).map((shade) => {
      const name = shadedName(tone, shade);
      return { name, value: resolveColor(name, theme.value)?.screen ?? '' };
    }),
  })),
  aliases: COLOR_ALIASES.map((alias) => ({
    name: alias,
    value: resolveColor(alias, theme.value)?.screen ?? '',
  })),
}));

/** The highlight tones on offer: the light shade of every tone. */
const highlightTones = computed(() =>
  COLOR_TONES.map((tone) => ({
    tone,
    value: resolveColor(shadedName(tone, 'light'), theme.value)?.screen ?? '',
  })),
);

/** The swatch on the toolbar button: the selection's colour, or the ink. */
const currentSwatch = computed(() =>
  selection.value.color ? resolveColor(selection.value.color, theme.value)?.screen : undefined,
);

// --- availability (R13-021, AC-EDIT-010) -----------------------------------
/** Whether a command can run right now, given the mode and the node under the cursor. */
function canRun(id: string): boolean {
  if (id === 'find') return true;
  if (!visual.value) {
    // The source view has no editor history of its own; the textarea's
    // native undo and select-all stay the browser's.
    return id !== 'undo' && id !== 'redo' && id !== 'selectAll';
  }
  if (!editor.value) return false;
  const state = selection.value;
  switch (id) {
    case 'undo':
      return canUndo.value;
    case 'redo':
      return canRedo.value;
    case 'heading':
      return !state.inList;
    case 'table':
    case 'image':
    case 'pageBreak':
    case 'qr':
    case 'layout':
    case 'align':
      return !state.inTable;
    default:
      return true;
  }
}

function refreshState(): void {
  const port = editor.value;
  if (!port) return;
  canUndo.value = port.canUndo();
  canRedo.value = port.canRedo();
  selection.value = port.selectionState();
}

/**
 * ProseMirror settles a click's selection — a node selection on an image, say
 * — in its own `mouseup` listener on the document, which runs after this
 * component's. Reading the state one tick later sees the click's result.
 */
function refreshStateAfterPointer(): void {
  setTimeout(refreshState, 0);
}

/** Object URL for a stored image, for the editor's `<img>`; the node view revokes it. */
async function resolveAssetUrl(assetId: string): Promise<string | null> {
  const data = await services.assets.data(assetId);
  return data ? URL.createObjectURL(data) : null;
}

async function mountEditor(): Promise<void> {
  const element = host.value;
  if (!element || editor.value) return;
  loading.value = true;
  failed.value = false;
  try {
    editor.value = await services.richTextEditor.create({
      element,
      initialMarkdown: props.modelValue,
      onChange: (markdown) => {
        lastEmitted = markdown;
        emit('update:modelValue', markdown);
      },
      onStateChange: refreshState,
      locale: props.locale,
      resolveAssetUrl,
      labels: {
        pageBreak: t('editor.pageBreak'),
        missingAsset: t('render.assetMissingInline'),
        qrCode: t('render.qrCode'),
        qrEmpty: t('editor.qrEmpty'),
      },
    });
    lastEmitted = props.modelValue;
    refreshState();
  } catch {
    // The chunk did not load or the editor refused to mount: the source view
    // still works, and the document is not touched.
    failed.value = true;
    view.value = 'source';
  } finally {
    loading.value = false;
  }
}

async function unmountEditor(): Promise<void> {
  const port = editor.value;
  editor.value = null;
  await port?.destroy();
}

async function switchView(next: EditorView): Promise<void> {
  if (next === view.value) return;
  if (next === 'source' && editor.value) {
    // Leave the visual view with its latest Markdown in the document.
    const markdown = await editor.value.getMarkdown();
    if (markdown !== props.modelValue) {
      lastEmitted = markdown;
      emit('update:modelValue', markdown);
    }
    await unmountEditor();
  }
  view.value = next;
  writeSetting(appSettings.editorView, next);
  emit('focusTarget', next === 'visual' ? 'rich-editor' : 'markdown-editor');
  if (next === 'visual') {
    // The host renders on the next tick; mount once it exists.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await mountEditor();
  }
}

// --- commands, routed per mode ---------------------------------------------
function run(command: EditorCommand, argument?: EditorCommandArgument): void {
  if (visual.value) {
    editor.value?.run(command, argument);
    return;
  }
  void sourceCommand(command, argument);
}

/** The source view's spelling of every toolbar command: a text transform on the textarea. */
async function sourceCommand(
  command: EditorCommand,
  argument?: EditorCommandArgument,
): Promise<void> {
  const field = source.value;
  if (!field) return;
  const text = typeof argument === 'string' ? argument : '';
  switch (command) {
    case 'bold':
      return field.wrapSelection('**');
    case 'italic':
      return field.wrapSelection('*');
    case 'strikethrough':
      return field.wrapSelection('~~');
    case 'code':
      return field.wrapSelection('`');
    case 'underline':
      return field.wrapSelection(':u[', ']');
    case 'highlight':
      return field.wrapSelection(':highlight[', ']');
    case 'small':
      return field.wrapSelection(':small[', ']');
    case 'superscript':
      return field.wrapSelection(':sup[', ']');
    case 'subscript':
      return field.wrapSelection(':sub[', ']');
    case 'color':
      return text ? field.wrapSelection(`:${text}[`, ']') : undefined;
    case 'paragraph':
      return field.prefixLines('#'.repeat(selection.value.heading || 1) + ' ');
    case 'heading1':
    case 'heading2':
    case 'heading3':
    case 'heading4':
    case 'heading5':
    case 'heading6':
      return field.prefixLines(`${'#'.repeat(Number(command.slice(-1)))} `);
    case 'bulletList':
      return field.prefixLines('- ');
    case 'orderedList':
      return field.prefixLines('1. ', true);
    case 'blockquote':
      return field.prefixLines('> ');
    case 'horizontalRule':
      return field.insertBlock('---');
    case 'pageBreak':
      return field.insertBlock('::page-break');
    case 'date':
      return field.insertText(dateToken(text));
    case 'linkWithText': {
      if (typeof argument !== 'object' || !('href' in argument)) return;
      return field.insertText(`[${argument.text}](${argument.href})`);
    }
    case 'table': {
      const size =
        typeof argument === 'object' && 'rows' in argument ? argument : { rows: 3, cols: 3 };
      const header = `| ${Array.from({ length: size.cols }, (_, i) => `Spalte ${i + 1}`).join(' | ')} |`;
      const rule = `| ${Array.from({ length: size.cols }, () => '---').join(' | ')} |`;
      const row = `| ${Array.from({ length: size.cols }, () => ' ').join(' | ')} |`;
      const rows = Array.from({ length: Math.max(size.rows - 1, 0) }, () => row);
      return field.insertBlock([header, rule, ...rows].join('\n'));
    }
    case 'image': {
      if (typeof argument !== 'object' || !('assetId' in argument)) return;
      const block = serializeImageLayout(argument);
      return field.insertText(`![${argument.alt ?? ''}](asset:${argument.assetId})${block}`);
    }
    case 'qr':
      if (typeof argument !== 'object' || !('payload' in argument)) return;
      return field.insertBlock(serializeQrDirective(argument));
    case 'align':
      return field.wrapBlock(`:::align{to=${text || 'left'}}`, ':::');
    case 'indent':
      return field.wrapBlock(`:::indent{level=${text || '1'}}`, ':::');
    case 'note':
      return field.wrapBlock(`:::note{type=${text || 'info'}}`, ':::');
    case 'signature':
      return field.wrapBlock(`:::signature{lines=${text || '3'}}`, ':::');
    case 'smallBlock':
      return field.wrapBlock(':::small', ':::');
    case 'clearFormatting':
      return field.stripMarks();
    default:
      return;
  }
}

function applyBlock(event: Event): void {
  const select = event.target as HTMLSelectElement;
  run(select.value as EditorCommand);
}

function applyColor(name: string): void {
  colorOpen.value = false;
  run('color', name);
}

function applyHighlightTone(tone: ColorTone): void {
  highlightOpen.value = false;
  emit('highlightTone', tone);
}

function applyLayout(layout: (typeof LAYOUTS)[number]): void {
  layoutOpen.value = false;
  run(layout.command, layout.argument);
}

function insertDate(iso: string): void {
  dateOpen.value = false;
  run('date', iso);
}

function insertLink(link: { href: string; text: string }): void {
  run('linkWithText', link);
}

function insertImage(image: {
  assetId: string;
  widthMm?: number;
  widthPercent?: number;
  align?: ImageAlignment;
  alt: string;
}): void {
  run('image', image);
}

/** A layout change from the image toolbar, applied to the selected image (R14-015). */
function changeImageLayout(layout: ImageLayoutChange['layout']): void {
  run('imageLayout', { layout });
}

/** Opens the QR dialog for a new code, or for the selected one (change 0040). */
function openQrDialog(edit: boolean): void {
  qrEditing.value = edit ? selection.value.qr : null;
  qrOpen.value = true;
}

function insertQr(spec: QrCodeSpec): void {
  run('qr', spec);
}

/** A change to the selected code — from the dialog or the toolbar's alignment buttons. */
function updateQr(spec: QrCodeSpec): void {
  run('qrUpdate', spec);
}

/** The selected text for the link dialog, in either view. */
const linkSeed = computed(() => ({
  text: visual.value ? selection.value.selectedText : (source.value?.selectedText() ?? ''),
  href: visual.value ? (selection.value.linkHref ?? '') : '',
}));

/** Inserts plain text at the cursor in whichever view is active (change 0011). */
function insertText(text: string): void {
  if (visual.value) editor.value?.insertText(text);
  else void source.value?.insertText(text);
}

/**
 * Commands from the application menu (R13-015), by id. The menu is the same
 * vocabulary as the toolbar, so every entry here maps onto a toolbar action.
 */
// --- find and replace (change 0048) ------------------------------------------
function openFind(): void {
  findOpen.value = true;
  findResult.value = null;
}

function closeFind(): void {
  findOpen.value = false;
  findResult.value = null;
  editor.value?.clearMatchHighlight();
  if (visual.value) editor.value?.focus();
}

function findText(query: string, options: TextSearchOptions, direction: 1 | -1): void {
  const result = visual.value
    ? (editor.value?.selectMatch(query, options, direction) ?? null)
    : (source.value?.findMatch(query, options, direction) ?? null);
  findResult.value = result ?? { index: -1, total: 0 };
  if (visual.value) refreshState();
}

function replaceText(query: string, replacement: string, options: TextSearchOptions): void {
  const replaced = visual.value
    ? (editor.value?.replaceMatch(query, replacement, options) ?? false)
    : (source.value?.replaceMatch(query, replacement, options) ?? false);
  // Nothing selected yet: the first click selects, the next replaces.
  if (!replaced) {
    findText(query, options, 1);
    return;
  }
  const total = visual.value
    ? (editor.value?.countMatches(query, options) ?? 0)
    : (source.value?.countMatches(query, options) ?? 0);
  findResult.value = total
    ? { index: findResult.value ? Math.min(findResult.value.index, total - 1) : 0, total }
    : { index: -1, total: 0 };
  if (visual.value) refreshState();
}

function replaceAllText(query: string, replacement: string, options: TextSearchOptions): void {
  if (visual.value) editor.value?.replaceAllMatches(query, replacement, options);
  else source.value?.replaceAllMatches(query, replacement, options);
  findResult.value = { index: -1, total: 0 };
  if (visual.value) refreshState();
}

function menuCommand(id: string): void {
  if (id.startsWith('align:')) {
    run('align', id.slice(6));
    return;
  }
  switch (id) {
    case 'find':
      openFind();
      break;
    case 'undo':
      editor.value?.undo();
      break;
    case 'redo':
      editor.value?.redo();
      break;
    case 'selectAll':
      if (visual.value) editor.value?.selectAll();
      else source.value?.selectAll();
      break;
    case 'clearFormatting':
      run('clearFormatting');
      break;
    case 'dateToday':
      insertDate(todayIso());
      break;
    case 'datePick':
      dateOpen.value = true;
      break;
    case 'link':
      linkOpen.value = true;
      break;
    case 'image':
      imageOpen.value = true;
      break;
    case 'qr':
      openQrDialog(false);
      break;
    case 'color':
      colorOpen.value = true;
      break;
    case 'table':
      tableOpen.value = true;
      break;
    case 'horizontalRule':
    case 'pageBreak':
    case 'paragraph':
    case 'heading1':
    case 'heading2':
    case 'heading3':
    case 'heading4':
    case 'heading5':
    case 'heading6':
    case 'bold':
    case 'italic':
    case 'underline':
    case 'strikethrough':
    case 'code':
    case 'highlight':
    case 'bulletList':
    case 'orderedList':
    case 'blockquote':
      run(id);
      break;
    default:
      break;
  }
}

/** The surface under the focus, reported so the menu bar knows what "Bold" means. */
function reportFocus(): void {
  emit('focusTarget', visual.value ? 'rich-editor' : 'markdown-editor');
}

const platform = detectPlatform();

/** Tooltip text with the key, from the registry (R14-008). */
function tip(labelKey: string, command: string): string {
  const keys = shortcutLabel(`editor:${command}`, platform);
  return keys ? `${t(labelKey)} (${keys})` : t(labelKey);
}

/**
 * Editor-scope shortcuts (R14-008), caught in the capture phase so the
 * registry — not Milkdown's built-in keymap — decides what `Ctrl+B` does, and
 * both never fire for one key. A key the current view cannot serve (undo in
 * the source view) is left to the browser.
 */
function onEditorKeydown(event: KeyboardEvent): void {
  const definition = findShortcut(event, platform, 'editor');
  if (!definition) return;
  const id = definition.command.slice('editor:'.length);
  if (!canRun(availabilityKey(id))) return;
  if (definition.preventBrowserDefault) event.preventDefault();
  event.stopPropagation();
  menuCommand(id);
}

/** The `canRun` key a command id maps onto, as the dispatcher does it. */
function availabilityKey(id: string): string {
  if (id.startsWith('heading') || id === 'paragraph') return 'heading';
  return id;
}

defineExpose({ insertText, menuCommand, canRun });

// A change from elsewhere — another document, an import, a restore — reloads
// the editor. Our own echo does not.
watch(
  () => props.modelValue,
  async (value) => {
    if (!editor.value || value === lastEmitted) return;
    lastEmitted = value;
    await editor.value.loadMarkdown(value);
  },
);

onMounted(() => {
  if (visual.value) void mountEditor();
});
onBeforeUnmount(() => void unmountEditor());
</script>

<template>
  <div class="rich-editor" data-shortcut-scope="editor" @keydown.capture="onEditorKeydown">
    <!-- The mode switch first (AC-EDIT-001): what the toolbar below acts on.
         Undo and redo share the row (R14-006). -->
    <div class="rich-views">
      <EditorModeSwitch :model-value="view" @update:model-value="switchView" />
      <div class="rich-toolbar-group rich-history" role="group" :aria-label="t('editor.history')">
        <button
          type="button"
          class="btn btn-ghost btn-square"
          :disabled="!canRun('undo')"
          :title="tip('editor.undo', 'undo')"
          :aria-label="t('editor.undo')"
          @click="editor?.undo()"
        >
          <AppIcon name="undo" />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-square"
          :disabled="!canRun('redo')"
          :title="tip('editor.redo', 'redo')"
          :aria-label="t('editor.redo')"
          @click="editor?.redo()"
        >
          <AppIcon name="redo" />
        </button>
      </div>
    </div>

    <div class="rich-toolbar" role="toolbar" :aria-label="t('editor.toolbar')">
      <label class="rich-toolbar-group">
        <span class="sr-only">{{ t('editor.block') }}</span>
        <select
          class="select select-bordered select-sm"
          :value="BLOCKS[selection.heading]?.command ?? 'paragraph'"
          :disabled="!canRun('heading')"
          :title="t('editor.block')"
          data-testid="editor-block"
          @change="applyBlock"
        >
          <option v-for="block in BLOCKS" :key="block.command" :value="block.command">
            {{ t(`editor.blocks.${block.command}`) }}
          </option>
        </select>
      </label>

      <div class="rich-toolbar-group">
        <button
          v-for="entry in [
            { id: 'bold', icon: 'bold', active: selection.bold },
            { id: 'italic', icon: 'italic', active: selection.italic },
            { id: 'underline', icon: 'underline', active: selection.underline },
            { id: 'strikethrough', icon: 'strikethrough', active: selection.strikethrough },
            { id: 'code', icon: 'code', active: false },
          ] as const"
          :key="entry.id"
          type="button"
          class="btn btn-ghost btn-sm btn-square"
          :class="{ 'btn-active': entry.active }"
          :disabled="!canRun(entry.id)"
          :aria-pressed="entry.active"
          :title="tip(`editor.${entry.id}`, entry.id)"
          :aria-label="t(`editor.${entry.id}`)"
          @click="run(entry.id)"
        >
          <AppIcon :name="entry.icon" />
        </button>

        <!-- Highlight: the button toggles, the caret picks the document's highlight tone. -->
        <span class="rich-split">
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square"
            :class="{ 'btn-active': selection.highlight }"
            :disabled="!canRun('highlight')"
            :aria-pressed="selection.highlight"
            :title="t('editor.highlight')"
            :aria-label="t('editor.highlight')"
            data-testid="editor-highlight"
            @click="run('highlight')"
          >
            <AppIcon name="highlight" />
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm rich-caret"
            :aria-expanded="highlightOpen"
            :aria-label="t('editor.highlightTone')"
            :title="t('editor.highlightTone')"
            @click="highlightOpen = !highlightOpen"
          >
            <span class="rich-swatch" :style="{ background: theme.highlight.screen }" />
            <AppIcon name="chevron-down" size="sm" />
          </button>
          <AppPopover
            :open="highlightOpen"
            :label="t('editor.highlightTone')"
            @close="highlightOpen = false"
          >
            <p class="popover-title">{{ t('editor.highlightTone') }}</p>
            <div class="rich-color-row rich-color-wrap">
              <button
                v-for="entry in highlightTones"
                :key="entry.tone"
                type="button"
                class="rich-swatch-button"
                :class="{ 'is-active': theme.highlight.screen === entry.value }"
                :title="entry.tone"
                :aria-label="entry.tone"
                :style="{ background: entry.value }"
                @click="applyHighlightTone(entry.tone)"
              />
            </div>
          </AppPopover>
        </span>

        <!-- Text colour: a popover with every tone, the aliases, and a reset. -->
        <span class="rich-split">
          <button
            type="button"
            class="btn btn-ghost btn-sm rich-color-button"
            :disabled="!canRun('color')"
            :aria-expanded="colorOpen"
            :aria-pressed="selection.color !== null"
            :title="t('editor.color')"
            :aria-label="t('editor.color')"
            data-testid="editor-color"
            @click="colorOpen = !colorOpen"
          >
            <AppIcon name="text-color" />
            <span class="rich-swatch" :style="{ background: currentSwatch ?? 'currentColor' }" />
          </button>
          <AppPopover :open="colorOpen" :label="t('editor.color')" @close="colorOpen = false">
            <div class="rich-color-panel" data-testid="editor-color-panel">
              <button
                type="button"
                class="btn btn-ghost btn-xs"
                data-testid="editor-color-reset"
                @click="applyColor('')"
              >
                <AppIcon name="close" size="sm" />
                <span>{{ t('editor.colorNone') }}</span>
              </button>
              <div v-for="entry in swatches.tones" :key="entry.tone" class="rich-color-row">
                <span class="rich-color-tone">{{ entry.tone }}</span>
                <button
                  v-for="shade in entry.shades"
                  :key="shade.name"
                  type="button"
                  class="rich-swatch-button"
                  :class="{ 'is-active': selection.color === shade.name }"
                  :title="shade.name"
                  :aria-label="shade.name"
                  :aria-pressed="selection.color === shade.name"
                  :data-color="shade.name"
                  :style="{ background: shade.value }"
                  @click="applyColor(shade.name)"
                />
              </div>
              <div class="rich-color-row rich-color-aliases">
                <button
                  v-for="alias in swatches.aliases"
                  :key="alias.name"
                  type="button"
                  class="btn btn-ghost btn-xs"
                  :class="{ 'btn-active': selection.color === alias.name }"
                  :data-color="alias.name"
                  @click="applyColor(alias.name)"
                >
                  <span class="rich-swatch" :style="{ background: alias.value }" />
                  {{ t(`editor.colorAliases.${alias.name}`) }}
                </button>
              </div>
            </div>
          </AppPopover>
        </span>

        <!-- Clear formatting: every character mark off the selection (R14-005). -->
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square"
          :disabled="!canRun('clearFormatting')"
          :title="tip('editor.clearFormatting', 'clearFormatting')"
          :aria-label="t('editor.clearFormatting')"
          data-testid="editor-clear-formatting"
          @click="run('clearFormatting')"
        >
          <AppIcon name="clear-formatting" />
        </button>
      </div>

      <div class="rich-toolbar-group" role="group" :aria-label="t('editor.alignment')">
        <button
          v-for="entry in ALIGNMENTS"
          :key="entry.to"
          type="button"
          class="btn btn-ghost btn-sm btn-square"
          :disabled="!canRun('align')"
          :title="t(`editor.layouts.align${entry.to.charAt(0).toUpperCase()}${entry.to.slice(1)}`)"
          :aria-label="
            t(`editor.layouts.align${entry.to.charAt(0).toUpperCase()}${entry.to.slice(1)}`)
          "
          @click="run('align', entry.to)"
        >
          <AppIcon :name="entry.icon" />
        </button>
      </div>

      <div class="rich-toolbar-group">
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square"
          :disabled="!canRun('bulletList')"
          :title="t('editor.bulletList')"
          :aria-label="t('editor.bulletList')"
          @click="run('bulletList')"
        >
          <AppIcon name="list-bulleted" />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square"
          :disabled="!canRun('orderedList')"
          :title="t('editor.orderedList')"
          :aria-label="t('editor.orderedList')"
          @click="run('orderedList')"
        >
          <AppIcon name="list-numbered" />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square"
          :disabled="!canRun('blockquote')"
          :title="t('editor.blockquote')"
          :aria-label="t('editor.blockquote')"
          @click="run('blockquote')"
        >
          <AppIcon name="quote" />
        </button>
      </div>

      <div class="rich-toolbar-group" role="group" :aria-label="t('editor.insert')">
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square"
          :class="{ 'btn-active': selection.link }"
          :disabled="!canRun('link')"
          :aria-pressed="selection.link"
          :title="tip('editor.link', 'link')"
          :aria-label="t('editor.link')"
          data-testid="editor-link"
          @click="linkOpen = true"
        >
          <AppIcon name="link" />
        </button>
        <span class="rich-split">
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square"
            :disabled="!canRun('table')"
            :aria-expanded="tableOpen"
            :title="t('editor.table')"
            :aria-label="t('editor.table')"
            data-testid="editor-table"
            @click="tableOpen = !tableOpen"
          >
            <AppIcon name="table" />
          </button>
          <TablePopover
            :open="tableOpen"
            @close="tableOpen = false"
            @insert="run('table', $event)"
          />
        </span>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square"
          :disabled="!canRun('image')"
          :title="t('editor.image')"
          :aria-label="t('editor.image')"
          data-testid="editor-image"
          @click="imageOpen = true"
        >
          <AppIcon name="image" />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square"
          :disabled="!canRun('qr')"
          :title="t('editor.qr')"
          :aria-label="t('editor.qr')"
          data-testid="editor-qr"
          @click="openQrDialog(false)"
        >
          <AppIcon name="qr-code" />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square"
          :disabled="!canRun('pageBreak')"
          :title="tip('editor.pageBreak', 'pageBreak')"
          :aria-label="t('editor.pageBreak')"
          @click="run('pageBreak')"
        >
          <AppIcon name="page-break" />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square"
          :disabled="!canRun('horizontalRule')"
          :title="t('editor.rule')"
          :aria-label="t('editor.rule')"
          @click="run('horizontalRule')"
        >
          <AppIcon name="rule" />
        </button>
        <span class="rich-split">
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            :aria-expanded="dateOpen"
            :title="t('editor.dateInsertHint')"
            @click="dateOpen = !dateOpen"
          >
            <AppIcon name="date" />
            <span>{{ t('editor.date') }}</span>
          </button>
          <AppPopover :open="dateOpen" :label="t('editor.datePick')" @close="dateOpen = false">
            <form class="popover-form" @submit.prevent="insertDate(pickedDate)">
              <button type="button" class="btn btn-sm btn-outline" @click="insertDate(todayIso())">
                {{ t('editor.dateToday') }}
              </button>
              <label class="field">
                <span>{{ t('editor.datePick') }}</span>
                <input
                  v-model="pickedDate"
                  class="input input-bordered input-sm"
                  type="date"
                  required
                />
              </label>
              <button type="submit" class="btn btn-sm btn-primary">
                {{ t('editor.dateInsert') }}
              </button>
            </form>
          </AppPopover>
        </span>
        <span class="rich-split">
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            :disabled="!canRun('layout')"
            :aria-expanded="layoutOpen"
            :title="t('editor.layoutHint')"
            data-testid="editor-layout"
            @click="layoutOpen = !layoutOpen"
          >
            <AppIcon name="note" />
            <span>{{
              selection.block && selection.block in { indent: 1, note: 1, signature: 1, small: 1 }
                ? t(`editor.layoutActive.${selection.block}`)
                : t('editor.layout')
            }}</span>
            <AppIcon name="chevron-down" size="sm" />
          </button>
          <AppPopover :open="layoutOpen" :label="t('editor.layout')" @close="layoutOpen = false">
            <ul class="popover-list" role="menu">
              <li v-for="layout in LAYOUTS" :key="layout.id" role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="popover-item"
                  :data-layout="layout.id"
                  @click="applyLayout(layout)"
                >
                  <AppIcon :name="layout.icon" size="sm" />
                  <span>{{ t(`editor.layouts.${layout.id}`) }}</span>
                </button>
              </li>
            </ul>
          </AppPopover>
        </span>
      </div>
    </div>

    <LinkDialog
      :open="linkOpen"
      :initial-text="linkSeed.text"
      :initial-href="linkSeed.href"
      @close="linkOpen = false"
      @insert="insertLink"
    />
    <ImageDialog
      :open="imageOpen"
      :assets="assets ?? []"
      @close="imageOpen = false"
      @insert="insertImage"
    />
    <QrCodeDialog
      :open="qrOpen"
      :initial="qrEditing"
      @close="qrOpen = false"
      @insert="insertQr"
      @update="updateQr"
    />

    <p v-if="failed" class="alert alert-warning" role="status">{{ t('editor.failed') }}</p>

    <FindReplaceBar
      :open="findOpen"
      :result="findResult"
      @close="closeFind"
      @find="findText"
      @replace="replaceText"
      @replace-all="replaceAllText"
    />
    <div v-if="visual" class="rich-host-wrap" :style="hostStyle">
      <p v-if="loading" class="editor-hint">{{ t('editor.loading') }}</p>
      <!-- Alignment and size of the selected image (R14-015). -->
      <ImageToolbar v-if="selection.image" :layout="selection.image" @change="changeImageLayout" />
      <!-- Alignment and the way into the dialog for the selected QR code (change 0040). -->
      <QrToolbar
        v-if="selection.qr"
        :spec="selection.qr"
        @change="updateQr"
        @edit="openQrDialog(true)"
      />
      <!-- A click moves the caret without a document transaction, so the
           toolbar state is refreshed on pointer and key events as well. -->
      <div
        ref="host"
        class="rich-host"
        :aria-label="label"
        @mouseup="refreshStateAfterPointer"
        @keyup="refreshState"
        @focusin="
          refreshState();
          reportFocus();
        "
      />
    </div>
    <MarkdownEditor
      v-else
      ref="source"
      :model-value="modelValue"
      :label="label"
      @update:model-value="emit('update:modelValue', $event)"
      @focusin="reportFocus"
    />
  </div>
</template>
