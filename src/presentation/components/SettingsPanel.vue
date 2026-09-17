<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { services } from '@/app/compositionRoot';
import type { DemoDataCount } from '@/application/usecases/DemoDataService';
import { createContactHref, publicResourceLinks } from '@/config/publicResources';
import {
  COLOR_ALIASES,
  COLOR_TONES,
  DEFAULT_DOCUMENT_THEME,
  FONT_FAMILIES,
  THEME_BOUNDS,
  resolveColor,
  type ColorAlias,
  type ColorTone,
} from '@/domain/document/DocumentTheme';
import { DATE_FORMATS, PAGE_NUMBER_POSITIONS } from '@/domain/document/FoldmarkDocument';
import { groupProfiles } from '@/domain/print/builtInProfiles';
import ConfirmDialog from '@/presentation/components/ConfirmDialog.vue';
import { THEME_IDS, useTheme, type ThemeId } from '@/presentation/composables/useTheme';
import {
  DEFAULT_PAGE_NUMBER_FORMATS,
  DOCUMENT_LOCALES,
  FACTORY_DOCUMENT_DEFAULTS,
  type DocumentDefaults,
} from '@/presentation/settings/documentDefaults';
import {
  appSettings,
  HISTORY_RETENTION_OPTIONS,
  readSetting,
  resetAllSettings,
  writeSetting,
} from '@/presentation/settings/settingsRegistry';
import { useLibraryStore } from '@/presentation/stores/libraryStore';
import { useWorkspaceStore } from '@/presentation/stores/workspaceStore';

/**
 * The settings, in categories (change 0028, R13-032): a side navigation on
 * a wide screen, a row of tabs on a phone, one category on screen at a time.
 *
 * - **General** — the app language and the first-run intro.
 * - **Documents** — what a new document starts with: language, date format,
 *   print profile, page numbers.
 * - **Appearance** — the colour theme of the app, not of the paper.
 * - **Fonts** — the typography a new document starts with.
 * - **Storage & history** — how many automatic versions are kept.
 * - **Privacy** — what is stored where, and the way to the inventory.
 * - **Data & backup** — deleting one collection at a time, or everything;
 *   each with its own confirmation, because "delete my contacts" and "delete
 *   everything" are different decisions.
 * - **Development** — diagnostics and the demo data (dev and test builds).
 * - **About** — version, licences, legal.
 *
 * Document defaults are written the moment they change; there is no Save
 * button on a settings page, and nothing here can lose work.
 */
const emit = defineEmits<{
  navigate: [
    view: 'help-manual' | 'help-faq' | 'privacy' | 'pro' | 'diagnostics' | 'about' | 'open-source',
  ];
  showIntro: [];
  settingsReset: [];
}>();

const { locale, t } = useI18n();
const { theme, setTheme } = useTheme();
const library = useLibraryStore();
const workspace = useWorkspaceStore();

const CATEGORIES = [
  'general',
  'documents',
  'appearance',
  'fonts',
  'colours',
  'storage',
  'privacy',
  'data',
  'development',
  'about',
] as const;
type Category = (typeof CATEGORIES)[number];

const supportHref = createContactHref('support', 'Support request');
const isDevelopment = import.meta.env.DEV;
/**
 * The demo data actions (change 0026) are for development and for the
 * automated screenshots, which run against a production build; the build
 * used for them sets `VITE_DEMO_DATA`, a shipped build never does.
 */
const demoDataAvailable = isDevelopment || import.meta.env.VITE_DEMO_DATA === 'true';

const active = ref<Category>('general');
const categories = computed(() =>
  CATEGORIES.filter((category) => category !== 'development' || isDevelopment || demoDataAvailable),
);

// --- document defaults -------------------------------------------------------
const defaults = ref<DocumentDefaults>(readSetting(appSettings.documentDefaults));
const defaultProfileId = ref(readSetting(appSettings.defaultPrintProfileId));
const retention = ref(readSetting(appSettings.historyAutomaticVersions));

function setDefault<K extends keyof DocumentDefaults>(key: K, value: DocumentDefaults[K]): void {
  defaults.value = { ...defaults.value, [key]: value };
  writeSetting(appSettings.documentDefaults, defaults.value);
}

function setNumberDefault(
  key: 'fontSizePt' | 'lineHeight' | 'paragraphSpacing',
  event: Event,
): void {
  const raw = (event.target as HTMLInputElement).value;
  const value = Number.parseFloat(raw.replace(',', '.'));
  const bounds = THEME_BOUNDS[key];
  if (!Number.isFinite(value) || value < bounds.min || value > bounds.max) return;
  setDefault(key, value);
}

function resetDefaults(): void {
  defaults.value = FACTORY_DOCUMENT_DEFAULTS;
  writeSetting(appSettings.documentDefaults, FACTORY_DOCUMENT_DEFAULTS);
}

/** One semantic colour's default tone (R14-009); the swatch shows the palette's screen value. */
function setAliasDefault(alias: ColorAlias, tone: string): void {
  if (!COLOR_TONES.includes(tone as ColorTone)) return;
  setDefault('aliases', { ...defaults.value.aliases, [alias]: tone as ColorTone });
}

function resetAliasDefaults(): void {
  setDefault('aliases', FACTORY_DOCUMENT_DEFAULTS.aliases);
}

function toneSwatch(tone: ColorTone): string {
  return resolveColor(tone, DEFAULT_DOCUMENT_THEME)?.screen ?? 'transparent';
}

function setDefaultProfile(event: Event): void {
  defaultProfileId.value = (event.target as HTMLSelectElement).value;
  writeSetting(appSettings.defaultPrintProfileId, defaultProfileId.value);
}

function setRetention(event: Event): void {
  const value = Number((event.target as HTMLSelectElement).value);
  const option = HISTORY_RETENTION_OPTIONS.find((candidate) => candidate === value);
  if (!option) return;
  retention.value = option;
  writeSetting(appSettings.historyAutomaticVersions, option);
}

const profileGroups = computed(() => groupProfiles(library.printProfiles));

function onThemeChange(event: Event): void {
  const target = event.target;
  if (target instanceof HTMLSelectElement) setTheme(target.value as ThemeId);
}

// --- data management ---------------------------------------------------------
type DeleteScope =
  'documents' | 'templates' | 'addresses' | 'assets' | 'history' | 'all' | 'settings';
const deleteAsk = ref<DeleteScope | null>(null);
const deleteDone = ref<DeleteScope | null>(null);
const busy = ref(false);

const DELETE_SCOPES: readonly DeleteScope[] = [
  'documents',
  'templates',
  'addresses',
  'assets',
  'history',
  'all',
];

async function confirmDelete(): Promise<void> {
  const scope = deleteAsk.value;
  if (!scope) return;
  deleteAsk.value = null;
  if (scope === 'settings') {
    resetAllSettings();
    defaults.value = readSetting(appSettings.documentDefaults);
    defaultProfileId.value = readSetting(appSettings.defaultPrintProfileId);
    retention.value = readSetting(appSettings.historyAutomaticVersions);
    deleteDone.value = scope;
    emit('settingsReset');
    return;
  }
  busy.value = true;
  const action = {
    documents: () => services.backup.deleteDocuments(),
    templates: () => services.backup.deleteTemplates(),
    addresses: () => services.backup.deleteAddresses(),
    assets: () => services.backup.deleteAssets(),
    history: () => services.backup.deleteHistory(),
    all: () => services.backup.deleteAll(),
  }[scope];
  const done = await library.run(action, 'errors.storageUnavailable');
  busy.value = false;
  if (done === null) return;
  if (scope === 'documents' || scope === 'all') workspace.close();
  await library.loadAll();
  deleteDone.value = scope;
}

// --- demo data -----------------------------------------------------------------
const demoCount = ref<DemoDataCount | null>(null);
const demoBusy = ref(false);

async function refreshDemoCount(): Promise<void> {
  if (!demoDataAvailable) return;
  demoCount.value = await services.demoData.count();
}

async function insertDemoData(): Promise<void> {
  demoBusy.value = true;
  try {
    demoCount.value = await services.demoData.insert();
    await library.loadAll();
  } finally {
    demoBusy.value = false;
  }
}

async function removeDemoData(): Promise<void> {
  demoBusy.value = true;
  try {
    demoCount.value = await services.demoData.remove();
    await library.loadAll();
  } finally {
    demoBusy.value = false;
  }
}

onMounted(() => {
  void library.loadAll();
  void refreshDemoCount();
});
</script>

<template>
  <section class="panel settings-panel" aria-labelledby="settings-title">
    <h1 id="settings-title">{{ t('settings.title') }}</h1>

    <div class="settings-layout">
      <nav class="settings-nav" :aria-label="t('settings.categories')">
        <ul role="tablist" :aria-label="t('settings.categories')">
          <li v-for="category in categories" :key="category" role="none">
            <button
              type="button"
              role="tab"
              class="settings-tab"
              :class="{ active: active === category }"
              :aria-selected="active === category"
              :aria-controls="`settings-${category}`"
              :data-testid="`settings-${category}`"
              @click="active = category"
            >
              {{ t(`settings.category.${category}`) }}
            </button>
          </li>
        </ul>
      </nav>

      <div class="settings-body">
        <!-- General -->
        <section
          v-if="active === 'general'"
          id="settings-general"
          class="settings-section"
          role="tabpanel"
        >
          <h2>{{ t('settings.category.general') }}</h2>
          <div class="settings-grid">
            <label class="form-control">
              <span class="label-text">{{ t('settings.language') }}</span>
              <select v-model="locale" class="select select-bordered">
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
          <ul class="resource-links">
            <li>
              <button class="link-button" type="button" @click="emit('showIntro')">
                {{ t('intro.showAgain') }}
              </button>
            </li>
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
          </ul>
        </section>

        <!-- Documents: what a new document starts with -->
        <section
          v-else-if="active === 'documents'"
          id="settings-documents"
          class="settings-section"
          role="tabpanel"
        >
          <h2>{{ t('settings.category.documents') }}</h2>
          <p>{{ t('settings.documentsHint') }}</p>
          <div class="settings-grid">
            <label class="form-control">
              <span class="label-text">{{ t('settings.defaults.locale') }}</span>
              <select
                class="select select-bordered"
                :value="defaults.locale"
                data-testid="default-locale"
                @change="
                  setDefault(
                    'locale',
                    ($event.target as HTMLSelectElement).value as DocumentDefaults['locale'],
                  )
                "
              >
                <option v-for="entry in DOCUMENT_LOCALES" :key="entry" :value="entry">
                  {{ t(`settings.locales.${entry}`) }}
                </option>
              </select>
            </label>
            <label class="form-control">
              <span class="label-text">{{ t('settings.defaults.dateFormat') }}</span>
              <select
                class="select select-bordered"
                :value="defaults.dateFormat"
                data-testid="default-date-format"
                @change="
                  setDefault(
                    'dateFormat',
                    ($event.target as HTMLSelectElement).value as DocumentDefaults['dateFormat'],
                  )
                "
              >
                <option v-for="entry in DATE_FORMATS" :key="entry" :value="entry">
                  {{ t(`settings.dateFormats.${entry}`) }}
                </option>
              </select>
            </label>
            <label class="form-control">
              <span class="label-text">{{ t('settings.defaults.printProfile') }}</span>
              <select
                class="select select-bordered"
                :value="defaultProfileId"
                data-testid="default-profile"
                @change="setDefaultProfile"
              >
                <optgroup
                  v-for="group in profileGroups"
                  :key="group.id"
                  :label="t(`profiles.group.${group.id}`)"
                >
                  <option v-for="profile in group.profiles" :key="profile.id" :value="profile.id">
                    {{ profile.name[locale === 'de' ? 'de' : 'en'] }}
                  </option>
                </optgroup>
              </select>
            </label>
            <label class="form-control">
              <span class="label-text">{{ t('settings.defaults.pageNumbers') }}</span>
              <select
                class="select select-bordered"
                :value="defaults.pageNumberFormat"
                data-testid="default-page-numbers"
                @change="
                  setDefault(
                    'pageNumberFormat',
                    ($event.target as HTMLSelectElement)
                      .value as DocumentDefaults['pageNumberFormat'],
                  )
                "
              >
                <option v-for="entry in DEFAULT_PAGE_NUMBER_FORMATS" :key="entry" :value="entry">
                  {{ t(`metadata.pageNumbers.formats.${entry}`) }}
                </option>
              </select>
            </label>
            <label class="form-control">
              <span class="label-text">{{ t('settings.defaults.pageNumberPosition') }}</span>
              <select
                class="select select-bordered"
                :value="defaults.pageNumberPosition"
                @change="
                  setDefault(
                    'pageNumberPosition',
                    ($event.target as HTMLSelectElement)
                      .value as DocumentDefaults['pageNumberPosition'],
                  )
                "
              >
                <option v-for="entry in PAGE_NUMBER_POSITIONS" :key="entry" :value="entry">
                  {{ t(`metadata.pageNumbers.positions.${entry}`) }}
                </option>
              </select>
            </label>
          </div>
          <div class="settings-actions">
            <button class="btn btn-ghost btn-sm" type="button" @click="resetDefaults">
              {{ t('settings.defaults.reset') }}
            </button>
          </div>
        </section>

        <!-- Appearance -->
        <section
          v-else-if="active === 'appearance'"
          id="settings-appearance"
          class="settings-section"
          role="tabpanel"
        >
          <h2>{{ t('settings.category.appearance') }}</h2>
          <div class="settings-grid">
            <label class="form-control">
              <span class="label-text">{{ t('settings.theme') }}</span>
              <select :value="theme" class="select select-bordered" @change="onThemeChange">
                <option v-for="item in THEME_IDS" :key="item" :value="item">
                  {{ t(`settings.themes.${item}`) }}
                </option>
              </select>
            </label>
          </div>
          <p>{{ t('settings.appearanceHint') }}</p>
        </section>

        <!-- Fonts: the typography a new document starts with -->
        <section
          v-else-if="active === 'fonts'"
          id="settings-fonts"
          class="settings-section"
          role="tabpanel"
        >
          <h2>{{ t('settings.category.fonts') }}</h2>
          <p>{{ t('settings.fontsHint') }}</p>
          <div class="settings-grid">
            <label class="form-control">
              <span class="label-text">{{ t('metadata.theme.fontFamily') }}</span>
              <select
                class="select select-bordered"
                :value="defaults.fontFamily"
                data-testid="default-font-family"
                @change="
                  setDefault(
                    'fontFamily',
                    ($event.target as HTMLSelectElement).value as DocumentDefaults['fontFamily'],
                  )
                "
              >
                <option v-for="family in FONT_FAMILIES" :key="family" :value="family">
                  {{ t(`metadata.theme.fontFamilies.${family}`) }}
                </option>
              </select>
            </label>
            <label class="form-control">
              <span class="label-text">{{ t('metadata.theme.fontSizePt') }}</span>
              <input
                class="input input-bordered"
                type="number"
                :min="THEME_BOUNDS.fontSizePt.min"
                :max="THEME_BOUNDS.fontSizePt.max"
                step="0.5"
                :value="defaults.fontSizePt"
                data-testid="default-font-size"
                @change="setNumberDefault('fontSizePt', $event)"
              />
            </label>
            <label class="form-control">
              <span class="label-text">{{ t('metadata.theme.lineHeight') }}</span>
              <input
                class="input input-bordered"
                type="number"
                :min="THEME_BOUNDS.lineHeight.min"
                :max="THEME_BOUNDS.lineHeight.max"
                step="0.05"
                :value="defaults.lineHeight"
                @change="setNumberDefault('lineHeight', $event)"
              />
            </label>
            <label class="form-control">
              <span class="label-text">{{ t('metadata.theme.paragraphSpacing') }}</span>
              <input
                class="input input-bordered"
                type="number"
                :min="THEME_BOUNDS.paragraphSpacing.min"
                :max="THEME_BOUNDS.paragraphSpacing.max"
                step="0.1"
                :value="defaults.paragraphSpacing"
                @change="setNumberDefault('paragraphSpacing', $event)"
              />
            </label>
          </div>
          <p class="field-hint">{{ t('settings.colorsHint') }}</p>
        </section>

        <!-- Colours: where the semantic colours of new documents point (R14-009) -->
        <section
          v-else-if="active === 'colours'"
          id="settings-colours"
          class="settings-section"
          role="tabpanel"
        >
          <h2>{{ t('settings.category.colours') }}</h2>
          <p>{{ t('settings.coloursHint') }}</p>
          <div class="settings-grid">
            <label v-for="alias in COLOR_ALIASES" :key="alias" class="form-control">
              <span class="label-text">
                <span
                  class="rich-swatch"
                  aria-hidden="true"
                  :style="{ background: toneSwatch(defaults.aliases[alias]) }"
                />
                {{ t(`editor.colorAliases.${alias}`) }}
              </span>
              <select
                class="select select-bordered"
                :value="defaults.aliases[alias]"
                :data-testid="`default-alias-${alias}`"
                @change="setAliasDefault(alias, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="tone in COLOR_TONES" :key="tone" :value="tone">{{ tone }}</option>
              </select>
            </label>
          </div>
          <div class="settings-actions">
            <button type="button" class="btn btn-ghost btn-sm" @click="resetAliasDefaults">
              {{ t('settings.resetColours') }}
            </button>
          </div>
        </section>

        <!-- Storage & history -->
        <section
          v-else-if="active === 'storage'"
          id="settings-storage"
          class="settings-section"
          role="tabpanel"
        >
          <h2>{{ t('settings.category.storage') }}</h2>
          <p>{{ t('settings.storageHint') }}</p>
          <div class="settings-grid">
            <label class="form-control">
              <span class="label-text">{{ t('history.retention') }}</span>
              <select class="select select-bordered" :value="retention" @change="setRetention">
                <option v-for="option in HISTORY_RETENTION_OPTIONS" :key="option" :value="option">
                  {{ t('history.retentionOption', { count: option }) }}
                </option>
              </select>
            </label>
          </div>
        </section>

        <!-- Privacy -->
        <section
          v-else-if="active === 'privacy'"
          id="settings-privacy"
          class="settings-section"
          role="tabpanel"
        >
          <h2>{{ t('settings.category.privacy') }}</h2>
          <p>{{ t('settings.privacyText') }}</p>
          <ul class="resource-links">
            <li>
              <button class="link-button" type="button" @click="emit('navigate', 'privacy')">
                {{ t('privacyPanel.title') }}
              </button>
              <small>{{ t('settings.privacyEntryHint') }}</small>
            </li>
            <li>
              <a :href="publicResourceLinks.privacy">{{ t('settings.privacyPolicy') }}</a>
            </li>
            <li>
              <a :href="publicResourceLinks.dataDeletion">{{ t('settings.deletionGuide') }}</a>
            </li>
          </ul>
        </section>

        <!-- Data & backup -->
        <section
          v-else-if="active === 'data'"
          id="settings-data"
          class="settings-section"
          role="tabpanel"
        >
          <h2>{{ t('settings.category.data') }}</h2>
          <ul class="resource-links">
            <li>
              <button class="link-button" type="button" @click="emit('navigate', 'privacy')">
                {{ t('privacyPanel.backup') }}
              </button>
              <small>{{ t('privacyPanel.backupHint') }}</small>
            </li>
          </ul>
          <h3 class="danger-heading">{{ t('settings.dataManagement') }}</h3>
          <p>{{ t('settings.dataManagementHint') }}</p>
          <ul class="delete-actions">
            <li v-for="scope in DELETE_SCOPES" :key="scope" class="danger-action">
              <div>
                <strong>{{ t(`settings.delete.${scope}.title`) }}</strong>
                <p>{{ t(`settings.delete.${scope}.hint`) }}</p>
              </div>
              <button
                class="btn btn-sm btn-error"
                :class="{ 'btn-outline': scope !== 'all' }"
                type="button"
                :disabled="busy"
                :data-testid="`delete-${scope}`"
                @click="deleteAsk = scope"
              >
                {{ t(`settings.delete.${scope}.title`) }}
              </button>
            </li>
            <li class="danger-action">
              <div>
                <strong>{{ t('privacyPanel.resetSettings') }}</strong>
                <p>{{ t('privacyPanel.resetSettingsHint') }}</p>
              </div>
              <button
                class="btn btn-sm btn-error btn-outline"
                type="button"
                data-testid="delete-settings"
                @click="deleteAsk = 'settings'"
              >
                {{ t('privacyPanel.resetSettings') }}
              </button>
            </li>
          </ul>
          <p v-if="deleteDone" class="alert alert-success" role="status" data-testid="delete-done">
            {{ t(`settings.delete.${deleteDone}.done`) }}
          </p>
          <p v-if="library.error" class="alert alert-error" role="alert">
            {{ t(library.error) }}
          </p>
        </section>

        <!-- Development -->
        <section
          v-else-if="active === 'development'"
          id="settings-development"
          class="settings-section"
          role="tabpanel"
        >
          <h2>{{ t('settings.category.development') }}</h2>
          <ul v-if="isDevelopment" class="resource-links">
            <li>
              <button class="link-button" type="button" @click="emit('navigate', 'diagnostics')">
                {{ t('diagnostics.title') }}
              </button>
              <small>{{ t('diagnostics.hint') }}</small>
            </li>
          </ul>
          <div v-if="demoDataAvailable" class="demo-data" data-testid="demo-data">
            <h3>{{ t('settings.demoData.title') }}</h3>
            <p>{{ t('settings.demoData.hint') }}</p>
            <p v-if="demoCount" class="field-hint" data-testid="demo-data-count">
              {{ t('settings.demoData.count', demoCount) }}
            </p>
            <div class="settings-actions">
              <button
                type="button"
                class="btn btn-sm btn-outline"
                :disabled="demoBusy"
                data-testid="demo-data-insert"
                @click="insertDemoData"
              >
                {{ t('settings.demoData.insert') }}
              </button>
              <button
                type="button"
                class="btn btn-sm btn-ghost"
                :disabled="demoBusy || !demoCount || Object.values(demoCount).every((n) => n === 0)"
                data-testid="demo-data-remove"
                @click="removeDemoData"
              >
                {{ t('settings.demoData.remove') }}
              </button>
            </div>
          </div>
        </section>

        <!-- About -->
        <section v-else id="settings-about" class="settings-section" role="tabpanel">
          <h2>{{ t('settings.category.about') }}</h2>
          <ul class="resource-links">
            <li>
              <button class="link-button" type="button" @click="emit('navigate', 'about')">
                {{ t('nav.about') }}
              </button>
            </li>
            <li>
              <button class="link-button" type="button" @click="emit('navigate', 'open-source')">
                {{ t('settings.licenses') }}
              </button>
            </li>
            <li>
              <a :href="publicResourceLinks.changelog">{{ t('settings.changelog') }}</a>
            </li>
            <li>
              <a :href="supportHref">{{ t('settings.support') }}</a>
            </li>
            <li>
              <button class="link-button" type="button" @click="emit('navigate', 'pro')">
                {{ t('pro.title') }}
              </button>
              <small>{{ t('pro.statusHint') }}</small>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <ConfirmDialog
      :open="deleteAsk !== null"
      :title="deleteAsk ? t(`settings.delete.${deleteAsk}.confirmTitle`) : ''"
      :text="deleteAsk ? t(`settings.delete.${deleteAsk}.confirmText`) : ''"
      :confirm-label="deleteAsk ? t(`settings.delete.${deleteAsk}.confirm`) : ''"
      danger
      @close="deleteAsk = null"
      @confirm="confirmDelete"
    />
  </section>
</template>
