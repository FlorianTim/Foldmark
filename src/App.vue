<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { appConfig } from '@/config';
import AboutPanel from '@/presentation/components/AboutPanel.vue';
import HelpPanel from '@/presentation/components/HelpPanel.vue';
import PrivacyNotice from '@/presentation/components/PrivacyNotice.vue';
import PrivacyPanel from '@/presentation/components/PrivacyPanel.vue';
import ProPanel from '@/presentation/components/ProPanel.vue';
import SettingsPanel from '@/presentation/components/SettingsPanel.vue';
import TodoPanel from '@/presentation/components/TodoPanel.vue';
import { useTheme } from '@/presentation/composables/useTheme';
import { appSettings, readSetting, writeSetting } from '@/presentation/settings/settingsRegistry';

/**
 * Views the shell can show.
 *
 * The three primary ones are in the top bar; the rest are reached from the
 * settings hub, which keeps the bar scannable as an app grows.
 */
type View =
  'todos' | 'settings' | 'about' | 'help-manual' | 'help-faq' | 'privacy' | 'pro' | 'diagnostics';

/**
 * The diagnostics panel is loaded lazily **behind a build-time flag**.
 *
 * `import.meta.env.DEV` is replaced with `false` in a production build, so
 * the ternary folds and the dynamic import becomes unreachable — the bundler
 * then drops the component chunk entirely rather than shipping a view nobody
 * can open. A plain `v-if` would have kept the component in the bundle.
 *
 * Its translations do stay in the message catalogue: those are one JSON file
 * per locale, and splitting them per view would cost more than the few
 * hundred bytes it saves.
 */
const DiagnosticsPanel = import.meta.env.DEV
  ? defineAsyncComponent(() => import('@/presentation/components/DiagnosticsPanel.vue'))
  : null;

const { locale } = useI18n();
const { setTheme } = useTheme();

const view = ref<View>('todos');
const notice = ref(!readSetting(appSettings.introCompleted));

// Theme initialization belongs at the shell so the saved theme applies before settings open.
useTheme();

function finishIntro(): void {
  writeSetting(appSettings.introCompleted, true);
  notice.value = false;
}

function openSettings(): void {
  view.value = 'settings';
  notice.value = false;
}

/** Reopening the intro does not clear the flag — reopening is reading. */
function showIntro(): void {
  notice.value = true;
}

/**
 * After a settings reset the stored values are gone, but the locale and
 * theme singletons still hold what they read at start-up. Put them back to
 * their defaults so the UI matches storage without a reload.
 */
function onSettingsReset(): void {
  locale.value = appSettings.locale.defaultValue;
  setTheme(appSettings.theme.defaultValue);
  notice.value = !readSetting(appSettings.introCompleted);
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" @click.prevent="view = 'todos'">
        <span class="brand-mark" aria-hidden="true">LC</span>
        <span>
          <strong>{{ appConfig.shortName }}</strong>
          <small>{{ appConfig.organization.name }}</small>
        </span>
      </a>
      <nav :aria-label="$t('nav.primary')">
        <button
          class="nav-button"
          :class="{ active: view === 'todos' }"
          :aria-pressed="view === 'todos'"
          type="button"
          @click="view = 'todos'"
        >
          {{ $t('nav.todos') }}
        </button>
        <button
          class="nav-button"
          :class="{ active: view === 'settings' }"
          :aria-pressed="view === 'settings'"
          type="button"
          @click="view = 'settings'"
        >
          {{ $t('nav.settings') }}
        </button>
        <button
          class="nav-button"
          :class="{ active: view === 'about' }"
          :aria-pressed="view === 'about'"
          type="button"
          @click="view = 'about'"
        >
          {{ $t('nav.about') }}
        </button>
      </nav>
    </header>

    <main>
      <TodoPanel v-if="view === 'todos'" />
      <SettingsPanel
        v-else-if="view === 'settings'"
        @navigate="view = $event"
        @show-intro="showIntro"
      />
      <HelpPanel v-else-if="view === 'help-manual'" document="manual" />
      <HelpPanel v-else-if="view === 'help-faq'" document="faq" />
      <PrivacyPanel v-else-if="view === 'privacy'" @settings-reset="onSettingsReset" />
      <ProPanel v-else-if="view === 'pro'" />
      <component :is="DiagnosticsPanel" v-else-if="view === 'diagnostics' && DiagnosticsPanel" />
      <AboutPanel v-else />
    </main>

    <footer>
      <span>{{ appConfig.organization.name }}</span>
      <span>{{ $t('app.privacy') }}</span>
    </footer>
    <PrivacyNotice :visible="notice" @accept="finishIntro" @settings="openSettings" />
  </div>
</template>
