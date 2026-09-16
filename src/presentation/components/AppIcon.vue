<script setup lang="ts">
import { computed } from 'vue';
import type { IconName } from '@/presentation/icons/iconNames.generated';

/**
 * One icon from the sprite (`public/icons/foldmark-icons.svg`), drawn with
 * `currentColor` so it follows the text colour of whatever button holds it.
 *
 * Decorative by default: a button shows its icon next to a label, or carries
 * an `aria-label` of its own. Pass `label` only when the icon is the whole
 * meaning and no text is nearby — then it becomes an image with a name.
 *
 * `<use href>` rather than inline SVG: the app never injects markup from
 * strings, and a sprite reference needs none. The name is a type from the
 * generated list, so a missing icon is a compile error, not an empty box.
 */
const props = withDefaults(
  defineProps<{
    name: IconName;
    /** Accessible name when the icon stands alone. */
    label?: string;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  { label: undefined, size: 'md' },
);

const href = computed(() => `${import.meta.env.BASE_URL}icons/foldmark-icons.svg#${props.name}`);
</script>

<template>
  <svg
    class="app-icon"
    :class="`app-icon-${size}`"
    :aria-hidden="label ? undefined : 'true'"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    focusable="false"
  >
    <use :href="href" />
  </svg>
</template>
