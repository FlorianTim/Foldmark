<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '@/presentation/components/AppIcon.vue';

/**
 * The one dialog behaviour every Foldmark dialog shares (R13-011).
 *
 * A native `<dialog>` shown with `showModal()` already owns modality, focus
 * trapping and Escape; this wrapper adds what the standard asks for on top:
 * a centred box with a title and a visible close button, `aria-labelledby`,
 * a backdrop click that closes non-destructive dialogs and leaves destructive
 * ones alone, and focus that returns to whatever opened the dialog — so a
 * keyboard user lands back on the button, not at the top of the page. On a
 * phone the box becomes a sheet (see `foldmark.css`).
 *
 * The `open` prop drives the element; the element never decides on its own.
 * Every way of closing — Escape, the X, the backdrop, a `close()` call from
 * the print path — ends in the `close` event, and the parent flips the prop.
 */
const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    /** Whether a click on the backdrop closes the dialog. Off for confirmations. */
    dismissible?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Extra class on the `<dialog>` for a dialog-specific stylesheet hook. */
    dialogClass?: string;
  }>(),
  { dismissible: true, size: 'md', dialogClass: '' },
);
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const element = ref<HTMLDialogElement | null>(null);
const titleId = useId();

/** The element that had focus before the dialog opened; focus goes back there. */
let opener: Element | null = null;
/** Set while the dialog is closed by `withClosed`, so that close is not a dismissal. */
let suspended = false;

function show(): void {
  const dialog = element.value;
  if (!dialog || dialog.open) return;
  opener = globalThis.document.activeElement;
  dialog.showModal();
  // A field marked `autofocus` takes focus over the close button, so that a
  // prompt can be answered by typing straight away.
  const first = dialog.querySelector<HTMLElement>('[autofocus]');
  if (first) first.focus();
}

function hide(): void {
  const dialog = element.value;
  if (!dialog || !dialog.open) return;
  dialog.close();
}

watch(
  () => props.open,
  (open) => {
    if (open) show();
    else hide();
  },
  { flush: 'post' },
);

/** The native `close` event: from Escape, from `hide()`, or from the print path. */
function onNativeClose(): void {
  if (suspended) return;
  emit('close');
  const target = opener;
  opener = null;
  if (target instanceof HTMLElement && target.isConnected) target.focus();
}

/** Escape: the browser would close the element itself; the prop has to lead instead. */
function onCancel(event: Event): void {
  event.preventDefault();
  emit('close');
}

/** A click on the backdrop lands on the `<dialog>` element itself, never on its content. */
function onBackdropClick(event: MouseEvent): void {
  if (props.dismissible && event.target === element.value) emit('close');
}

/**
 * Runs `action` with the native dialog closed and reopens it afterwards,
 * without emitting `close`. The print path uses this so Chrome does not print
 * the top layer (R13-001) and the dialog is still there when the user is back.
 */
async function withClosed(action: () => Promise<void> | void): Promise<void> {
  const dialog = element.value;
  const wasOpen = Boolean(dialog?.open);
  suspended = true;
  try {
    if (wasOpen) dialog?.close();
    await action();
  } finally {
    if (wasOpen && dialog && !dialog.open && dialog.isConnected && props.open) dialog.showModal();
    suspended = false;
  }
}

defineExpose({ element, withClosed });

onBeforeUnmount(() => {
  suspended = true;
  hide();
});
</script>

<template>
  <dialog
    ref="element"
    class="app-dialog"
    :class="[`app-dialog-${size}`, dialogClass]"
    :aria-labelledby="titleId"
    @close="onNativeClose"
    @cancel="onCancel"
    @click="onBackdropClick"
  >
    <!-- The box is rendered only while open: a closed dialog's fields would
         otherwise still be findable by their labels. -->
    <div v-if="open" class="app-dialog-box">
      <header class="app-dialog-header">
        <h2 :id="titleId" class="app-dialog-title">{{ title }}</h2>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square app-dialog-close"
          :aria-label="t('dialog.close')"
          :title="t('dialog.close')"
          @click="emit('close')"
        >
          <AppIcon name="close" />
        </button>
      </header>
      <div class="app-dialog-body">
        <slot />
      </div>
      <footer v-if="$slots.footer" class="app-dialog-footer">
        <slot name="footer" />
      </footer>
    </div>
  </dialog>
</template>
