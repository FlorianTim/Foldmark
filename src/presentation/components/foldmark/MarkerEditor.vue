<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import { roundMm } from '@/domain/common/Units';
import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import {
  capabilitiesFor,
  EDITABLE_MARKER_KINDS,
  isRegionKind,
  lineLength,
  MARKERS_MAX,
  moveMarker,
  newMarker,
  withLineLength,
  withMarker,
  withOrientation,
  withoutMarker,
} from '@/domain/print/markerEditing';
import type { MarkerKind, MarkerLineStyle, PrintMarker } from '@/domain/print/PrintMarker';
import type { PrintProfile } from '@/domain/print/PrintProfile';
import AppIcon from '@/presentation/components/AppIcon.vue';

/**
 * The numeric marker editor of a user-owned profile (change 0047, R02-001).
 *
 * A draft of the marker list is edited in place — kind, label, position,
 * length or size, orientation, line style, stroke, printed and preview
 * switches — with add, move up/down and delete; the validation of the
 * would-be profile is shown while typing, and "Save marks" hands the list to
 * the service once. Every number is millimetres, because that is what a
 * ruler reads on the printed sheet.
 */
const props = defineProps<{ profile: PrintProfile }>();
const emit = defineEmits<{ save: [markers: readonly PrintMarker[]] }>();
const { t } = useI18n();

const draft = ref<readonly PrintMarker[]>(props.profile.markers);
const newKind = ref<MarkerKind>('fold');
const LINE_STYLES: readonly MarkerLineStyle[] = ['solid', 'dashed', 'dotted'];

watch(
  () => props.profile,
  (profile) => {
    draft.value = profile.markers;
  },
);

const dirty = computed(() => draft.value !== props.profile.markers);

/** The profile as it would be stored, so the findings are the real ones. */
const wouldBe = computed<PrintProfile>(() => ({
  ...props.profile,
  markers: draft.value,
  capabilities: capabilitiesFor(props.profile, draft.value),
}));
const issues = computed<readonly ValidationIssue[]>(() =>
  services.printProfiles.validate(wouldBe.value),
);
const blocked = computed(() => issues.value.some((issue) => issue.severity === 'error'));
const full = computed(() => draft.value.length >= MARKERS_MAX);

function number(raw: string, fallback: number): number {
  const value = Number.parseFloat(raw.replace(',', '.'));
  return Number.isFinite(value) ? value : fallback;
}

function update(marker: PrintMarker, changes: Partial<PrintMarker>): void {
  draft.value = withMarker(draft.value, { ...marker, ...changes });
}

function setNumber(marker: PrintMarker, key: 'xMm' | 'yMm' | 'strokeWidthMm', raw: string): void {
  update(marker, { [key]: number(raw, marker[key]) });
}

function setLength(marker: PrintMarker, raw: string): void {
  draft.value = withMarker(draft.value, withLineLength(marker, number(raw, lineLength(marker))));
}

function setSize(marker: PrintMarker, key: 'widthMm' | 'heightMm', raw: string): void {
  update(marker, { [key]: number(raw, marker[key] ?? 0) });
}

function setOrientation(marker: PrintMarker, raw: string): void {
  const orientation = raw === 'vertical' ? 'vertical' : 'horizontal';
  draft.value = withMarker(draft.value, withOrientation(marker, orientation));
}

function setKind(marker: PrintMarker, raw: string): void {
  const kind = EDITABLE_MARKER_KINDS.find((candidate) => candidate === raw);
  if (!kind || kind === marker.kind) return;
  // A line becoming a region needs a height; a region becoming a line keeps its length.
  if (isRegionKind(kind) && !isRegionKind(marker.kind)) {
    const length = lineLength(marker);
    update(marker, { kind, widthMm: length, heightMm: length, orientation: 'horizontal' });
  } else if (!isRegionKind(kind) && isRegionKind(marker.kind)) {
    update(marker, { kind, heightMm: undefined, orientation: 'horizontal' });
  } else {
    update(marker, { kind });
  }
}

function add(): void {
  if (full.value) return;
  draft.value = [...draft.value, newMarker(draft.value, newKind.value, props.profile.page)];
}

function remove(marker: PrintMarker): void {
  draft.value = withoutMarker(draft.value, marker.id);
}

function move(marker: PrintMarker, direction: -1 | 1): void {
  draft.value = moveMarker(draft.value, marker.id, direction);
}

function discard(): void {
  draft.value = props.profile.markers;
}

function save(): void {
  if (blocked.value || !dirty.value) return;
  emit('save', draft.value);
}
</script>

<template>
  <div class="marker-editor" data-testid="marker-editor">
    <p class="profile-note">{{ t('profiles.markerEditor.hint') }}</p>

    <ol v-if="draft.length" class="marker-editor-list">
      <li
        v-for="(marker, index) in draft"
        :key="marker.id"
        class="marker-editor-row"
        :data-testid="`marker-${marker.id}`"
      >
        <div class="marker-editor-head">
          <span class="marker-editor-index">{{ index + 1 }}</span>
          <label class="field">
            <span>{{ t('profiles.markerEditor.kind') }}</span>
            <select
              class="select select-bordered select-sm"
              :value="marker.kind"
              data-testid="marker-kind"
              @change="setKind(marker, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="kind in EDITABLE_MARKER_KINDS" :key="kind" :value="kind">
                {{ t(`marker.kind.${kind}`) }}
              </option>
            </select>
          </label>
          <label class="field marker-editor-label">
            <span>{{ t('profiles.markerEditor.label') }}</span>
            <input
              class="input input-bordered input-sm"
              type="text"
              maxlength="60"
              :value="marker.label ?? ''"
              data-testid="marker-label"
              @change="
                update(marker, {
                  label: ($event.target as HTMLInputElement).value.trim() || undefined,
                })
              "
            />
          </label>
          <span class="marker-editor-actions">
            <button
              type="button"
              class="btn btn-ghost btn-xs"
              :disabled="index === 0"
              :aria-label="t('profiles.markerEditor.moveUp')"
              :title="t('profiles.markerEditor.moveUp')"
              data-testid="marker-up"
              @click="move(marker, -1)"
            >
              <AppIcon name="chevron-up" size="sm" />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-xs"
              :disabled="index === draft.length - 1"
              :aria-label="t('profiles.markerEditor.moveDown')"
              :title="t('profiles.markerEditor.moveDown')"
              data-testid="marker-down"
              @click="move(marker, 1)"
            >
              <AppIcon name="chevron-down" size="sm" />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-xs"
              :aria-label="t('profiles.markerEditor.remove')"
              :title="t('profiles.markerEditor.remove')"
              data-testid="marker-remove"
              @click="remove(marker)"
            >
              <AppIcon name="delete" size="sm" />
            </button>
          </span>
        </div>

        <div class="marker-editor-geometry">
          <label class="field">
            <span>x (mm)</span>
            <input
              class="input input-bordered input-sm"
              type="number"
              step="0.5"
              inputmode="decimal"
              :value="roundMm(marker.xMm)"
              data-testid="marker-x"
              @change="setNumber(marker, 'xMm', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="field">
            <span>y (mm)</span>
            <input
              class="input input-bordered input-sm"
              type="number"
              step="0.5"
              inputmode="decimal"
              :value="roundMm(marker.yMm)"
              data-testid="marker-y"
              @change="setNumber(marker, 'yMm', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <template v-if="isRegionKind(marker.kind)">
            <label class="field">
              <span>{{ t('profiles.markerEditor.width') }}</span>
              <input
                class="input input-bordered input-sm"
                type="number"
                min="0"
                step="0.5"
                inputmode="decimal"
                :value="roundMm(marker.widthMm ?? 0)"
                data-testid="marker-width"
                @change="setSize(marker, 'widthMm', ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label class="field">
              <span>{{ t('profiles.markerEditor.height') }}</span>
              <input
                class="input input-bordered input-sm"
                type="number"
                min="0"
                step="0.5"
                inputmode="decimal"
                :value="roundMm(marker.heightMm ?? 0)"
                data-testid="marker-height"
                @change="setSize(marker, 'heightMm', ($event.target as HTMLInputElement).value)"
              />
            </label>
          </template>
          <template v-else>
            <label class="field">
              <span>{{ t('profiles.markerEditor.length') }}</span>
              <input
                class="input input-bordered input-sm"
                type="number"
                min="0"
                step="0.5"
                inputmode="decimal"
                :value="roundMm(lineLength(marker))"
                data-testid="marker-length"
                @change="setLength(marker, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label class="field">
              <span>{{ t('profiles.markerEditor.orientation') }}</span>
              <select
                class="select select-bordered select-sm"
                :value="marker.orientation"
                data-testid="marker-orientation"
                @change="setOrientation(marker, ($event.target as HTMLSelectElement).value)"
              >
                <option value="horizontal">{{ t('profiles.markerEditor.horizontal') }}</option>
                <option value="vertical">{{ t('profiles.markerEditor.vertical') }}</option>
              </select>
            </label>
          </template>
          <label class="field">
            <span>{{ t('profiles.markerEditor.lineStyle') }}</span>
            <select
              class="select select-bordered select-sm"
              :value="marker.lineStyle"
              data-testid="marker-line-style"
              @change="
                update(marker, {
                  lineStyle: ($event.target as HTMLSelectElement).value as MarkerLineStyle,
                })
              "
            >
              <option v-for="style in LINE_STYLES" :key="style" :value="style">
                {{ t(`profiles.markerEditor.lineStyles.${style}`) }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>{{ t('profiles.markerEditor.stroke') }}</span>
            <input
              class="input input-bordered input-sm"
              type="number"
              min="0.05"
              max="5"
              step="0.05"
              inputmode="decimal"
              :value="marker.strokeWidthMm"
              data-testid="marker-stroke"
              @change="
                setNumber(marker, 'strokeWidthMm', ($event.target as HTMLInputElement).value)
              "
            />
          </label>
        </div>

        <div class="marker-editor-flags">
          <label class="field-inline">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              :checked="marker.print"
              data-testid="marker-print"
              @change="update(marker, { print: ($event.target as HTMLInputElement).checked })"
            />
            <span>{{ t('profiles.markerEditor.print') }}</span>
          </label>
          <label class="field-inline">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              :checked="marker.preview"
              data-testid="marker-preview"
              @change="update(marker, { preview: ($event.target as HTMLInputElement).checked })"
            />
            <span>{{ t('profiles.markerEditor.preview') }}</span>
          </label>
          <label v-if="profile.duplex" class="field-inline">
            <span>{{ t('profiles.markerEditor.surface') }}</span>
            <select
              class="select select-bordered select-sm"
              :value="marker.surface"
              data-testid="marker-surface"
              @change="
                update(marker, {
                  surface: ($event.target as HTMLSelectElement).value as PrintMarker['surface'],
                })
              "
            >
              <option value="all">{{ t('profiles.markerEditor.surfaces.all') }}</option>
              <option value="front">{{ t('profiles.markerEditor.surfaces.front') }}</option>
              <option value="back">{{ t('profiles.markerEditor.surfaces.back') }}</option>
            </select>
          </label>
        </div>
      </li>
    </ol>
    <p v-else class="empty-state">{{ t('profiles.markerEditor.empty') }}</p>

    <div class="marker-editor-add">
      <label class="field">
        <span>{{ t('profiles.markerEditor.newKind') }}</span>
        <select
          v-model="newKind"
          class="select select-bordered select-sm"
          data-testid="marker-new-kind"
        >
          <option v-for="kind in EDITABLE_MARKER_KINDS" :key="kind" :value="kind">
            {{ t(`marker.kind.${kind}`) }}
          </option>
        </select>
      </label>
      <button
        type="button"
        class="btn btn-outline btn-sm"
        :disabled="full"
        data-testid="marker-add"
        @click="add"
      >
        {{ t('profiles.markerEditor.add') }}
      </button>
    </div>

    <ul
      v-if="issues.length"
      class="validation-list marker-editor-issues"
      data-testid="marker-issues"
    >
      <li
        v-for="issue in issues"
        :key="`${issue.code}-${issue.path}`"
        :class="`issue-${issue.severity}`"
      >
        <span class="issue-severity">{{ t(`validation.severity.${issue.severity}`) }}</span>
        <span class="issue-message">{{ t(`validation.${issue.code}`, issue.params ?? {}) }}</span>
      </li>
    </ul>

    <div class="profile-actions">
      <button
        type="button"
        class="btn btn-primary btn-sm"
        :disabled="!dirty || blocked"
        data-testid="marker-save"
        @click="save"
      >
        {{ t('profiles.markerEditor.save') }}
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        :disabled="!dirty"
        data-testid="marker-discard"
        @click="discard"
      >
        {{ t('profiles.markerEditor.discard') }}
      </button>
    </div>
  </div>
</template>
