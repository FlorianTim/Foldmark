<script setup lang="ts">
import { computed } from 'vue';
import type { PrintProfile } from '../../domain/PrintProfile';

const props = defineProps<{ profile: PrintProfile; zoom: number }>();
const pageStyle = computed(() => ({
  width: `${props.profile.page.widthMm}mm`,
  height: `${props.profile.page.heightMm}mm`,
  transform: `scale(${props.zoom})`,
  transformOrigin: 'top left',
}));
</script>

<template>
  <div class="preview-viewport" aria-label="Document preview">
    <article class="paper" :style="pageStyle">
      <span
        v-for="marker in profile.markers.filter((item) => item.preview)"
        :key="marker.id"
        class="print-marker"
        :data-kind="marker.kind"
        :style="{
          '--x': `${marker.xMm}mm`,
          '--y': `${marker.yMm}mm`,
          '--width': `${marker.widthMm ?? 0}mm`,
        }"
      />
      <slot />
    </article>
  </div>
</template>
