<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import { roundMm } from '@/domain/common/Units';
import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import { groupProfiles } from '@/domain/print/builtInProfiles';
import { markerBounds, type PrintMarker } from '@/domain/print/PrintMarker';
import type { PrintProfile } from '@/domain/print/PrintProfile';
import ConfirmDialog from '@/presentation/components/ConfirmDialog.vue';
import { appSettings, readSetting, writeSetting } from '@/presentation/settings/settingsRegistry';
import { useLibraryStore } from '@/presentation/stores/libraryStore';

/**
 * The profile catalogue and what each profile actually claims.
 *
 * Two things are shown that most apps hide, and both are deliberate:
 *
 * **The measurements.** Every marker is listed with its coordinate in
 * millimetres. That is the number the user will hold a ruler against, and a
 * profile editor that shows only a picture cannot be checked.
 *
 * **The standards status.** The DIN-style profiles are built from commonly
 * cited working values and have not been verified against a licensed copy of
 * the standard. The panel says so on the profile itself, because a claim of
 * conformance is not something to make quietly.
 *
 * Built-ins are read-only and cannot be deleted (R13-031). Editing offers a
 * copy instead — the geometry the app shipped has to stay reproducible. A
 * user's own profile can be renamed and its margins set by number; the body
 * area follows the margins.
 */
const library = useLibraryStore();
const { t, locale } = useI18n();

const selectedId = ref<string | null>(null);
const cloneName = ref('');
const notice = ref<string | null>(null);
const deleteAsk = ref(false);

const defaultProfileId = ref(readSetting(appSettings.defaultPrintProfileId));

const selected = computed<PrintProfile | null>(
  () => library.printProfiles.find((profile) => profile.id === selectedId.value) ?? null,
);

const groups = computed(() => groupProfiles(library.printProfiles));

const issues = computed<readonly ValidationIssue[]>(() =>
  selected.value ? services.printProfiles.validate(selected.value) : [],
);

/** The editable fields of a user-owned profile, as text so a half-typed number survives. */
const draft = ref({ name: '', topMm: '', rightMm: '', bottomMm: '', leftMm: '' });

watch(
  selected,
  (profile) => {
    if (!profile) return;
    draft.value = {
      name: profileName(profile),
      topMm: String(profile.margins.topMm),
      rightMm: String(profile.margins.rightMm),
      bottomMm: String(profile.margins.bottomMm),
      leftMm: String(profile.margins.leftMm),
    };
  },
  { immediate: true },
);

onMounted(async () => {
  await library.loadAll();
  selectedId.value ??= library.printProfiles[0]?.id ?? null;
});

function profileName(profile: PrintProfile): string {
  return profile.name[locale.value === 'de' ? 'de' : 'en'];
}

function markerPosition(marker: PrintMarker): string {
  const bounds = markerBounds(marker);
  const size =
    bounds.widthMm && bounds.heightMm
      ? ` · ${roundMm(bounds.widthMm)} × ${roundMm(bounds.heightMm)} mm`
      : bounds.widthMm || bounds.heightMm
        ? ` · ${roundMm(bounds.widthMm || bounds.heightMm)} mm`
        : '';
  return `x ${roundMm(marker.xMm)} mm · y ${roundMm(marker.yMm)} mm${size}`;
}

async function cloneSelected(): Promise<void> {
  const source = selected.value;
  if (!source) return;
  const name = cloneName.value.trim() || `${profileName(source)} (${t('profiles.copySuffix')})`;
  const created = await library.run(
    () => services.printProfiles.clone(source.id, { de: name, en: name }),
    'errors.invalidInput',
  );
  if (!created) return;
  cloneName.value = '';
  await library.refreshProfiles();
  selectedId.value = created.id;
  notice.value = 'profiles.cloned';
}

/** Saves the name and margins of the selected user-owned profile. */
async function saveDraft(): Promise<void> {
  const source = selected.value;
  if (!source || source.builtIn) return;
  // A number input hands v-model a number already; a text fallback may hold a comma.
  const number = (text: string | number, fallback: number): number => {
    const value = Number.parseFloat(String(text).replace(',', '.'));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };
  const name = draft.value.name.trim() || profileName(source);
  const updated = await library.run(
    () =>
      services.printProfiles.update(source.id, {
        name: { de: name, en: name },
        margins: {
          topMm: number(draft.value.topMm, source.margins.topMm),
          rightMm: number(draft.value.rightMm, source.margins.rightMm),
          bottomMm: number(draft.value.bottomMm, source.margins.bottomMm),
          leftMm: number(draft.value.leftMm, source.margins.leftMm),
        },
      }),
    'errors.invalidInput',
  );
  if (!updated) return;
  await library.refreshProfiles();
  notice.value = 'profiles.saved';
}

async function removeSelected(): Promise<void> {
  const source = selected.value;
  deleteAsk.value = false;
  if (!source || source.builtIn) return;
  await library.run(() => services.printProfiles.remove(source.id), 'errors.immutableRecord');
  await library.refreshProfiles();
  selectedId.value = library.printProfiles[0]?.id ?? null;
  notice.value = 'profiles.removed';
}

function setDefaultProfile(id: string): void {
  defaultProfileId.value = id;
  writeSetting(appSettings.defaultPrintProfileId, id);
  notice.value = 'profiles.defaultSaved';
}

const MARGIN_FIELDS = ['topMm', 'rightMm', 'bottomMm', 'leftMm'] as const;
</script>

<template>
  <section class="panel" aria-labelledby="profiles-title">
    <div class="section-heading">
      <div>
        <p class="eyebrow">{{ t('profiles.eyebrow') }}</p>
        <h1 id="profiles-title">{{ t('profiles.title') }}</h1>
        <p>{{ t('profiles.description') }}</p>
      </div>
    </div>

    <p v-if="library.error" class="alert alert-error" role="alert">{{ t(library.error) }}</p>
    <p v-if="notice" class="alert alert-success" role="status">{{ t(notice) }}</p>

    <div class="profile-layout">
      <nav class="profile-list" :aria-label="t('profiles.title')">
        <section v-for="group in groups" :key="group.id" class="profile-group">
          <h2 class="profile-group-title">{{ t(`profiles.group.${group.id}`) }}</h2>
          <ul>
            <li v-for="profile in group.profiles" :key="profile.id">
              <button
                type="button"
                class="profile-entry"
                :class="{ active: profile.id === selectedId }"
                :aria-pressed="profile.id === selectedId"
                :data-testid="`profile-${profile.id}`"
                @click="selectedId = profile.id"
              >
                <strong>{{ profileName(profile) }}</strong>
                <span>
                  {{ roundMm(profile.page.widthMm) }} × {{ roundMm(profile.page.heightMm) }} mm
                  <template v-if="profile.duplex"> · {{ t('profiles.duplex') }}</template>
                </span>
                <small v-if="profile.builtIn">{{ t('profiles.builtIn') }}</small>
                <small v-else>{{ t('profiles.own') }}</small>
              </button>
            </li>
          </ul>
        </section>
      </nav>

      <div v-if="selected" class="profile-detail">
        <h2>{{ profileName(selected) }}</h2>

        <p
          v-if="selected.standardsStatus === 'draft-unverified'"
          class="alert alert-warning"
          role="status"
        >
          {{ t('profiles.standardsUnverified') }}
        </p>

        <dl class="profile-facts">
          <dt>{{ t('profiles.pageSize') }}</dt>
          <dd>{{ roundMm(selected.page.widthMm) }} × {{ roundMm(selected.page.heightMm) }} mm</dd>
          <dt>{{ t('profiles.margins') }}</dt>
          <dd>
            {{ roundMm(selected.margins.topMm) }} / {{ roundMm(selected.margins.rightMm) }} /
            {{ roundMm(selected.margins.bottomMm) }} / {{ roundMm(selected.margins.leftMm) }} mm
          </dd>
          <dt>{{ t('profiles.duplex') }}</dt>
          <dd>
            {{
              selected.duplex
                ? t(`export.duplex.${selected.duplex.flip}`)
                : t('profiles.singleSided')
            }}
          </dd>
        </dl>

        <!-- A user-owned profile is edited here; a built-in shows its values only. -->
        <form v-if="!selected.builtIn" class="profile-editor" @submit.prevent="saveDraft">
          <h3>{{ t('profiles.edit') }}</h3>
          <label class="field">
            <span>{{ t('profiles.name') }}</span>
            <input
              v-model="draft.name"
              class="input input-bordered"
              type="text"
              maxlength="80"
              data-testid="profile-name"
            />
          </label>
          <div class="field-grid profile-margins">
            <label v-for="field in MARGIN_FIELDS" :key="field" class="field">
              <span>{{ t(`profiles.margin.${field}`) }}</span>
              <input
                v-model="draft[field]"
                class="input input-bordered"
                type="number"
                min="0"
                max="200"
                step="0.5"
                inputmode="decimal"
                :data-testid="`profile-${field}`"
              />
            </label>
          </div>
          <div class="profile-actions">
            <button class="btn btn-primary" type="submit" data-testid="profile-save">
              {{ t('profiles.save') }}
            </button>
            <button
              class="btn btn-error btn-outline"
              type="button"
              data-testid="profile-delete"
              @click="deleteAsk = true"
            >
              {{ t('profiles.delete') }}
            </button>
          </div>
        </form>

        <h3>{{ t('profiles.markers') }}</h3>
        <ul v-if="selected.markers.length" class="marker-list">
          <li v-for="marker in selected.markers" :key="marker.id" class="marker-row">
            <span class="marker-kind">{{ t(`marker.kind.${marker.kind}`) }}</span>
            <span class="marker-position">{{ markerPosition(marker) }}</span>
            <span class="marker-visibility">
              {{ marker.print ? t('profiles.printed') : t('profiles.previewOnly') }}
            </span>
          </li>
        </ul>
        <p v-else class="empty-state">{{ t('profiles.noMarkers') }}</p>

        <h3>{{ t('profiles.checks') }}</h3>
        <ul v-if="issues.length" class="validation-list">
          <li v-for="(issue, index) in issues" :key="index" :class="`issue-${issue.severity}`">
            <span class="issue-severity">{{ t(`validation.severity.${issue.severity}`) }}</span>
            <span class="issue-message">{{
              t(`validation.${issue.code}`, issue.params ?? {})
            }}</span>
          </li>
        </ul>
        <p v-else class="empty-state">{{ t('profiles.noIssues') }}</p>

        <div class="profile-actions">
          <label class="field">
            <span>{{ t('profiles.cloneName') }}</span>
            <input
              v-model="cloneName"
              class="input input-bordered"
              type="text"
              maxlength="80"
              data-testid="profile-clone-name"
            />
          </label>
          <button
            class="btn btn-primary"
            type="button"
            data-testid="profile-clone"
            @click="cloneSelected"
          >
            {{ t('profiles.clone') }}
          </button>
          <button
            class="btn btn-outline"
            type="button"
            :disabled="defaultProfileId === selected.id"
            @click="setDefaultProfile(selected.id)"
          >
            {{ t('profiles.makeDefault') }}
          </button>
        </div>

        <p v-if="selected.builtIn" class="profile-note">{{ t('profiles.builtInNote') }}</p>
      </div>
    </div>

    <ConfirmDialog
      :open="deleteAsk"
      :title="t('profiles.deleteTitle')"
      :text="t('profiles.deleteText', { name: selected ? profileName(selected) : '' })"
      :confirm-label="t('profiles.delete')"
      danger
      @close="deleteAsk = false"
      @confirm="removeSelected"
    />
  </section>
</template>
