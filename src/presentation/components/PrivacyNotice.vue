<script setup lang="ts">
import { computed, ref, watch } from 'vue';

/**
 * First-visit introduction.
 *
 * Grown out of the earlier one-shot privacy banner rather than added beside
 * it: two separate first-contact mechanisms would compete for the same
 * moment, and the visitor would dismiss whichever appeared second without
 * reading it.
 *
 * Three short steps — what the app is, where the data lives, how to change
 * language and appearance. Skip is available on every step and has exactly
 * the same effect as finishing, because a first-time visitor who wants to
 * look around first must not be trapped.
 *
 * It deliberately asks for **no** permission and stores nothing except the
 * completion flag.
 */
const props = defineProps<{ visible: boolean }>();

const emit = defineEmits<{
  accept: [];
  settings: [];
}>();

const STEP_COUNT = 3;
const step = ref(0);

// Reopening from settings starts at the beginning again.
watch(
  () => props.visible,
  (visible) => {
    if (visible) step.value = 0;
  },
);

const isLastStep = computed(() => step.value === STEP_COUNT - 1);

function next(): void {
  if (isLastStep.value) {
    emit('accept');
    return;
  }
  step.value += 1;
}
</script>

<template>
  <div
    v-if="visible"
    class="privacy-banner"
    role="dialog"
    aria-modal="false"
    aria-labelledby="privacy-title"
  >
    <div>
      <strong id="privacy-title">
        {{
          step === 0
            ? $t('intro.welcomeTitle')
            : step === 1
              ? $t('privacy.title')
              : $t('intro.settingsTitle')
        }}
      </strong>
      <p>
        {{
          step === 0
            ? $t('intro.welcomeBody')
            : step === 1
              ? $t('privacy.body')
              : $t('intro.settingsBody')
        }}
      </p>
      <!-- Progress is announced as text, not as a row of dots: a screen
           reader never announces dots at all. -->
      <small>{{ $t('intro.progress', { step: step + 1, total: STEP_COUNT }) }}</small>
    </div>
    <div class="privacy-actions">
      <button class="btn btn-primary btn-sm" type="button" @click="next">
        {{ isLastStep ? $t('intro.finish') : $t('intro.next') }}
      </button>
      <button class="btn btn-ghost btn-sm" type="button" @click="emit('settings')">
        {{ $t('privacy.settings') }}
      </button>
      <button v-if="!isLastStep" class="btn btn-ghost btn-sm" type="button" @click="emit('accept')">
        {{ $t('intro.skip') }}
      </button>
    </div>
  </div>
</template>
