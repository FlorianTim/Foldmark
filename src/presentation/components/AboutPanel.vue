<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import markUrl from '@/assets/icons/logo.svg';
import { appConfig } from '@/config';
import { publicResourceLinks } from '@/config/publicResources';

/**
 * Everything shown here comes from validated configuration. The panel adds no
 * product facts of its own, so a wrong name or version is a configuration bug
 * with one place to fix, not a string hunt across components.
 *
 * The order is the one a reader expects of an About view (R13-008): the
 * application and its version, who makes it, the licence, then the privacy and
 * open-source views, then the repository and build for those who want them.
 */
const emit = defineEmits<{ navigate: [view: 'privacy' | 'open-source'] }>();

const { t } = useI18n();
const repositoryUrl = `https://github.com/${appConfig.repositoryOwner}/${appConfig.repositoryName}`;
/** Set by the release pipeline; absent in local builds, and then simply not shown. */
const buildId = (import.meta.env.VITE_BUILD_ID as string | undefined)?.trim() || null;
</script>

<template>
  <section class="panel" aria-labelledby="about-title">
    <div class="about-identity">
      <img class="brand-mark-image about-mark" :src="markUrl" alt="" width="48" height="48" />
      <div>
        <h1 id="about-title">{{ t('about.title') }}</h1>
        <p class="about-version">{{ t('about.versionLine', { version: appConfig.version }) }}</p>
      </div>
    </div>
    <p>{{ t('about.description') }}</p>

    <dl class="metadata">
      <div>
        <dt>{{ t('about.application') }}</dt>
        <dd>{{ appConfig.name }}</dd>
      </div>
      <div>
        <dt>{{ t('about.version') }}</dt>
        <dd>{{ appConfig.version }}</dd>
      </div>
      <div>
        <dt>{{ t('about.organization') }}</dt>
        <dd>
          <a :href="appConfig.organization.url" rel="noreferrer">
            {{ appConfig.organization.name }}
          </a>
        </dd>
      </div>
      <div>
        <dt>{{ t('about.license') }}</dt>
        <dd>{{ appConfig.license }}</dd>
      </div>
      <div>
        <dt>{{ t('about.repository') }}</dt>
        <dd>
          <a :href="repositoryUrl" rel="noopener noreferrer">{{ t('about.repositoryLink') }}</a>
        </dd>
      </div>
      <div v-if="buildId">
        <dt>{{ t('about.build') }}</dt>
        <dd>
          <code>{{ buildId }}</code>
        </dd>
      </div>
    </dl>

    <div class="about-sections">
      <div class="privacy-card">
        <h2>{{ t('about.privacy') }}</h2>
        <p>{{ t('about.privacyBody') }}</p>
        <button class="btn btn-outline" type="button" @click="emit('navigate', 'privacy')">
          {{ t('about.privacyLink') }}
        </button>
      </div>

      <div class="privacy-card">
        <h2>{{ t('about.libraries') }}</h2>
        <p>{{ t('about.librariesBody') }}</p>
        <button class="btn btn-outline" type="button" @click="emit('navigate', 'open-source')">
          {{ t('about.notices') }}
        </button>
      </div>
    </div>

    <p class="about-links">
      <a :href="publicResourceLinks.website" rel="noreferrer">{{ t('about.website') }}</a>
    </p>
  </section>
</template>
