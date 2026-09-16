<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  canSend,
  CONTACT_POINTS_MAX,
  createPostalEntry,
  deriveDisplayName,
  hasRole,
  personName,
  POSTAL_ENTRIES_MAX,
  type Address,
  type AddressRole,
  type ContactPoint,
  type PostalEntry,
} from '@/domain/address/Address';
import { createId } from '@/domain/common/Ids';
import type { PostalAddress } from '@/domain/document/FoldmarkDocument';
import AppDialog from '@/presentation/components/AppDialog.vue';
import AppIcon from '@/presentation/components/AppIcon.vue';
import ConfirmDialog from '@/presentation/components/ConfirmDialog.vue';
import CountryCombobox from '@/presentation/components/foldmark/CountryCombobox.vue';

/**
 * Adding or editing one contact (R13-028): a centred dialog with the name,
 * any number of postal addresses, e-mail addresses, phone numbers and
 * websites — one of each kind marked primary — plus tags, sender options and
 * notes. Closing with unsaved changes asks first; deleting asks always.
 *
 * The dialog edits a plain draft and hands the result back as the input the
 * directory service takes; it never talks to storage itself, so the panel
 * stays the one place that refreshes the lists.
 */
const props = defineProps<{
  open: boolean;
  /** The contact to edit, or `null` for a new one. */
  contact: Address | null;
}>();
const emit = defineEmits<{
  close: [];
  save: [payload: ContactPayload];
  delete: [id: string];
}>();
const { t } = useI18n();

/** What the panel persists: the input of `AddressBookService.add`, plus the id when editing. */
export interface ContactPayload {
  readonly id: string | null;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly displayName?: string;
  readonly addresses: readonly PostalEntry[];
  readonly emails: readonly ContactPoint[];
  readonly phones: readonly ContactPoint[];
  readonly websites: readonly ContactPoint[];
  readonly contactVisibility: { email?: boolean; phone?: boolean; website?: boolean };
  readonly roles: readonly AddressRole[];
  readonly footerLines: readonly string[];
  readonly notes?: string;
  readonly tags: readonly string[];
}

interface PostalDraft {
  id: string;
  label: string;
  countryCode: string;
  organization: string;
  department: string;
  street: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  region: string;
  primary: boolean;
  favorite: boolean;
}

interface PointDraft {
  key: string;
  value: string;
  primary: boolean;
}

interface ContactDraft {
  firstName: string;
  lastName: string;
  displayName: string;
  addresses: PostalDraft[];
  emails: PointDraft[];
  phones: PointDraft[];
  websites: PointDraft[];
  showEmail: boolean;
  showPhone: boolean;
  showWebsite: boolean;
  sender: boolean;
  favorite: boolean;
  footerLines: string;
  tags: string;
  notes: string;
}

const draft = ref<ContactDraft>(emptyDraft());
/** The draft as opened, to tell an untouched dialog from an edited one. */
let opened = '';
const discardAsk = ref(false);
const deleteAsk = ref(false);

const isDirty = computed(() => JSON.stringify(draft.value) !== opened);
const title = computed(() => (props.contact ? t('addresses.edit') : t('addresses.newTitle')));

function emptyPostal(primary: boolean): PostalDraft {
  return {
    id: createId(),
    label: '',
    countryCode: 'DE',
    organization: '',
    department: '',
    street: '',
    addressLine2: '',
    postalCode: '',
    city: '',
    region: '',
    primary,
    favorite: false,
  };
}

function emptyPoint(primary: boolean): PointDraft {
  return { key: createId(), value: '', primary };
}

function emptyDraft(): ContactDraft {
  return {
    firstName: '',
    lastName: '',
    displayName: '',
    addresses: [emptyPostal(true)],
    emails: [],
    phones: [],
    websites: [],
    showEmail: false,
    showPhone: false,
    showWebsite: false,
    sender: false,
    favorite: false,
    footerLines: '',
    tags: '',
    notes: '',
  };
}

/** A 1.0 record has the person in the postal fields only; split it into the name fields once. */
function splitPerson(person: string | undefined): { firstName: string; lastName: string } {
  const trimmed = person?.trim() ?? '';
  const space = trimmed.lastIndexOf(' ');
  if (space === -1) return { firstName: '', lastName: trimmed };
  return { firstName: trimmed.slice(0, space), lastName: trimmed.slice(space + 1) };
}

function draftFrom(address: Address): ContactDraft {
  const names =
    address.firstName || address.lastName
      ? { firstName: address.firstName ?? '', lastName: address.lastName ?? '' }
      : splitPerson(address.postal.person);
  const points = (list: readonly ContactPoint[]): PointDraft[] =>
    list.map((point) => ({ key: createId(), value: point.value, primary: point.primary }));
  const addresses = address.addresses.map((entry) => ({
    id: entry.id,
    label: entry.label ?? '',
    countryCode: entry.postal.countryCode ?? '',
    organization: entry.postal.organization ?? '',
    department: entry.postal.department ?? '',
    street: entry.postal.street ?? '',
    addressLine2: entry.postal.addressLine2 ?? '',
    postalCode: entry.postal.postalCode ?? '',
    city: entry.postal.city ?? '',
    region: entry.postal.region ?? '',
    primary: entry.primary,
    favorite: entry.favorite ?? false,
  }));
  return {
    ...names,
    // A derived display name is shown as a placeholder, not stored as text.
    displayName:
      address.displayName === derivedName(names, address.postal) ? '' : address.displayName,
    addresses: addresses.length ? addresses : [emptyPostal(true)],
    emails: points(address.emails),
    phones: points(address.phones),
    websites: points(address.websites),
    showEmail: address.contactVisibility.email ?? false,
    showPhone: address.contactVisibility.phone ?? false,
    showWebsite: address.contactVisibility.website ?? false,
    sender: canSend(address),
    favorite: hasRole(address, 'favorite'),
    footerLines: (address.stationery?.footerLines ?? []).join('\n'),
    tags: address.tags.join(', '),
    notes: address.notes ?? '',
  };
}

function derivedName(
  names: { firstName: string; lastName: string },
  postal: PostalAddress,
): string {
  return deriveDisplayName({ ...names, postal });
}

/** The display name the directory will show unless one is typed. */
const namePlaceholder = computed(() => {
  const primary = draft.value.addresses.find((entry) => entry.primary) ?? draft.value.addresses[0];
  return derivedName(draft.value, primary ? toPostal(primary, draft.value) : {});
});

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    draft.value = props.contact ? draftFrom(props.contact) : emptyDraft();
    opened = JSON.stringify(draft.value);
    discardAsk.value = false;
    deleteAsk.value = false;
  },
);

// --- lists -----------------------------------------------------------------
function addAddress(): void {
  if (draft.value.addresses.length >= POSTAL_ENTRIES_MAX) return;
  draft.value.addresses.push(emptyPostal(draft.value.addresses.length === 0));
}

function removeAddress(index: number): void {
  const [removed] = draft.value.addresses.splice(index, 1);
  if (removed?.primary && draft.value.addresses[0]) draft.value.addresses[0].primary = true;
}

function setPrimaryAddress(index: number): void {
  draft.value.addresses.forEach((entry, at) => {
    entry.primary = at === index;
  });
}

type PointKind = 'emails' | 'phones' | 'websites';

function addPoint(kind: PointKind): void {
  const list = draft.value[kind];
  if (list.length >= CONTACT_POINTS_MAX) return;
  list.push(emptyPoint(list.length === 0));
}

function removePoint(kind: PointKind, index: number): void {
  const list = draft.value[kind];
  const [removed] = list.splice(index, 1);
  if (removed?.primary && list[0]) list[0].primary = true;
}

function setPrimaryPoint(kind: PointKind, index: number): void {
  draft.value[kind].forEach((point, at) => {
    point.primary = at === index;
  });
}

// --- save / close ------------------------------------------------------------
/** Drops the empty strings the form uses so the schema sees absent optionals. */
function toPostal(
  entry: PostalDraft,
  names: { firstName: string; lastName: string },
): PostalAddress {
  const fields: Record<string, string> = {
    person: personName(names),
    organization: entry.organization,
    department: entry.department,
    street: entry.street,
    addressLine2: entry.addressLine2,
    postalCode: entry.postalCode,
    city: entry.city,
    region: entry.region,
    countryCode: entry.countryCode.toUpperCase(),
  };
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value.trim() !== ''),
  ) as PostalAddress;
}

function isBlankAddress(entry: PostalDraft): boolean {
  return [
    entry.organization,
    entry.department,
    entry.street,
    entry.addressLine2,
    entry.postalCode,
    entry.city,
    entry.region,
  ].every((value) => value.trim() === '');
}

function submit(): void {
  const value = draft.value;
  const optional = (text: string): string | undefined => text.trim() || undefined;
  const addresses = value.addresses
    .filter((entry) => !isBlankAddress(entry))
    .map((entry) =>
      createPostalEntry(
        {
          postal: toPostal(entry, value),
          label: entry.label,
          primary: entry.primary,
          favorite: entry.favorite,
        },
        entry.id,
      ),
    );
  const points = (list: PointDraft[]): ContactPoint[] =>
    list
      .filter((point) => point.value.trim() !== '')
      .map((point) => ({ value: point.value.trim(), primary: point.primary }));
  const roles: AddressRole[] = [
    ...(value.sender ? (['sender'] as const) : []),
    ...(value.favorite ? (['favorite'] as const) : []),
  ];
  emit('save', {
    id: props.contact?.id ?? null,
    firstName: optional(value.firstName),
    lastName: optional(value.lastName),
    displayName: optional(value.displayName),
    addresses,
    emails: points(value.emails),
    phones: points(value.phones),
    websites: points(value.websites),
    contactVisibility: {
      email: value.showEmail || undefined,
      phone: value.showPhone || undefined,
      website: value.showWebsite || undefined,
    },
    roles,
    footerLines: value.footerLines
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 8),
    notes: optional(value.notes),
    tags: value.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 24),
  });
  opened = JSON.stringify(draft.value);
}

/** Every way out asks when something would be lost (AC-CONTACT-008). */
function requestClose(): void {
  if (isDirty.value) discardAsk.value = true;
  else emit('close');
}

function discard(): void {
  discardAsk.value = false;
  emit('close');
}

const POSTAL_FIELDS = [
  'organization',
  'department',
  'street',
  'addressLine2',
  'postalCode',
  'city',
  'region',
] as const;

const POINT_KINDS: readonly { kind: PointKind; label: string; type: string; max: number }[] = [
  { kind: 'emails', label: 'addresses.email', type: 'email', max: 254 },
  { kind: 'phones', label: 'addresses.phone', type: 'tel', max: 40 },
  { kind: 'websites', label: 'addresses.website', type: 'url', max: 300 },
];
</script>

<template>
  <AppDialog
    :open="open"
    :title="title"
    size="lg"
    dialog-class="contact-dialog"
    @close="requestClose"
  >
    <form id="contact-form" class="contact-form" @submit.prevent="submit">
      <!-- Name -->
      <fieldset class="contact-section">
        <legend>{{ t('addresses.section.name') }}</legend>
        <div class="field-grid">
          <label class="field">
            <span>{{ t('addresses.firstName') }}</span>
            <input
              v-model="draft.firstName"
              class="input input-bordered"
              type="text"
              maxlength="120"
              autocomplete="off"
              autofocus
              data-testid="contact-first-name"
            />
          </label>
          <label class="field">
            <span>{{ t('addresses.lastName') }}</span>
            <input
              v-model="draft.lastName"
              class="input input-bordered"
              type="text"
              maxlength="120"
              autocomplete="off"
              data-testid="contact-last-name"
            />
          </label>
        </div>
        <label class="field">
          <span>{{ t('addresses.displayName') }}</span>
          <input
            v-model="draft.displayName"
            class="input input-bordered"
            type="text"
            maxlength="120"
            autocomplete="off"
            :placeholder="namePlaceholder"
          />
        </label>
        <p class="field-hint">{{ t('addresses.displayNameHint') }}</p>
      </fieldset>

      <!-- Postal addresses -->
      <fieldset class="contact-section">
        <legend>{{ t('addresses.section.addresses') }}</legend>
        <div
          v-for="(entry, index) in draft.addresses"
          :key="entry.id"
          class="contact-address"
          :data-testid="`contact-address-${index}`"
        >
          <div class="contact-address-head">
            <label class="field field-grow">
              <span>{{ t('addresses.addressLabel') }}</span>
              <input
                v-model="entry.label"
                class="input input-bordered input-sm"
                type="text"
                maxlength="40"
                :placeholder="t('addresses.addressLabelHint')"
              />
            </label>
            <label class="field-inline">
              <input
                type="radio"
                class="radio radio-sm"
                name="primary-address"
                :checked="entry.primary"
                @change="setPrimaryAddress(index)"
              />
              <span>{{ t('addresses.primary') }}</span>
            </label>
            <label class="field-inline">
              <input v-model="entry.favorite" type="checkbox" class="checkbox checkbox-sm" />
              <span>{{ t('addresses.role.favorite') }}</span>
            </label>
            <button
              v-if="draft.addresses.length > 1"
              type="button"
              class="btn btn-ghost btn-xs btn-square"
              :aria-label="t('addresses.removeAddress')"
              :title="t('addresses.removeAddress')"
              @click="removeAddress(index)"
            >
              <AppIcon name="delete" size="sm" />
            </button>
          </div>
          <!-- Country first: it decides what the rest of the form means. -->
          <CountryCombobox v-model="entry.countryCode" :label="t('metadata.field.countryCode')" />
          <div class="field-grid">
            <label v-for="field in POSTAL_FIELDS" :key="field" class="field">
              <span>{{ t(`metadata.field.${field}`) }}</span>
              <input
                v-model="entry[field]"
                class="input input-bordered"
                type="text"
                :maxlength="field === 'postalCode' ? 16 : 120"
                autocomplete="off"
              />
            </label>
          </div>
        </div>
        <button
          v-if="draft.addresses.length < POSTAL_ENTRIES_MAX"
          type="button"
          class="btn btn-ghost btn-sm contact-add"
          @click="addAddress"
        >
          <AppIcon name="add" size="sm" /> {{ t('addresses.addAddress') }}
        </button>
      </fieldset>

      <!-- Contact points -->
      <fieldset class="contact-section">
        <legend>{{ t('addresses.contact') }}</legend>
        <p class="field-hint">{{ t('addresses.contactHint') }}</p>
        <div v-for="group in POINT_KINDS" :key="group.kind" class="contact-points">
          <div class="contact-points-head">
            <span class="contact-points-label">{{ t(group.label) }}</span>
            <label class="field-inline">
              <input
                v-if="group.kind === 'emails'"
                v-model="draft.showEmail"
                type="checkbox"
                class="checkbox checkbox-sm"
              />
              <input
                v-else-if="group.kind === 'phones'"
                v-model="draft.showPhone"
                type="checkbox"
                class="checkbox checkbox-sm"
              />
              <input
                v-else
                v-model="draft.showWebsite"
                type="checkbox"
                class="checkbox checkbox-sm"
              />
              <span>{{ t('addresses.showInDocument') }}</span>
            </label>
          </div>
          <div v-for="(point, index) in draft[group.kind]" :key="point.key" class="contact-point">
            <input
              v-model="point.value"
              class="input input-bordered input-sm"
              :type="group.type"
              :maxlength="group.max"
              autocomplete="off"
              :aria-label="`${t(group.label)} ${index + 1}`"
              :data-testid="`${group.kind}-${index}`"
            />
            <label class="field-inline">
              <input
                type="radio"
                class="radio radio-sm"
                :name="`primary-${group.kind}`"
                :checked="point.primary"
                :data-testid="`${group.kind}-${index}-primary`"
                @change="setPrimaryPoint(group.kind, index)"
              />
              <span>{{ t('addresses.primary') }}</span>
            </label>
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-square"
              :aria-label="t('addresses.removeEntry')"
              :title="t('addresses.removeEntry')"
              @click="removePoint(group.kind, index)"
            >
              <AppIcon name="delete" size="sm" />
            </button>
          </div>
          <button
            v-if="draft[group.kind].length < CONTACT_POINTS_MAX"
            type="button"
            class="btn btn-ghost btn-sm contact-add"
            :data-testid="`add-${group.kind}`"
            @click="addPoint(group.kind)"
          >
            <AppIcon name="add" size="sm" /> {{ t(group.label) }}
          </button>
        </div>
      </fieldset>

      <!-- Tags, roles, notes -->
      <fieldset class="contact-section">
        <legend>{{ t('addresses.roles') }}</legend>
        <label class="field-inline">
          <input v-model="draft.favorite" type="checkbox" class="checkbox" />
          <span>{{ t('addresses.role.favorite') }}</span>
        </label>
        <label class="field-inline">
          <input v-model="draft.sender" type="checkbox" class="checkbox" />
          <span>{{ t('addresses.role.sender') }}</span>
        </label>
        <label v-if="draft.sender" class="field">
          <span>{{ t('addresses.footerLines') }}</span>
          <textarea
            v-model="draft.footerLines"
            class="textarea textarea-bordered"
            rows="3"
            maxlength="1600"
          />
        </label>
        <label class="field">
          <span>{{ t('addresses.tags') }}</span>
          <input
            v-model="draft.tags"
            class="input input-bordered"
            type="text"
            maxlength="400"
            autocomplete="off"
            :placeholder="t('addresses.tagsHint')"
          />
        </label>
        <label class="field">
          <span>{{ t('addresses.notes') }}</span>
          <textarea
            v-model="draft.notes"
            class="textarea textarea-bordered"
            rows="2"
            maxlength="2000"
          />
        </label>
      </fieldset>
    </form>

    <template #footer>
      <button
        v-if="contact"
        type="button"
        class="btn btn-ghost text-error contact-delete"
        @click="deleteAsk = true"
      >
        {{ t('addresses.delete') }}
      </button>
      <button type="button" class="btn btn-ghost" @click="requestClose">
        {{ t('addresses.cancel') }}
      </button>
      <button type="submit" form="contact-form" class="btn btn-primary" data-testid="contact-save">
        {{ t('addresses.add') }}
      </button>
    </template>

    <ConfirmDialog
      :open="discardAsk"
      :title="t('addresses.discardTitle')"
      :text="t('addresses.discardText')"
      :confirm-label="t('addresses.discard')"
      danger
      @close="discardAsk = false"
      @confirm="discard"
    />
    <ConfirmDialog
      :open="deleteAsk"
      :title="t('addresses.deleteTitle')"
      :text="t('addresses.deleteText', { name: contact?.displayName ?? '' })"
      :confirm-label="t('addresses.delete')"
      danger
      @close="deleteAsk = false"
      @confirm="contact && emit('delete', contact.id)"
    />
  </AppDialog>
</template>
