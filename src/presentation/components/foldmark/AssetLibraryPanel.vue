<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import { AssetRejectedError } from '@/application/errors/FoldmarkErrors';
import {
  ALLOWED_ASSET_MIME_TYPES,
  ASSET_DESCRIPTION_MAX_LENGTH,
  ASSET_KINDS,
  ASSET_MAX_BYTES,
  ASSET_TITLE_MAX_LENGTH,
  assetTitle,
  intrinsicSizeMm,
  type AssetKind,
  type DocumentAsset,
} from '@/domain/asset/DocumentAsset';
import { roundMm } from '@/domain/common/Units';
import ConfirmDialog from '@/presentation/components/ConfirmDialog.vue';
import { useAssetUrls } from '@/presentation/composables/useAssetUrls';
import { useLibraryStore } from '@/presentation/stores/libraryStore';

/**
 * Locally stored artwork: logos, photographs, letterheads, signatures and,
 * prepared for later, QR codes.
 *
 * Nothing leaves the browser and nothing is fetched. Files are validated before
 * they are stored — type sniffed from the bytes, dimensions read from the
 * decoded image — and a rejection says which rule it failed, because "could not
 * import" tells a user nothing they can act on.
 *
 * Each card carries the metadata a person maintains — title, description,
 * kind — editable in place (R13-030), and the facts the file brought with it:
 * filename, type, dimensions, size, import date. The title is independent of
 * the filename, so "IMG_2041.jpg" can be called "Logo blau".
 *
 * Deleting shows **what would break first**. An asset used by three documents
 * is a decision, not an accident, and a background that disappears is otherwise
 * discovered at the printer.
 */
const library = useLibraryStore();
const { t, locale } = useI18n();

const kind = ref<AssetKind>('image');
const fileInput = ref<HTMLInputElement | null>(null);
const rejection = ref<string | null>(null);
const busy = ref(false);
const pendingDelete = ref<{ asset: DocumentAsset; usedBy: readonly string[] } | null>(null);
/** Titles and descriptions as typed, per asset, until they are committed. */
const drafts = ref<Record<string, { title: string; description: string }>>({});

const assetIds = computed(() => library.assets.map((asset) => asset.id));
const previews = useAssetUrls(assetIds);

const acceptTypes = ALLOWED_ASSET_MIME_TYPES.join(',');
const maxMegabytes = Math.round(ASSET_MAX_BYTES / (1024 * 1024));

onMounted(() => void library.loadAll());

async function onFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  busy.value = true;
  rejection.value = null;
  try {
    await services.assets.import(file, { kind: kind.value, filename: file.name });
    await library.refreshAssets();
  } catch (error) {
    rejection.value =
      error instanceof AssetRejectedError
        ? `assets.rejected.${error.params?.reason ?? 'unknown'}`
        : 'errors.unexpected';
  } finally {
    busy.value = false;
  }
}

function draftOf(asset: DocumentAsset): { title: string; description: string } {
  return (drafts.value[asset.id] ??= {
    title: asset.title ?? asset.label ?? '',
    description: asset.description ?? '',
  });
}

/** Writes a changed title, description or kind; an unchanged value is not a write. */
async function commit(
  asset: DocumentAsset,
  changes: { title?: string; description?: string; kind?: AssetKind },
): Promise<void> {
  const next = {
    title: changes.title === undefined ? undefined : changes.title.trim() || undefined,
    description:
      changes.description === undefined ? undefined : changes.description.trim() || undefined,
    kind: changes.kind,
  };
  const unchanged =
    (next.title === undefined || next.title === (asset.title ?? asset.label)) &&
    (next.description === undefined || next.description === asset.description) &&
    (next.kind === undefined || next.kind === asset.kind);
  if (unchanged) return;
  await library.run(
    () =>
      services.assets.updateMetadata(asset.id, {
        ...(changes.title !== undefined ? { title: next.title ?? '' } : {}),
        ...(changes.description !== undefined ? { description: next.description ?? '' } : {}),
        ...(next.kind ? { kind: next.kind } : {}),
      }),
    'errors.invalidInput',
  );
  // The draft is dropped only once the fresh record is in the store, so the
  // re-render in between cannot seed a new draft from the stale one.
  await library.refreshAssets();
  delete drafts.value[asset.id];
}

async function askDelete(asset: DocumentAsset): Promise<void> {
  const documents = await services.assets.usage(asset.id);
  pendingDelete.value = { asset, usedBy: documents.map((document) => document.title) };
}

async function confirmDelete(): Promise<void> {
  const pending = pendingDelete.value;
  if (!pending) return;
  await library.run(() => services.assets.remove(pending.asset.id), 'errors.notFound');
  pendingDelete.value = null;
  await library.refreshAssets();
}

function physicalSize(asset: DocumentAsset): string {
  const size = intrinsicSizeMm(asset);
  return `${roundMm(size.widthMm)} × ${roundMm(size.heightMm)} mm @ 300 dpi`;
}

/** The decoded pixel dimensions, as one string so the card stays one line. */
function pixelSize(asset: DocumentAsset): string {
  return `${asset.widthPx} × ${asset.heightPx} px`;
}

function fileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} kB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function importedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}
</script>

<template>
  <section class="panel" aria-labelledby="assets-title">
    <div class="section-heading">
      <div>
        <p class="eyebrow">{{ t('assets.eyebrow') }}</p>
        <h1 id="assets-title">{{ t('assets.title') }}</h1>
        <p>{{ t('assets.description') }}</p>
      </div>
      <span class="badge badge-outline">{{
        t('assets.count', { count: library.assets.length })
      }}</span>
    </div>

    <div class="asset-import">
      <label class="field">
        <span>{{ t('assets.kind') }}</span>
        <select v-model="kind" class="select select-bordered">
          <option v-for="option in ASSET_KINDS" :key="option" :value="option">
            {{ t(`assets.kindName.${option}`) }}
          </option>
        </select>
      </label>

      <button class="btn btn-primary" type="button" :disabled="busy" @click="fileInput?.click()">
        {{ t('assets.import') }}
      </button>
      <input
        ref="fileInput"
        class="sr-only"
        type="file"
        :accept="acceptTypes"
        :aria-label="t('assets.import')"
        @change="onFileSelected"
      />
      <p class="asset-rules">{{ t('assets.rules', { max: maxMegabytes }) }}</p>
    </div>

    <p v-if="rejection" class="alert alert-error" role="alert">{{ t(rejection) }}</p>
    <p v-if="library.error" class="alert alert-error" role="alert">{{ t(library.error) }}</p>
    <p class="asset-signature-note">{{ t('assets.signatureNote') }}</p>

    <p v-if="library.assets.length === 0" class="empty-state">{{ t('assets.empty') }}</p>
    <ul v-else class="asset-grid">
      <li
        v-for="asset in library.assets"
        :key="asset.id"
        class="asset-card"
        :data-testid="`asset-${asset.id}`"
      >
        <img class="asset-thumb" :src="previews[asset.id] ?? ''" :alt="assetTitle(asset)" />
        <div class="asset-body">
          <label class="field">
            <span class="sr-only">{{ t('assets.field.title') }}</span>
            <input
              v-model="draftOf(asset).title"
              class="input input-bordered input-sm asset-title"
              type="text"
              :maxlength="ASSET_TITLE_MAX_LENGTH"
              :placeholder="asset.sourceFilename ?? t('assets.field.title')"
              :aria-label="t('assets.field.title')"
              data-testid="asset-title"
              @change="commit(asset, { title: draftOf(asset).title })"
            />
          </label>
          <label class="field">
            <span class="sr-only">{{ t('assets.field.description') }}</span>
            <textarea
              v-model="draftOf(asset).description"
              class="textarea textarea-bordered textarea-sm"
              rows="2"
              :maxlength="ASSET_DESCRIPTION_MAX_LENGTH"
              :placeholder="t('assets.field.description')"
              :aria-label="t('assets.field.description')"
              @change="commit(asset, { description: draftOf(asset).description })"
            />
          </label>
          <label class="field">
            <span class="sr-only">{{ t('assets.kind') }}</span>
            <select
              class="select select-bordered select-sm"
              :value="asset.kind"
              :aria-label="t('assets.kind')"
              @change="
                commit(asset, { kind: ($event.target as HTMLSelectElement).value as AssetKind })
              "
            >
              <option v-for="option in ASSET_KINDS" :key="option" :value="option">
                {{ t(`assets.kindName.${option}`) }}
              </option>
            </select>
          </label>
          <dl class="asset-facts">
            <dt>{{ t('assets.field.filename') }}</dt>
            <dd>{{ asset.sourceFilename ?? '—' }}</dd>
            <dt>{{ t('assets.field.mimeType') }}</dt>
            <dd>{{ asset.mimeType }}</dd>
            <dt>{{ t('assets.field.dimensions') }}</dt>
            <dd>{{ pixelSize(asset) }} · {{ physicalSize(asset) }}</dd>
            <dt>{{ t('assets.field.size') }}</dt>
            <dd>{{ fileSize(asset.byteSize) }}</dd>
            <dt>{{ t('assets.field.created') }}</dt>
            <dd>{{ importedAt(asset.createdAt) }}</dd>
          </dl>
          <button
            class="btn btn-ghost btn-sm text-error asset-delete"
            type="button"
            @click="askDelete(asset)"
          >
            {{ t('assets.delete') }}
          </button>
        </div>
      </li>
    </ul>

    <ConfirmDialog
      :open="pendingDelete !== null"
      :title="t('assets.deleteTitle')"
      :text="
        pendingDelete?.usedBy.length
          ? t('assets.deleteInUse', { count: pendingDelete.usedBy.length })
          : t('assets.deleteUnused')
      "
      :confirm-label="t('assets.confirmDelete')"
      danger
      @close="pendingDelete = null"
      @confirm="confirmDelete"
    >
      <ul v-if="pendingDelete?.usedBy.length" class="usage-list">
        <li v-for="title in pendingDelete.usedBy" :key="title">{{ title }}</li>
      </ul>
    </ConfirmDialog>
  </section>
</template>
