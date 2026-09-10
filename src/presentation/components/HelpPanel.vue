<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import SafeMarkdown from '@/presentation/components/SafeMarkdown.vue';
import faqDe from '@/presentation/help/faq.de.md?raw';
import faqEn from '@/presentation/help/faq.en.md?raw';
import manualDe from '@/presentation/help/manual.de.md?raw';
import manualEn from '@/presentation/help/manual.en.md?raw';

/**
 * Bundled help documents, rendered offline.
 *
 * The documents are imported as raw strings, so they are part of the bundle
 * rather than a runtime fetch: the manual has to work on a blocked
 * connection, and a network request here would contradict the privacy
 * promise the app makes elsewhere.
 *
 * The variant follows the **rendered** locale, not the stored preference —
 * the stored value can be absent while the UI already shows a language, and
 * a manual in a different language than the surrounding page is a bug that
 * is hard to notice and embarrassing to ship. Unsupported locales fall back
 * to English rather than failing.
 */
const props = defineProps<{ document: 'manual' | 'faq' }>();

const { t, locale } = useI18n();

const documents = {
  manual: { de: manualDe, en: manualEn },
  faq: { de: faqDe, en: faqEn },
} as const;

const source = computed(() => {
  const variants = documents[props.document];
  return locale.value === 'de' ? variants.de : variants.en;
});

const title = computed(() => (props.document === 'manual' ? t('help.manual') : t('help.faq')));
</script>

<template>
  <section class="panel" aria-labelledby="help-title">
    <h1 id="help-title">{{ title }}</h1>
    <SafeMarkdown :source="source" />
  </section>
</template>
