<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import type { DecodeResult } from '@/application/ports/MarkdownDocumentCodec';
import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import { createId } from '@/domain/common/Ids';
import {
  compareDocuments,
  DEFAULT_DOCUMENT_SORT,
  documentSizeLabel,
  documentsIn,
  type DocumentSort,
  type DocumentSortKey,
} from '@/domain/document/documentList';
import { childFolders, folderPath, type Folder } from '@/domain/document/Folder';
import {
  documentSummary,
  type DocumentKind,
  type FoldmarkDocument,
} from '@/domain/document/FoldmarkDocument';
import { DEFAULT_PROFILE_ID } from '@/domain/print/builtInProfiles';
import AppIcon from '@/presentation/components/AppIcon.vue';
import ConfirmDialog from '@/presentation/components/ConfirmDialog.vue';
import PromptDialog from '@/presentation/components/PromptDialog.vue';
import type { IconName } from '@/presentation/icons/iconNames.generated';
import AppMenu, { type Menu } from '@/presentation/components/foldmark/AppMenu.vue';
import ImportPreviewDialog from '@/presentation/components/foldmark/ImportPreviewDialog.vue';
import MoveDialog from '@/presentation/components/foldmark/MoveDialog.vue';
import TemplatesDialog from '@/presentation/components/foldmark/TemplatesDialog.vue';
import { downloadText, safeFilename } from '@/presentation/download';
import { appSettings, readSetting } from '@/presentation/settings/settingsRegistry';
import { useLibraryStore } from '@/presentation/stores/libraryStore';
import { useWorkspaceStore } from '@/presentation/stores/workspaceStore';

/**
 * The workspace start view as a file manager (R13-024, R13-025).
 *
 * `[+ New ▾] [Import] [Export / Backup] [Archive]` above a sortable list of
 * folders and documents with the columns a person expects of a file manager:
 * name, kind, folder, changed, size, status. A breadcrumb leads down the
 * folders and back; every row has its actions in one menu. Archiving hides
 * without deleting, and the Archive view brings things back.
 *
 * Import is deliberately **two steps**. A file is parsed and its findings are
 * shown before anything is stored, so a document that only half survived is a
 * question rather than a surprise in the list. When parsing fails outright the
 * panel keeps the original text and offers it back — losing somebody's letter
 * because Foldmark could not read its front matter would be the worst possible
 * outcome of opening a file.
 */
const emit = defineEmits<{ navigate: [view: 'privacy'] }>();

const workspace = useWorkspaceStore();
const library = useLibraryStore();
const { t, locale } = useI18n();

/** Document kinds the New menu offers, with the label each one starts with. */
const KINDS: readonly { kind: DocumentKind; icon: IconName }[] = [
  { kind: 'letter', icon: 'letter' },
  { kind: 'postcard', icon: 'postcard' },
  { kind: 'card', icon: 'card' },
  { kind: 'photo-card', icon: 'photo' },
  { kind: 'custom', icon: 'free-document' },
];

const KIND_ICON: Readonly<Record<DocumentKind, IconName>> = {
  letter: 'letter',
  postcard: 'postcard',
  card: 'card',
  'photo-card': 'photo',
  email: 'mail',
  custom: 'free-document',
};

const folderId = ref<string | undefined>(undefined);
const archive = ref(false);
const sort = ref<DocumentSort>(DEFAULT_DOCUMENT_SORT);
const query = ref('');

const importIssues = ref<readonly ValidationIssue[]>([]);
const rejectedSource = ref<string | null>(null);
const busy = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

// dialogs
const newFolderOpen = ref(false);
const renameTarget = ref<{ kind: 'document' | 'folder'; id: string; name: string } | null>(null);
const moveTarget = ref<{ kind: 'document' | 'folder'; id: string; currentId?: string } | null>(
  null,
);
const deleteTarget = ref<{ kind: 'document' | 'folder'; id: string; name: string } | null>(null);
/** Which row's action menu is open. */
const menuFor = ref<string | null>(null);
/**
 * Where the open row menu sits. The table scrolls sideways on narrow screens,
 * and a scrolling box clips anything hanging out of it — so the menu is fixed
 * to the viewport next to its button instead of flowing inside the row.
 */
const menuStyle = ref<{ top: string; right: string }>({ top: '0px', right: '0px' });

function toggleMenu(id: string, event: MouseEvent): void {
  if (menuFor.value === id) {
    menuFor.value = null;
    return;
  }
  const button = event.currentTarget as HTMLElement;
  const rect = button.getBoundingClientRect();
  menuStyle.value = {
    top: `${Math.round(rect.bottom + 4)}px`,
    right: `${Math.round(globalThis.innerWidth - rect.right)}px`,
  };
  menuFor.value = id;
}

function closeMenu(): void {
  menuFor.value = null;
}

function onDocumentPointerDown(event: Event): void {
  if (!menuFor.value) return;
  const target = event.target as Element | null;
  if (target?.closest('.file-actions')) return;
  closeMenu();
}

onMounted(() => {
  void library.loadAll();
  globalThis.document.addEventListener('pointerdown', onDocumentPointerDown);
  globalThis.addEventListener('scroll', closeMenu, true);
  globalThis.addEventListener('resize', closeMenu);
});
onBeforeUnmount(() => {
  globalThis.document.removeEventListener('pointerdown', onDocumentPointerDown);
  globalThis.removeEventListener('scroll', closeMenu, true);
  globalThis.removeEventListener('resize', closeMenu);
});

const folders = computed(() => library.folders);
const breadcrumb = computed(() => folderPath(folders.value, folderId.value));

/** Subfolders shown as rows above the documents (the archive view lists archived ones). */
const shownFolders = computed(() =>
  archive.value
    ? folders.value.filter((folder) => folder.archived)
    : childFolders(folders.value, folderId.value, locale.value).filter(
        (folder) => !folder.archived,
      ),
);

const shownDocuments = computed(() => {
  const term = query.value.trim().toLowerCase();
  const inScope = term
    ? library.documents.filter(
        (document) =>
          (archive.value ? true : !document.archived) &&
          `${document.title} ${documentSummary(document)}`.toLowerCase().includes(term),
      )
    : documentsIn(library.documents, folders.value, folderId.value, archive.value);
  return inScope.slice().sort(compareDocuments(sort.value, locale.value));
});

function setSort(key: DocumentSortKey): void {
  sort.value =
    sort.value.key === key
      ? { key, direction: sort.value.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: key === 'name' || key === 'kind' ? 'asc' : 'desc' };
}

function sortIndicator(key: DocumentSortKey): 'ascending' | 'descending' | 'none' {
  if (sort.value.key !== key) return 'none';
  return sort.value.direction === 'asc' ? 'ascending' : 'descending';
}

function folderName(id: string | undefined): string {
  return folders.value.find((folder) => folder.id === id)?.name ?? '';
}

function status(document: FoldmarkDocument): 'archived' | 'saved' {
  return document.archived ? 'archived' : 'saved';
}

// --- New menu ---------------------------------------------------------------
const newMenu = computed<readonly Menu[]>(() => [
  {
    id: 'new',
    label: t('documents.newMenu'),
    items: [
      ...KINDS.map(({ kind, icon }) => ({
        id: `new:${kind}`,
        label: t(`documents.kind.${kind}`),
        icon,
      })),
      { id: 'new:folder', label: t('documents.folder'), icon: 'folder', dividerBefore: true },
      // Templates after the kinds (change 0039): the first eight by name, the rest in the dialog.
      ...library.templates.slice(0, TEMPLATE_MENU_LIMIT).map((template, index) => ({
        id: `template:${template.id}`,
        label: template.name,
        icon: 'template' as const,
        dividerBefore: index === 0,
      })),
      {
        id: 'templates',
        label: t('templates.manage'),
        icon: 'template',
        dividerBefore: library.templates.length === 0,
      },
    ],
  },
]);

/** Most templates listed in the menu itself. */
const TEMPLATE_MENU_LIMIT = 8;
const templatesOpen = ref(false);

async function onNewCommand(id: string): Promise<void> {
  if (id === 'new:folder') {
    newFolderOpen.value = true;
    return;
  }
  if (id === 'templates') {
    templatesOpen.value = true;
    return;
  }
  if (id.startsWith('template:')) {
    await createFromTemplate(id.slice('template:'.length));
    return;
  }
  await createDocument(id.slice(4) as DocumentKind);
}

/** A new document from a template, in the current folder, opened at once. */
async function createFromTemplate(templateId: string): Promise<void> {
  templatesOpen.value = false;
  const template = library.templates.find((candidate) => candidate.id === templateId);
  if (!template) return;
  const id = await workspace.createFromTemplate(templateId, {
    title: t(`documents.newTitle.${template.kind}`),
    ...(folderId.value ? { folderId: folderId.value } : {}),
  });
  if (id) await library.refreshDocuments();
}

async function createDocument(kind: DocumentKind): Promise<void> {
  const id = await workspace.create({ kind, title: t(`documents.newTitle.${kind}`) });
  if (!id) return;
  // A document created inside a folder starts there.
  if (folderId.value) {
    await library.run(
      () => services.documents.move(id, folderId.value),
      'errors.storageUnavailable',
    );
    workspace.patch({ folderId: folderId.value });
  }
  await library.refreshDocuments();
}

async function createFolder(name: string): Promise<void> {
  await library.run(
    () => services.folders.create({ name, parentId: folderId.value }),
    'errors.invalidInput',
  );
  await library.refreshFolders();
}

// --- row actions ------------------------------------------------------------
async function openDocument(id: string): Promise<void> {
  await workspace.open(id);
}

function enterFolder(id: string | undefined): void {
  folderId.value = id;
  archive.value = false;
  menuFor.value = null;
}

async function duplicate(entry: FoldmarkDocument): Promise<void> {
  menuFor.value = null;
  await library.run(
    () => services.documents.duplicate(entry.id, t('documents.copyOf', { title: entry.title })),
    'errors.storageUnavailable',
  );
  await library.refreshDocuments();
}

async function setArchived(entry: FoldmarkDocument, on: boolean): Promise<void> {
  menuFor.value = null;
  await library.run(
    () => services.documents.setArchived(entry.id, on),
    'errors.storageUnavailable',
  );
  await library.refreshDocuments();
}

async function setFolderArchived(folder: Folder, on: boolean): Promise<void> {
  menuFor.value = null;
  await library.run(() => services.folders.setArchived(folder.id, on), 'errors.storageUnavailable');
  await library.refreshFolders();
}

function exportDocument(entry: FoldmarkDocument): void {
  menuFor.value = null;
  downloadText(services.documents.encode(entry), safeFilename(entry.title, 'md'), 'text/markdown');
}

async function rename(value: string): Promise<void> {
  const target = renameTarget.value;
  renameTarget.value = null;
  if (!target) return;
  if (target.kind === 'document') {
    await library.run(() => services.documents.rename(target.id, value), 'errors.invalidInput');
    await library.refreshDocuments();
  } else {
    await library.run(() => services.folders.rename(target.id, value), 'errors.invalidInput');
    await library.refreshFolders();
  }
}

async function move(targetFolderId: string | undefined): Promise<void> {
  const target = moveTarget.value;
  moveTarget.value = null;
  if (!target) return;
  if (target.kind === 'document') {
    await library.run(
      () => services.documents.move(target.id, targetFolderId),
      'errors.storageUnavailable',
    );
    await library.refreshDocuments();
  } else {
    await library.run(
      () => services.folders.move(target.id, targetFolderId),
      'errors.invalidInput',
    );
    await library.refreshFolders();
  }
}

async function confirmDelete(): Promise<void> {
  const target = deleteTarget.value;
  deleteTarget.value = null;
  if (!target) return;
  if (target.kind === 'document') {
    await library.run(async () => {
      await services.documents.remove(target.id);
      await services.history.forget(target.id);
    }, 'errors.storageUnavailable');
    await library.refreshDocuments();
  } else {
    await library.run(() => services.folders.remove(target.id), 'errors.storageUnavailable');
    await library.loadAll();
  }
}

// --- import -----------------------------------------------------------------
/**
 * Import is one path for the button and for a drop (R14-014): every file is
 * decoded, shown in the preview dialog, and stored only on "Import". Several
 * files queue up and are previewed one after the other.
 */
interface ImportCandidate {
  readonly fileName: string;
  readonly result: DecodeResult;
}

const importQueue = ref<ImportCandidate[]>([]);
const importTotal = ref(0);
const importPosition = computed(() => ({
  index: importTotal.value - importQueue.value.length + 1,
  total: importTotal.value,
}));
const importCurrent = computed(() => importQueue.value[0] ?? null);

/** Only Markdown and plain-text files are read; anything else is refused unread. */
const MARKDOWN_FILE = /\.(?:md|markdown|txt)$/iu;

function isMarkdownFile(file: File): boolean {
  return (
    MARKDOWN_FILE.test(file.name) ||
    file.type === 'text/markdown' ||
    (file.type === 'text/plain' && !file.name.includes('.'))
  );
}

async function queueFiles(files: readonly File[]): Promise<void> {
  importIssues.value = [];
  rejectedSource.value = null;
  const accepted = files.filter(isMarkdownFile);
  if (accepted.length < files.length) {
    importIssues.value = [{ severity: 'warning', code: 'import.notMarkdown', path: '' }];
  }
  if (!accepted.length) return;
  busy.value = true;
  const candidates: ImportCandidate[] = [];
  for (const file of accepted) {
    const source = await file.text();
    candidates.push({
      fileName: file.name,
      result: services.documents.decode(source, {
        id: createId(),
        locale: locale.value === 'de' ? 'de-DE' : 'en-GB',
        printProfileId: readSetting(appSettings.defaultPrintProfileId) || DEFAULT_PROFILE_ID,
      }),
    });
  }
  importQueue.value = candidates;
  importTotal.value = candidates.length;
  busy.value = false;
}

async function onFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  await queueFiles(files);
}

/** "Import" in the preview: the document is stored with a checkpoint of the file as it arrived. */
async function confirmImport(): Promise<void> {
  const candidate = importCurrent.value;
  if (!candidate || !candidate.result.ok) return;
  const { document } = candidate.result;
  const stored = await library.run(async () => {
    const imported = await services.documents.importDocument(
      folderId.value ? { ...document, folderId: folderId.value } : document,
    );
    await services.history.checkpoint(imported, 'imported');
    return imported;
  }, 'errors.storageUnavailable');
  importQueue.value = importQueue.value.slice(1);
  if (stored) {
    await library.refreshDocuments();
    // The last file of a drop is opened; earlier ones stay in the list.
    if (!importQueue.value.length) await workspace.open(stored.id);
  }
}

function skipImport(): void {
  importQueue.value = importQueue.value.slice(1);
}

// --- drag and drop (R14-014) -------------------------------------------------
/** Nested elements fire enter/leave pairs; a counter keeps the overlay steady. */
const dragDepth = ref(0);
const dragging = computed(() => dragDepth.value > 0);

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

function onDragEnter(event: DragEvent): void {
  if (!hasFiles(event)) return;
  event.preventDefault();
  dragDepth.value += 1;
}

function onDragOver(event: DragEvent): void {
  if (!hasFiles(event)) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
}

function onDragLeave(event: DragEvent): void {
  if (!hasFiles(event)) return;
  dragDepth.value = Math.max(0, dragDepth.value - 1);
}

async function onDrop(event: DragEvent): Promise<void> {
  if (!hasFiles(event)) return;
  event.preventDefault();
  dragDepth.value = 0;
  await queueFiles(Array.from(event.dataTransfer?.files ?? []));
}

function issueMessage(issue: ValidationIssue): string {
  return t(`validation.${issue.code}`, issue.params ?? {});
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(locale.value, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const SORT_COLUMNS: readonly { key: DocumentSortKey; label: string }[] = [
  { key: 'name', label: 'documents.column.name' },
  { key: 'kind', label: 'documents.column.kind' },
];
</script>

<template>
  <section
    class="panel file-manager"
    :class="{ 'is-dragging': dragging }"
    aria-labelledby="documents-title"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- The drop zone (R14-014): shown while a file is over the panel. -->
    <div v-if="dragging" class="drop-overlay" aria-hidden="true">
      <AppIcon name="import" size="lg" />
      <span>{{ t('documents.dropHere') }}</span>
    </div>
    <div class="section-heading">
      <div>
        <p class="eyebrow">{{ t('documents.eyebrow') }}</p>
        <h1 id="documents-title">{{ archive ? t('documents.archive') : t('documents.title') }}</h1>
        <p>{{ t('documents.description') }}</p>
      </div>
      <span class="badge badge-outline">{{
        t('documents.count', { count: library.documents.length })
      }}</span>
    </div>

    <!-- The toolbar: New, Import, Export / Backup, Archive. -->
    <div class="file-toolbar" role="toolbar" :aria-label="t('documents.toolbar')">
      <div class="file-toolbar-new">
        <AppMenu :menus="newMenu" :label="t('documents.newMenu')" @command="onNewCommand" />
      </div>
      <button
        class="btn btn-outline btn-sm"
        type="button"
        :disabled="busy"
        @click="fileInput?.click()"
      >
        <AppIcon name="import" />
        <span>{{ t('documents.import') }}</span>
      </button>
      <input
        ref="fileInput"
        class="sr-only"
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        multiple
        :aria-label="t('documents.import')"
        @change="onFileSelected"
      />
      <button class="btn btn-outline btn-sm" type="button" @click="emit('navigate', 'privacy')">
        <AppIcon name="export" />
        <span>{{ t('documents.exportBackup') }}</span>
      </button>
      <button
        class="btn btn-sm"
        :class="archive ? 'btn-primary' : 'btn-outline'"
        type="button"
        :aria-pressed="archive"
        data-testid="toggle-archive"
        @click="archive = !archive"
      >
        <AppIcon name="archive" />
        <span>{{ t('documents.archive') }}</span>
      </button>
      <label class="field file-search">
        <span class="sr-only">{{ t('documents.search') }}</span>
        <input
          v-model="query"
          class="input input-bordered input-sm"
          type="search"
          :placeholder="t('documents.search')"
          autocomplete="off"
        />
      </label>
    </div>

    <!-- Breadcrumb down the folders. -->
    <nav v-if="!archive" class="file-breadcrumb" :aria-label="t('documents.breadcrumb')">
      <button
        type="button"
        class="link-button"
        :aria-current="!folderId ? 'page' : undefined"
        @click="enterFolder(undefined)"
      >
        <AppIcon name="home" size="sm" />
        <span>{{ t('documents.topLevel') }}</span>
      </button>
      <template v-for="crumb in breadcrumb" :key="crumb.id">
        <span class="file-breadcrumb-separator" aria-hidden="true">›</span>
        <button
          type="button"
          class="link-button"
          :aria-current="crumb.id === folderId ? 'page' : undefined"
          @click="enterFolder(crumb.id)"
        >
          {{ crumb.name }}
        </button>
      </template>
    </nav>

    <p v-if="library.error" class="alert alert-error" role="alert">{{ t(library.error) }}</p>

    <TemplatesDialog
      :open="templatesOpen"
      @close="templatesOpen = false"
      @use="createFromTemplate"
    />

    <ImportPreviewDialog
      :open="importCurrent !== null"
      :file-name="importCurrent?.fileName ?? ''"
      :result="importCurrent?.result ?? null"
      :position="importPosition"
      @import="confirmImport"
      @skip="skipImport"
    />

    <div v-if="importIssues.length" class="import-report">
      <h2>{{ t('documents.importReport') }}</h2>
      <ul class="validation-list">
        <li v-for="(issue, index) in importIssues" :key="index" :class="`issue-${issue.severity}`">
          <span class="issue-severity">{{ t(`validation.severity.${issue.severity}`) }}</span>
          <span class="issue-message">{{ issueMessage(issue) }}</span>
          <code v-if="issue.path" class="issue-path">{{ issue.path }}</code>
        </li>
      </ul>
      <template v-if="rejectedSource">
        <p>{{ t('documents.importRejected') }}</p>
        <label class="field">
          <span>{{ t('documents.originalSource') }}</span>
          <textarea class="textarea textarea-bordered" rows="8" :value="rejectedSource" readonly />
        </label>
      </template>
    </div>

    <p v-if="library.loading" aria-live="polite">{{ t('documents.loading') }}</p>
    <p v-else-if="shownFolders.length === 0 && shownDocuments.length === 0" class="empty-state">
      {{ archive ? t('documents.archiveEmpty') : t('documents.empty') }}
    </p>

    <div v-else class="file-table-wrap">
      <table class="file-table">
        <thead>
          <tr>
            <th
              v-for="column in SORT_COLUMNS"
              :key="column.key"
              scope="col"
              :aria-sort="sortIndicator(column.key)"
            >
              <button type="button" class="file-sort" @click="setSort(column.key)">
                {{ t(column.label) }}
                <AppIcon v-if="sort.key === column.key" name="sort" size="sm" />
              </button>
            </th>
            <th scope="col">{{ t('documents.column.folder') }}</th>
            <th scope="col" :aria-sort="sortIndicator('updated')">
              <button type="button" class="file-sort" @click="setSort('updated')">
                {{ t('documents.column.updated') }}
                <AppIcon v-if="sort.key === 'updated'" name="sort" size="sm" />
              </button>
            </th>
            <th scope="col" :aria-sort="sortIndicator('opened')">
              <button type="button" class="file-sort" @click="setSort('opened')">
                {{ t('documents.column.opened') }}
                <AppIcon v-if="sort.key === 'opened'" name="sort" size="sm" />
              </button>
            </th>
            <th scope="col">{{ t('documents.column.size') }}</th>
            <th scope="col">{{ t('documents.column.status') }}</th>
            <th scope="col">
              <span class="sr-only">{{ t('documents.column.actions') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Folders first, as a file manager does. -->
          <tr v-for="folder in shownFolders" :key="folder.id" class="file-row file-row-folder">
            <td>
              <button type="button" class="file-name" @click="enterFolder(folder.id)">
                <AppIcon name="folder" />
                <strong>{{ folder.name }}</strong>
              </button>
            </td>
            <td>{{ t('documents.folder') }}</td>
            <td>{{ folderName(folder.parentId) || '—' }}</td>
            <td>{{ formatDate(folder.updatedAt) }}</td>
            <td>—</td>
            <td>—</td>
            <td>
              <span class="badge badge-outline badge-sm">
                {{
                  folder.archived ? t('documents.status.archived') : t('documents.status.folder')
                }}
              </span>
            </td>
            <td class="file-actions-cell">
              <div class="file-actions">
                <button
                  type="button"
                  class="btn btn-ghost btn-xs btn-square"
                  :aria-label="t('documents.actionsFor', { name: folder.name })"
                  :aria-expanded="menuFor === `folder:${folder.id}`"
                  @click="toggleMenu(`folder:${folder.id}`, $event)"
                >
                  <AppIcon name="more" />
                </button>
                <ul
                  v-if="menuFor === `folder:${folder.id}`"
                  class="file-menu"
                  role="menu"
                  :style="menuStyle"
                  @keydown.escape.stop="closeMenu"
                >
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="popover-item"
                      @click="enterFolder(folder.id)"
                    >
                      <AppIcon name="folder-open" size="sm" /><span>{{
                        t('documents.action.open')
                      }}</span>
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="popover-item"
                      @click="
                        menuFor = null;
                        renameTarget = { kind: 'folder', id: folder.id, name: folder.name };
                      "
                    >
                      <AppIcon name="rename" size="sm" /><span>{{
                        t('documents.action.rename')
                      }}</span>
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="popover-item"
                      @click="
                        menuFor = null;
                        moveTarget = { kind: 'folder', id: folder.id, currentId: folder.parentId };
                      "
                    >
                      <AppIcon name="move" size="sm" /><span>{{ t('documents.action.move') }}</span>
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="popover-item"
                      @click="setFolderArchived(folder, !folder.archived)"
                    >
                      <AppIcon :name="folder.archived ? 'unarchive' : 'archive'" size="sm" />
                      <span>{{
                        folder.archived
                          ? t('documents.action.restore')
                          : t('documents.action.archive')
                      }}</span>
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="popover-item is-danger"
                      @click="
                        menuFor = null;
                        deleteTarget = { kind: 'folder', id: folder.id, name: folder.name };
                      "
                    >
                      <AppIcon name="delete" size="sm" /><span>{{ t('documents.delete') }}</span>
                    </button>
                  </li>
                </ul>
              </div>
            </td>
          </tr>

          <tr
            v-for="entry in shownDocuments"
            :key="entry.id"
            class="file-row"
            :data-document-id="entry.id"
          >
            <td>
              <button type="button" class="file-name document-open" @click="openDocument(entry.id)">
                <AppIcon :name="KIND_ICON[entry.kind]" />
                <span class="file-name-text">
                  <strong>{{ entry.title || t('workspace.untitled') }}</strong>
                  <small>{{ documentSummary(entry) }}</small>
                </span>
              </button>
            </td>
            <td>{{ t(`documents.kind.${entry.kind}`) }}</td>
            <td>{{ folderName(entry.folderId) || '—' }}</td>
            <td>{{ formatDate(entry.updatedAt) }}</td>
            <td>{{ entry.lastOpenedAt ? formatDate(entry.lastOpenedAt) : '—' }}</td>
            <td>{{ documentSizeLabel(entry) }}</td>
            <td>
              <span class="badge badge-outline badge-sm">{{
                t(`documents.status.${status(entry)}`)
              }}</span>
            </td>
            <td class="file-actions-cell">
              <div class="file-actions">
                <button
                  type="button"
                  class="btn btn-ghost btn-xs btn-square"
                  :aria-label="t('documents.actionsFor', { name: entry.title })"
                  :aria-expanded="menuFor === entry.id"
                  :data-testid="`actions-${entry.id}`"
                  @click="toggleMenu(entry.id, $event)"
                >
                  <AppIcon name="more" />
                </button>
                <ul
                  v-if="menuFor === entry.id"
                  class="file-menu"
                  role="menu"
                  :style="menuStyle"
                  @keydown.escape.stop="closeMenu"
                >
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="popover-item"
                      @click="openDocument(entry.id)"
                    >
                      <AppIcon name="edit" size="sm" /><span>{{ t('documents.action.open') }}</span>
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="popover-item"
                      @click="
                        menuFor = null;
                        renameTarget = { kind: 'document', id: entry.id, name: entry.title };
                      "
                    >
                      <AppIcon name="rename" size="sm" /><span>{{
                        t('documents.action.rename')
                      }}</span>
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="popover-item"
                      @click="duplicate(entry)"
                    >
                      <AppIcon name="duplicate" size="sm" /><span>{{
                        t('documents.duplicate')
                      }}</span>
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="popover-item"
                      @click="
                        menuFor = null;
                        moveTarget = { kind: 'document', id: entry.id, currentId: entry.folderId };
                      "
                    >
                      <AppIcon name="move" size="sm" /><span>{{ t('documents.action.move') }}</span>
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="popover-item"
                      @click="setArchived(entry, !entry.archived)"
                    >
                      <AppIcon :name="entry.archived ? 'unarchive' : 'archive'" size="sm" />
                      <span>{{
                        entry.archived
                          ? t('documents.action.restore')
                          : t('documents.action.archive')
                      }}</span>
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="popover-item"
                      @click="exportDocument(entry)"
                    >
                      <AppIcon name="export" size="sm" /><span>{{
                        t('documents.action.export')
                      }}</span>
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="popover-item is-danger"
                      @click="
                        menuFor = null;
                        deleteTarget = { kind: 'document', id: entry.id, name: entry.title };
                      "
                    >
                      <AppIcon name="delete" size="sm" /><span>{{ t('documents.delete') }}</span>
                    </button>
                  </li>
                </ul>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <PromptDialog
      :open="newFolderOpen"
      :title="t('documents.newFolder')"
      :label="t('documents.folderName')"
      :confirm-label="t('documents.create')"
      :maxlength="80"
      @close="newFolderOpen = false"
      @submit="createFolder"
    />
    <PromptDialog
      :open="renameTarget !== null"
      :title="t('documents.renameTitle')"
      :label="t('documents.newName')"
      :initial-value="renameTarget?.name"
      :confirm-label="t('documents.action.rename')"
      :maxlength="renameTarget?.kind === 'folder' ? 80 : 200"
      @close="renameTarget = null"
      @submit="rename"
    />
    <MoveDialog
      :open="moveTarget !== null"
      :folders="folders"
      :current-id="moveTarget?.currentId"
      :moving-folder-id="moveTarget?.kind === 'folder' ? moveTarget.id : undefined"
      @close="moveTarget = null"
      @move="move"
    />
    <ConfirmDialog
      :open="deleteTarget !== null"
      :title="
        deleteTarget?.kind === 'folder'
          ? t('documents.deleteFolderTitle')
          : t('documents.deleteTitle')
      "
      :text="
        deleteTarget?.kind === 'folder'
          ? t('documents.deleteFolderText', { name: deleteTarget?.name ?? '' })
          : t('documents.deleteText', { name: deleteTarget?.name ?? '' })
      "
      :confirm-label="t('documents.delete')"
      danger
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </section>
</template>
