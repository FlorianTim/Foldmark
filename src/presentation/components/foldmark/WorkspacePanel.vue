<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import { referencedAssetIds } from '@/application/render/RenderPlan';
import { summarizeIssues } from '@/domain/common/ValidationIssue';
import {
  resolveColor,
  resolveTheme,
  shadedName,
  themeDeviations,
  type ColorTone,
} from '@/domain/document/DocumentTheme';
import type { TemplateOptions } from '@/domain/document/DocumentTemplate';
import { isTwoSided, type DocumentKind } from '@/domain/document/FoldmarkDocument';
import AppIcon from '@/presentation/components/AppIcon.vue';
import { useAssetUrls } from '@/presentation/composables/useAssetUrls';
import { useElementWidth } from '@/presentation/composables/useElementWidth';
import type { IconName } from '@/presentation/icons/iconNames.generated';
import {
  appSettings,
  readSetting,
  writeSetting,
  WORKSPACE_LAYOUT_IDS,
  WORKSPACE_MODE_IDS,
  type WorkspaceLayout,
  type WorkspaceMode,
} from '@/presentation/settings/settingsRegistry';
import { SAVE_STATUS_GLYPH } from '@/presentation/stores/saveStatus';
import { useLibraryStore } from '@/presentation/stores/libraryStore';
import { useWorkspaceStore } from '@/presentation/stores/workspaceStore';
import {
  createCommandDispatcher,
  type CommandTarget,
} from '@/presentation/editor/commandDispatcher';
import { detectPlatform, shortcutLabel } from '@/presentation/shortcuts/shortcutRegistry';
import { useShortcuts } from '@/presentation/shortcuts/useShortcuts';
import {
  DEFAULT_PANE_FRACTIONS,
  gridColumns,
  hasSplitterAfter,
  paneSlots,
  panesFor,
  resizePanes,
  type FocusPane,
  type Pane,
  type PaneFractions,
} from '@/presentation/workspace/workspaceLayout';
import AppMenu, { type Menu } from '@/presentation/components/foldmark/AppMenu.vue';
import DocumentCheckDialog from '@/presentation/components/foldmark/DocumentCheckDialog.vue';
import EmailDialog from '@/presentation/components/foldmark/EmailDialog.vue';
import ExportDialog from '@/presentation/components/foldmark/ExportDialog.vue';
import HistoryDialog from '@/presentation/components/foldmark/HistoryDialog.vue';
import MetadataForm from '@/presentation/components/foldmark/MetadataForm.vue';
import PaneResizer from '@/presentation/components/foldmark/PaneResizer.vue';
import PaperPreview from '@/presentation/components/foldmark/PaperPreview.vue';
import PaperSurface from '@/presentation/components/foldmark/PaperSurface.vue';
import PrintDialog from '@/presentation/components/foldmark/PrintDialog.vue';
import SaveTemplateDialog from '@/presentation/components/foldmark/SaveTemplateDialog.vue';
import RichTextEditor from '@/presentation/components/foldmark/RichTextEditor.vue';
import ShortcutsDialog from '@/presentation/components/foldmark/ShortcutsDialog.vue';
import SurfaceEditor from '@/presentation/components/foldmark/SurfaceEditor.vue';

/**
 * The workspace: three areas of working on one document (R13-013).
 *
 * - **Document settings** — what it is and whom it is for: profile, title,
 *   sender, recipient, letter details, page numbers, font theme.
 * - **Writing area** — what it says.
 * - **Preview** — what the paper will show.
 *
 * The areas are a semantic split, not a column layout. On a phone they are
 * tabs; on a laptop the chosen combination sits side by side; on a wide
 * monitor all three fit (`workspaceLayout.ts` decides). Side panes fold to a
 * rail, the splitters between panes drag, and Writing area and Preview have a
 * focus mode that gives them the whole workspace (R13-014). Above the panes a
 * classic menu bar routes to the same commands the toolbar offers (R13-015).
 *
 * Output — print, export, email — lives in three dialogs (R13-009), and the
 * document check in a fourth (R13-010); none of them blocks on warnings.
 *
 * The `print-root` at the bottom is the copy the printer actually receives. It
 * is built from the store's `paper`-mode plan, teleported next to the app
 * shell and invisible on screen; the print stylesheet shows it and hides every
 * other child of `body` (R14-001). Printing the preview instead would mean CSS
 * deciding which marks appear, rather than the print profile.
 */
const emit = defineEmits<{
  openAddressBook: [query: string];
  navigate: [view: 'documents' | 'help-manual' | 'help-faq' | 'about' | 'open-source'];
}>();

const workspace = useWorkspaceStore();
const library = useLibraryStore();
const { t, locale } = useI18n();

const root = ref<HTMLElement | null>(null);
const width = useElementWidth(root);

// --- layout state ----------------------------------------------------------
const mode = ref<WorkspaceMode>(readSetting(appSettings.workspaceMode));
const layout = ref<WorkspaceLayout>(readSetting(appSettings.workspaceLayout));
const collapsed = ref(readSetting(appSettings.workspaceCollapsed));
const fractions = ref<PaneFractions>(readSetting(appSettings.workspacePaneWidths));
/** Focus mode is a moment, not a preference: it is not stored. */
const focus = ref<FocusPane>(null);

const panes = computed(() => panesFor(width.value, layout.value, mode.value));
const tabbed = computed(() => panes.value.length === 1);
const slots = computed(() => paneSlots(panes.value, collapsed.value, focus.value));
const columns = computed(() => gridColumns(slots.value, fractions.value));
const gridStyle = computed(() => (tabbed.value ? {} : { gridTemplateColumns: columns.value }));
const isCollapsed = (pane: Pane): boolean =>
  slots.value.find((slot) => slot.pane === pane)?.collapsed ?? false;

function setMode(next: WorkspaceMode): void {
  mode.value = next;
  writeSetting(appSettings.workspaceMode, next);
}

function setLayout(next: WorkspaceLayout): void {
  layout.value = next;
  focus.value = null;
  writeSetting(appSettings.workspaceLayout, next);
}

function setCollapsed(pane: 'document' | 'preview', value: boolean): void {
  collapsed.value = { ...collapsed.value, [pane]: value };
  writeSetting(appSettings.workspaceCollapsed, collapsed.value);
}

function toggleCollapsed(pane: 'document' | 'preview'): void {
  focus.value = null;
  setCollapsed(pane, !collapsed.value[pane]);
}

/** Focus mode: the pane takes the workspace; Escape or the exit button restores it. */
function setFocus(pane: FocusPane): void {
  focus.value = focus.value === pane ? null : pane;
  if (focus.value && tabbed.value) setMode(focus.value);
}

function onFocusKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && focus.value) {
    focus.value = null;
    event.stopPropagation();
  }
}

/** The grid's width in pixels, for turning a splitter's pixel delta into fractions. */
const grid = ref<HTMLElement | null>(null);

function onResize(left: Pane, right: Pane, deltaPx: number): void {
  const total = grid.value?.getBoundingClientRect().width ?? width.value;
  fractions.value = resizePanes(fractions.value, left, right, deltaPx, total);
  writeSetting(appSettings.workspacePaneWidths, fractions.value);
}

function onResizeEdge(left: Pane, right: Pane, side: 'left' | 'right'): void {
  onResize(left, right, side === 'left' ? -10_000 : 10_000);
}

function resetWidths(): void {
  fractions.value = DEFAULT_PANE_FRACTIONS;
  writeSetting(appSettings.workspacePaneWidths, fractions.value);
}

/** `aria-valuenow` of a splitter: the left pane's share of the pair, in percent. */
function splitterValue(left: Pane, right: Pane): number {
  const pair = fractions.value[left] + fractions.value[right];
  return pair > 0 ? (fractions.value[left] / pair) * 100 : 50;
}

/** Keyboard operation of the mode tabs, as the WAI-ARIA tabs pattern expects. */
function onModeKey(event: KeyboardEvent, index: number): void {
  const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
  if (!step) return;
  event.preventDefault();
  const next =
    WORKSPACE_MODE_IDS[(index + step + WORKSPACE_MODE_IDS.length) % WORKSPACE_MODE_IDS.length];
  setMode(next);
  (event.currentTarget as HTMLElement).parentElement
    ?.querySelector<HTMLElement>(`[data-mode="${next}"]`)
    ?.focus();
}

// --- document and dialogs --------------------------------------------------
const document = computed(() => workspace.document);
const printPlan = computed(() => workspace.printPlan);
const printAssetIds = computed(() => (printPlan.value ? referencedAssetIds(printPlan.value) : []));
const printAssetUrls = useAssetUrls(printAssetIds);
const twoSided = computed(() => (document.value ? isTwoSided(document.value.kind) : false));
const documentTheme = computed(() => resolveTheme(document.value?.printOptions.theme));

const printOpen = ref(false);
const printAsPdf = ref(false);
const exportOpen = ref(false);
const emailOpen = ref(false);
const checkOpen = ref(false);
const historyOpen = ref(false);

function openPrint(asPdf = false): void {
  exportOpen.value = false;
  emailOpen.value = false;
  printAsPdf.value = asPdf;
  printOpen.value = true;
}

/** Findings for the current target, condensed into the badge on the check button. */
const checks = computed(() => summarizeIssues(workspace.issues));

/**
 * Status text next to the Save button. The glyph carries the state on its own,
 * so a reader who cannot tell the colours apart still gets it; the colour is a
 * courtesy on top.
 */
const saveStatus = computed(() => {
  const status = workspace.saveStatus;
  if (!status) return null;
  const glyph = SAVE_STATUS_GLYPH[status.kind];
  switch (status.kind) {
    case 'saved':
      return {
        kind: status.kind,
        glyph,
        text: t(status.draft ? 'workspace.status.draft' : 'workspace.status.saved', {
          time: timeFormat.value.format(status.at),
        }),
      };
    case 'error':
      return { kind: status.kind, glyph, text: t('workspace.status.error') };
    default:
      return { kind: status.kind, glyph, text: t(`workspace.status.${status.kind}`) };
  }
});

const timeFormat = computed(
  () => new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }),
);

/** The highlight tone from the toolbar becomes the document theme's highlight pair. */
function setHighlightTone(tone: ColorTone): void {
  const current = document.value;
  if (!current) return;
  const pair = resolveColor(shadedName(tone, 'light'), documentTheme.value);
  if (!pair) return;
  const theme = themeDeviations({
    ...current.printOptions.theme,
    highlight: { screen: pair.screen, print: pair.screen },
  });
  workspace.patch({ printOptions: { ...current.printOptions, theme } });
}

/** The printed-marks switch in the preview writes the document's print preference. */
function setPrintedMarks(on: boolean): void {
  if (!document.value) return;
  workspace.patch({
    exportPreferences: { ...document.value.exportPreferences, pdfIncludesPhysicalMarks: on },
  });
}

/** Closing flushes the automatic copy first, so nothing is lost (R13-015). */
async function closeDocument(): Promise<void> {
  await workspace.close();
  emit('navigate', 'documents');
}

async function duplicateDocument(): Promise<void> {
  const current = document.value;
  if (!current) return;
  await workspace.flushWorkingCopy();
  const copy = await workspace.runQuietly(() =>
    services.documents.duplicate(current.id, t('documents.copyOf', { title: current.title })),
  );
  if (!copy) return;
  await library.refreshDocuments();
  await workspace.open(copy.id);
}

async function newDocument(kind: DocumentKind): Promise<void> {
  await workspace.flushWorkingCopy();
  const id = await workspace.create({
    kind,
    title: t(`documents.newTitle.${kind}`),
    locale: locale.value === 'de' ? 'de-DE' : 'en-GB',
  });
  if (id) await library.refreshDocuments();
}

// --- menu bar --------------------------------------------------------------
// The two components live inside the slot loop; a string `ref` there would
// collect an array (Vue's `v-for` rule), so they are set by function refs.
const editor = ref<InstanceType<typeof RichTextEditor> | null>(null);
const preview = ref<InstanceType<typeof PaperPreview> | null>(null);
const setEditorRef = (instance: unknown): void => {
  editor.value = (instance as InstanceType<typeof RichTextEditor> | null) ?? null;
};
const setPreviewRef = (instance: unknown): void => {
  preview.value = (instance as InstanceType<typeof PaperPreview> | null) ?? null;
};
const metadataForm = ref<InstanceType<typeof MetadataForm> | null>(null);
const setMetadataRef = (instance: unknown): void => {
  metadataForm.value = (instance as InstanceType<typeof MetadataForm> | null) ?? null;
};

/** Format → Document font… opens the theme group of the document settings (R14-010). */
async function openDocumentFont(): Promise<void> {
  if (tabbed.value) setMode('document');
  else if (isCollapsed('document')) setCollapsed('document', false);
  await nextTick();
  await metadataForm.value?.openThemeGroup();
}

/**
 * The surface the writer was last in (R14-003). A click on a menu or toolbar
 * button does not change it; only an editing surface reporting focus does, so
 * "Format → Bold" still knows where the selection is after the menu took the
 * focus away.
 */
const target = ref<CommandTarget>('none');
function setTarget(next: CommandTarget): void {
  target.value = next;
}

/** Format → Bold over the subject toggles the whole line's weight (A5). */
function toggleSubjectBold(): void {
  const current = document.value;
  if (!current) return;
  const { subjectBold, ...rest } = current.printOptions;
  workspace.patch({
    printOptions: subjectBold === false ? rest : { ...rest, subjectBold: false },
  });
}

const dispatcher = createCommandDispatcher({
  target: () => target.value,
  editor: () => editor.value,
  toggleSubjectBold,
  workspace: (id) => workspaceCommand(id),
});
// Ctrl+S, Ctrl+P and the editor keys, from the one registry (R14-008).
useShortcuts(dispatcher);
const platform = detectPlatform();
/** The key label a menu entry shows for its command, or nothing. */
const keys = (command: string): string | undefined => shortcutLabel(command, platform) || undefined;

const menus = computed<readonly Menu[]>(() => {
  const kinds: readonly { kind: DocumentKind; icon: IconName }[] = [
    { kind: 'letter', icon: 'letter' },
    { kind: 'postcard', icon: 'postcard' },
    { kind: 'card', icon: 'card' },
  ];
  const canEdit = !twoSided.value;
  const layoutItems = WORKSPACE_LAYOUT_IDS.map((id) => ({
    id: `layout:${id}`,
    label: t(`workspace.layout.${id}`),
    checked: layout.value === id,
    dividerBefore: id === 'auto',
  }));
  const built: readonly Menu[] = [
    {
      id: 'file',
      label: t('menu.file'),
      items: [
        ...kinds.map(({ kind, icon }) => ({
          id: `new:${kind}`,
          label: t(`documents.new.${kind}`),
          icon,
        })),
        { id: 'open', label: t('menu.open'), icon: 'documents', dividerBefore: true },
        { id: 'import', label: t('documents.import'), icon: 'import' },
        {
          id: 'save',
          label: t('workspace.save'),
          icon: 'save',
          shortcut: keys('save'),
          dividerBefore: true,
        },
        { id: 'duplicate', label: t('documents.duplicate'), icon: 'duplicate' },
        {
          id: 'saveTemplate',
          label: t('templates.saveAs'),
          icon: 'template',
          disabled: twoSided.value,
        },
        { id: 'history', label: t('workspace.history'), icon: 'history' },
        {
          id: 'print',
          label: t('workspace.print'),
          icon: 'print',
          shortcut: keys('print'),
          dividerBefore: true,
        },
        { id: 'export', label: t('workspace.export'), icon: 'export' },
        { id: 'email', label: t('workspace.email'), icon: 'mail' },
        { id: 'close', label: t('workspace.close'), icon: 'close', dividerBefore: true },
      ],
    },
    {
      id: 'edit',
      label: t('menu.edit'),
      items: [
        {
          id: 'editor:undo',
          label: t('editor.undo'),
          icon: 'undo',
          shortcut: keys('editor:undo'),
          disabled: !canEdit,
        },
        {
          id: 'editor:redo',
          label: t('editor.redo'),
          icon: 'redo',
          shortcut: keys('editor:redo'),
          disabled: !canEdit,
        },
        {
          id: 'editor:selectAll',
          label: t('menu.selectAll'),
          shortcut: keys('editor:selectAll'),
          disabled: !canEdit,
          dividerBefore: true,
        },
        {
          id: 'editor:find',
          label: t('editor.find.menu'),
          icon: 'search',
          shortcut: keys('editor:find'),
          disabled: !canEdit,
        },
        { id: 'check', label: t('workspace.check'), icon: 'validation', dividerBefore: true },
      ],
    },
    {
      id: 'insert',
      label: t('menu.insert'),
      items: [
        { id: 'editor:dateToday', label: t('editor.dateToday'), icon: 'date', disabled: !canEdit },
        { id: 'editor:datePick', label: t('editor.datePick'), icon: 'date', disabled: !canEdit },
        {
          id: 'editor:link',
          label: t('editor.link'),
          icon: 'link',
          shortcut: keys('editor:link'),
          disabled: !canEdit,
          dividerBefore: true,
        },
        { id: 'editor:table', label: t('editor.table'), icon: 'table', disabled: !canEdit },
        { id: 'editor:image', label: t('editor.image'), icon: 'image', disabled: !canEdit },
        { id: 'editor:horizontalRule', label: t('editor.rule'), icon: 'rule', disabled: !canEdit },
        {
          id: 'editor:pageBreak',
          label: t('editor.pageBreak'),
          icon: 'page-break',
          shortcut: keys('editor:pageBreak'),
          disabled: !canEdit,
          dividerBefore: true,
        },
        { id: 'editor:qr', label: t('editor.qr'), icon: 'qr-code', disabled: !canEdit },
      ],
    },
    {
      id: 'format',
      label: t('menu.format'),
      items: [
        {
          id: 'editor:paragraph',
          label: t('editor.blocks.paragraph'),
          icon: 'paragraph',
          disabled: !canEdit,
        },
        {
          id: 'editor:heading1',
          label: t('editor.blocks.heading1'),
          icon: 'heading',
          disabled: !canEdit,
        },
        {
          id: 'editor:heading2',
          label: t('editor.blocks.heading2'),
          icon: 'heading',
          disabled: !canEdit,
        },
        {
          id: 'editor:heading3',
          label: t('editor.blocks.heading3'),
          icon: 'heading',
          disabled: !canEdit,
        },
        {
          id: 'editor:bold',
          label: t('editor.bold'),
          icon: 'bold',
          shortcut: keys('editor:bold'),
          disabled: !canEdit,
          dividerBefore: true,
        },
        {
          id: 'editor:italic',
          label: t('editor.italic'),
          icon: 'italic',
          shortcut: keys('editor:italic'),
          disabled: !canEdit,
        },
        {
          id: 'editor:underline',
          label: t('editor.underline'),
          icon: 'underline',
          disabled: !canEdit,
        },
        {
          id: 'editor:strikethrough',
          label: t('editor.strikethrough'),
          icon: 'strikethrough',
          disabled: !canEdit,
        },
        {
          id: 'editor:highlight',
          label: t('editor.highlight'),
          icon: 'highlight',
          disabled: !canEdit,
        },
        { id: 'editor:color', label: t('editor.color'), icon: 'text-color', disabled: !canEdit },
        {
          id: 'editor:clearFormatting',
          label: t('editor.clearFormatting'),
          icon: 'clear-formatting',
          shortcut: keys('editor:clearFormatting'),
          disabled: !canEdit,
          dividerBefore: true,
        },
        {
          id: 'editor:bulletList',
          label: t('editor.bulletList'),
          icon: 'list-bulleted',
          disabled: !canEdit,
          dividerBefore: true,
        },
        {
          id: 'editor:orderedList',
          label: t('editor.orderedList'),
          icon: 'list-numbered',
          disabled: !canEdit,
        },
        {
          id: 'editor:blockquote',
          label: t('editor.blockquote'),
          icon: 'quote',
          disabled: !canEdit,
        },
        {
          id: 'editor:align:left',
          label: t('editor.layouts.alignLeft'),
          icon: 'align-left',
          disabled: !canEdit,
          dividerBefore: true,
        },
        {
          id: 'editor:align:center',
          label: t('editor.layouts.alignCenter'),
          icon: 'align-center',
          disabled: !canEdit,
        },
        {
          id: 'editor:align:right',
          label: t('editor.layouts.alignRight'),
          icon: 'align-right',
          disabled: !canEdit,
        },
        {
          id: 'editor:align:justify',
          label: t('editor.layouts.alignJustify'),
          icon: 'align-justify',
          disabled: !canEdit,
        },
        {
          id: 'theme:font',
          label: t('menu.documentFont'),
          icon: 'heading',
          dividerBefore: true,
        },
      ],
    },
    {
      id: 'view',
      label: t('menu.view'),
      items: [
        {
          id: 'pane:document',
          label: t('workspace.mode.document'),
          icon: 'document-pane',
          checked: !isCollapsed('document') && panes.value.includes('document'),
          disabled: tabbed.value,
        },
        {
          id: 'pane:preview',
          label: t('workspace.mode.preview'),
          icon: 'preview-pane',
          checked: !isCollapsed('preview') && panes.value.includes('preview'),
          disabled: tabbed.value,
        },
        {
          id: 'focus:write',
          label: t('workspace.focusWrite'),
          icon: 'maximize',
          checked: focus.value === 'write',
          dividerBefore: true,
        },
        {
          id: 'focus:preview',
          label: t('workspace.focusPreview'),
          icon: 'maximize',
          checked: focus.value === 'preview',
        },
        ...layoutItems,
        {
          id: 'guides',
          label: t('preview.guidesMenu'),
          icon: 'guides-visible',
          checked: preview.value?.showGuides ?? true,
          dividerBefore: true,
        },
        {
          id: 'zoom:fit-page',
          label: t('preview.zoom.fit-page'),
          icon: 'fit-page',
          checked: preview.value?.zoom === 'fit-page',
          dividerBefore: true,
        },
        {
          id: 'zoom:fit-width',
          label: t('preview.zoom.fit-width'),
          icon: 'fit-width',
          checked: preview.value?.zoom === 'fit-width',
        },
        {
          id: 'zoom:actual',
          label: t('preview.zoom.actual'),
          checked: preview.value?.zoom === 'actual',
        },
      ],
    },
    {
      id: 'help',
      label: t('menu.help'),
      items: [
        { id: 'help:manual', label: t('help.manual') },
        { id: 'help:faq', label: t('help.faq') },
        { id: 'help:shortcuts', label: t('menu.shortcuts'), dividerBefore: true },
        { id: 'help:about', label: t('nav.about'), icon: 'about', dividerBefore: true },
        { id: 'help:open-source', label: t('openSource.title') },
      ],
    },
  ];
  // What the editor cannot do right now — no surface focused, a heading in a
  // list, undo with nothing to undo — is disabled here, from the same answer
  // the toolbar gives (R14-003).
  return built.map((menu) => ({
    ...menu,
    items: menu.items.map((item) =>
      item.id.startsWith('editor:')
        ? { ...item, disabled: item.disabled || !dispatcher.canExecute(item.id) }
        : item,
    ),
  }));
});

const shortcutsOpen = ref(false);
const saveTemplateOpen = ref(false);
const templateSaved = ref<string | null>(null);

/** File → Save as template… (change 0039): the service decides, the workspace reports. */
async function onSaveTemplate(options: TemplateOptions): Promise<void> {
  const saved = await workspace.saveAsTemplate(options);
  if (!saved) return;
  templateSaved.value = saved.name;
  await library.refreshTemplates();
}

/** The menu bar hands every id to the dispatcher; editor ids stop there. */
async function onMenuCommand(id: string): Promise<void> {
  await dispatcher.execute(id);
}

/** Everything that is not an editor command: file, view and help entries. */
async function workspaceCommand(id: string): Promise<void> {
  if (id.startsWith('new:')) return newDocument(id.slice(4) as DocumentKind);
  if (id.startsWith('layout:')) return setLayout(id.slice(7) as WorkspaceLayout);
  if (id.startsWith('zoom:')) {
    preview.value?.setZoom(id.slice(5) as 'fit-page' | 'fit-width' | 'actual');
    return;
  }
  switch (id) {
    case 'open':
    case 'import':
      await closeDocument();
      break;
    case 'save':
      await workspace.save();
      break;
    case 'duplicate':
      await duplicateDocument();
      break;
    case 'history':
      historyOpen.value = true;
      break;
    case 'saveTemplate':
      saveTemplateOpen.value = true;
      break;
    case 'print':
      openPrint(false);
      break;
    case 'export':
      exportOpen.value = true;
      break;
    case 'email':
      emailOpen.value = true;
      break;
    case 'check':
      checkOpen.value = true;
      break;
    case 'close':
      await closeDocument();
      break;
    case 'theme:font':
      await openDocumentFont();
      break;
    case 'pane:document':
      toggleCollapsed('document');
      break;
    case 'pane:preview':
      toggleCollapsed('preview');
      break;
    case 'focus:write':
      setFocus('write');
      break;
    case 'focus:preview':
      setFocus('preview');
      break;
    case 'guides':
      preview.value?.toggleGuides();
      break;
    case 'help:manual':
      emit('navigate', 'help-manual');
      break;
    case 'help:faq':
      emit('navigate', 'help-faq');
      break;
    case 'help:shortcuts':
      shortcutsOpen.value = true;
      break;
    case 'help:about':
      emit('navigate', 'about');
      break;
    case 'help:open-source':
      emit('navigate', 'open-source');
      break;
    default:
      break;
  }
}

// --- lifecycle -------------------------------------------------------------
/**
 * Warns before a reload discards work the automatic copy has not caught yet.
 *
 * Only edits younger than the debounce can be lost, so the warning is rare;
 * the listener is registered only while a document is open.
 */
function beforeUnload(event: BeforeUnloadEvent): void {
  if (!workspace.pendingEdits) return;
  event.preventDefault();
}

/** A tab going into the background writes its copy at once, debounce or not. */
function onVisibilityChange(): void {
  if (globalThis.document.visibilityState === 'hidden') void workspace.flushWorkingCopy();
}

globalThis.addEventListener('beforeunload', beforeUnload);
globalThis.document.addEventListener('visibilitychange', onVisibilityChange);
// The panel is re-mounted when the user comes back from the image library:
// an image imported there has to be in the picker without reopening (R13-002).
onMounted(() => void workspace.refreshAssets());
onBeforeUnmount(() => {
  globalThis.removeEventListener('beforeunload', beforeUnload);
  globalThis.document.removeEventListener('visibilitychange', onVisibilityChange);
});

/** A closed document takes its dialogs with it. */
watch(document, (next) => {
  if (!next) {
    printOpen.value = false;
    exportOpen.value = false;
    emailOpen.value = false;
    checkOpen.value = false;
    historyOpen.value = false;
    focus.value = null;
  }
});

const PANE_ICON: Readonly<Record<Pane, IconName>> = {
  document: 'document-pane',
  write: 'write-pane',
  preview: 'preview-pane',
};
</script>

<template>
  <section
    v-if="document"
    ref="root"
    class="workspace"
    :data-panes="slots.length"
    :data-focus="focus ?? undefined"
    :aria-label="t('workspace.title')"
    @keydown="onFocusKeydown"
  >
    <header class="workspace-bar">
      <div class="workspace-identity">
        <h1>{{ document.title || t('workspace.untitled') }}</h1>
        <span
          v-if="saveStatus"
          class="save-status"
          :data-state="saveStatus.kind"
          role="status"
          aria-live="polite"
        >
          <span class="save-status-glyph" aria-hidden="true">{{ saveStatus.glyph }}</span>
          {{ saveStatus.text }}
        </span>
      </div>

      <div v-if="tabbed" class="workspace-modes" role="tablist" :aria-label="t('workspace.modes')">
        <button
          v-for="(entry, index) in WORKSPACE_MODE_IDS"
          :key="entry"
          type="button"
          role="tab"
          class="btn btn-sm"
          :class="mode === entry ? 'btn-primary' : 'btn-ghost'"
          :aria-selected="mode === entry"
          :tabindex="mode === entry ? 0 : -1"
          :data-mode="entry"
          @click="setMode(entry)"
          @keydown="onModeKey($event, index)"
        >
          <AppIcon :name="PANE_ICON[entry]" size="sm" />
          <span>{{ t(`workspace.mode.${entry}`) }}</span>
        </button>
      </div>

      <div class="workspace-actions">
        <label v-if="!tabbed || width >= 980" class="workspace-layout">
          <span class="sr-only">{{ t('workspace.layout.label') }}</span>
          <select
            class="select select-bordered select-sm"
            :value="layout"
            :title="t('workspace.layout.label')"
            @change="setLayout(($event.target as HTMLSelectElement).value as WorkspaceLayout)"
          >
            <option v-for="option in WORKSPACE_LAYOUT_IDS" :key="option" :value="option">
              {{ t(`workspace.layout.${option}`) }}
            </option>
          </select>
        </label>

        <button
          class="btn btn-ghost btn-sm workspace-check"
          type="button"
          :title="t('workspace.checkHint')"
          data-testid="check-document"
          @click="checkOpen = true"
        >
          <AppIcon name="validation" />
          <span>{{ t('workspace.check') }}</span>
          <span class="checks-badge" :class="checks.error ? 'is-blocked' : 'is-ready'">
            <span :title="t('check.group.error')">✕ {{ checks.error }}</span>
            <span :title="t('check.group.warning')">⚠ {{ checks.warning }}</span>
            <span :title="t('check.group.info')">ⓘ {{ checks.info }}</span>
          </span>
        </button>

        <div class="workspace-output" role="group" :aria-label="t('workspace.outputGroup')">
          <button
            class="btn btn-outline btn-sm"
            type="button"
            data-testid="open-print"
            @click="openPrint(false)"
          >
            <AppIcon name="print" />
            <span>{{ t('workspace.print') }}</span>
          </button>
          <button
            class="btn btn-outline btn-sm"
            type="button"
            data-testid="open-export"
            @click="exportOpen = true"
          >
            <AppIcon name="export" />
            <span>{{ t('workspace.export') }}</span>
          </button>
          <button
            class="btn btn-outline btn-sm"
            type="button"
            data-testid="open-email"
            @click="emailOpen = true"
          >
            <AppIcon name="mail" />
            <span>{{ t('workspace.email') }}</span>
          </button>
        </div>

        <button
          class="btn btn-ghost btn-sm btn-square"
          type="button"
          :aria-label="t('workspace.history')"
          :title="t('workspace.history')"
          @click="historyOpen = true"
        >
          <AppIcon name="history" />
        </button>
        <button
          class="btn btn-primary btn-sm"
          type="button"
          :aria-busy="workspace.saving"
          @click="workspace.save()"
        >
          <AppIcon name="save" />
          <span>{{ t('workspace.save') }}</span>
        </button>
        <button
          class="btn btn-ghost btn-sm btn-square"
          type="button"
          :aria-label="t('workspace.close')"
          :title="t('workspace.closeHint')"
          @click="closeDocument"
        >
          <AppIcon name="close" />
        </button>
      </div>
    </header>

    <AppMenu :menus="menus" :label="t('menu.label')" @command="onMenuCommand" />

    <p v-if="workspace.error" class="alert alert-error" role="alert">{{ t(workspace.error) }}</p>
    <div v-if="workspace.recovery" class="alert alert-info recovery-banner" role="status">
      <span>
        {{
          t('workspace.recovery', {
            time: timeFormat.format(new Date(workspace.recovery.savedAt)),
          })
        }}
      </span>
      <span class="recovery-actions">
        <button type="button" class="btn btn-sm btn-primary" @click="workspace.acceptRecovery()">
          {{ t('workspace.recoveryContinue') }}
        </button>
        <button type="button" class="btn btn-sm btn-ghost" @click="workspace.discardRecovery()">
          {{ t('workspace.recoveryDiscard') }}
        </button>
      </span>
    </div>
    <p v-if="workspace.profileFallback" class="alert alert-warning" role="status">
      {{ t('workspace.profileFallback') }}
    </p>
    <p v-if="templateSaved" class="alert alert-success" role="status" data-testid="template-saved">
      <span>{{ t('templates.saved', { name: templateSaved }) }}</span>
      <button type="button" class="btn btn-xs btn-ghost" @click="templateSaved = null">
        {{ t('dialog.close') }}
      </button>
    </p>

    <div ref="grid" class="workspace-grid" :style="gridStyle">
      <template v-for="(slot, index) in slots" :key="slot.pane">
        <!-- A folded pane is a rail with an expand handle; the pane itself stays
             mounted (`v-show`) so the editor keeps its state (R13-014). -->
        <div
          v-show="slot.collapsed"
          class="workspace-rail"
          :data-pane="slot.pane"
          role="region"
          :aria-label="t(`workspace.mode.${slot.pane}`)"
        >
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square"
            :aria-label="t('workspace.expandPane', { pane: t(`workspace.mode.${slot.pane}`) })"
            :title="t('workspace.expandPane', { pane: t(`workspace.mode.${slot.pane}`) })"
            :aria-expanded="false"
            @click="focus ? setFocus(null) : toggleCollapsed(slot.pane as 'document' | 'preview')"
          >
            <AppIcon :name="slot.pane === 'preview' ? 'chevron-left' : 'chevron-right'" />
          </button>
          <span class="workspace-rail-label">
            <AppIcon :name="PANE_ICON[slot.pane]" size="sm" />
            {{ t(`workspace.mode.${slot.pane}`) }}
          </span>
        </div>

        <div
          v-show="!slot.collapsed"
          class="workspace-pane"
          :class="`pane-${slot.pane}`"
          :data-pane="slot.pane"
          :role="tabbed ? 'tabpanel' : 'region'"
          :aria-label="t(`workspace.mode.${slot.pane}`)"
        >
          <header v-if="!tabbed" class="pane-header">
            <span class="pane-title">
              <AppIcon :name="PANE_ICON[slot.pane]" size="sm" />
              {{ t(`workspace.mode.${slot.pane}`) }}
            </span>
            <span class="pane-tools">
              <button
                v-if="slot.pane !== 'document'"
                type="button"
                class="btn btn-ghost btn-xs btn-square"
                :aria-label="focus === slot.pane ? t('workspace.exitFocus') : t('workspace.focus')"
                :title="focus === slot.pane ? t('workspace.exitFocus') : t('workspace.focus')"
                :aria-pressed="focus === slot.pane"
                :data-testid="`focus-${slot.pane}`"
                @click="setFocus(slot.pane as 'write' | 'preview')"
              >
                <AppIcon :name="focus === slot.pane ? 'minimize' : 'maximize'" size="sm" />
              </button>
              <button
                v-if="slot.pane !== 'write' && !focus"
                type="button"
                class="btn btn-ghost btn-xs btn-square"
                :aria-label="
                  t('workspace.collapsePane', { pane: t(`workspace.mode.${slot.pane}`) })
                "
                :title="t('workspace.collapsePane', { pane: t(`workspace.mode.${slot.pane}`) })"
                :aria-expanded="true"
                :data-testid="`collapse-${slot.pane}`"
                @click="toggleCollapsed(slot.pane as 'document' | 'preview')"
              >
                <AppIcon
                  :name="slot.pane === 'preview' ? 'chevron-right' : 'chevron-left'"
                  size="sm"
                />
              </button>
            </span>
          </header>
          <button
            v-if="focus === slot.pane && tabbed"
            type="button"
            class="btn btn-ghost btn-xs"
            @click="setFocus(null)"
          >
            <AppIcon name="minimize" size="sm" />
            <span>{{ t('workspace.exitFocus') }}</span>
          </button>

          <MetadataForm
            v-if="slot.pane === 'document'"
            :ref="setMetadataRef"
            @open-address-book="emit('openAddressBook', $event)"
            @focus-target="setTarget"
          />
          <template v-else-if="slot.pane === 'write'">
            <SurfaceEditor v-if="twoSided" />
            <RichTextEditor
              v-else
              :ref="setEditorRef"
              :model-value="document.bodyMarkdown"
              :label="t('editor.bodyLabel')"
              :theme="documentTheme"
              :locale="document.locale"
              :assets="workspace.assets"
              @update:model-value="workspace.patch({ bodyMarkdown: $event })"
              @highlight-tone="setHighlightTone"
              @focus-target="setTarget"
            />
          </template>
          <PaperPreview
            v-else
            :ref="setPreviewRef"
            :plan="workspace.plan"
            :surface-index="workspace.surfaceIndex"
            :printed-marks="document.exportPreferences.pdfIncludesPhysicalMarks"
            :maximized="focus === 'preview'"
            @select-surface="workspace.selectSurface"
            @toggle-printed-marks="setPrintedMarks"
            @print="openPrint(false)"
            @maximize="setFocus('preview')"
          />
        </div>

        <PaneResizer
          v-if="!tabbed && hasSplitterAfter(slots, index)"
          :label="
            t('workspace.resizer', {
              left: t(`workspace.mode.${slot.pane}`),
              right: t(`workspace.mode.${slots[index + 1].pane}`),
            })
          "
          :value-now="splitterValue(slot.pane, slots[index + 1].pane)"
          @resize="onResize(slot.pane, slots[index + 1].pane, $event)"
          @edge="onResizeEdge(slot.pane, slots[index + 1].pane, $event)"
          @reset="resetWidths"
        />
      </template>
    </div>

    <PrintDialog :open="printOpen" :pdf-hint="printAsPdf" @close="printOpen = false" />
    <ExportDialog :open="exportOpen" @close="exportOpen = false" @print-as-pdf="openPrint(true)" />
    <EmailDialog :open="emailOpen" @close="emailOpen = false" @print-as-pdf="openPrint(true)" />
    <DocumentCheckDialog :open="checkOpen" @close="checkOpen = false" />
    <HistoryDialog :open="historyOpen" @close="historyOpen = false" />
    <ShortcutsDialog :open="shortcutsOpen" @close="shortcutsOpen = false" />
    <SaveTemplateDialog
      :open="saveTemplateOpen"
      :suggested-name="document.metadata.subject || document.title"
      @close="saveTemplateOpen = false"
      @save="onSaveTemplate"
    />

    <!-- The paper-mode plan already contains only the marks that print, so the
         copy draws everything it is given: the preview's guides toggle has no
         say here, which is the whole point of a separate print copy. It lives
         next to the app shell, not inside it: the print medium shows this one
         child of `body` and nothing else (R14-001). -->
    <Teleport to="body">
      <div v-if="printPlan" class="print-root" aria-hidden="true">
        <PaperSurface
          v-for="page in printPlan.pages"
          :key="page.index"
          :page="page"
          :asset-urls="printAssetUrls"
          :show-guides="true"
          :theme="printPlan.theme"
          :locale="printPlan.locale"
          medium="print"
        />
      </div>
    </Teleport>
  </section>
</template>
