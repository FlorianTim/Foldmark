<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SurfaceContent } from '@/domain/document/FoldmarkDocument';
import { useWorkspaceStore } from '@/presentation/stores/workspaceStore';
import MarkdownEditor from '@/presentation/components/foldmark/MarkdownEditor.vue';

/**
 * Editing a two-sided piece: postcard, card, photo card.
 *
 * A postcard is not a short letter. Its two sides carry different things — an
 * image and a caption on the front, a message and a postal address on the back
 * — and the editor mirrors that rather than pretending there is one body with
 * options. Switching sides here also moves the preview, so the pane and the
 * paper always show the same face.
 *
 * The message lives in `surfaces.back.text` rather than in the document body.
 * The body is what a letter renders; keeping the postcard message separate is
 * what lets the same document be flipped to a letter profile without its text
 * appearing in two places.
 */
const workspace = useWorkspaceStore();
const { t } = useI18n();

const side = ref<'front' | 'back'>('front');

const document = computed(() => workspace.document);
const backgrounds = computed(() =>
  workspace.assets.filter((asset) => asset.kind === 'image' || asset.kind === 'background'),
);

const current = computed<SurfaceContent>(() => document.value?.surfaces[side.value] ?? {});

function patchSurface(changes: Partial<SurfaceContent>): void {
  if (!document.value) return;
  const next: SurfaceContent = { ...current.value, ...changes };
  const cleaned = Object.fromEntries(
    Object.entries(next).filter(([, value]) => value !== undefined && value !== ''),
  ) as SurfaceContent;
  workspace.patch({
    surfaces: { ...document.value.surfaces, [side.value]: cleaned },
  });
}

function selectSide(next: 'front' | 'back'): void {
  side.value = next;
  // The preview follows the editor: looking at the back while typing the front
  // is the fastest way to fill the wrong side of a card.
  workspace.selectSurface(next === 'front' ? 0 : 1);
}
</script>

<template>
  <div v-if="document" class="surface-editor">
    <div class="pane-tabs" role="tablist" :aria-label="t('surface.sides')">
      <button
        v-for="option in ['front', 'back'] as const"
        :key="option"
        type="button"
        role="tab"
        class="btn btn-sm"
        :class="side === option ? 'btn-primary' : 'btn-ghost'"
        :aria-selected="side === option"
        @click="selectSide(option)"
      >
        {{ t(`surface.${option}`) }}
      </button>
    </div>

    <template v-if="side === 'front'">
      <label class="field">
        <span>{{ t('surface.background') }}</span>
        <select
          class="select select-bordered"
          :value="current.backgroundAssetId ?? ''"
          @change="
            patchSurface({
              backgroundAssetId: ($event.target as HTMLSelectElement).value || undefined,
            })
          "
        >
          <option value="">{{ t('surface.noBackground') }}</option>
          <option v-for="asset in backgrounds" :key="asset.id" :value="asset.id">
            {{ asset.label ?? asset.sourceFilename ?? asset.id }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>{{ t('surface.caption') }}</span>
        <input
          class="input input-bordered"
          type="text"
          maxlength="300"
          :value="current.caption ?? ''"
          @input="patchSurface({ caption: ($event.target as HTMLInputElement).value })"
        />
      </label>

      <p v-if="backgrounds.length === 0" class="empty-state">{{ t('surface.noAssetsHint') }}</p>
    </template>

    <MarkdownEditor
      v-else
      :model-value="current.text ?? ''"
      :label="t('surface.messageLabel')"
      own-toolbar
      @update:model-value="patchSurface({ text: $event })"
    />
  </div>
</template>
