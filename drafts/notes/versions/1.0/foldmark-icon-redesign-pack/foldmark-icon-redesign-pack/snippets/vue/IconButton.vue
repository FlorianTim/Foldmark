<script setup lang="ts">
import AppIcon from './AppIcon.vue'

const props = withDefaults(defineProps<{
  icon: string
  label: string
  iconOnly?: boolean
  variant?: 'ghost' | 'outline' | 'solid'
}>(), {
  iconOnly: false,
  variant: 'ghost',
})
</script>

<template>
  <button
    class="btn fm-icon-button"
    :class="{
      'btn-ghost': variant === 'ghost',
      'btn-outline': variant === 'outline',
      'btn-primary': variant === 'solid',
      'fm-icon-button--only': iconOnly,
    }"
    :aria-label="label"
    :title="iconOnly ? label : undefined"
    type="button"
  >
    <AppIcon :name="icon as any" />
    <span v-if="!iconOnly">{{ label }}</span>
    <span v-else class="fm-sr-only">{{ label }}</span>
  </button>
</template>
