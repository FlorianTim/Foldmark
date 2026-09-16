<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

/**
 * A small non-modal panel anchored below a toolbar button (change 0022):
 * colour swatches, the table size grid, a date field. Escape and a click
 * outside close it and hand focus back to the button that opened it; while
 * open, the first focusable control inside gets the focus so keyboard users
 * do not have to hunt for it.
 *
 * Positioned by the parent's flow (`position: absolute` under a relative
 * group) rather than the `popover` attribute: anchor positioning is not in
 * every browser yet, and a `top-layer` panel would escape the workspace's
 * scrolling pane.
 */
const props = defineProps<{ open: boolean; label: string }>();
const emit = defineEmits<{ close: [] }>();

const panel = ref<HTMLElement | null>(null);
let opener: Element | null = null;

function onDocumentPointerDown(event: Event): void {
  const target = event.target as Node;
  if (panel.value && !panel.value.contains(target) && !opener?.contains(target)) emit('close');
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation();
    emit('close');
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      opener = globalThis.document.activeElement;
      globalThis.document.addEventListener('pointerdown', onDocumentPointerDown);
      await nextTick();
      panel.value?.querySelector<HTMLElement>('button, input, select, [tabindex="0"]')?.focus();
    } else {
      globalThis.document.removeEventListener('pointerdown', onDocumentPointerDown);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
      opener = null;
    }
  },
);

onBeforeUnmount(() =>
  globalThis.document.removeEventListener('pointerdown', onDocumentPointerDown),
);
</script>

<template>
  <div
    v-if="open"
    ref="panel"
    class="app-popover"
    role="dialog"
    :aria-label="label"
    @keydown="onKeydown"
  >
    <slot />
  </div>
</template>
