<script setup lang="ts">
import { computed } from 'vue'

type IconName =
  | 'save'
  | 'history'
  | 'print'
  | 'export'
  | 'validation'
  | 'language'
  | 'theme-cycle'
  | 'documents'
  | 'addresses'
  | 'print-profiles'
  | 'images'
  | 'settings'
  | 'about'
  | 'foldmark-mark'
  | 'lambrocode-mark'

const props = withDefaults(defineProps<{
  name: IconName
  label?: string
  size?: 'sm' | 'md' | 'lg'
  decorative?: boolean
}>(), {
  size: 'md',
  decorative: true,
})

const href = computed(() => `/icons/sprite/foldmark-icons.svg#${props.name}`)
const classes = computed(() => [
  'fm-icon',
  props.size === 'sm' && 'fm-icon--sm',
  props.size === 'lg' && 'fm-icon--lg',
])
</script>

<template>
  <svg
    :class="classes"
    :aria-hidden="decorative ? 'true' : undefined"
    :role="decorative ? undefined : 'img'"
  >
    <title v-if="!decorative && label">{{ label }}</title>
    <use :href="href" />
  </svg>
</template>
