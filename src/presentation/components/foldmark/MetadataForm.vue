<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import { addressLines, deriveDisplayName, type Address } from '@/domain/address/Address';
import type { SenderSnapshot } from '@/domain/address/SenderProfile';
import { groupProfiles } from '@/domain/print/builtInProfiles';
import {
  PAGE_NUMBER_FORMATS,
  type PageNumberOptions,
  type PageNumberPosition,
  type PostalAddress,
  type PrintOptions,
} from '@/domain/document/FoldmarkDocument';
import { categoryForKind } from '@/domain/document/FoldmarkDocument';
import {
  DEFAULT_DOCUMENT_THEME,
  FONT_FAMILIES,
  resolveTheme,
  THEME_BOUNDS,
  themeDeviations,
  type DocumentThemeSettings,
  type FontFamily,
} from '@/domain/document/DocumentTheme';
import type { LetterBlockName } from '@/domain/markdown/directives';
import { letterBlockText } from '@/domain/markdown/letterBlocks';
import AppIcon from '@/presentation/components/AppIcon.vue';
import AddressCombobox from '@/presentation/components/foldmark/AddressCombobox.vue';
import CountryCombobox from '@/presentation/components/foldmark/CountryCombobox.vue';
import {
  appSettings,
  DOCUMENT_SECTION_IDS,
  readSetting,
  writeSetting,
  type DocumentSectionId,
} from '@/presentation/settings/settingsRegistry';
import { useLibraryStore } from '@/presentation/stores/libraryStore';
import { useWorkspaceStore } from '@/presentation/stores/workspaceStore';

/**
 * The structured half of a document — the Document settings area (R13-017).
 *
 * Four groups, each an accordion whose open state is remembered: Document
 * (profile, name, then the paper's typeface and spacing and the page numbers
 * as subsections — set once, so they sit below the fold), Sender, Recipient
 * and Letter details. The profile is the first control — it decides what the
 * rest of the form means. The recipient's e-mail address is not a field here:
 * it comes from the contact and is edited in the e-mail dialog.
 *
 * Metadata is a form, not prose. "Betreff" belongs in a field the renderer can
 * place in a subject region and a mail client can put in a header — inferring
 * it from the first line of the body would be a guess that fails the first time
 * someone starts a letter with a quotation. The salutation and the closing
 * are managed here too and anchored in the body as blocks (R13-019).
 *
 * Recipients can be picked from the contact directory or typed. Picking
 * **copies** the fields into the document rather than linking them: a letter
 * is a record of what was sent, and correcting a book entry next year must
 * not silently rewrite what went in an envelope last year. The sender works
 * the same way, and its snapshot is editable right here.
 */
const emit = defineEmits<{
  openAddressBook: [query: string];
  /** The subject is a formatting target; every other field here is none (R14-003). */
  focusTarget: [target: 'subject' | 'none'];
}>();

/** Reports which surface took the focus, so Format → Bold knows what it acts on. */
function onFocusIn(event: FocusEvent): void {
  const element = event.target as HTMLElement | null;
  emit('focusTarget', element?.dataset.testid === 'subject' ? 'subject' : 'none');
}

const workspace = useWorkspaceStore();
const library = useLibraryStore();
const { t, tm } = useI18n();

const document = computed(() => workspace.document);
const recipient = computed<PostalAddress>(() => workspace.document?.metadata.recipient ?? {});
const senderSnapshot = computed<SenderSnapshot | undefined>(
  () => workspace.document?.metadata.sender,
);

// --- accordions ------------------------------------------------------------
const open = ref<Set<string>>(new Set(readSetting(appSettings.documentSectionsOpen)));

function isOpen(id: DocumentSectionId): boolean {
  return open.value.has(id);
}

const form = ref<HTMLElement | null>(null);

/**
 * Format → Document font… (R14-010): the theme group unfolds and the size
 * field takes the focus, so the document-wide size is one menu entry away
 * without living among the letter metadata.
 */
async function openThemeGroup(): Promise<void> {
  open.value.add('document');
  writeSetting(
    appSettings.documentSectionsOpen,
    DOCUMENT_SECTION_IDS.filter((section) => open.value.has(section)),
  );
  await nextTick();
  form.value?.querySelector<HTMLInputElement>('[data-testid="theme-font-size"]')?.focus();
}

defineExpose({ openThemeGroup });

function onToggle(id: DocumentSectionId, event: Event): void {
  const element = event.target as HTMLDetailsElement;
  if (element.open) open.value.add(id);
  else open.value.delete(id);
  writeSetting(
    appSettings.documentSectionsOpen,
    DOCUMENT_SECTION_IDS.filter((section) => open.value.has(section)),
  );
}

// --- document --------------------------------------------------------------
/**
 * The profiles offered, in the catalogue's groups (R13-031): those that suit
 * the document kind plus whatever the document already uses; a free document
 * may take any profile.
 */
const profileGroups = computed(() => {
  const wanted = document.value ? categoryForKind(document.value.kind) : 'letter';
  const free = document.value?.kind === 'custom';
  return groupProfiles(
    library.printProfiles.filter(
      (profile) =>
        free || profile.category === wanted || profile.id === document.value?.printProfileId,
    ),
  );
});

// --- sender ----------------------------------------------------------------
/** The sender's source is gone but the document still carries its snapshot. */
const senderIsOrphan = computed(() => {
  const metadata = document.value?.metadata;
  if (!metadata?.sender) return false;
  return !library.senderProfiles.some((sender) => sender.id === metadata.senderProfileId);
});

/** The snapshot lags behind its address-book entry, or was edited here. */
const senderIsStale = computed(() => {
  const metadata = document.value?.metadata;
  if (!metadata?.sender || !metadata.senderProfileId) return false;
  const source = library.addresses.find((address) => address.id === metadata.senderProfileId);
  if (!source) return false;
  const snapshot = JSON.stringify(metadata.sender.postal);
  return snapshot !== JSON.stringify(source.postal) || metadata.sender.name !== source.displayName;
});

/** The one-line summary a folded Sender group shows. */
const senderSummary = computed(() => {
  const snapshot = senderSnapshot.value;
  if (!snapshot) return t('metadata.noneChosen');
  return [snapshot.name, addressLines(snapshot.postal).slice(0, 2).join(', ')]
    .filter(Boolean)
    .join(' · ');
});

/** Edits the sender snapshot in place: the document keeps what it shows (ADR 0017). */
function setSenderField(field: keyof PostalAddress | 'name', value: string): void {
  const snapshot = senderSnapshot.value;
  if (!snapshot) return;
  if (field === 'name') {
    workspace.patchMetadata({ sender: { ...snapshot, name: value } });
    return;
  }
  const postal: Record<string, string> = { ...snapshot.postal };
  if (value.trim()) postal[field] = field === 'countryCode' ? value.trim().toUpperCase() : value;
  else delete postal[field];
  workspace.patchMetadata({ sender: { ...snapshot, postal: postal as PostalAddress } });
}

// --- recipient -------------------------------------------------------------
function setRecipientField(field: keyof PostalAddress, value: string): void {
  const next: Record<string, string> = { ...recipient.value };
  if (value.trim()) next[field] = field === 'countryCode' ? value.trim().toUpperCase() : value;
  else delete next[field];
  workspace.patchMetadata({
    recipient: Object.keys(next).length ? (next as PostalAddress) : undefined,
  });
}

/**
 * Copies a book entry into the document; the book is never referenced for
 * rendering. The entry's id is kept so the snapshot can be compared with the
 * directory and reset from it (R14-012).
 */
async function chooseRecipient(address: Address): Promise<void> {
  workspace.patchMetadata({
    recipient: { ...address.postal },
    recipientContactId: address.id,
    // The contact's address is the hand-off recipient unless one was typed (R13-009).
    emailTo: address.email ?? document.value?.metadata.emailTo,
  });
  await services.addressBook.touch(address.id);
}

/** The recipient snapshot differs from the directory entry it was taken from. */
const recipientIsStale = computed(() => {
  const metadata = document.value?.metadata;
  if (!metadata?.recipient || !metadata.recipientContactId) return false;
  const source = library.addresses.find((address) => address.id === metadata.recipientContactId);
  if (!source) return false;
  return JSON.stringify(metadata.recipient) !== JSON.stringify(source.postal);
});

/** The closed recipient combobox shows whom the letter is addressed to. */
const recipientLabel = computed(() => {
  const postal = document.value?.metadata.recipient;
  return postal && Object.keys(postal).length ? deriveDisplayName(postal) : undefined;
});

const recipientSummary = computed(() => {
  const postal = document.value?.metadata.recipient;
  if (!postal || !Object.keys(postal).length) return t('metadata.noneChosen');
  return addressLines(postal).slice(0, 3).join(', ');
});

// --- letter details --------------------------------------------------------
/** The phrases offered for a salutation or a closing: the document's own first, then the locale's. */
function phrases(kind: 'salutations' | 'closings'): readonly string[] {
  const own = kind === 'salutations' ? letterText('salutation') : letterText('closing');
  const list = tm(`editor.${kind}`) as readonly string[];
  return [...new Set([own?.trim() || '', ...list].filter(Boolean))];
}

/** The words the body block holds, falling back to the metadata copy. */
function letterText(name: LetterBlockName): string {
  const current = document.value;
  if (!current) return '';
  return letterBlockText(current.bodyMarkdown, name) ?? current.metadata[name] ?? '';
}

function setPrintOption<K extends keyof PrintOptions>(key: K, value: PrintOptions[K]): void {
  if (!document.value) return;
  workspace.patch({ printOptions: { ...document.value.printOptions, [key]: value } });
}

const PAGE_NUMBER_POSITIONS: readonly PageNumberPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

function setPageNumbers(changes: Partial<PageNumberOptions>): void {
  if (!document.value) return;
  setPrintOption('pageNumbers', { ...document.value.printOptions.pageNumbers, ...changes });
}

// --- font theme ------------------------------------------------------------
const documentTheme = computed(() => resolveTheme(document.value?.printOptions.theme));

function setTheme(changes: DocumentThemeSettings): void {
  if (!document.value) return;
  const merged: DocumentThemeSettings = { ...document.value.printOptions.theme, ...changes };
  const theme = themeDeviations(merged);
  const rest = withoutTheme(document.value.printOptions);
  workspace.patch({
    printOptions: Object.keys(theme).length ? { ...rest, theme } : rest,
  });
}

/** The print options without their theme key, so a reset leaves no empty map behind. */
function withoutTheme(options: PrintOptions): PrintOptions {
  const copy: { -readonly [K in keyof PrintOptions]?: PrintOptions[K] } = { ...options };
  delete copy.theme;
  return copy as PrintOptions;
}

type ThemeNumberKey = 'fontSizePt' | 'lineHeight' | 'paragraphSpacing' | 'smallSizePt';

/**
 * Fields committed on `change` keep a draft of what is being typed: Vue writes
 * a bound `:value` back into the element on every re-render of the form, and
 * a re-render in the middle of typing — an autosave, a resolved asset — would
 * otherwise wipe the half-typed number.
 */
const drafts = ref<Record<string, string>>({});

function draftOf(key: string, current: string | number): string {
  return drafts.value[key] ?? String(current);
}

function setDraft(key: string, value: string): void {
  drafts.value = { ...drafts.value, [key]: value };
}

function clearDraft(key: string): void {
  const next = { ...drafts.value };
  delete next[key];
  drafts.value = next;
}

function setThemeNumber(key: ThemeNumberKey, raw: string): void {
  clearDraft(key);
  const value = Number(raw);
  if (!Number.isFinite(value)) return;
  const bounds = THEME_BOUNDS[key];
  setTheme({ [key]: Math.min(Math.max(value, bounds.min), bounds.max) });
}

function commitLetterBlock(name: LetterBlockName, raw: string): void {
  clearDraft(name);
  workspace.setLetterBlock(name, raw);
}

function resetTheme(): void {
  if (!document.value) return;
  workspace.patch({ printOptions: withoutTheme(document.value.printOptions) });
}

/** The fields shown for an address, in the order they are printed. */
const POSTAL_FIELDS = [
  'organization',
  'department',
  'person',
  'street',
  'addressLine2',
  'postalCode',
  'city',
  'region',
] as const;

const THEME_NUMBERS: readonly { key: ThemeNumberKey; step: string }[] = [
  { key: 'fontSizePt', step: '0.5' },
  { key: 'lineHeight', step: '0.05' },
  { key: 'paragraphSpacing', step: '0.1' },
  { key: 'smallSizePt', step: '0.5' },
];
</script>

<template>
  <form v-if="document" ref="form" class="metadata-form" @submit.prevent @focusin="onFocusIn">
    <!-- Document: the profile first, then the internal name. -->
    <details
      class="metadata-section"
      :open="isOpen('document')"
      data-testid="section-document"
      @toggle="onToggle('document', $event)"
    >
      <summary>
        <AppIcon name="letter" size="sm" />
        <span>{{ t('metadata.document') }}</span>
        <small v-if="!isOpen('document')" class="metadata-summary">
          {{ t(`documents.kind.${document.kind}`) }} · {{ document.title }}
        </small>
      </summary>
      <label class="field">
        <span>{{ t('metadata.printProfile') }}</span>
        <select
          class="select select-bordered"
          :value="document.printProfileId"
          @change="workspace.selectProfile(($event.target as HTMLSelectElement).value)"
        >
          <optgroup
            v-for="group in profileGroups"
            :key="group.id"
            :label="t(`profiles.group.${group.id}`)"
          >
            <option v-for="profile in group.profiles" :key="profile.id" :value="profile.id">
              {{ profile.name[$i18n.locale === 'de' ? 'de' : 'en'] }}
            </option>
          </optgroup>
        </select>
      </label>
      <label class="field">
        <span>{{ t('metadata.title') }}</span>
        <input
          class="input input-bordered"
          type="text"
          :value="document.title"
          maxlength="200"
          @input="workspace.setTitle(($event.target as HTMLInputElement).value)"
        />
      </label>
      <small class="field-hint">{{ t('metadata.titleHint') }}</small>
      <p class="field-static">
        <span>{{ t('metadata.kind') }}</span>
        <strong>{{ t(`documents.kind.${document.kind}`) }}</strong>
      </p>

      <!-- Typeface and spacing: the paper's theme, kept with the document. -->
      <h3 class="metadata-subhead" data-testid="document-theme">
        <AppIcon name="heading" size="sm" />
        {{ t('metadata.theme.title') }}
      </h3>
      <p class="editor-hint">{{ t('metadata.theme.hint') }}</p>

      <div class="field-grid">
        <label class="field">
          <span>{{ t('metadata.theme.fontFamily') }}</span>
          <select
            class="select select-bordered"
            :value="documentTheme.fontFamily"
            @change="
              setTheme({ fontFamily: ($event.target as HTMLSelectElement).value as FontFamily })
            "
          >
            <option v-for="family in FONT_FAMILIES" :key="family" :value="family">
              {{ t(`metadata.theme.fontFamilies.${family}`) }}
            </option>
          </select>
        </label>
        <label v-for="entry in THEME_NUMBERS" :key="entry.key" class="field">
          <span>{{ t(`metadata.theme.${entry.key}`) }}</span>
          <input
            class="input input-bordered"
            type="number"
            :min="THEME_BOUNDS[entry.key].min"
            :max="THEME_BOUNDS[entry.key].max"
            :step="entry.step"
            :value="draftOf(entry.key, documentTheme[entry.key])"
            :data-testid="entry.key === 'fontSizePt' ? 'theme-font-size' : undefined"
            @input="setDraft(entry.key, ($event.target as HTMLInputElement).value)"
            @change="setThemeNumber(entry.key, ($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>

      <div class="field-actions">
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="!document.printOptions.theme"
          @click="resetTheme"
        >
          {{ t('metadata.theme.reset') }}
        </button>
      </div>
      <p class="editor-hint">
        {{
          t('metadata.theme.defaults', {
            size: DEFAULT_DOCUMENT_THEME.fontSizePt,
            family: t(`metadata.theme.fontFamilies.${DEFAULT_DOCUMENT_THEME.fontFamily}`),
          })
        }}
      </p>
      <!-- The semantic colours are global defaults under Settings → Colours
           (R14-009); a document that carries its own keeps them. -->
      <p v-if="document.printOptions.theme?.aliases" class="field-hint">
        {{ t('metadata.theme.ownAliases') }}
      </p>

      <!-- Page numbers and printed marks. -->
      <h3 class="metadata-subhead" data-testid="section-page-numbers">
        <AppIcon name="page-break" size="sm" />
        {{ t('metadata.pageOptions') }}
      </h3>

      <label class="field">
        <span>{{ t('metadata.pageNumbers.format') }}</span>
        <select
          class="select select-bordered"
          :value="document.printOptions.pageNumbers.format"
          data-testid="page-number-format"
          @change="
            setPageNumbers({
              format: ($event.target as HTMLSelectElement).value as PageNumberOptions['format'],
            })
          "
        >
          <option v-for="format in PAGE_NUMBER_FORMATS" :key="format" :value="format">
            {{ t(`metadata.pageNumbers.formats.${format}`) }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>{{ t('metadata.pageNumbers.position') }}</span>
        <select
          class="select select-bordered"
          :value="document.printOptions.pageNumbers.position"
          :disabled="document.printOptions.pageNumbers.format === 'none'"
          @change="
            setPageNumbers({
              position: ($event.target as HTMLSelectElement).value as PageNumberPosition,
            })
          "
        >
          <option v-for="position in PAGE_NUMBER_POSITIONS" :key="position" :value="position">
            {{ t(`metadata.pageNumbers.positions.${position}`) }}
          </option>
        </select>
      </label>

      <label class="field-inline">
        <input
          type="checkbox"
          class="checkbox"
          :checked="document.printOptions.pageNumbers.hideOnFirstPage"
          :disabled="document.printOptions.pageNumbers.format === 'none'"
          @change="setPageNumbers({ hideOnFirstPage: ($event.target as HTMLInputElement).checked })"
        />
        <span>{{ t('metadata.pageNumbers.hideOnFirstPage') }}</span>
      </label>

      <label class="field-inline">
        <input
          type="checkbox"
          class="checkbox"
          :checked="document.exportPreferences.pdfIncludesPhysicalMarks"
          @change="
            workspace.patch({
              exportPreferences: {
                ...document.exportPreferences,
                pdfIncludesPhysicalMarks: ($event.target as HTMLInputElement).checked,
              },
            })
          "
        />
        <span>{{ t('export.includeMarks') }}</span>
      </label>
    </details>

    <!-- Sender: picked from the directory, kept as an editable snapshot. -->
    <details
      class="metadata-section"
      :open="isOpen('sender')"
      data-testid="section-sender"
      @toggle="onToggle('sender', $event)"
    >
      <summary>
        <AppIcon name="sender" size="sm" />
        <span>{{ t('metadata.sender') }}</span>
        <small v-if="!isOpen('sender')" class="metadata-summary">{{ senderSummary }}</small>
      </summary>
      <AddressCombobox
        :addresses="library.addresses"
        role="sender"
        :selected-id="document.metadata.senderProfileId ?? null"
        :selected-label="
          senderIsOrphan && document.metadata.sender
            ? t('metadata.senderSnapshot', { name: document.metadata.sender.name })
            : undefined
        "
        :label="t('metadata.sender')"
        @select="workspace.selectSender($event.id)"
        @clear="workspace.selectSender(null)"
        @open-book="emit('openAddressBook', $event)"
      />
      <!-- The snapshot may be edited here; the directory is the source it can
           be reset from (R14-012). -->
      <p v-if="senderIsStale" class="snapshot-status" role="status">
        <AppIcon name="info" size="sm" />
        <span>{{ t('metadata.snapshotChanged') }}</span>
        <button
          type="button"
          class="btn btn-xs btn-ghost"
          data-testid="reset-sender"
          @click="workspace.refreshSenderFromSource()"
        >
          {{ t('metadata.resetFromContact') }}
        </button>
      </p>
      <template v-if="senderSnapshot">
        <label class="field">
          <span>{{ t('metadata.senderName') }}</span>
          <input
            class="input input-bordered"
            type="text"
            :value="senderSnapshot.name"
            maxlength="200"
            @input="setSenderField('name', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <div class="field-grid">
          <label v-for="field in POSTAL_FIELDS" :key="field" class="field">
            <span>{{ t(`metadata.field.${field}`) }}</span>
            <input
              class="input input-bordered"
              type="text"
              :value="senderSnapshot.postal[field] ?? ''"
              :maxlength="field === 'postalCode' ? 16 : 120"
              @input="setSenderField(field, ($event.target as HTMLInputElement).value)"
            />
          </label>
          <CountryCombobox
            :model-value="senderSnapshot.postal.countryCode ?? ''"
            :label="t('metadata.field.countryCode')"
            @update:model-value="setSenderField('countryCode', $event)"
          />
        </div>
        <p class="field-hint">
          {{
            [senderSnapshot.email, senderSnapshot.phone, senderSnapshot.website]
              .filter(Boolean)
              .join(' · ') || t('metadata.noContactShown')
          }}
        </p>
      </template>
    </details>

    <!-- Recipient: a snapshot too, typed or picked. -->
    <details
      class="metadata-section"
      :open="isOpen('recipient')"
      data-testid="section-recipient"
      @toggle="onToggle('recipient', $event)"
    >
      <summary>
        <AppIcon name="recipient" size="sm" />
        <span>{{ t('metadata.recipient') }}</span>
        <small v-if="!isOpen('recipient')" class="metadata-summary">{{ recipientSummary }}</small>
      </summary>
      <AddressCombobox
        :addresses="library.addresses"
        role="recipient"
        :selected-id="null"
        :selected-label="recipientLabel"
        :label="t('metadata.pickFromBook')"
        @select="chooseRecipient($event)"
        @clear="workspace.patchMetadata({ recipient: undefined, recipientContactId: undefined })"
        @open-book="emit('openAddressBook', $event)"
      />
      <p v-if="recipientIsStale" class="snapshot-status" role="status">
        <AppIcon name="info" size="sm" />
        <span>{{ t('metadata.snapshotChanged') }}</span>
        <button
          type="button"
          class="btn btn-xs btn-ghost"
          data-testid="reset-recipient"
          @click="workspace.refreshRecipientFromSource()"
        >
          {{ t('metadata.resetFromContact') }}
        </button>
      </p>
      <div class="field-grid">
        <label v-for="field in POSTAL_FIELDS" :key="field" class="field">
          <span>{{ t(`metadata.field.${field}`) }}</span>
          <input
            class="input input-bordered"
            type="text"
            :value="recipient[field] ?? ''"
            :maxlength="field === 'postalCode' ? 16 : 120"
            @input="setRecipientField(field, ($event.target as HTMLInputElement).value)"
          />
        </label>
        <CountryCombobox
          :model-value="recipient.countryCode ?? ''"
          :label="t('metadata.field.countryCode')"
          @update:model-value="setRecipientField('countryCode', $event)"
        />
      </div>
    </details>

    <!-- Letter details: subject, date, reference, salutation, closing. -->
    <details
      class="metadata-section"
      :open="isOpen('letter')"
      data-testid="section-letter"
      @toggle="onToggle('letter', $event)"
    >
      <summary>
        <AppIcon name="greeting" size="sm" />
        <span>{{ t('metadata.letter') }}</span>
        <small v-if="!isOpen('letter')" class="metadata-summary">
          {{ document.metadata.subject || t('metadata.noSubject') }}
        </small>
      </summary>

      <label class="field">
        <span>{{ t('metadata.subject') }}</span>
        <input
          class="input input-bordered"
          type="text"
          :value="document.metadata.subject ?? ''"
          maxlength="200"
          data-testid="subject"
          data-shortcut-scope="editor"
          @input="workspace.setSubject(($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field-inline">
        <input
          type="checkbox"
          class="checkbox checkbox-sm"
          :checked="document.printOptions.showSubject !== false"
          @change="
            setPrintOption(
              'showSubject',
              ($event.target as HTMLInputElement).checked ? undefined : false,
            )
          "
        />
        <span>{{ t('metadata.showSubject') }}</span>
      </label>

      <div class="field-row">
        <label class="field field-grow">
          <span>{{ t('metadata.date') }}</span>
          <input
            class="input input-bordered"
            type="date"
            :value="document.metadata.date ?? ''"
            @input="
              workspace.patchMetadata({
                date: ($event.target as HTMLInputElement).value || undefined,
              })
            "
          />
        </label>
        <label class="field-inline">
          <input
            type="checkbox"
            class="checkbox checkbox-sm"
            :checked="document.printOptions.showDate !== false"
            @change="
              setPrintOption(
                'showDate',
                ($event.target as HTMLInputElement).checked ? undefined : false,
              )
            "
          />
          <span>{{ t('metadata.showDate') }}</span>
        </label>
      </div>

      <label class="field">
        <span>{{ t('metadata.reference') }}</span>
        <input
          class="input input-bordered"
          type="text"
          :value="document.metadata.reference ?? ''"
          maxlength="120"
          @input="
            workspace.patchMetadata({
              reference: ($event.target as HTMLInputElement).value || undefined,
            })
          "
        />
      </label>

      <label class="field">
        <span>{{ t('metadata.salutation') }}</span>
        <input
          class="input input-bordered"
          type="text"
          list="salutation-phrases"
          :value="draftOf('salutation', letterText('salutation'))"
          maxlength="200"
          data-testid="salutation"
          @input="setDraft('salutation', ($event.target as HTMLInputElement).value)"
          @change="commitLetterBlock('salutation', ($event.target as HTMLInputElement).value)"
        />
        <datalist id="salutation-phrases">
          <option v-for="phrase in phrases('salutations')" :key="phrase" :value="phrase" />
        </datalist>
      </label>
      <small class="field-hint">{{ t('metadata.salutationHint') }}</small>

      <label class="field">
        <span>{{ t('metadata.closing') }}</span>
        <input
          class="input input-bordered"
          type="text"
          list="closing-phrases"
          :value="draftOf('closing', letterText('closing'))"
          maxlength="200"
          data-testid="closing"
          @input="setDraft('closing', ($event.target as HTMLInputElement).value)"
          @change="commitLetterBlock('closing', ($event.target as HTMLInputElement).value)"
        />
        <datalist id="closing-phrases">
          <option v-for="phrase in phrases('closings')" :key="phrase" :value="phrase" />
        </datalist>
      </label>
    </details>
  </form>
</template>
