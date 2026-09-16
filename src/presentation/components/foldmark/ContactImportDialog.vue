<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import { addressLines, type Address } from '@/domain/address/Address';
import {
  parseContactFile,
  type ContactImportResult,
  type ImportedContact,
} from '@/domain/address/import/contactImport';
import {
  reviewImport,
  type ImportDecision,
  type ImportGroup,
  type ImportReviewEntry,
} from '@/domain/address/import/contactReview';
import AppDialog from '@/presentation/components/AppDialog.vue';
import AppIcon from '@/presentation/components/AppIcon.vue';
import { useLibraryStore } from '@/presentation/stores/libraryStore';

/**
 * Contact import with a review (R14-013): the file is read, every contact is
 * compared with the directory, and the three groups — new, probably existing,
 * needs review — are listed with a decision per row. Nothing is stored until
 * "Import"; a probable duplicate is skipped unless the person says merge or
 * new, and a merge only ever adds.
 */
const props = defineProps<{ open: boolean; file: File | null }>();
const emit = defineEmits<{ close: []; imported: [counts: { added: number; merged: number }] }>();
const { t } = useI18n();
const library = useLibraryStore();

const reading = ref(false);
const saving = ref(false);
const result = ref<ContactImportResult | null>(null);
const entries = ref<readonly ImportReviewEntry[]>([]);
const decisions = ref<ImportDecision[]>([]);
const fileName = ref('');

const GROUPS: readonly ImportGroup[] = ['new', 'existing', 'review'];

const counts = computed(() => ({
  total: entries.value.length,
  new: entries.value.filter((entry) => entry.group === 'new').length,
  existing: entries.value.filter((entry) => entry.group === 'existing').length,
  review: entries.value.filter((entry) => entry.group === 'review').length,
}));

const willAdd = computed(() => decisions.value.filter((decision) => decision === 'new').length);
const willMerge = computed(() => decisions.value.filter((decision) => decision === 'merge').length);

/** The rows of one group with their index into the decisions. */
function rows(group: ImportGroup): { index: number; entry: ImportReviewEntry }[] {
  return entries.value
    .map((entry, index) => ({ index, entry }))
    .filter(({ entry }) => entry.group === group);
}

async function read(file: File): Promise<void> {
  reading.value = true;
  fileName.value = file.name;
  try {
    const parsed = parseContactFile(await file.text());
    result.value = parsed;
    const review = reviewImport(parsed.contacts, library.addresses);
    entries.value = review.entries;
    decisions.value = review.entries.map((entry) => entry.defaultDecision);
  } finally {
    reading.value = false;
  }
}

watch(
  () => [props.open, props.file] as const,
  ([open, file]) => {
    if (open && file) void read(file);
    if (!open) {
      result.value = null;
      entries.value = [];
      decisions.value = [];
    }
  },
  { immediate: true },
);

function setDecision(index: number, decision: ImportDecision): void {
  decisions.value = decisions.value.map((current, at) => (at === index ? decision : current));
}

function setAll(group: ImportGroup, decision: ImportDecision): void {
  decisions.value = decisions.value.map((current, index) =>
    entries.value[index]?.group === group ? decision : current,
  );
}

async function confirm(): Promise<void> {
  saving.value = true;
  const outcome = await library.run(
    () =>
      services.addressBook.importContacts(
        entries.value.map((entry, index) => ({
          contact: entry.contact,
          decision: decisions.value[index] ?? 'skip',
          ...(entry.match ? { matchId: entry.match.id } : {}),
        })),
      ),
    'errors.storageUnavailable',
  );
  saving.value = false;
  if (!outcome) return;
  await library.refreshAddresses();
  emit('imported', { added: outcome.added, merged: outcome.merged });
  emit('close');
}

function issueMessage(issue: ValidationIssue): string {
  return t(`validation.${issue.code}`, issue.params ?? {});
}

/** One line for the imported side of a row. */
function summary(contact: ImportedContact): string {
  const first = contact.addresses[0]?.postal;
  const place = first ? addressLines(first).slice(0, 2).join(', ') : '';
  return [place, contact.emails[0], contact.phones[0]].filter(Boolean).join(' · ');
}

/** One line for the directory side of a row. */
function existingSummary(address: Address): string {
  const place = addressLines(address.postal).slice(0, 2).join(', ');
  return [
    place,
    address.emails[0]?.value ?? address.email,
    address.phones[0]?.value ?? address.phone,
  ]
    .filter(Boolean)
    .join(' · ');
}
</script>

<template>
  <AppDialog :open="open" :title="t('addresses.import.title')" size="lg" @close="emit('close')">
    <p v-if="reading" class="editor-hint" aria-live="polite">{{ t('addresses.import.reading') }}</p>

    <template v-else-if="result">
      <p class="import-file">
        <AppIcon name="contacts" size="sm" />
        <strong>{{ fileName }}</strong>
      </p>
      <p class="import-summary" data-testid="contact-import-summary">
        {{ t('addresses.import.recognised', { count: counts.total }) }}
        <span v-if="counts.total">
          — {{ t('addresses.import.groupNew', { count: counts.new }) }},
          {{ t('addresses.import.groupExisting', { count: counts.existing }) }},
          {{ t('addresses.import.groupReview', { count: counts.review }) }}
        </span>
      </p>

      <ul v-if="result.issues.length" class="validation-list">
        <li v-for="(issue, index) in result.issues" :key="index" :class="`issue-${issue.severity}`">
          <span class="issue-severity">{{ t(`validation.severity.${issue.severity}`) }}</span>
          <span class="issue-message">{{ issueMessage(issue) }}</span>
        </li>
      </ul>

      <section v-for="group in GROUPS" :key="group" class="import-group">
        <template v-if="rows(group).length">
          <header class="import-group-head">
            <h3>{{ t(`addresses.import.group.${group}`) }}</h3>
            <span class="import-group-actions">
              <button
                v-if="group !== 'new'"
                type="button"
                class="btn btn-ghost btn-xs"
                @click="setAll(group, 'skip')"
              >
                {{ t('addresses.import.allSkip') }}
              </button>
              <button
                v-if="group !== 'new'"
                type="button"
                class="btn btn-ghost btn-xs"
                @click="setAll(group, 'merge')"
              >
                {{ t('addresses.import.allMerge') }}
              </button>
              <button type="button" class="btn btn-ghost btn-xs" @click="setAll(group, 'new')">
                {{ t('addresses.import.allNew') }}
              </button>
            </span>
          </header>
          <ul class="import-rows">
            <li
              v-for="{ index, entry } in rows(group)"
              :key="index"
              class="import-row"
              :data-testid="`import-row-${group}`"
            >
              <div class="import-row-side">
                <strong>{{ entry.contact.displayName || t('addresses.import.unnamed') }}</strong>
                <small>{{ summary(entry.contact) }}</small>
              </div>
              <div v-if="entry.match" class="import-row-side import-row-existing">
                <span class="import-row-signal">
                  {{ t(`addresses.import.signal.${entry.signal}`) }}
                </span>
                <strong>{{ entry.match.displayName }}</strong>
                <small>{{ existingSummary(entry.match) }}</small>
              </div>
              <fieldset class="import-row-choice">
                <legend class="sr-only">{{ t('addresses.import.decision') }}</legend>
                <label v-if="entry.match">
                  <input
                    type="radio"
                    class="radio radio-xs"
                    :name="`decision-${index}`"
                    value="skip"
                    :checked="decisions[index] === 'skip'"
                    @change="setDecision(index, 'skip')"
                  />
                  {{ t('addresses.import.skip') }}
                </label>
                <label v-if="entry.match">
                  <input
                    type="radio"
                    class="radio radio-xs"
                    :name="`decision-${index}`"
                    value="merge"
                    :checked="decisions[index] === 'merge'"
                    @change="setDecision(index, 'merge')"
                  />
                  {{ t('addresses.import.merge') }}
                </label>
                <label>
                  <input
                    type="radio"
                    class="radio radio-xs"
                    :name="`decision-${index}`"
                    value="new"
                    :checked="decisions[index] === 'new'"
                    @change="setDecision(index, 'new')"
                  />
                  {{ t('addresses.import.asNew') }}
                </label>
                <label v-if="!entry.match">
                  <input
                    type="radio"
                    class="radio radio-xs"
                    :name="`decision-${index}`"
                    value="skip"
                    :checked="decisions[index] === 'skip'"
                    @change="setDecision(index, 'skip')"
                  />
                  {{ t('addresses.import.skip') }}
                </label>
              </fieldset>
            </li>
          </ul>
        </template>
      </section>
    </template>

    <template #footer>
      <span class="import-footer-note">
        {{ t('addresses.import.plan', { add: willAdd, merge: willMerge }) }}
      </span>
      <button type="button" class="btn btn-ghost" @click="emit('close')">
        {{ t('dialog.cancel') }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="saving || reading || (willAdd === 0 && willMerge === 0)"
        data-testid="contact-import-confirm"
        @click="confirm"
      >
        <AppIcon name="import" />
        <span>{{ t('addresses.import.confirm') }}</span>
      </button>
    </template>
  </AppDialog>
</template>
