<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

/**
 * The libraries Foldmark is built from, as a table rather than a wall of
 * Markdown (R13-008): name, version, licence, link — runtime packages first,
 * development tooling after, because a reader asking "what runs in my
 * browser?" wants the short list before the long one.
 *
 * The data is `THIRD-PARTY-NOTICES.generated.json`, written by
 * `npm run licenses:generate` from the lockfile, and read from the app's own
 * origin when the view opens. Nothing is parsed from Markdown and nothing is
 * fetched from anywhere else.
 */
interface LibraryNotice {
  readonly name: string;
  readonly version: string;
  readonly license: string;
  readonly homepage?: string;
  readonly repository?: string;
  readonly runtime: boolean;
}

const { t } = useI18n();

const notices = ref<readonly LibraryNotice[]>([]);
const failed = ref(false);
const query = ref('');
const noticesUrl = `${import.meta.env.BASE_URL}THIRD-PARTY-NOTICES.generated.json`;
const markdownUrl = `${import.meta.env.BASE_URL}THIRD-PARTY-NOTICES.generated.md`;

onMounted(async () => {
  try {
    const response = await fetch(noticesUrl);
    if (!response.ok) throw new Error(String(response.status));
    const parsed: unknown = await response.json();
    notices.value = Array.isArray(parsed) ? parsed.filter(isNotice) : [];
  } catch {
    failed.value = true;
  }
});

/** Only well-formed rows reach the template; a hand-edited file cannot break the view. */
function isNotice(value: unknown): value is LibraryNotice {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.name === 'string' &&
    typeof row.version === 'string' &&
    typeof row.license === 'string'
  );
}

/** A link is shown only for `https:` targets; `git://` and `git+ssh:` remotes stay text. */
function linkOf(notice: LibraryNotice): string | null {
  for (const candidate of [notice.homepage, notice.repository]) {
    if (!candidate) continue;
    const cleaned = candidate.replace(/^git\+/u, '').replace(/\.git$/u, '');
    if (/^https:\/\//u.test(cleaned)) return cleaned;
  }
  return null;
}

const filtered = computed(() => {
  const term = query.value.trim().toLowerCase();
  return term
    ? notices.value.filter(
        (notice) =>
          notice.name.toLowerCase().includes(term) || notice.license.toLowerCase().includes(term),
      )
    : notices.value;
});

const groups = computed(() => [
  { id: 'runtime', rows: filtered.value.filter((notice) => notice.runtime !== false) },
  { id: 'development', rows: filtered.value.filter((notice) => notice.runtime === false) },
]);
</script>

<template>
  <section class="panel" aria-labelledby="open-source-title">
    <h1 id="open-source-title">{{ t('openSource.title') }}</h1>
    <p>{{ t('openSource.description') }}</p>

    <div class="open-source-tools">
      <label class="field field-grow">
        <span>{{ t('openSource.search') }}</span>
        <input v-model="query" class="input input-bordered" type="search" autocomplete="off" />
      </label>
      <a class="btn btn-ghost btn-sm" :href="markdownUrl" target="_blank" rel="noopener noreferrer">
        {{ t('openSource.rawNotices') }}
      </a>
    </div>

    <p v-if="failed" class="alert alert-warning" role="status">{{ t('openSource.unavailable') }}</p>
    <p v-else-if="notices.length === 0" aria-live="polite">{{ t('openSource.loading') }}</p>

    <template v-for="group in groups" :key="group.id">
      <h2>{{ t(`openSource.group.${group.id}`, { count: group.rows.length }) }}</h2>
      <p v-if="group.rows.length === 0 && notices.length" class="empty-state">
        {{ t('openSource.noMatches') }}
      </p>
      <div v-else-if="group.rows.length" class="open-source-table">
        <table>
          <thead>
            <tr>
              <th>{{ t('openSource.column.name') }}</th>
              <th>{{ t('openSource.column.version') }}</th>
              <th>{{ t('openSource.column.license') }}</th>
              <th>{{ t('openSource.column.link') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="notice in group.rows" :key="`${notice.name}@${notice.version}`">
              <td>
                <code>{{ notice.name }}</code>
              </td>
              <td>{{ notice.version }}</td>
              <td>{{ notice.license }}</td>
              <td>
                <a v-if="linkOf(notice)" :href="linkOf(notice) ?? ''" rel="noopener noreferrer">
                  {{ t('openSource.project') }}
                </a>
                <span v-else class="open-source-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
