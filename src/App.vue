<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import markUrl from '@/assets/icons/logo.svg';
import { appConfig } from '@/config';
import AboutPanel from '@/presentation/components/AboutPanel.vue';
import HelpPanel from '@/presentation/components/HelpPanel.vue';
import OpenSourcePanel from '@/presentation/components/OpenSourcePanel.vue';
import PrivacyNotice from '@/presentation/components/PrivacyNotice.vue';
import PrivacyPanel from '@/presentation/components/PrivacyPanel.vue';
import ProPanel from '@/presentation/components/ProPanel.vue';
import SettingsPanel from '@/presentation/components/SettingsPanel.vue';
import AddressBookPanel from '@/presentation/components/foldmark/AddressBookPanel.vue';
import AssetLibraryPanel from '@/presentation/components/foldmark/AssetLibraryPanel.vue';
import DocumentListPanel from '@/presentation/components/foldmark/DocumentListPanel.vue';
import PrintProfilePanel from '@/presentation/components/foldmark/PrintProfilePanel.vue';
import WorkspacePanel from '@/presentation/components/foldmark/WorkspacePanel.vue';
import { useTheme } from '@/presentation/composables/useTheme';
import { appSettings, readSetting, writeSetting } from '@/presentation/settings/settingsRegistry';
import { useWorkspaceStore } from '@/presentation/stores/workspaceStore';

/**
 * Views the shell can show.
 *
 * The four primary ones are in the top bar; the rest are reached from the
 * settings hub, which keeps the bar scannable as an app grows.
 */
type View =
  | 'documents'
  | 'addresses'
  | 'profiles'
  | 'assets'
  | 'settings'
  | 'about'
  | 'help-manual'
  | 'help-faq'
  | 'privacy'
  | 'open-source'
  | 'pro'
  | 'diagnostics';

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

const { locale, t } = useI18n();
const { setTheme } = useTheme();
const workspace = useWorkspaceStore();

const view = ref<View>('documents');
const notice = ref(!readSetting(appSettings.introCompleted));

// Theme initialization belongs at the shell so the saved theme applies before settings open.
useTheme();

/**
 * The workspace needs the whole window; every other view reads better narrow.
 *
 * A three-pane editor squeezed into a 960 px column is the one layout that
 * makes the paper preview useless, which is the part people came for.
 */
const wide = computed(() => view.value === 'documents' && workspace.isOpen);

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

/** The primary navigation entries, in bar order. */
const PRIMARY_VIEWS: readonly View[] = ['documents', 'addresses', 'profiles', 'assets'];

function goto(next: View): void {
  view.value = next;
}

/**
 * The brand mark is the way home (R13-015): it closes the open document —
 * after the automatic copy is written — and shows the document list.
 */
async function goHome(): Promise<void> {
  if (workspace.isOpen) await workspace.close();
  goto('documents');
}

/** What the address book opens with when reached from a picker. */
const addressBookQuery = ref('');

function openAddressBook(query: string): void {
  addressBookQuery.value = query;
  goto('addresses');
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" :title="t('nav.home')" @click.prevent="goHome">
        <img class="brand-mark-image" :src="markUrl" alt="" width="28" height="28" />
        <span>
          <strong>{{ appConfig.shortName }}</strong>
          <small>{{ appConfig.organization.name }}</small>
        </span>
      </a>
      <nav :aria-label="$t('nav.primary')">
        <button
          v-for="entry in PRIMARY_VIEWS"
          :key="entry"
          class="nav-button"
          :class="{ active: view === entry }"
          :aria-pressed="view === entry"
          type="button"
          @click="goto(entry)"
        >
          {{ $t(`nav.${entry}`) }}
        </button>
        <button
          class="nav-button"
          :class="{ active: view === 'settings' }"
          :aria-pressed="view === 'settings'"
          type="button"
          @click="goto('settings')"
        >
          {{ $t('nav.settings') }}
        </button>
        <button
          class="nav-button"
          :class="{ active: view === 'about' }"
          :aria-pressed="view === 'about'"
          type="button"
          @click="goto('about')"
        >
          {{ $t('nav.about') }}
        </button>
      </nav>
    </header>

    <main :class="{ wide }">
      <template v-if="view === 'documents'">
        <WorkspacePanel
          v-if="workspace.isOpen"
          @open-address-book="openAddressBook"
          @navigate="goto($event as View)"
        />
        <DocumentListPanel v-else @navigate="goto($event as View)" />
      </template>
      <AddressBookPanel
        v-else-if="view === 'addresses'"
        :initial-query="addressBookQuery"
        @used-in-document="goto('documents')"
      />
      <PrintProfilePanel v-else-if="view === 'profiles'" />
      <AssetLibraryPanel v-else-if="view === 'assets'" />
      <SettingsPanel
        v-else-if="view === 'settings'"
        @navigate="goto($event as View)"
        @show-intro="showIntro"
        @settings-reset="onSettingsReset"
      />
      <HelpPanel v-else-if="view === 'help-manual'" document="manual" />
      <HelpPanel v-else-if="view === 'help-faq'" document="faq" />
      <PrivacyPanel v-else-if="view === 'privacy'" @settings-reset="onSettingsReset" />
      <OpenSourcePanel v-else-if="view === 'open-source'" />
      <ProPanel v-else-if="view === 'pro'" />
      <component :is="DiagnosticsPanel" v-else-if="view === 'diagnostics' && DiagnosticsPanel" />
      <AboutPanel v-else @navigate="goto($event as View)" />
    </main>

    <!-- One quiet line (R13-016); inside the editor it is dropped so the
         panes get the height. -->
    <footer v-if="!wide" class="app-footer">
      <span>{{ appConfig.organization.name }}</span>
      <span>{{ $t('app.privacy') }}</span>
    </footer>
    <PrivacyNotice :visible="notice" @accept="finishIntro" @settings="openSettings" />
  </div>
</template>
