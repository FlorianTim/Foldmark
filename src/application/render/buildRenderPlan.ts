import { addressLines } from '@/domain/address/Address';
import { returnAddressLine, type SenderProfile } from '@/domain/address/SenderProfile';
import { effectiveDpi, MIN_PRINT_DPI, type DocumentAsset } from '@/domain/asset/DocumentAsset';
import { contentBox, type BoxMm } from '@/domain/common/Units';
import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import type {
  AssetPlacement,
  FoldmarkDocument,
  PageNumberOptions,
} from '@/domain/document/FoldmarkDocument';
import type { DateFormat } from '@/domain/document/FoldmarkDocument';
import type { ExportTarget } from '@/domain/export/ExportTarget';
import type { PrintMarker, SurfaceScope } from '@/domain/print/PrintMarker';
import {
  markersFor,
  profileSurfaces,
  region,
  type PrintProfile,
} from '@/domain/print/PrintProfile';
import type {
  RenderBlock,
  RenderPage,
  RenderPlan,
  RenderTextStyle,
} from '@/application/render/RenderPlan';
import {
  linesHeightMm,
  markdownHeightMm,
  splitParagraphs,
  type MetricsContext,
} from '@/application/render/textMetrics';
import { resolveTheme, type DocumentTheme } from '@/domain/document/DocumentTheme';
import { formatIsoDate } from '@/domain/markdown/dateToken';
import { isPageBreakSource } from '@/domain/markdown/parseMarkdown';

/**
 * Turning a document and a profile into a render plan.
 *
 * This is the only place that knows how a letter is laid out on paper, and it
 * is a pure function: same inputs, same plan, every time. No DOM, no clock, no
 * storage. Everything the layout needs — the sender, the asset metadata — is
 * passed in already resolved, so the function cannot reach for it and cannot
 * fail halfway through.
 *
 * ## Pagination
 *
 * Foldmark assigns paragraphs to pages here rather than letting CSS reflow
 * them. The reason is the product promise: if the browser paginated, the fold
 * marks on sheet two would be drawn by Foldmark and the page break decided by
 * the layout engine, and the two would disagree the first time a font
 * substituted. Assigning blocks to pages up front means every consumer draws
 * exactly the page this function described.
 *
 * The height estimate is deliberately pessimistic, and where it is still not
 * enough the plan reports an overflow issue rather than pretending.
 */

/** Everything the layout needs, already resolved by the caller. */
export interface RenderInput {
  readonly document: FoldmarkDocument;
  readonly profile: PrintProfile;
  readonly target: ExportTarget;
  /** `screen` draws preview-only guides; `paper` draws what the printer receives. */
  readonly mode: 'screen' | 'paper';
  readonly sender?: SenderProfile;
  /** Metadata for every asset the document references; missing entries are reported. */
  readonly assets?: readonly DocumentAsset[];
}

/** Most pages one document may produce, so a pathological body cannot hang the app. */
export const MAX_RENDER_PAGES = 50;

function includesPhysicalMarks(input: RenderInput): boolean {
  const { exportPreferences } = input.document;
  switch (input.target) {
    case 'print':
    case 'pdf':
      return exportPreferences.pdfIncludesPhysicalMarks;
    case 'email-pdf':
      return exportPreferences.emailPdfIncludesPhysicalMarks;
    default:
      return false;
  }
}

function markersForPage(
  input: RenderInput,
  surface: SurfaceScope,
  physicalMarks: boolean,
): readonly PrintMarker[] {
  if (input.mode === 'screen') {
    // The preview shows the sheet as it will print: a printed mark the
    // document has switched off is not drawn on screen either (R13-004).
    return markersFor(input.profile, surface, 'preview').filter(
      (marker) => !marker.print || physicalMarks,
    );
  }
  return physicalMarks ? markersFor(input.profile, surface, 'print') : [];
}

/** Formats a document date in the document's own language and chosen format. */
export function formatDocumentDate(
  isoDate: string,
  locale: string,
  format: DateFormat = 'long',
): string {
  return formatIsoDate(isoDate, locale, format);
}

function lineBlock(
  regionName: string,
  box: BoxMm,
  lines: readonly string[],
  style: RenderTextStyle,
): RenderBlock | null {
  const usable = lines.filter((line) => line.trim().length > 0);
  return usable.length ? { kind: 'lines', region: regionName, box, lines: usable, style } : null;
}

function imageBlock(
  regionName: string,
  placement: AssetPlacement,
  assets: readonly DocumentAsset[],
  issues: ValidationIssue[],
): RenderBlock | null {
  const asset = assets.find((candidate) => candidate.id === placement.assetId);
  if (!asset) {
    issues.push({
      severity: 'error',
      code: 'render.assetMissing',
      path: `assetPlacements.${placement.id}`,
      params: { assetId: placement.assetId },
    });
    return null;
  }
  const heightMm = placement.heightMm ?? (asset.heightPx / asset.widthPx) * placement.widthMm;
  const dpi = effectiveDpi(asset, placement.widthMm);
  if (dpi > 0 && dpi < MIN_PRINT_DPI) {
    issues.push({
      severity: 'warning',
      code: 'render.imageResolutionLow',
      path: `assetPlacements.${placement.id}`,
      params: { dpi: Math.round(dpi), minimum: MIN_PRINT_DPI },
    });
  }
  return {
    kind: 'image',
    region: regionName,
    box: {
      xMm: placement.xMm,
      yMm: placement.yMm,
      widthMm: placement.widthMm,
      heightMm,
    },
    assetId: placement.assetId,
    fit: placement.fit,
    rotationDeg: placement.rotationDeg,
    opacity: placement.opacity,
    layer: placement.layer,
  };
}

function placementsFor(
  input: RenderInput,
  surface: SurfaceScope,
  issues: ValidationIssue[],
): readonly RenderBlock[] {
  const assets = input.assets ?? [];
  const letterhead = surface === 'back' ? [] : (input.sender?.letterhead ?? []);
  const placements = [...letterhead, ...input.document.assetPlacements].filter(
    (placement) =>
      placement.surface === 'all' || surface === 'all' || placement.surface === surface,
  );
  return placements
    .map((placement) => imageBlock('placement', placement, assets, issues))
    .filter((block): block is RenderBlock => block !== null);
}

/** The blocks that belong only on the first sheet of a letter. */
function letterHeadBlocks(input: RenderInput, issues: ValidationIssue[]): readonly RenderBlock[] {
  const { document, profile, sender } = input;
  const blocks: RenderBlock[] = [];

  const addressRegion = region(profile, 'addressWindow');
  if (addressRegion) {
    const recipient = document.metadata.recipient;
    const lines = recipient ? addressLines(recipient) : [];
    const returnLine = sender ? returnAddressLine(sender) : '';
    const block = lineBlock(
      'addressWindow',
      addressRegion,
      returnLine ? [returnLine, '', ...lines] : lines,
      'address',
    );
    if (block) blocks.push(block);
  }

  const infoRegion = region(profile, 'infoBlock');
  if (infoRegion) {
    const entries: { labelKey: string; value: string }[] = [];
    if (document.metadata.reference) {
      entries.push({ labelKey: 'reference', value: document.metadata.reference });
    }
    if (document.metadata.date && document.printOptions.showDate !== false) {
      entries.push({
        labelKey: 'date',
        value: formatDocumentDate(
          document.metadata.date,
          document.locale,
          document.printOptions.dateFormat,
        ),
      });
    }
    if (entries.length) {
      blocks.push({ kind: 'fields', region: 'infoBlock', box: infoRegion, entries, style: 'meta' });
    }
  }

  const subjectRegion = region(profile, 'subject');
  if (subjectRegion && document.metadata.subject && document.printOptions.showSubject !== false) {
    const block = lineBlock('subject', subjectRegion, [document.metadata.subject], 'subject');
    // Bold by convention; the document may set the whole line regular (R14-003).
    if (block?.kind === 'lines') {
      blocks.push(
        document.printOptions.subjectBold === false ? { ...block, weight: 'regular' } : block,
      );
    }
  }

  const footerRegion = region(profile, 'footer');
  if (footerRegion && sender?.footerLines.length) {
    const block = lineBlock('footer', footerRegion, sender.footerLines, 'footer');
    if (block) blocks.push(block);
  }

  if (!region(profile, 'addressWindow') && document.metadata.recipient) {
    issues.push({
      severity: 'info',
      code: 'render.noAddressRegion',
      path: 'printProfileId',
      params: { profile: profile.id },
    });
  }

  return blocks;
}

/** Height reserved for the number line, in the margin. */
const PAGE_NUMBER_LINE_MM = 5;

/**
 * The page number as a positioned block, or `null` when the document has none
 * or hides it on this page.
 *
 * It sits in the top or bottom margin, halfway between the paper edge and the
 * content, across the content width. Never a CSS counter: the plan already
 * knows page and total, and browsers disagree on `@page` margin boxes.
 */
export function pageNumberBlock(
  options: PageNumberOptions,
  profile: PrintProfile,
  page: number,
  total: number,
): RenderBlock | null {
  if (options.format === 'none') return null;
  if (options.hideOnFirstPage && page === 1) return null;
  const [vertical, horizontal] = options.position.split('-') as [
    'top' | 'bottom',
    'left' | 'center' | 'right',
  ];
  const { margins, page: size } = profile;
  const yMm =
    vertical === 'top'
      ? Math.max(0, margins.topMm / 2 - PAGE_NUMBER_LINE_MM / 2)
      : Math.min(
          size.heightMm - PAGE_NUMBER_LINE_MM,
          size.heightMm - margins.bottomMm / 2 - PAGE_NUMBER_LINE_MM / 2,
        );
  return {
    kind: 'pageNumber',
    region: 'pageNumber',
    box: {
      xMm: margins.leftMm,
      yMm,
      widthMm: size.widthMm - margins.leftMm - margins.rightMm,
      heightMm: PAGE_NUMBER_LINE_MM,
    },
    page,
    total,
    format: options.format,
    align: horizontal,
    style: 'footer',
  };
}

/**
 * Splits the body into per-page Markdown sources.
 *
 * Greedy: blocks go on the current page until the next one would not fit, or
 * until a `::page-break` says so. A block taller than a whole page is placed
 * anyway and reported — refusing to render it would lose the text, and the
 * user can see the overflow and break it up themselves.
 *
 * Pages are normalised here (R14-002): a break at the top, two breaks in a
 * row and a break as the last thing in the body open **no** page. A sheet that
 * exists only because a technical container does is not a page the printer
 * should see; a deliberately blank sheet needs its own command, not a trailing
 * break. Preview, print and PDF all read this list, so they agree.
 */
export function paginateBody(
  source: string,
  firstBox: BoxMm,
  continuationBox: BoxMm,
  style: RenderTextStyle = 'body',
  context: MetricsContext = {},
): readonly string[] {
  const theme = context.theme ?? resolveTheme(undefined);
  const blocks = splitParagraphs(source);
  if (blocks.length === 0) return [];

  const pages: string[] = [];
  let current: string[] = [];
  let usedMm = 0;
  let box = firstBox;

  const gapMm = linesHeightMm(theme.paragraphSpacing, style, theme);
  const canBreak = (): boolean => pages.length + 1 < MAX_RENDER_PAGES;
  const flush = (): void => {
    pages.push(current.join('\n\n'));
    current = [];
    usedMm = 0;
    box = continuationBox;
  };

  for (const block of blocks) {
    if (isPageBreakSource(block)) {
      // A break at the top of a page is not a blank page; a break after
      // content ends the page here.
      if (current.length && canBreak()) flush();
      continue;
    }
    const height = markdownHeightMm(block, style, box.widthMm, context);
    const needed = current.length ? usedMm + gapMm + height : height;
    if (current.length && needed > box.heightMm && canBreak()) {
      flush();
      current = [block];
      usedMm = height;
      continue;
    }
    current.push(block);
    usedMm = needed;
  }
  if (current.length) pages.push(current.join('\n\n'));
  return pages;
}

function buildLetterPages(
  input: RenderInput,
  theme: DocumentTheme,
  issues: ValidationIssue[],
): readonly RenderPage[] {
  const { document, profile } = input;
  const context: MetricsContext = { theme, assets: input.assets };
  const physicalMarks = includesPhysicalMarks(input);
  const bodyRegion = region(profile, 'body') ?? {
    ...contentBox(profile.page, profile.margins),
    surface: 'all' as const,
  };
  const continuation: BoxMm = contentBox(profile.page, profile.margins);
  // Date directives stay in the source: every renderer formats them in the
  // document's language itself, so the estimate and the drawing see one text.
  const bodyPages = paginateBody(document.bodyMarkdown, bodyRegion, continuation, 'body', context);
  const pageSources = bodyPages.length ? bodyPages : [''];

  return pageSources.map((source, index) => {
    const box = index === 0 ? bodyRegion : continuation;
    const blocks: RenderBlock[] = [];
    if (index === 0) blocks.push(...letterHeadBlocks(input, issues));
    if (index === 0) blocks.push(...placementsFor(input, 'all', issues));
    const pageNumber = pageNumberBlock(
      document.printOptions.pageNumbers,
      profile,
      index + 1,
      pageSources.length,
    );
    if (pageNumber) blocks.push(pageNumber);
    if (source) {
      blocks.push({ kind: 'markdown', region: 'body', box, source, style: 'body' });
      const height = markdownHeightMm(source, 'body', box.widthMm, context);
      if (height > box.heightMm) {
        issues.push({
          severity: 'warning',
          code: 'render.bodyOverflow',
          path: 'bodyMarkdown',
          params: { page: index + 1 },
        });
      }
    }
    return {
      index,
      surface: 'all' as SurfaceScope,
      page: profile.page,
      bleed: profile.bleed,
      markers: markersForPage(input, 'all', physicalMarks),
      blocks,
    };
  });
}

function buildSurfacePage(
  input: RenderInput,
  surface: 'front' | 'back',
  index: number,
  theme: DocumentTheme,
  issues: ValidationIssue[],
): RenderPage {
  const { document, profile } = input;
  const context: MetricsContext = { theme, assets: input.assets };
  const physicalMarks = includesPhysicalMarks(input);
  const blocks: RenderBlock[] = [];
  const content = document.surfaces[surface];

  const backgroundRegion = region(profile, 'background');
  if (backgroundRegion && backgroundRegion.surface !== otherSurface(surface)) {
    const assetId = content?.backgroundAssetId;
    if (assetId) {
      const block = imageBlock(
        'background',
        {
          id: `${surface}-background`,
          assetId,
          surface,
          xMm: backgroundRegion.xMm,
          yMm: backgroundRegion.yMm,
          widthMm: backgroundRegion.widthMm,
          heightMm: backgroundRegion.heightMm,
          rotationDeg: 0,
          opacity: 1,
          layer: 'background',
          fit: 'cover',
        },
        input.assets ?? [],
        issues,
      );
      if (block) blocks.push(block);
    }
  }

  const captionRegion = region(profile, 'caption');
  if (captionRegion && captionRegion.surface !== otherSurface(surface) && content?.caption) {
    const block = lineBlock('caption', captionRegion, [content.caption], 'caption');
    if (block) blocks.push(block);
  }

  const messageRegion = region(profile, 'message');
  if (messageRegion && messageRegion.surface !== otherSurface(surface)) {
    const source = content?.text ?? (surface === 'back' ? document.bodyMarkdown : '');
    if (source.trim()) {
      blocks.push({
        kind: 'markdown',
        region: 'message',
        box: messageRegion,
        source,
        style: 'body',
      });
      if (
        markdownHeightMm(source, 'body', messageRegion.widthMm, context) > messageRegion.heightMm
      ) {
        issues.push({
          severity: 'warning',
          code: 'render.messageOverflow',
          path: `surfaces.${surface}.text`,
        });
      }
    }
  }

  const addressRegion = region(profile, 'address');
  if (addressRegion && addressRegion.surface !== otherSurface(surface)) {
    const recipient = document.metadata.recipient;
    const block = lineBlock(
      'address',
      addressRegion,
      recipient ? addressLines(recipient) : [],
      'address',
    );
    if (block) blocks.push(block);
  }

  blocks.push(...placementsFor(input, surface, issues));

  return {
    index,
    surface,
    page: profile.page,
    bleed: profile.bleed,
    markers: markersForPage(input, surface, physicalMarks),
    blocks,
  };
}

function otherSurface(surface: 'front' | 'back'): 'front' | 'back' {
  return surface === 'front' ? 'back' : 'front';
}

/**
 * Builds the plan for one document, profile and target.
 *
 * Never throws: a document that cannot be laid out produces a plan with issues,
 * because the workspace has to show *something* next to the error. Refusing to
 * return a plan would blank the preview exactly when the user needs to see what
 * is wrong.
 */
export function buildRenderPlan(input: RenderInput): RenderPlan {
  const issues: ValidationIssue[] = [];
  const surfaces = profileSurfaces(input.profile);
  const duplex = surfaces.length > 1;
  const theme = resolveTheme(input.document.printOptions.theme);

  const pages = duplex
    ? surfaces.map((surface, index) =>
        buildSurfacePage(input, surface as 'front' | 'back', index, theme, issues),
      )
    : buildLetterPages(input, theme, issues);

  return {
    documentId: input.document.id,
    profileId: input.profile.id,
    target: input.target,
    locale: input.document.locale,
    theme,
    pages: pages.slice(0, MAX_RENDER_PAGES),
    includesPhysicalMarks: includesPhysicalMarks(input),
    issues,
  };
}
