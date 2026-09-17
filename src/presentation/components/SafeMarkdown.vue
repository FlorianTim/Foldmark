<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import QrCodeFigure from '@/presentation/components/QrCodeFigure.vue';
import { SafeInline } from '@/presentation/components/SafeInline';
import { parseMarkdown, type MarkdownBlock } from '@/presentation/markdown/parseMarkdown';

/**
 * Renders the bounded Markdown subset through static templates.
 *
 * Nothing here is ever assigned as raw markup: every token is text interpolated by
 * Vue, every element is one the template names, and a link's `href` is only
 * what the parser already vetted (`http`, `https`, `mailto`). That is what
 * lets the same component draw the preview and the print copy without a
 * sanitizer in the trust path (ADR 0011).
 *
 * Block directives (change 0017) are drawn by name from the catalogue: an
 * indent, an alignment, a note box, a signature line. An unknown directive is
 * its content in a marked wrapper — visible as text, never as an error.
 */
const props = defineProps<{
  source?: string;
  blocks?: readonly MarkdownBlock[];
  /** Language for date tokens; the UI language when the document has none. */
  locale?: string;
  /** Object URLs for local assets referenced by images. */
  assetUrls?: Readonly<Record<string, string>>;
}>();
const { t, locale: uiLocale } = useI18n();
const rendered = computed(() => props.blocks ?? parseMarkdown(props.source ?? ''));
const dateLocale = computed(() => props.locale ?? uiLocale.value);
const urls = computed(() => props.assetUrls ?? {});
const missing = computed(() => t('render.assetMissingInline'));

/**
 * Heading levels map to real elements, so the document outline is real. The
 * page title is the `h1`, so a Markdown `#` becomes `h2`; the last two levels
 * share `h6`, the deepest element there is.
 */
const headingTag = (level: number): 'h2' | 'h3' | 'h4' | 'h5' | 'h6' =>
  (['h2', 'h3', 'h4', 'h5', 'h6', 'h6'] as const)[Math.min(Math.max(level, 1), 6) - 1];

/** Class and style for a known block directive; unknown ones get the marker class only. */
function directiveClass(block: Extract<MarkdownBlock, { kind: 'directive' }>): string[] {
  if (!block.known) return ['md-unknown-block'];
  const classes = [`md-${block.name}`];
  if (block.name === 'align') classes.push(`md-align-${block.attributes.to}`);
  if (block.name === 'note') classes.push(`md-note-${block.attributes.type}`);
  return classes;
}

/** The one attribute the stylesheet keys on: the indent level or the signature's lines. */
function directiveData(block: Extract<MarkdownBlock, { kind: 'directive' }>): string | undefined {
  if (!block.known) return undefined;
  if (block.name === 'indent') return block.attributes.level;
  if (block.name === 'signature') return block.attributes.lines;
  return undefined;
}
</script>

<template>
  <div class="safe-markdown">
    <template v-for="(block, blockIndex) in rendered" :key="blockIndex">
      <component :is="headingTag(block.level)" v-if="block.kind === 'heading'">
        <SafeInline
          :tokens="block.content"
          :locale="dateLocale"
          :asset-urls="urls"
          :missing-asset-label="missing"
        />
      </component>

      <p v-else-if="block.kind === 'paragraph'">
        <SafeInline
          :tokens="block.content"
          :locale="dateLocale"
          :asset-urls="urls"
          :missing-asset-label="missing"
        />
      </p>

      <component
        :is="block.ordered ? 'ol' : 'ul'"
        v-else-if="block.kind === 'list'"
        :start="block.start"
      >
        <li
          v-for="(item, itemIndex) in block.items"
          :key="itemIndex"
          :class="item.depth ? `md-depth-${item.depth}` : undefined"
        >
          <SafeInline
            :tokens="item.content"
            :locale="dateLocale"
            :asset-urls="urls"
            :missing-asset-label="missing"
          />
        </li>
      </component>

      <blockquote v-else-if="block.kind === 'blockquote'">
        <SafeMarkdown :blocks="block.blocks" :locale="dateLocale" :asset-urls="urls" />
      </blockquote>

      <table v-else-if="block.kind === 'table'">
        <thead>
          <tr>
            <th v-for="(cell, cellIndex) in block.header" :key="cellIndex">
              <SafeInline
                :tokens="cell"
                :locale="dateLocale"
                :asset-urls="urls"
                :missing-asset-label="missing"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in block.rows" :key="rowIndex">
            <td v-for="(cell, cellIndex) in row" :key="cellIndex">
              <SafeInline
                :tokens="cell"
                :locale="dateLocale"
                :asset-urls="urls"
                :missing-asset-label="missing"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <hr v-else-if="block.kind === 'rule'" />

      <!-- A page break is a layout instruction; the render plan already acted on it. -->
      <div v-else-if="block.kind === 'pageBreak'" class="md-page-break" aria-hidden="true" />

      <!-- A QR code is encoded from its payload every time it is drawn (change 0040). -->
      <QrCodeFigure
        v-else-if="block.kind === 'qr'"
        :payload="block.payload"
        :size-mm="block.sizeMm"
        :align="block.align"
        :error-correction="block.errorCorrection"
      />

      <div
        v-else-if="block.kind === 'directive'"
        :class="directiveClass(block)"
        :data-level="directiveData(block)"
        :data-directive="block.known ? undefined : block.name"
      >
        <SafeMarkdown :blocks="block.blocks" :locale="dateLocale" :asset-urls="urls" />
      </div>
    </template>
  </div>
</template>
