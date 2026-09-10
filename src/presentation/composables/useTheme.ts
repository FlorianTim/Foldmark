import { ref, watchEffect, type Ref } from 'vue';
import {
  appSettings,
  readSetting,
  writeSetting,
  THEME_IDS,
  type ThemeId,
} from '@/presentation/settings/settingsRegistry';

// Re-exported so components keep importing the theme vocabulary from the
// theme controller, while the registry remains its single definition.
export { THEME_IDS, type ThemeId };

const theme = ref<ThemeId>(readSetting(appSettings.theme));
let initialized = false;

/** Initializes and exposes the singleton theme controller. */
export function useTheme(): { theme: Ref<ThemeId>; setTheme: (value: ThemeId) => void } {
  if (!initialized) {
    watchEffect(() => {
      document.documentElement.dataset.theme = theme.value;
    });
    initialized = true;
  }

  const setTheme = (value: ThemeId): void => {
    theme.value = value;
    writeSetting(appSettings.theme, value);
  };

  return { theme, setTheme };
}
