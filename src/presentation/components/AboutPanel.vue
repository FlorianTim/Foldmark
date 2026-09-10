<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { appConfig } from '@/config';
import { publicResourceLinks } from '@/config/publicResources';

const { t } = useI18n();
const noticesUrl = `${import.meta.env.BASE_URL}THIRD-PARTY-NOTICES.generated.md`;
</script>

<template>
  <section class="panel" aria-labelledby="about-title">
    <h1 id="about-title">{{ t('about.title') }}</h1>
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
    </dl>
    <h2>{{ t('about.libraries') }}</h2>
    <a class="btn btn-outline" :href="noticesUrl" target="_blank" rel="noopener noreferrer">
      {{ t('about.notices') }}
    </a>
    <a class="btn btn-ghost" :href="publicResourceLinks.website">
      {{ t('about.website') }}
    </a>
  </section>
</template>
