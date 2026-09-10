import { watch } from 'vue';
import { createI18n } from 'vue-i18n';
import { appConfig } from '@/config';
import { readPreference, writePreference } from '@/presentation/browserStorage';
import de from './messages/de.json';
import en from './messages/en.json';

/** Locale identifiers shipped by the generic template. */
export type Locale = 'de' | 'en';

function isLocale(value: string | null): value is Locale {
  return value === 'de' || value === 'en';
}

const storedLocale = readPreference('locale');

/** Selects a supported locale from saved state, then browser preferences, then configuration. */
export function selectInitialLocale(
  stored: string | null,
  languages: readonly string[] = globalThis.navigator.languages,
): Locale {
  if (isLocale(stored)) return stored;
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0];
    if (base === 'de' || base === 'en') return base;
  }
  return appConfig.defaultLocale;
}

/** Vue I18n instance configured with validated local messages and preference persistence. */
export const i18n = createI18n({
  legacy: false,
  locale: selectInitialLocale(storedLocale),
  fallbackLocale: 'en',
  messages: { de, en },
});

watch(
  i18n.global.locale,
  (locale) => {
    writePreference('locale', locale);
    document.documentElement.lang = locale;
  },
  { immediate: true },
);
