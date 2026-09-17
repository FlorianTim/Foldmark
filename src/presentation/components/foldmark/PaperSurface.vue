<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  visibleScreenMarkers,
  type RenderBlock,
  type RenderPage,
  type RenderTextStyle,
} from '@/application/render/RenderPlan';
import { textMetricsFor } from '@/application/render/textMetrics';
import { cssMm, roundMm } from '@/domain/common/Units';
import {
  DEFAULT_DOCUMENT_THEME,
  ptToMm,
  type DocumentTheme,
} from '@/domain/document/DocumentTheme';
import { applyPageNumberPattern } from '@/domain/document/FoldmarkDocument';
import { isRegionMarker, type PrintMarker } from '@/domain/print/PrintMarker';
import SafeMarkdown from '@/presentation/components/SafeMarkdown.vue';
import { themeVariables } from '@/presentation/markdown/themeVariables';

/**
 * One sheet of paper.
 *
 * Everything here is positioned in **CSS millimetres**, taken straight from the
 * render plan. No conversion, no pixel arithmetic, no device-pixel ratio: the
 * browser owns the physical mapping, which is exactly the property that makes a
 * fold mark land at 105 mm on the printer.
 *
 * Screen zoom is a `transform: scale()` applied by the *parent*, deliberately
 * outside this component. A transform does not change layout, so a sheet at
 * 40 % and the same sheet at 100 % are the same millimetres — the zoom control
 * physically cannot move a mark.
 *
 * Styles are bound with `:style` rather than written as `style` attributes:
 * Vue applies bound styles through CSSOM, which the app's strict
 * `style-src 'self'` policy allows, while a literal inline attribute would be
 * blocked.
 */
const props = defineProps<{
  page: RenderPage;
  /** Object URLs for the assets this page references, keyed by asset id. */
  assetUrls: Readonly<Record<string, string>>;
  /** Whether markers are drawn at all. Hiding them never changes what prints. */
  showGuides: boolean;
  /** The document theme the plan was laid out with; the defaults when absent. */
  theme?: DocumentTheme;
  /** Which palette values to use: the screen ones for the preview, the print ones for the copy. */
  medium?: 'screen' | 'print';
  /** Language for dates in the body. */
  locale?: string;
}>();

const { t } = useI18n();

const theme = computed(() => props.theme ?? DEFAULT_DOCUMENT_THEME);
const metrics = computed(() => textMetricsFor(theme.value));

/**
 * The sheet's size, plus the document theme as custom properties: font family,
 * paragraph gap, small size and one `--md-color-*` per palette name, so the
 * static templates in `SafeMarkdown` can refer to a colour by name without
 * ever seeing a value from the document text.
 */
const paperStyle = computed(() => ({
  width: cssMm(props.page.page.widthMm),
  height: cssMm(props.page.page.heightMm),
  ...themeVariables(theme.value, props.medium ?? 'screen'),
  '--md-small-size': `${roundMm(ptToMm(theme.value.smallSizePt))}mm`,
  '--md-line-height': `${roundMm(metrics.value.body.lineHeightMm)}mm`,
  // The gap in millimetres, the unit the height estimate reasoned in.
  '--md-paragraph-gap': `${roundMm(theme.value.paragraphSpacing * metrics.value.body.lineHeightMm)}mm`,
}));

const visibleMarkers = computed(() => visibleScreenMarkers(props.page, props.showGuides));

function markerStyle(marker: PrintMarker): Record<string, string> {
  const color = marker.print ? 'var(--fm-mark-print)' : 'var(--fm-guide)';
  const width = cssMm(marker.strokeWidthMm);

  if (isRegionMarker(marker)) {
    return {
      left: cssMm(marker.xMm),
      top: cssMm(marker.yMm),
      width: cssMm(marker.widthMm ?? 0),
      height: cssMm(marker.heightMm ?? 0),
      border: `${width} ${marker.lineStyle} ${color}`,
    };
  }

  const length = marker.widthMm ?? marker.heightMm ?? 0;
  return marker.orientation === 'vertical'
    ? {
        left: cssMm(marker.xMm),
        top: cssMm(marker.yMm),
        height: cssMm(marker.heightMm ?? length),
        borderLeft: `${width} ${marker.lineStyle} ${color}`,
      }
    : {
        left: cssMm(marker.xMm),
        top: cssMm(marker.yMm),
        width: cssMm(length),
        borderTop: `${width} ${marker.lineStyle} ${color}`,
      };
}

/** The number line, worded in the UI language: `2`, `Seite 2`, `Seite 2 von 5`. */
function pageNumberText(block: Extract<RenderBlock, { kind: 'pageNumber' }>): string {
  switch (block.format) {
    case 'number':
      return String(block.page);
    case 'page':
      return t('render.pageNumber.page', { page: block.page });
    case 'slash':
      return `${block.page} / ${block.total}`;
    case 'of':
      return t('render.pageNumber.of', { page: block.page, total: block.total });
    case 'custom':
      return block.pattern
        ? applyPageNumberPattern(block.pattern, block.page, block.total)
        : t('render.pageNumber.pageOf', { page: block.page, total: block.total });
    default:
      return t('render.pageNumber.pageOf', { page: block.page, total: block.total });
  }
}

function blockStyle(block: RenderBlock): Record<string, string> {
  const base: Record<string, string> = {
    left: cssMm(block.box.xMm),
    top: cssMm(block.box.yMm),
    width: cssMm(block.box.widthMm),
    height: cssMm(block.box.heightMm),
  };
  if (block.kind === 'image') {
    return {
      ...base,
      opacity: String(block.opacity),
      transform: block.rotationDeg ? `rotate(${block.rotationDeg}deg)` : '',
      zIndex: block.layer === 'background' ? '0' : block.layer === 'foreground' ? '3' : '1',
    };
  }
  return { ...base, ...textStyle(block.style), zIndex: '2' };
}

/** Type size and leading come from the same metrics the layout estimated with. */
function textStyle(style: RenderTextStyle): Record<string, string> {
  const text = metrics.value[style];
  return {
    fontSize: `${roundMm(text.fontSizeMm)}mm`,
    lineHeight: `${roundMm(text.lineHeightMm)}mm`,
  };
}

function markerLabel(marker: PrintMarker): string {
  return marker.label ?? t(`marker.kind.${marker.kind}`);
}
</script>

<template>
  <div class="paper" :style="paperStyle" :data-surface="page.surface">
    <div
      v-for="marker in visibleMarkers"
      :key="marker.id"
      class="print-marker"
      :class="[`marker-${marker.kind}`, marker.print ? 'marker-printed' : 'marker-preview']"
      :style="markerStyle(marker)"
      :data-print="marker.print"
      :aria-label="markerLabel(marker)"
      role="presentation"
    />

    <div
      v-for="(block, index) in page.blocks"
      :key="`${block.region}-${index}`"
      class="paper-block"
      :class="`block-${block.kind}`"
      :data-style="block.kind === 'image' ? undefined : block.style"
      :data-weight="block.kind === 'lines' ? block.weight : undefined"
      :style="blockStyle(block)"
    >
      <template v-if="block.kind === 'lines'">
        <p v-for="(line, lineIndex) in block.lines" :key="lineIndex" class="paper-line">
          {{ line }}
        </p>
      </template>

      <SafeMarkdown
        v-else-if="block.kind === 'markdown'"
        :source="block.source"
        :locale="locale"
        :asset-urls="assetUrls"
      />

      <dl v-else-if="block.kind === 'fields'" class="paper-fields">
        <template v-for="entry in block.entries" :key="entry.labelKey">
          <dt>{{ t(`render.field.${entry.labelKey}`) }}</dt>
          <dd>{{ entry.value }}</dd>
        </template>
      </dl>

      <p
        v-else-if="block.kind === 'pageNumber'"
        class="paper-line paper-page-number"
        :style="{ textAlign: block.align }"
      >
        {{ pageNumberText(block) }}
      </p>

      <img
        v-else
        class="paper-image"
        :src="assetUrls[block.assetId] ?? ''"
        :style="{ objectFit: block.fit === 'stretch' ? 'fill' : block.fit }"
        alt=""
      />
    </div>
  </div>
</template>
