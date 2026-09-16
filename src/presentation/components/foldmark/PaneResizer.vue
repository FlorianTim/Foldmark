<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

/**
 * The splitter between two workspace panes (R13-014).
 *
 * A pointer drag reports the horizontal delta since the last event; the
 * parent turns it into pane fractions and clamps them. Keyboard users get
 * the same through the WAI-ARIA window-splitter pattern: a focusable
 * `separator` that moves 16 px per arrow key, and Home/End that give the
 * left or the right pane everything the minimums allow. A double click
 * restores the default proportions.
 */
const props = defineProps<{
  /** Accessible name: which two panes the splitter sits between. */
  label: string;
  /** Current position as a percentage of the pair, for `aria-valuenow`. */
  valueNow: number;
}>();
const emit = defineEmits<{
  resize: [deltaPx: number];
  reset: [];
  edge: [side: 'left' | 'right'];
}>();

const { t } = useI18n();
const dragging = ref(false);
let lastX = 0;

/** One arrow key moves this far. */
const KEY_STEP_PX = 16;

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;
  const handle = event.currentTarget as HTMLElement;
  handle.setPointerCapture(event.pointerId);
  dragging.value = true;
  lastX = event.clientX;
  event.preventDefault();
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) return;
  const delta = event.clientX - lastX;
  if (delta === 0) return;
  lastX = event.clientX;
  emit('resize', delta);
}

function onPointerUp(event: PointerEvent): void {
  if (!dragging.value) return;
  dragging.value = false;
  (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
}

function onKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowLeft':
      emit('resize', -KEY_STEP_PX);
      break;
    case 'ArrowRight':
      emit('resize', KEY_STEP_PX);
      break;
    case 'Home':
      emit('edge', 'left');
      break;
    case 'End':
      emit('edge', 'right');
      break;
    case 'Enter':
      emit('reset');
      break;
    default:
      return;
  }
  event.preventDefault();
}
</script>

<template>
  <div
    class="pane-resizer"
    :class="{ 'is-dragging': dragging }"
    role="separator"
    tabindex="0"
    aria-orientation="vertical"
    :aria-label="label"
    :aria-valuenow="Math.round(props.valueNow)"
    aria-valuemin="0"
    aria-valuemax="100"
    :title="t('workspace.resizerHint')"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @dblclick="emit('reset')"
    @keydown="onKeydown"
  >
    <span class="pane-resizer-grip" aria-hidden="true" />
  </div>
</template>
