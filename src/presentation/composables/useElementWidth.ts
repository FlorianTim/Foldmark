import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

/**
 * The current width of an element, kept up to date by a `ResizeObserver`.
 *
 * Used where layout depends on the space a component *has* rather than on
 * the viewport — a workspace inside a narrow window and one beside an open
 * sidebar should behave the same. Starts at `0` and settles on mount, so
 * consumers treat `0` as "not measured yet", never as "narrow".
 */
export function useElementWidth(element: Ref<HTMLElement | null>): Ref<number> {
  const width = ref(0);
  let observer: ResizeObserver | null = null;

  onMounted(() => {
    const node = element.value;
    if (!node) return;
    width.value = node.getBoundingClientRect().width;
    if (typeof ResizeObserver === 'undefined') return;
    observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) width.value = entry.contentRect.width;
    });
    observer.observe(node);
  });

  onBeforeUnmount(() => observer?.disconnect());

  return width;
}
