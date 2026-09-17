<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ASSET_TITLE_MAX_LENGTH } from '@/domain/asset/DocumentAsset';
import {
  appendPoint,
  hasInk,
  SIGNATURE_MAX_STROKES,
  type Stroke,
  type StrokePoint,
} from '@/domain/asset/signatureStrokes';
import AppDialog from '@/presentation/components/AppDialog.vue';
import AppIcon from '@/presentation/components/AppIcon.vue';
import { drawStrokes, rasterizeSignature } from '@/presentation/signatureRaster';

/**
 * Drawing a signature (change 0046, R02-003): a pad that takes a pen, a
 * finger or a mouse through pointer events, keeps the strokes as geometry
 * (undo is "drop the last stroke"), and hands a cropped, scaled PNG to the
 * caller on Save. Nothing is stored here; the library panel imports the blob
 * through the same rules as a file, so a drawn signature is a signature asset
 * like any other.
 */
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  close: [];
  save: [payload: { blob: Blob; title: string }];
}>();
const { t } = useI18n();

/** The pad's size in CSS pixels; the canvas backs it at the device pixel ratio. */
const PAD_WIDTH = 640;
const PAD_HEIGHT = 220;

const canvas = ref<HTMLCanvasElement | null>(null);
const strokes = ref<readonly Stroke[]>([]);
const current = ref<Stroke | null>(null);
const title = ref('');
const saving = ref(false);
const failure = ref<string | null>(null);

const inked = computed(() => hasInk(strokes.value) || (current.value?.length ?? 0) > 0);

function redraw(): void {
  const element = canvas.value;
  const context = element?.getContext('2d');
  if (!element || !context) return;
  const ratio = globalThis.devicePixelRatio || 1;
  if (element.width !== PAD_WIDTH * ratio || element.height !== PAD_HEIGHT * ratio) {
    element.width = PAD_WIDTH * ratio;
    element.height = PAD_HEIGHT * ratio;
  }
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, element.width, element.height);
  // The signature line the person writes on; it is not part of the image.
  context.save();
  context.scale(ratio, ratio);
  context.strokeStyle = 'rgba(120, 120, 120, 0.5)';
  context.lineWidth = 1;
  context.setLineDash([4, 4]);
  context.beginPath();
  context.moveTo(24, PAD_HEIGHT - 48);
  context.lineTo(PAD_WIDTH - 24, PAD_HEIGHT - 48);
  context.stroke();
  context.restore();
  const all = current.value ? [...strokes.value, current.value] : strokes.value;
  drawStrokes(context, all, { scale: ratio, color: '#111' });
}

function padPoint(event: PointerEvent): StrokePoint {
  const rect = canvas.value!.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * PAD_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * PAD_HEIGHT,
  };
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0 && event.pointerType === 'mouse') return;
  if (strokes.value.length >= SIGNATURE_MAX_STROKES) return;
  event.preventDefault();
  canvas.value?.setPointerCapture(event.pointerId);
  current.value = [padPoint(event)];
  failure.value = null;
  redraw();
}

function onPointerMove(event: PointerEvent): void {
  if (!current.value) return;
  event.preventDefault();
  // Coalesced events carry the samples between two frames; a fast pen
  // otherwise turns into straight lines.
  const samples =
    typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [event];
  let stroke = current.value;
  for (const sample of samples.length ? samples : [event]) {
    stroke = appendPoint(stroke, padPoint(sample));
  }
  current.value = stroke;
  redraw();
}

function onPointerUp(event: PointerEvent): void {
  if (!current.value) return;
  event.preventDefault();
  if (canvas.value?.hasPointerCapture(event.pointerId)) {
    canvas.value.releasePointerCapture(event.pointerId);
  }
  strokes.value = [...strokes.value, current.value];
  current.value = null;
  redraw();
}

function undo(): void {
  strokes.value = strokes.value.slice(0, -1);
  redraw();
}

function clear(): void {
  strokes.value = [];
  current.value = null;
  redraw();
}

async function save(): Promise<void> {
  if (!inked.value || saving.value) return;
  saving.value = true;
  failure.value = null;
  try {
    const raster = await rasterizeSignature(strokes.value);
    if (!raster) {
      failure.value = 'assets.signaturePad.notEncodable';
      return;
    }
    emit('save', {
      blob: raster.blob,
      title:
        title.value.trim().slice(0, ASSET_TITLE_MAX_LENGTH) ||
        t('assets.signaturePad.defaultTitle'),
    });
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    strokes.value = [];
    current.value = null;
    title.value = '';
    failure.value = null;
    void nextTick(redraw);
  },
);

function onResize(): void {
  if (props.open) redraw();
}
globalThis.addEventListener('resize', onResize);
onBeforeUnmount(() => globalThis.removeEventListener('resize', onResize));
</script>

<template>
  <AppDialog
    :open="open"
    :title="t('assets.signaturePad.title')"
    size="lg"
    dialog-class="signature-dialog"
    @close="emit('close')"
  >
    <p class="signature-hint">{{ t('assets.signaturePad.hint') }}</p>
    <div class="signature-pad-frame">
      <canvas
        ref="canvas"
        class="signature-pad"
        :style="{ aspectRatio: `${PAD_WIDTH} / ${PAD_HEIGHT}` }"
        role="img"
        :aria-label="t('assets.signaturePad.padLabel')"
        data-testid="signature-pad"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      />
    </div>
    <div class="signature-tools">
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        :disabled="strokes.length === 0"
        data-testid="signature-undo"
        @click="undo"
      >
        <AppIcon name="undo" />
        <span>{{ t('assets.signaturePad.undo') }}</span>
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        :disabled="!inked"
        data-testid="signature-clear"
        @click="clear"
      >
        <AppIcon name="delete" />
        <span>{{ t('assets.signaturePad.clear') }}</span>
      </button>
    </div>
    <label class="field">
      <span>{{ t('assets.signaturePad.name') }}</span>
      <input
        v-model="title"
        class="input input-bordered"
        type="text"
        :maxlength="ASSET_TITLE_MAX_LENGTH"
        :placeholder="t('assets.signaturePad.defaultTitle')"
        data-testid="signature-title"
      />
    </label>
    <p v-if="failure" class="alert alert-error" role="alert">{{ t(failure) }}</p>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">
        {{ t('dialog.cancel') }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="!inked || saving"
        data-testid="signature-save"
        @click="save"
      >
        {{ t('assets.signaturePad.save') }}
      </button>
    </template>
  </AppDialog>
</template>
