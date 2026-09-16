<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { IMAGE_ALIGNMENTS, type ImageAlignment } from '@/domain/markdown/directives';
import { services } from '@/app/compositionRoot';
import { AssetRejectedError } from '@/application/errors/FoldmarkErrors';
import {
  ALLOWED_ASSET_MIME_TYPES,
  ASSET_MAX_BYTES,
  assetTitle,
  type DocumentAsset,
} from '@/domain/asset/DocumentAsset';
import AppDialog from '@/presentation/components/AppDialog.vue';
import AppIcon from '@/presentation/components/AppIcon.vue';
import { useAssetUrls } from '@/presentation/composables/useAssetUrls';
import { useWorkspaceStore } from '@/presentation/stores/workspaceStore';

/**
 * Inserting an image (R13-022, AC-ASSET-003): from the library, or a file
 * imported on the spot. The chosen asset is shown as a thumbnail with its
 * title, dimensions and size before anything is inserted, and the width on
 * paper is set in millimetres — the unit the render plan reasons in.
 *
 * Import goes through the same service as the library view, with the same
 * byte-sniffing rules; a rejection says which rule failed.
 */
const props = defineProps<{ open: boolean; assets: readonly DocumentAsset[] }>();
const emit = defineEmits<{
  close: [];
  insert: [
    image: {
      assetId: string;
      widthMm?: number;
      widthPercent?: number;
      align?: ImageAlignment;
      alt: string;
    },
  ];
}>();

const workspace = useWorkspaceStore();
const { t } = useI18n();

const tab = ref<'library' | 'import'>('library');
const picked = ref<string>('');
const widthMm = ref(60);
/** How the width is given (R14-015): millimetres, a share of the text width, or the full width. */
const widthMode = ref<'mm' | 'percent' | 'full'>('mm');
const widthPercent = ref(50);
const align = ref<ImageAlignment>('left');
const rejection = ref<string | null>(null);
const busy = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const images = computed(() =>
  props.assets.filter((asset) => asset.kind === 'image' || asset.kind === 'logo'),
);
const ids = computed(() => images.value.map((asset) => asset.id));
const urls = useAssetUrls(ids);
const chosen = computed(() => images.value.find((asset) => asset.id === picked.value) ?? null);

const acceptTypes = ALLOWED_ASSET_MIME_TYPES.join(',');
const maxMegabytes = Math.round(ASSET_MAX_BYTES / (1024 * 1024));

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    rejection.value = null;
    tab.value = images.value.length ? 'library' : 'import';
    if (!chosen.value) picked.value = images.value[0]?.id ?? '';
  },
);

async function onFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  busy.value = true;
  rejection.value = null;
  try {
    const asset = await services.assets.import(file, { kind: 'image', filename: file.name });
    await workspace.refreshAssets();
    picked.value = asset.id;
    tab.value = 'library';
  } catch (error) {
    rejection.value =
      error instanceof AssetRejectedError
        ? `assets.rejected.${error.params?.reason ?? 'unknown'}`
        : 'errors.unexpected';
  } finally {
    busy.value = false;
  }
}

function fileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} kB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function insert(): void {
  const asset = chosen.value;
  if (!asset) return;
  emit('insert', {
    assetId: asset.id,
    ...(widthMode.value === 'mm'
      ? { widthMm: Math.min(Math.max(Math.round(widthMm.value), 5), 400) }
      : widthMode.value === 'percent'
        ? { widthPercent: Math.min(Math.max(Math.round(widthPercent.value), 1), 100) }
        : { widthPercent: 100 }),
    ...(align.value !== 'left' ? { align: align.value } : {}),
    alt: assetTitle(asset),
  });
  emit('close');
}
</script>

<template>
  <AppDialog :open="open" :title="t('editor.imageTitle')" size="lg" @close="emit('close')">
    <div class="image-tabs" role="tablist" :aria-label="t('editor.imageSource')">
      <button
        type="button"
        role="tab"
        class="btn btn-sm"
        :class="tab === 'library' ? 'btn-primary' : 'btn-ghost'"
        :aria-selected="tab === 'library'"
        @click="tab = 'library'"
      >
        <AppIcon name="images" size="sm" />
        <span>{{ t('editor.imageFromLibrary') }}</span>
      </button>
      <button
        type="button"
        role="tab"
        class="btn btn-sm"
        :class="tab === 'import' ? 'btn-primary' : 'btn-ghost'"
        :aria-selected="tab === 'import'"
        @click="tab = 'import'"
      >
        <AppIcon name="import" size="sm" />
        <span>{{ t('editor.imageImport') }}</span>
      </button>
    </div>

    <div v-if="tab === 'library'" class="image-library">
      <p v-if="images.length === 0" class="empty-state">{{ t('editor.imageNone') }}</p>
      <ul v-else class="image-choices" role="listbox" :aria-label="t('editor.imagePick')">
        <li v-for="asset in images" :key="asset.id">
          <button
            type="button"
            class="image-choice"
            :class="{ 'is-active': picked === asset.id }"
            role="option"
            :aria-selected="picked === asset.id"
            :data-asset-id="asset.id"
            @click="picked = asset.id"
          >
            <img class="image-choice-thumb" :src="urls[asset.id] ?? ''" alt="" />
            <span class="image-choice-title">{{ assetTitle(asset) }}</span>
          </button>
        </li>
      </ul>
    </div>

    <div v-else class="image-import">
      <p class="asset-rules">{{ t('assets.rules', { max: maxMegabytes }) }}</p>
      <button class="btn btn-outline" type="button" :disabled="busy" @click="fileInput?.click()">
        <AppIcon name="import" />
        <span>{{ t('assets.import') }}</span>
      </button>
      <input
        ref="fileInput"
        class="sr-only"
        type="file"
        :accept="acceptTypes"
        :aria-label="t('assets.import')"
        @change="onFileSelected"
      />
      <p v-if="rejection" class="alert alert-error" role="alert">{{ t(rejection) }}</p>
    </div>

    <div v-if="chosen" class="image-preview" data-testid="image-preview">
      <img class="image-preview-thumb" :src="urls[chosen.id] ?? ''" :alt="assetTitle(chosen)" />
      <dl class="image-facts">
        <dt>{{ t('assets.field.title') }}</dt>
        <dd>{{ assetTitle(chosen) }}</dd>
        <dt>{{ t('assets.field.dimensions') }}</dt>
        <dd>{{ chosen.widthPx }} × {{ chosen.heightPx }} px</dd>
        <dt>{{ t('assets.field.size') }}</dt>
        <dd>{{ fileSize(chosen.byteSize) }}</dd>
        <template v-if="chosen.description">
          <dt>{{ t('assets.field.description') }}</dt>
          <dd>{{ chosen.description }}</dd>
        </template>
      </dl>
      <fieldset class="field-radios image-layout-fields">
        <legend class="field-legend">{{ t('editor.imageSize') }}</legend>
        <label class="field-inline">
          <input v-model="widthMode" type="radio" class="radio radio-sm" value="mm" />
          <span>{{ t('editor.imageWidthMm') }}</span>
          <input
            v-model.number="widthMm"
            class="input input-bordered input-sm image-width"
            type="number"
            min="5"
            max="400"
            step="1"
            :disabled="widthMode !== 'mm'"
            data-testid="image-width"
          />
        </label>
        <label class="field-inline">
          <input v-model="widthMode" type="radio" class="radio radio-sm" value="percent" />
          <span>{{ t('editor.imageWidthPercent') }}</span>
          <input
            v-model.number="widthPercent"
            class="input input-bordered input-sm image-width"
            type="number"
            min="1"
            max="100"
            step="1"
            :disabled="widthMode !== 'percent'"
            data-testid="image-width-percent"
          />
        </label>
        <label class="field-inline">
          <input
            v-model="widthMode"
            type="radio"
            class="radio radio-sm"
            value="full"
            data-testid="image-width-full"
          />
          <span>{{ t('editor.imageSizeFull') }}</span>
        </label>
      </fieldset>
      <fieldset class="field-radios">
        <legend class="field-legend">{{ t('editor.imageLayout') }}</legend>
        <label v-for="option in IMAGE_ALIGNMENTS" :key="option" class="field-inline">
          <input
            v-model="align"
            type="radio"
            class="radio radio-sm"
            :value="option"
            :data-testid="`image-dialog-align-${option}`"
          />
          <span>{{ t(`editor.imageAlign.${option}`) }}</span>
        </label>
      </fieldset>
    </div>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">
        {{ t('dialog.cancel') }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="!chosen"
        data-testid="image-insert"
        @click="insert"
      >
        <AppIcon name="image" />
        <span>{{ t('editor.imageInsert') }}</span>
      </button>
    </template>
  </AppDialog>
</template>
