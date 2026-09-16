import type { BoxMm, MarginsMm, PageSizeMm } from '@/domain/common/Units';
import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import type { DocumentTheme } from '@/domain/document/DocumentTheme';
import type { ExportTarget } from '@/domain/export/ExportTarget';
import { inlineAssetIds } from '@/domain/markdown/parseMarkdown';
import type { PrintMarker, SurfaceScope } from '@/domain/print/PrintMarker';

/**
 * The render plan — the one representation every output shares.
 *
 * A plan is what a document, a profile, the resolved sender and the resolved
 * assets collapse into once every decision has been made: which surfaces exist,
 * what goes in which box, which marks are visible, and in millimetres
 * throughout. It contains no DOM, no Vue, no CSS and no HTML.
 *
 * That matters for three reasons:
 *
 * - **It is testable.** "Does the fold mark sit at 105 mm?" is a unit test
 *   against a data structure, not a screenshot comparison.
 * - **It is shared.** The screen preview, the print stylesheet and any future
 *   PDF adapter all consume the same plan, so they cannot drift apart.
 * - **Zoom cannot touch it.** Display scale is applied by the preview *after*
 *   the plan exists, which is the mechanism behind the promise that zooming
 *   never changes what prints.
 *
 * A plan is a pure function of its inputs. Nothing here reads a clock, a
 * random number or the DOM.
 */

/** A run of text with the emphasis Foldmark's Markdown subset can express. */
export interface RenderTextRun {
  readonly text: string;
  readonly strong?: boolean;
  readonly emphasis?: boolean;
  readonly code?: boolean;
}

/** One laid-out piece of content inside a named region. */
export type RenderBlock =
  | {
      readonly kind: 'lines';
      /** Which named region of the profile this block belongs to. */
      readonly region: string;
      readonly box: BoxMm;
      readonly lines: readonly string[];
      readonly style: RenderTextStyle;
      /** `regular` where a style is bold by default but the document says otherwise. */
      readonly weight?: 'regular';
    }
  | {
      readonly kind: 'markdown';
      readonly region: string;
      readonly box: BoxMm;
      /** Markdown source; the presentation layer parses it with the safe subset parser. */
      readonly source: string;
      readonly style: RenderTextStyle;
    }
  | {
      readonly kind: 'fields';
      readonly region: string;
      readonly box: BoxMm;
      readonly entries: readonly { readonly labelKey: string; readonly value: string }[];
      readonly style: RenderTextStyle;
    }
  | {
      /** The page number, positioned in a margin; the presentation layer words it. */
      readonly kind: 'pageNumber';
      readonly region: string;
      readonly box: BoxMm;
      readonly page: number;
      readonly total: number;
      readonly format: 'number' | 'page' | 'page-of' | 'slash' | 'of';
      readonly align: 'left' | 'center' | 'right';
      readonly style: RenderTextStyle;
    }
  | {
      readonly kind: 'image';
      readonly region: string;
      readonly box: BoxMm;
      readonly assetId: string;
      readonly fit: 'contain' | 'cover' | 'stretch';
      readonly rotationDeg: number;
      readonly opacity: number;
      readonly layer: 'background' | 'content' | 'foreground';
    };

/** Type of text, so the renderer can pick a size without inventing one. */
export type RenderTextStyle = 'body' | 'subject' | 'address' | 'meta' | 'footer' | 'caption';

/** One physical surface, ready to be drawn. */
export interface RenderPage {
  /** Zero-based print order. */
  readonly index: number;
  readonly surface: SurfaceScope;
  readonly page: PageSizeMm;
  readonly bleed?: MarginsMm;
  /** Markers already filtered for this surface and this output mode. */
  readonly markers: readonly PrintMarker[];
  readonly blocks: readonly RenderBlock[];
}

/** Everything one export needs, resolved. */
export interface RenderPlan {
  readonly documentId: string;
  readonly profileId: string;
  readonly target: ExportTarget;
  /** Document language, which drives date formatting and the salutation defaults. */
  readonly locale: string;
  /** The resolved document theme: font, sizes and palette every page is drawn with. */
  readonly theme: DocumentTheme;
  readonly pages: readonly RenderPage[];
  /** Whether printed helper marks were included, after target and preference. */
  readonly includesPhysicalMarks: boolean;
  /** Findings produced while laying out, such as content that will not fit. */
  readonly issues: readonly ValidationIssue[];
}

/**
 * Every asset the plan references — placed images and the `asset:` images
 * inside Markdown blocks alike — so a caller can resolve the bytes once. The
 * body images were missing here in 1.0, which is why an image inserted from
 * the library rendered as "image missing" on paper (R13-002).
 */
export function referencedAssetIds(plan: RenderPlan): readonly string[] {
  const ids = new Set<string>();
  for (const page of plan.pages) {
    for (const block of page.blocks) {
      if (block.kind === 'image') ids.add(block.assetId);
      if (block.kind === 'markdown') for (const id of inlineAssetIds(block.source)) ids.add(id);
    }
  }
  return [...ids];
}

/**
 * The markers a screen-mode page draws right now.
 *
 * Two independent switches (R13-004): the plan already says which marks are
 * **ink** — `print: true`, subject to the document's printed-marks preference
 * when the plan was built — and those are always drawn, because the preview
 * shows the paper. The guides toggle only governs the preview-only guides:
 * safe areas, stamp boxes, letterhead bands. Hiding guides therefore never
 * makes the preview disagree with the sheet, and the paper-mode plan never
 * sees this toggle at all.
 */
export function visibleScreenMarkers(
  page: RenderPage,
  showGuides: boolean,
): readonly PrintMarker[] {
  return showGuides ? page.markers : page.markers.filter((marker) => marker.print);
}
