<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import {
  addressLines,
  canSend,
  CONTACTS_PAGE_SIZE,
  compareByDisplayName,
  fuzzyMatches,
  groupByInitial,
  hasRole,
  paginate,
  type Address,
  type AddressRole,
} from '@/domain/address/Address';
import {
  CONTACT_EXPORT_FILE,
  CONTACT_EXPORT_FORMATS,
  serializeContacts,
  type ContactExportFormat,
} from '@/domain/address/export/contactExport';
import AppIcon from '@/presentation/components/AppIcon.vue';
import AppMenu, { type Menu } from '@/presentation/components/foldmark/AppMenu.vue';
import ContactDialog, {
  type ContactPayload,
} from '@/presentation/components/foldmark/ContactDialog.vue';
import ContactImportDialog from '@/presentation/components/foldmark/ContactImportDialog.vue';
import { downloadText, safeFilename } from '@/presentation/download';
import { useLibraryStore } from '@/presentation/stores/libraryStore';
import { useWorkspaceStore } from '@/presentation/stores/workspaceStore';

/**
 * The contact directory (change 0025): every person and organisation the
 * letters go to or come from, in one alphabetical list grouped by initial,
 * searched fuzzily over the whole set and then paged.
 *
 * One list, because "who is this letter between?" is one question and the
 * same person answers it from either side. What a contact *is* to the owner
 * — primary, home, sender, favourite — is a role on the entry, shown as a
 * badge and changed from the row's actions. Adding and editing happen in a
 * dialog (`ContactDialog`), so the list never leaves the screen.
 *
 * Likely duplicates are **reported, never merged**. Two entries that look alike
 * are often two real people, and a merge cannot be undone.
 */
const props = defineProps<{ initialQuery?: string }>();
const emit = defineEmits<{ usedInDocument: [] }>();

// --- import (R14-013) --------------------------------------------------------
const importFile = ref<File | null>(null);
const importOpen = ref(false);
const importInput = ref<HTMLInputElement | null>(null);
const importNotice = ref<{ added: number; merged: number } | null>(null);
/** Nested elements fire enter/leave pairs; a counter keeps the overlay steady. */
const dragDepth = ref(0);
const dragging = computed(() => dragDepth.value > 0);

function openImport(file: File): void {
  importNotice.value = null;
  importFile.value = file;
  importOpen.value = true;
}

function onImportFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) openImport(file);
}

function onImported(counts: { added: number; merged: number }): void {
  importNotice.value = counts;
}

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

function onDrop(event: DragEvent): void {
  if (!hasFiles(event)) return;
  event.preventDefault();
  dragDepth.value = 0;
  const file = event.dataTransfer?.files[0];
  if (file) openImport(file);
}

const library = useLibraryStore();
const workspace = useWorkspaceStore();
const { t, locale } = useI18n();

// --- export (R03-004, change 0042) --------------------------------------------
/** The whole directory, alphabetically, never the current page or search. */
const exportMenu = computed<readonly Menu[]>(() => [
  {
    id: 'export',
    label: t('addresses.export.button'),
    items: CONTACT_EXPORT_FORMATS.map((format) => ({
      id: `export:${format}`,
      label: t(`addresses.export.${format}`),
      icon: 'export' as const,
      disabled: library.addresses.length === 0,
    })),
  },
]);

function onExportCommand(id: string): void {
  const format = id.replace(/^export:/u, '') as ContactExportFormat;
  if (!CONTACT_EXPORT_FORMATS.includes(format)) return;
  const contacts = [...library.addresses].sort(compareByDisplayName(locale.value));
  const file = CONTACT_EXPORT_FILE[format];
  const stamp = new Date().toISOString().slice(0, 10);
  downloadText(
    serializeContacts(contacts, format),
    safeFilename(`${t('addresses.export.filename')}-${stamp}`, file.extension),
    file.mimeType,
  );
}

const query = ref(props.initialQuery ?? '');
const page = ref(1);
const editing = ref<Address | null>(null);
const dialogOpen = ref(false);
const duplicateWarning = ref<readonly Address[]>([]);
const notice = ref<string | null>(null);
/** Which row's action menu is open. */
const menuFor = ref<string | null>(null);

/** The search runs over the whole directory; the page is cut afterwards (R13-027). */
const matching = computed(() => {
  const term = query.value.trim();
  const list = term
    ? library.addresses.filter((address) => fuzzyMatches(address, term))
    : library.addresses;
  return list.slice().sort(compareByDisplayName(locale.value));
});

const paged = computed(() => paginate(matching.value, page.value, CONTACTS_PAGE_SIZE));
const groups = computed(() => groupByInitial(paged.value.items, locale.value));

/** The page numbers shown: all of them up to seven, else a window around the current one. */
const pageNumbers = computed<readonly number[]>(() => {
  const { pages, page: current } = paged.value;
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const start = Math.max(1, Math.min(current - 3, pages - 6));
  return Array.from({ length: 7 }, (_, index) => start + index);
});

const canUseInDocument = computed(() => workspace.isOpen);

watch(query, () => {
  page.value = 1;
});

onMounted(() => void library.loadAll());

function startNew(): void {
  editing.value = null;
  dialogOpen.value = true;
  duplicateWarning.value = [];
  notice.value = null;
  menuFor.value = null;
}

function startEdit(address: Address): void {
  editing.value = address;
  dialogOpen.value = true;
  duplicateWarning.value = [];
  notice.value = null;
  menuFor.value = null;
}

async function save(payload: ContactPayload): Promise<void> {
  const { id, footerLines, ...fields } = payload;
  if (id) {
    const current = library.addresses.find((address) => address.id === id);
    const kept = (current?.roles ?? []).filter((role) => role === 'primary' || role === 'home');
    const saved = await library.run(
      () =>
        services.addressBook.update(id, {
          ...fields,
          displayName: fields.displayName ?? '',
          roles: [...kept, ...fields.roles],
          stationery: {
            footerLines,
            defaultSignatureId: current?.stationery?.defaultSignatureId,
            letterhead: current?.stationery?.letterhead ?? [],
          },
        }),
      'errors.invalidInput',
    );
    if (!saved) return;
  } else {
    const result = await library.run(
      () =>
        services.addressBook.add({
          ...fields,
          roles: fields.roles.length ? fields.roles : ['normal'],
          stationery: fields.roles.includes('sender') ? { footerLines, letterhead: [] } : undefined,
        }),
      'errors.invalidInput',
    );
    if (!result) return;
    duplicateWarning.value = result.possibleDuplicates;
  }
  dialogOpen.value = false;
  notice.value = 'addresses.saved';
  await refresh();
}

async function refresh(): Promise<void> {
  await library.refreshAddresses();
  await library.refreshSenders();
}

async function setRole(address: Address, role: AddressRole, on: boolean): Promise<void> {
  menuFor.value = null;
  await library.run(
    () => services.addressBook.setRole(address.id, role, on),
    'errors.storageUnavailable',
  );
  await refresh();
}

async function duplicate(address: Address): Promise<void> {
  menuFor.value = null;
  await library.run(
    () => services.addressBook.duplicate(address.id, (name) => t('addresses.copyOf', { name })),
    'errors.storageUnavailable',
  );
  await library.refreshAddresses();
}

async function remove(id: string): Promise<void> {
  dialogOpen.value = false;
  await library.run(() => services.addressBook.remove(id), 'errors.storageUnavailable');
  await refresh();
}

async function useAsSender(address: Address): Promise<void> {
  menuFor.value = null;
  await workspace.selectSender(address.id);
  emit('usedInDocument');
}

async function useAsRecipient(address: Address): Promise<void> {
  menuFor.value = null;
  workspace.patchMetadata({ recipient: { ...address.postal } });
  await services.addressBook.touch(address.id);
  emit('usedInDocument');
}

/** The badges a row shows, in role order. */
function badges(address: Address): readonly AddressRole[] {
  return address.roles.filter((role) => role !== 'normal');
}

/** The second line of a row: the primary address, then how many more there are. */
function summary(address: Address): string {
  // The name is the heading already; the rest of the primary address follows.
  const lines = addressLines(address.postal).filter((line) => line !== address.displayName);
  const more = address.addresses.length - 1;
  const parts = [lines.join(', ')];
  if (more > 0) parts.push(t('addresses.moreAddresses', { count: more }));
  return parts.filter(Boolean).join(' · ');
}

/** The third line: primary e-mail and phone, when there are any. */
function contactLine(address: Address): string {
  return [address.email, address.phone].filter(Boolean).join(' · ');
}

/** Where the open row menu sits; fixed so a scrolling list never clips it. */
const menuStyle = ref<{ top: string; right: string }>({ top: '0px', right: '0px' });

function toggleMenu(id: string, event: MouseEvent): void {
  if (menuFor.value === id) {
    menuFor.value = null;
    return;
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  menuStyle.value = {
    top: `${Math.round(rect.bottom + 4)}px`,
    right: `${Math.round(globalThis.innerWidth - rect.right)}px`,
  };
  menuFor.value = id;
}

function onDocumentPointerDown(event: Event): void {
  if (!menuFor.value) return;
  const target = event.target as Element | null;
  if (target?.closest('.file-actions')) return;
  menuFor.value = null;
}

onMounted(() => {
  globalThis.document.addEventListener('pointerdown', onDocumentPointerDown);
});
onBeforeUnmount(() => {
  globalThis.document.removeEventListener('pointerdown', onDocumentPointerDown);
});
watch(dialogOpen, () => {
  menuFor.value = null;
});
</script>

<template>
  <section
    class="panel contact-directory"
    :class="{ 'is-dragging': dragging }"
    aria-labelledby="addresses-title"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- The drop zone (R14-013): a vCard or CSV over the directory. -->
    <div v-if="dragging" class="drop-overlay" aria-hidden="true">
      <AppIcon name="import" size="lg" />
      <span>{{ t('addresses.import.dropHere') }}</span>
    </div>
    <div class="section-heading">
      <div>
        <p class="eyebrow">{{ t('addresses.eyebrow') }}</p>
        <h1 id="addresses-title">{{ t('addresses.title') }}</h1>
        <p>{{ t('addresses.description') }}</p>
      </div>
      <span class="section-actions">
        <button
          type="button"
          class="btn btn-outline"
          data-testid="import-contacts"
          @click="importInput?.click()"
        >
          <AppIcon name="import" />
          <span>{{ t('addresses.import.button') }}</span>
        </button>
        <input
          ref="importInput"
          class="sr-only"
          type="file"
          accept=".vcf,.csv,text/vcard,text/x-vcard,text/csv"
          :aria-label="t('addresses.import.button')"
          @change="onImportFileSelected"
        />
        <AppMenu
          :menus="exportMenu"
          :label="t('addresses.export.button')"
          data-testid="export-contacts"
          @command="onExportCommand"
        />
        <button type="button" class="btn btn-primary" data-testid="new-contact" @click="startNew">
          {{ t('addresses.new') }}
        </button>
      </span>
    </div>

    <ContactImportDialog
      :open="importOpen"
      :file="importFile"
      @close="importOpen = false"
      @imported="onImported"
    />

    <p v-if="library.error" class="alert alert-error" role="alert">{{ t(library.error) }}</p>
    <p v-if="importNotice" class="alert alert-success" role="status" data-testid="import-notice">
      {{ t('addresses.import.done', importNotice) }}
    </p>
    <p v-if="notice" class="alert alert-success" role="status">{{ t(notice) }}</p>
    <p v-if="duplicateWarning.length" class="alert alert-warning" role="status">
      {{ t('addresses.duplicateWarning', { count: duplicateWarning.length }) }}
    </p>

    <div class="file-toolbar contact-toolbar">
      <label class="field file-search contact-search">
        <span class="sr-only">{{ t('addresses.search') }}</span>
        <input
          v-model="query"
          class="input input-bordered input-sm"
          type="search"
          autocomplete="off"
          :placeholder="t('addresses.search')"
          data-testid="contact-search"
        />
      </label>
      <span class="contact-count">
        {{ t('addresses.count', { shown: matching.length, total: library.addresses.length }) }}
      </span>
    </div>

    <p v-if="library.addresses.length === 0" class="empty-state">{{ t('addresses.empty') }}</p>
    <p v-else-if="matching.length === 0" class="empty-state">{{ t('addresses.noMatches') }}</p>

    <section v-for="group in groups" :key="group.initial" class="address-group">
      <h2 class="address-initial">{{ group.initial }}</h2>
      <ul class="address-list">
        <li v-for="address in group.addresses" :key="address.id" class="address-row contact-row">
          <button
            type="button"
            class="contact-open"
            :aria-label="t('addresses.action.edit') + ': ' + address.displayName"
            @click="startEdit(address)"
          >
            <span class="contact-avatar" aria-hidden="true">
              {{ address.displayName.trim().charAt(0).toLocaleUpperCase(locale) }}
            </span>
            <span class="address-summary">
              <strong>{{ address.displayName }}</strong>
              <span class="address-badges">
                <span
                  v-for="role in badges(address)"
                  :key="role"
                  class="badge badge-outline badge-sm"
                >
                  {{ t(`addresses.role.${role}`) }}
                </span>
                <span v-for="tag in address.tags" :key="tag" class="badge badge-ghost badge-sm">
                  {{ tag }}
                </span>
              </span>
              <span class="address-lines">{{ summary(address) }}</span>
              <span v-if="contactLine(address)" class="address-lines">{{
                contactLine(address)
              }}</span>
              <small v-if="address.provenance.source !== 'manual'" class="address-source">
                {{ t(`addresses.source.${address.provenance.source}`) }}
              </small>
            </span>
          </button>

          <div class="file-actions">
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-square"
              :aria-label="t('documents.actionsFor', { name: address.displayName })"
              :aria-expanded="menuFor === address.id"
              :data-testid="`contact-actions-${address.id}`"
              @click="toggleMenu(address.id, $event)"
            >
              <AppIcon name="more" />
            </button>
            <ul
              v-if="menuFor === address.id"
              class="file-menu"
              role="menu"
              :style="menuStyle"
              @keydown.escape.stop="menuFor = null"
            >
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="popover-item"
                  @click="startEdit(address)"
                >
                  <AppIcon name="edit" size="sm" /><span>{{ t('addresses.action.edit') }}</span>
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="popover-item"
                  @click="duplicate(address)"
                >
                  <AppIcon name="duplicate" size="sm" /><span>{{
                    t('addresses.action.duplicate')
                  }}</span>
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitemcheckbox"
                  class="popover-item"
                  :aria-checked="hasRole(address, 'primary')"
                  @click="setRole(address, 'primary', !hasRole(address, 'primary'))"
                >
                  <AppIcon name="primary" size="sm" /><span>{{
                    t('addresses.action.primary')
                  }}</span>
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitemcheckbox"
                  class="popover-item"
                  :aria-checked="hasRole(address, 'home')"
                  @click="setRole(address, 'home', !hasRole(address, 'home'))"
                >
                  <AppIcon name="home" size="sm" /><span>{{ t('addresses.action.home') }}</span>
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitemcheckbox"
                  class="popover-item"
                  :aria-checked="hasRole(address, 'favorite')"
                  @click="setRole(address, 'favorite', !hasRole(address, 'favorite'))"
                >
                  <AppIcon name="favorite" size="sm" /><span>{{
                    t('addresses.action.favorite')
                  }}</span>
                </button>
              </li>
              <li v-if="canUseInDocument && canSend(address)" role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="popover-item"
                  @click="useAsSender(address)"
                >
                  <AppIcon name="sender" size="sm" /><span>{{
                    t('addresses.action.useAsSender')
                  }}</span>
                </button>
              </li>
              <li v-if="canUseInDocument" role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="popover-item"
                  @click="useAsRecipient(address)"
                >
                  <AppIcon name="recipient" size="sm" /><span>{{
                    t('addresses.action.useAsRecipient')
                  }}</span>
                </button>
              </li>
            </ul>
          </div>
        </li>
      </ul>
    </section>

    <nav
      v-if="paged.pages > 1"
      class="contact-pagination"
      :aria-label="t('addresses.pagination')"
      data-testid="contact-pagination"
    >
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-square"
        :disabled="paged.page === 1"
        :aria-label="t('addresses.previousPage')"
        @click="page = paged.page - 1"
      >
        <AppIcon name="chevron-left" />
      </button>
      <button
        v-for="number in pageNumbers"
        :key="number"
        type="button"
        class="btn btn-sm"
        :class="number === paged.page ? 'btn-primary' : 'btn-ghost'"
        :aria-current="number === paged.page ? 'page' : undefined"
        @click="page = number"
      >
        {{ number }}
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-square"
        :disabled="paged.page === paged.pages"
        :aria-label="t('addresses.nextPage')"
        @click="page = paged.page + 1"
      >
        <AppIcon name="chevron-right" />
      </button>
    </nav>

    <ContactDialog
      :open="dialogOpen"
      :contact="editing"
      @close="dialogOpen = false"
      @save="save"
      @delete="remove"
    />
  </section>
</template>
