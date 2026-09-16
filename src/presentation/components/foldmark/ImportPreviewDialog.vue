<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { DecodeResult } from '@/application/ports/MarkdownDocumentCodec';
import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import { inlineAssetIds } from '@/domain/markdown/parseMarkdown';
import AppDialog from '@/presentation/components/AppDialog.vue';
import AppIcon from '@/presentation/components/AppIcon.vue';
import { useLibraryStore } from '@/presentation/stores/libraryStore';

/**
 * What a dropped or chosen Markdown file would become, before anything is
 * stored (R14-014). The codec has already decoded the file — this dialog is
 * a view of that result: the title, kind and profile it would get, the
 * findings (a missing front matter, an unknown kind, a version the app does
 * not know), the front-matter keys Foldmark does not interpret but keeps,
 * and the images the body references that are not in the library. Import
 * or skip; a file that could not be read at all shows its original text so
 * nothing is lost.
 */
const props = defineProps<{
  open: boolean;
  fileName: string;
  result: DecodeResult | null;
  /** How many files wait behind this one, for "1 of 3". */
  position?: { index: number; total: number };
}>();
const emit = defineEmits<{ import: []; skip: [] }>();
const { t } = useI18n();
const library = useLibraryStore();

const document = computed(() => (props.result?.ok ? props.result.document : null));
const issues = computed<readonly ValidationIssue[]>(() => props.result?.issues ?? []);
const preservedKeys = computed(() => Object.keys(document.value?.preserved ?? {}));
const profile = computed(() =>
  library.printProfiles.find((candidate) => candidate.id === document.value?.printProfileId),
);
/** Images the body references that this library does not have. */
const missingAssets = computed(() => {
  const body = document.value?.bodyMarkdown ?? '';
  const known = new Set(library.assets.map((asset) => asset.id));
  return inlineAssetIds(body).filter((id) => !known.has(id));
});
const sizeKb = computed(() => {
  const source = props.result?.ok
    ? props.result.document.bodyMarkdown.length
    : (props.result?.source.length ?? 0);
  return Math.max(1, Math.round(source / 1024));
});

function issueMessage(issue: ValidationIssue): string {
  return t(`validation.${issue.code}`, issue.params ?? {});
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="
      position && position.total > 1
        ? t('documents.importPreviewOf', { index: position.index, total: position.total })
        : t('documents.importPreview')
    "
    size="md"
    @close="emit('skip')"
  >
    <p class="import-file">
      <AppIcon name="documents" size="sm" />
      <strong>{{ fileName }}</strong>
      <small>{{ t('documents.importSize', { kb: sizeKb }) }}</small>
    </p>

    <dl v-if="document" class="import-facts" data-testid="import-preview">
      <dt>{{ t('metadata.title') }}</dt>
      <dd>{{ document.title }}</dd>
      <dt>{{ t('documents.column.kind') }}</dt>
      <dd>{{ t(`documents.kind.${document.kind}`) }}</dd>
      <dt>{{ t('metadata.printProfile') }}</dt>
      <dd>{{ profile?.name ?? document.printProfileId }}</dd>
      <template v-if="preservedKeys.length">
        <dt>{{ t('documents.importPreserved') }}</dt>
        <dd>
          <code v-for="key in preservedKeys" :key="key" class="import-key">{{ key }}</code>
        </dd>
      </template>
      <template v-if="missingAssets.length">
        <dt>{{ t('documents.importAssets') }}</dt>
        <dd>{{ t('documents.importAssetsMissing', { count: missingAssets.length }) }}</dd>
      </template>
    </dl>

    <ul v-if="issues.length" class="validation-list">
      <li v-for="(issue, index) in issues" :key="index" :class="`issue-${issue.severity}`">
        <span class="issue-severity">{{ t(`validation.severity.${issue.severity}`) }}</span>
        <span class="issue-message">{{ issueMessage(issue) }}</span>
      </li>
    </ul>

    <template v-if="result && !result.ok">
      <p>{{ t('documents.importRejected') }}</p>
      <label class="field">
        <span>{{ t('documents.originalSource') }}</span>
        <textarea class="textarea textarea-bordered" rows="6" :value="result.source" readonly />
      </label>
    </template>

    <template #footer>
      <button type="button" class="btn btn-ghost" data-testid="import-skip" @click="emit('skip')">
        {{ position && position.total > 1 ? t('documents.importSkip') : t('dialog.cancel') }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="!document"
        data-testid="import-confirm"
        @click="emit('import')"
      >
        <AppIcon name="import" />
        <span>{{ t('documents.importConfirm') }}</span>
      </button>
    </template>
  </AppDialog>
</template>
