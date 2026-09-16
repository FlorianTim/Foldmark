<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { summarizeIssues, type ValidationIssue } from '@/domain/common/ValidationIssue';
import AppDialog from '@/presentation/components/AppDialog.vue';
import AppIcon from '@/presentation/components/AppIcon.vue';
import { useWorkspaceStore } from '@/presentation/stores/workspaceStore';

/**
 * "Check document" (R13-010): what is wrong, and how much it matters, as a
 * view of its own rather than a panel inside the print dialog.
 *
 * - **error** — this output cannot be produced technically. Rare on purpose.
 * - **warning** — it will be produced and will probably be wrong on paper.
 * - **info** — worth knowing; the 100 % scaling reminder lives here.
 *
 * Warnings never block anything. A letter without a recipient prints, an
 * empty sheet prints; the dialog only says so. Messages come from translation
 * keys carried by the issue, so German and English stay complete.
 */
defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const workspace = useWorkspaceStore();
const { t } = useI18n();

const issues = computed(() => workspace.issues);
const summary = computed(() => summarizeIssues(issues.value));

const GROUPS = ['error', 'warning', 'info'] as const;
const grouped = computed(() =>
  GROUPS.map((severity) => ({
    severity,
    issues: issues.value.filter((issue) => issue.severity === severity),
  })),
);

function message(issue: ValidationIssue): string {
  return t(`validation.${issue.code}`, issue.params ?? {});
}
</script>

<template>
  <AppDialog :open="open" :title="t('check.title')" size="md" @close="emit('close')">
    <p class="check-summary" :class="summary.error ? 'is-blocked' : 'is-ready'" role="status">
      <AppIcon :name="summary.error ? 'error' : 'check-circle'" />
      <strong>{{ summary.error ? t('validation.blocked') : t('check.ready') }}</strong>
      <span>{{
        t('validation.counts', {
          errors: summary.error,
          warnings: summary.warning,
          infos: summary.info,
        })
      }}</span>
    </p>
    <p class="export-note">
      {{ t('check.explain', { target: t(`export.target.${workspace.target}`) }) }}
    </p>

    <template v-for="group in grouped" :key="group.severity">
      <section v-if="group.issues.length" class="check-group">
        <h3 class="check-heading">
          <AppIcon
            :name="
              group.severity === 'error'
                ? 'error'
                : group.severity === 'warning'
                  ? 'warning'
                  : 'info'
            "
            size="sm"
          />
          {{ t(`check.group.${group.severity}`) }}
        </h3>
        <ul class="validation-list">
          <li
            v-for="(issue, index) in group.issues"
            :key="`${issue.code}-${issue.path ?? index}`"
            :class="`issue-${issue.severity}`"
          >
            <span class="issue-severity">{{ t(`validation.severity.${issue.severity}`) }}</span>
            <span class="issue-message">{{ message(issue) }}</span>
            <code v-if="issue.path" class="issue-path">{{ issue.path }}</code>
          </li>
        </ul>
      </section>
    </template>
    <p v-if="issues.length === 0" class="empty-state">{{ t('validation.none') }}</p>

    <template #footer>
      <button type="button" class="btn btn-primary" @click="emit('close')">
        {{ t('dialog.close') }}
      </button>
    </template>
  </AppDialog>
</template>
