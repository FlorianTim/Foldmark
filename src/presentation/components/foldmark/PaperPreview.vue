<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { RenderPlan } from '@/application/render/RenderPlan';
import { referencedAssetIds } from '@/application/render/RenderPlan';
import { useAssetUrls } from '@/presentation/composables/useAssetUrls';
import { usePrintPageSize } from '@/presentation/composables/usePrintPageSize';
import {
  appSettings,
  readSetting,
  writeSetting,
  PREVIEW_ZOOM_IDS,
  type PreviewZoom,
} from '@/presentation/settings/settingsRegistry';
import AppIcon from '@/presentation/components/AppIcon.vue';
import PaperSurface from '@/presentation/components/foldmark/PaperSurface.vue';

/**
 * The paper, at a size you can work with.
 *
 * The one invariant this component protects: **zoom is display only**. The
 * sheet is laid out in millimetres by `PaperSurface`, and scaling happens here
 * as a CSS transform on a wrapper. A transform does not change layout, so no
 * zoom level can alter a single coordinate that reaches the printer — which is
 * the difference between a preview and a promise.
 *
 * `fit-page` and `fit-width` are computed from the container size, so the
 * factor is arithmetic rather than a guess, and it is recomputed on resize.
 * `actual` is 1, which is only truly life-size if the operating system's
 * display scaling is 100 % — hence the reminder next to it rather than a claim.
 */
const props = defineProps<{
  plan: RenderPlan | null;
  surfaceIndex: number;
  /**
   * Whether the document prints its physical marks. The second switch next
   * to the guides toggle (R13-004): guides are a preview courtesy, printed
   * marks are a document decision, and each has its own control.
   */
  printedMarks?: boolean;
  /** Whether the preview currently fills the workspace (focus mode). */
  maximized?: boolean;
}>();
const emit = defineEmits<{
  selectSurface: [index: number];
  togglePrintedMarks: [on: boolean];
  /** Quick print: straight to the print dialog (R13-012). */
  print: [];
  maximize: [];
}>();

const { t } = useI18n();

/** CSS reference pixels per millimetre, fixed by the CSS specification. */
const PX_PER_MM = 96 / 25.4;

const zoom = ref<PreviewZoom>(readSetting(appSettings.previewZoom));
const showGuides = ref(readSetting(appSettings.showPreviewGuides));
const viewport = ref<HTMLDivElement | null>(null);
const viewportSize = ref({ width: 0, height: 0 });

const pages = computed(() => props.plan?.pages ?? []);
const page = computed(() => pages.value[props.surfaceIndex] ?? pages.value[0] ?? null);
const pageSize = computed(() => page.value?.page ?? null);
const stack = ref<HTMLDivElement | null>(null);

/**
 * Choosing a page from the navigator scrolls it into view.
 *
 * Only from the navigator (R13-007): a watch on `surfaceIndex` fired on every
 * reset — a document change, a profile switch, a re-render — and dragged the
 * scroll position back to the top while the reader was halfway down page
 * three. The pages themselves are all there; nothing else moves the viewport.
 */
function selectPage(index: number): void {
  emit('selectSurface', index);
  const target = stack.value?.querySelectorAll<HTMLElement>('.preview-stage')[index];
  target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}
const assetIds = computed(() => (props.plan ? referencedAssetIds(props.plan) : []));
const assetUrls = useAssetUrls(assetIds);

usePrintPageSize(pageSize);

const scale = computed(() => {
  const size = pageSize.value;
  if (!size || zoom.value === 'actual') return 1;
  const { width, height } = viewportSize.value;
  if (width === 0) return 1;

  const horizontal = width / (size.widthMm * PX_PER_MM);
  if (zoom.value === 'fit-width') return clamp(horizontal);
  return clamp(Math.min(horizontal, height / (size.heightMm * PX_PER_MM)));
});

/** Keeps a pathological page from collapsing to nothing or filling the screen. */
function clamp(value: number): number {
  return Math.min(Math.max(value, 0.1), 4);
}

/** The wrapper reserves the scaled size, because a transform reserves none. */
const stageStyle = computed(() => {
  const size = pageSize.value;
  if (!size) return {};
  return {
    width: `${size.widthMm * PX_PER_MM * scale.value}px`,
    height: `${size.heightMm * PX_PER_MM * scale.value}px`,
  };
});

const sheetStyle = computed(() => ({
  transform: `scale(${scale.value})`,
  transformOrigin: 'top left',
}));

function setZoom(next: PreviewZoom): void {
  zoom.value = next;
  writeSetting(appSettings.previewZoom, next);
}

function toggleGuides(): void {
  showGuides.value = !showGuides.value;
  writeSetting(appSettings.showPreviewGuides, showGuides.value);
}

let observer: ResizeObserver | null = null;

/**
 * Reads the viewport size, writing only when it changed. `ResizeObserver`
 * also reports when content inside scrolls past a scrollbar threshold; an
 * unchanged size written again would recompute the scale and re-lay the
 * pages while the reader scrolls (R13-007).
 */
function measure(): void {
  const element = viewport.value;
  if (!element) return;
  const next = { width: element.clientWidth - 32, height: element.clientHeight - 32 };
  if (next.width !== viewportSize.value.width || next.height !== viewportSize.value.height) {
    viewportSize.value = next;
  }
}

onMounted(() => {
  measure();
  if (typeof globalThis.ResizeObserver === 'function' && viewport.value) {
    observer = new globalThis.ResizeObserver(measure);
    observer.observe(viewport.value);
  }
});

onBeforeUnmount(() => observer?.disconnect());

/** The page navigator: three buttons up to three pages, a select and arrows beyond (R13-012). */
const compactNavigator = computed(() => pages.value.length > 3);
const currentPage = computed(() => Math.min(props.surfaceIndex, pages.value.length - 1));

function stepPage(step: number): void {
  const next = currentPage.value + step;
  if (next >= 0 && next < pages.value.length) selectPage(next);
}

/** The menu bar drives the guides toggle and the zoom through these. */
defineExpose({ toggleGuides, setZoom, showGuides, zoom });
</script>

<template>
  <section class="paper-preview" :aria-label="t('preview.title')">
    <div class="preview-controls">
      <div class="preview-zoom" role="group" :aria-label="t('preview.zoomLabel')">
        <button
          v-for="option in PREVIEW_ZOOM_IDS"
          :key="option"
          type="button"
          class="btn btn-sm"
          :class="[
            zoom === option ? 'btn-primary' : 'btn-ghost',
            option !== 'actual' && 'btn-square',
          ]"
          :aria-pressed="zoom === option"
          :aria-label="t(`preview.zoom.${option}`)"
          :title="t(`preview.zoom.${option}`)"
          @click="setZoom(option)"
        >
          <AppIcon v-if="option === 'fit-page'" name="fit-page" />
          <AppIcon v-else-if="option === 'fit-width'" name="fit-width" />
          <span v-else>{{ t(`preview.zoom.${option}`) }}</span>
        </button>
      </div>

      <div class="preview-switches" role="group" :aria-label="t('preview.marksLabel')">
        <button
          type="button"
          class="btn btn-sm btn-ghost"
          :aria-pressed="showGuides"
          :title="t('preview.guidesHint')"
          @click="toggleGuides"
        >
          <AppIcon :name="showGuides ? 'guides-visible' : 'guides-hidden'" />
          <span>{{ showGuides ? t('preview.hideGuides') : t('preview.showGuides') }}</span>
        </button>
        <label v-if="printedMarks !== undefined" class="field-inline preview-printed-marks">
          <input
            type="checkbox"
            class="checkbox checkbox-sm"
            :checked="printedMarks"
            :title="t('preview.printedMarksHint')"
            @change="emit('togglePrintedMarks', ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ t('preview.printedMarks') }}</span>
        </label>
      </div>

      <div class="preview-tools" role="group" :aria-label="t('preview.toolsLabel')">
        <button
          type="button"
          class="btn btn-sm btn-ghost btn-square"
          :aria-label="t('workspace.print')"
          :title="t('preview.quickPrint')"
          data-testid="preview-print"
          @click="emit('print')"
        >
          <AppIcon name="print" />
        </button>
        <button
          v-if="maximized !== undefined"
          type="button"
          class="btn btn-sm btn-ghost btn-square"
          :aria-label="maximized ? t('workspace.exitFocus') : t('preview.maximize')"
          :title="maximized ? t('workspace.exitFocus') : t('preview.maximize')"
          :aria-pressed="maximized"
          data-testid="preview-maximize"
          @click="emit('maximize')"
        >
          <AppIcon :name="maximized ? 'minimize' : 'maximize'" />
        </button>
      </div>

      <!-- Up to three pages: one button each. Beyond that, arrows and a select
           (R13-012), so a twelve-page letter does not grow twelve buttons. -->
      <div
        v-if="pages.length > 1 && !compactNavigator"
        class="preview-surfaces"
        role="group"
        :aria-label="t('preview.surfaceLabel')"
      >
        <button
          v-for="(surfacePage, index) in pages"
          :key="surfacePage.index"
          type="button"
          class="btn btn-sm"
          :class="index === surfaceIndex ? 'btn-primary' : 'btn-ghost'"
          :aria-pressed="index === surfaceIndex"
          @click="selectPage(index)"
        >
          {{ t(`preview.surface.${surfacePage.surface}`, { page: index + 1 }) }}
        </button>
      </div>
      <div
        v-else-if="compactNavigator"
        class="preview-surfaces preview-navigator"
        role="group"
        :aria-label="t('preview.surfaceLabel')"
      >
        <button
          type="button"
          class="btn btn-sm btn-ghost btn-square"
          :aria-label="t('preview.previousPage')"
          :title="t('preview.previousPage')"
          :disabled="currentPage <= 0"
          @click="stepPage(-1)"
        >
          <AppIcon name="chevron-left" />
        </button>
        <label class="preview-page-select">
          <span class="sr-only">{{ t('preview.surfaceLabel') }}</span>
          <select
            class="select select-bordered select-sm"
            :value="currentPage"
            @change="selectPage(Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="(surfacePage, index) in pages" :key="surfacePage.index" :value="index">
              {{ t(`preview.surface.${surfacePage.surface}`, { page: index + 1 }) }}
            </option>
          </select>
        </label>
        <span class="preview-page-total">{{ t('preview.pageOf', { total: pages.length }) }}</span>
        <button
          type="button"
          class="btn btn-sm btn-ghost btn-square"
          :aria-label="t('preview.nextPage')"
          :title="t('preview.nextPage')"
          :disabled="currentPage >= pages.length - 1"
          @click="stepPage(1)"
        >
          <AppIcon name="chevron-right" />
        </button>
      </div>
    </div>

    <div ref="viewport" class="preview-viewport">
      <!-- Every page is on screen, in print order: the preview paginates
           exactly as the plan does, so what is seen is what is printed. -->
      <div v-if="pages.length" ref="stack" class="preview-pages">
        <div
          v-for="(sheet, index) in pages"
          :key="sheet.index"
          class="preview-stage"
          :class="{ 'is-selected': index === surfaceIndex && pages.length > 1 }"
          :style="stageStyle"
          :aria-label="t(`preview.surface.${sheet.surface}`, { page: index + 1 })"
        >
          <div class="preview-sheet" :style="sheetStyle">
            <PaperSurface
              :page="sheet"
              :asset-urls="assetUrls"
              :show-guides="showGuides"
              :theme="plan?.theme"
              :locale="plan?.locale"
              medium="screen"
            />
          </div>
        </div>
      </div>
      <p v-else class="empty-state">{{ t('preview.empty') }}</p>
    </div>

    <p class="preview-note">
      {{ t('preview.scalingNote') }}
    </p>
  </section>
</template>
