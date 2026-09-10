<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { allSettings, rawValue } from '@/presentation/settings/settingsRegistry';

/**
 * Development-only view over the settings registry.
 *
 * This is what making the registry enumerable was for: "which preferences
 * exist, and what is actually stored?" is answerable without grepping.
 *
 * **Read-only.** A writable debug console is a different feature with
 * different risks — a value written here would bypass the composable that
 * owns it, and the UI would then disagree with storage until a reload.
 *
 * The shell loads this component behind a build-time `import.meta.env.DEV`
 * flag, so a production build drops the chunk entirely. Its translations do
 * remain in the message catalogue — one JSON per locale, not worth splitting
 * per view.
 */
const { t } = useI18n();
</script>

<template>
  <section class="panel" aria-labelledby="diagnostics-title">
    <h1 id="diagnostics-title">{{ t('diagnostics.title') }}</h1>
    <p class="hint">{{ t('diagnostics.intro') }}</p>
    <dl class="metadata">
      <div v-for="setting in allSettings" :key="setting.key">
        <dt>{{ setting.key }}</dt>
        <dd>
          <code>{{ rawValue(setting) ?? t('diagnostics.unset') }}</code>
          <small>{{ t('diagnostics.default', { value: setting.encodedDefault }) }}</small>
        </dd>
      </div>
    </dl>
  </section>
</template>
