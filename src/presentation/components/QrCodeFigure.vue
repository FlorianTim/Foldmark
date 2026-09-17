<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ImageAlignment } from '@/domain/markdown/directives';
import {
  encodeQrMatrix,
  qrModulePath,
  qrViewBoxSize,
  type QrErrorCorrection,
} from '@/domain/qr/qrCode';

/**
 * A QR code as drawn on screen and on paper (change 0040): the payload is
 * encoded here, at render time, and drawn as one SVG path in a box of the
 * requested millimetres. The path string comes from the encoder and holds
 * digits and four letters; the payload itself appears only in the
 * accessible name. Black on white regardless of the theme — a scanner needs
 * the contrast, and the sheet is white anyway.
 */
const props = defineProps<{
  payload: string;
  sizeMm: number;
  align: ImageAlignment;
  errorCorrection: QrErrorCorrection;
}>();
const { t } = useI18n();

const matrix = computed(() => encodeQrMatrix(props.payload, props.errorCorrection));
const side = computed(() => (matrix.value ? qrViewBoxSize(matrix.value) : 0));
const path = computed(() => (matrix.value ? qrModulePath(matrix.value) : ''));
const size = computed(() => `${props.sizeMm}mm`);
const classes = computed(() => ['md-qr', `md-qr-align-${props.align}`]);
</script>

<template>
  <svg
    v-if="matrix"
    :class="classes"
    :viewBox="`0 0 ${side} ${side}`"
    :width="size"
    :height="size"
    shape-rendering="crispEdges"
    role="img"
    :aria-label="`${t('render.qrCode')}: ${payload}`"
    :data-qr-payload="payload"
    :data-size="sizeMm"
  >
    <rect :width="side" :height="side" fill="#fff" />
    <path :d="path" fill="#000" />
  </svg>
  <span v-else :class="[...classes, 'md-qr-missing']" role="img" :aria-label="t('editor.qrEmpty')">
    {{ t('editor.qrEmpty') }}
  </span>
</template>
