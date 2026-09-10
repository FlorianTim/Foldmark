<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import type { Entitlement } from '@/domain/entitlement/Entitlement';

/**
 * Entitlement status.
 *
 * Shows a state and sells nothing: no price, no product list, no buy action.
 * The template has no purchase channel, and a purchase surface that cannot
 * complete a purchase is worse than none — it is a support ticket and, for a
 * published app, a compliance problem.
 *
 * What ships instead is the whole shape around it: the port, the cache, the
 * fail-open gates and this view. Adding a real channel is then one adapter
 * and one composition-root line.
 */
const { t } = useI18n();

const entitlement = ref<Entitlement>(services.entitlement.current());
const available = ref<boolean | null>(null);
const restoring = ref(false);
const outcome = ref<'restored' | 'nothing' | 'unavailable' | null>(null);

onMounted(async () => {
  // Queried here, on an explicit visit — never during startup.
  available.value = await services.entitlement.isPurchaseAvailable();
});

async function restore(): Promise<void> {
  restoring.value = true;
  outcome.value = await services.entitlement.restore();
  entitlement.value = services.entitlement.current();
  restoring.value = false;
}
</script>

<template>
  <section class="panel" aria-labelledby="pro-title">
    <h1 id="pro-title">{{ t('pro.title') }}</h1>

    <div class="privacy-card">
      <h2>{{ entitlement === 'free' ? t('pro.statusFree') : t('pro.statusPro') }}</h2>
      <p>{{ t('pro.allFree') }}</p>
    </div>

    <div class="privacy-card">
      <!-- Three distinct states. Without the pending one, a slow check is
           indistinguishable from an unavailable channel. -->
      <p v-if="available === null" role="status">{{ t('pro.checking') }}</p>
      <p v-else-if="available" role="status">{{ t('pro.available') }}</p>
      <p v-else role="status">{{ t('pro.unavailable') }}</p>

      <div class="settings-actions">
        <button class="btn btn-outline" type="button" :disabled="restoring" @click="restore">
          {{ restoring ? t('pro.restoring') : t('pro.restore') }}
        </button>
      </div>

      <p v-if="outcome === 'restored'" class="alert alert-success" role="status">
        {{ t('pro.restoreRestored') }}
      </p>
      <p v-else-if="outcome === 'nothing'" class="alert" role="status">
        {{ t('pro.restoreNothing') }}
      </p>
      <p v-else-if="outcome === 'unavailable'" class="alert alert-error" role="alert">
        {{ t('pro.restoreUnavailable') }}
      </p>
    </div>

    <p class="hint">{{ t('pro.note') }}</p>
  </section>
</template>
