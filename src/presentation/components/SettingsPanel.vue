<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { createContactHref, publicResourceLinks } from '@/config/publicResources';
import { THEME_IDS, useTheme, type ThemeId } from '@/presentation/composables/useTheme';

/**
 * The settings hub.
 *
 * Two kinds of entry, on purpose:
 *
 * - **Inline controls** for what a visitor changes often — language and
 *   appearance. A language switch is one interaction here and three behind a
 *   sub-view, and it is the most-used setting in a bilingual app.
 * - **Navigation rows** for everything else, so the hub stays scannable as
 *   the app grows.
 *
 * The destructive actions are deliberately **not** here: they live on the
 * privacy view, next to the explanation that leads a visitor to them.
 */
const emit = defineEmits<{
  navigate: [view: 'help-manual' | 'help-faq' | 'privacy' | 'pro' | 'diagnostics'];
  showIntro: [];
}>();

const { locale, t } = useI18n();
const { theme, setTheme } = useTheme();

const supportHref = createContactHref('support', 'Support request');
const isDevelopment = import.meta.env.DEV;

function onThemeChange(event: Event): void {
  const target = event.target;
  if (target instanceof HTMLSelectElement) {
    setTheme(target.value as ThemeId);
  }
}
</script>

<template>
  <section class="panel" aria-labelledby="settings-title">
    <h1 id="settings-title">{{ t('settings.title') }}</h1>

    <div class="settings-grid">
      <label class="form-control">
        <span class="label-text">{{ t('settings.language') }}</span>
        <select v-model="locale" class="select select-bordered">
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </label>
      <label class="form-control">
        <span class="label-text">{{ t('settings.theme') }}</span>
        <select :value="theme" class="select select-bordered" @change="onThemeChange">
          <option v-for="item in THEME_IDS" :key="item" :value="item">
            {{ t(`settings.themes.${item}`) }}
          </option>
        </select>
      </label>
    </div>

    <div class="privacy-card">
      <h2>{{ t('settings.sections.help') }}</h2>
      <ul class="resource-links">
        <li>
          <button class="link-button" type="button" @click="emit('navigate', 'help-manual')">
            {{ t('help.manual') }}
          </button>
        </li>
        <li>
          <button class="link-button" type="button" @click="emit('navigate', 'help-faq')">
            {{ t('help.faq') }}
          </button>
        </li>
        <li>
          <button class="link-button" type="button" @click="emit('showIntro')">
            {{ t('intro.showAgain') }}
          </button>
        </li>
      </ul>
    </div>

    <div class="privacy-card">
      <h2>{{ t('settings.sections.data') }}</h2>
      <ul class="resource-links">
        <li>
          <button class="link-button" type="button" @click="emit('navigate', 'privacy')">
            {{ t('privacyPanel.title') }}
          </button>
          <small>{{ t('settings.privacyEntryHint') }}</small>
        </li>
      </ul>
    </div>

    <div class="privacy-card">
      <h2>{{ t('settings.sections.pro') }}</h2>
      <ul class="resource-links">
        <li>
          <button class="link-button" type="button" @click="emit('navigate', 'pro')">
            {{ t('pro.title') }}
          </button>
          <!-- Without this line a "Pro" entry reads as a paywall that does
               not exist, and visitors go hunting for it. -->
          <small>{{ t('pro.allFree') }}</small>
        </li>
      </ul>
    </div>

    <div class="privacy-card">
      <h2>{{ t('settings.sections.support') }}</h2>
      <ul class="resource-links">
        <li>
          <a :href="publicResourceLinks.faq">{{ t('settings.faq') }}</a>
        </li>
        <li>
          <a :href="publicResourceLinks.changelog">{{ t('settings.changelog') }}</a>
        </li>
        <li>
          <a :href="publicResourceLinks.licenses">{{ t('settings.licenses') }}</a>
        </li>
        <li>
          <a :href="supportHref">{{ t('settings.support') }}</a>
        </li>
      </ul>
    </div>

    <!-- `import.meta.env.DEV` is folded at build time, so this section is
         absent from a production build — and the shell drops the panel's
         chunk with it. -->
    <div v-if="isDevelopment" class="privacy-card">
      <h2>{{ t('settings.sections.development') }}</h2>
      <ul class="resource-links">
        <li>
          <button class="link-button" type="button" @click="emit('navigate', 'diagnostics')">
            {{ t('diagnostics.title') }}
          </button>
          <small>{{ t('diagnostics.hint') }}</small>
        </li>
      </ul>
    </div>
  </section>
</template>
