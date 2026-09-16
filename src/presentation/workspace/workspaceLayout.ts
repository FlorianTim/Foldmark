import type { WorkspaceLayout, WorkspaceMode } from '@/presentation/settings/settingsRegistry';

/**
 * Which workspace panes are on screen, how wide, and which are folded away.
 *
 * The three panes — Document settings, Writing area, Preview — are a semantic
 * split of the work, not a three-column requirement (R13-013). On a phone they
 * are tabs; on a laptop the chosen combination sits side by side; on a wide
 * monitor all three fit. The decision is a pure function of width, preference,
 * active mode and the collapse/focus state, so it can be tested without a
 * browser and read without a debugger.
 */

/** A workspace pane. The ids double as the mode ids of the narrow-screen tabs. */
export type Pane = WorkspaceMode;

/** Every pane, in display order. */
export const PANES: readonly Pane[] = ['document', 'write', 'preview'];

/**
 * Below this width the workspace is tabs only. The widths are those of the
 * workspace *element*, which sits inside the shell's margins — a 1024 px
 * tablet in landscape gives the workspace about 990 px.
 */
export const TWO_PANE_MIN_WIDTH = 980;

/**
 * From this width three panes fit. Lowered from 1380 px (1.1) to the width a
 * 13-inch laptop in landscape actually has, so "Automatic" shows all three
 * areas there (AC-WS-001); the minimum column widths keep the editor usable.
 */
export const THREE_PANE_MIN_WIDTH = 1180;

/** The panes an explicit layout names. `auto` decides by width. */
const LAYOUT_PANES: Readonly<Record<Exclude<WorkspaceLayout, 'auto'>, readonly Pane[]>> = {
  document: ['document'],
  write: ['write'],
  preview: ['preview'],
  'document-write': ['document', 'write'],
  'write-preview': ['write', 'preview'],
  'document-preview': ['document', 'preview'],
  all: ['document', 'write', 'preview'],
};

/**
 * The panes visible for a width, a layout preference and the active mode, in
 * display order — before collapsing and focus are applied.
 *
 * Automatic: three panes from the three-pane width, two from the two-pane
 * width (the active mode beside the preview, or Write beside the preview when
 * the user is *in* the preview), otherwise the active mode alone. An explicit
 * combination is honoured from the two-pane width on and degrades to the
 * active mode below it — never to squeezed columns.
 */
export function panesFor(
  widthPx: number,
  layout: WorkspaceLayout,
  mode: WorkspaceMode,
): readonly Pane[] {
  if (layout !== 'auto') {
    const wanted = LAYOUT_PANES[layout];
    if (wanted.length === 1 || widthPx >= TWO_PANE_MIN_WIDTH) return wanted;
    return [wanted.includes(mode) ? mode : wanted[0]];
  }
  if (widthPx >= THREE_PANE_MIN_WIDTH) return PANES;
  if (widthPx >= TWO_PANE_MIN_WIDTH)
    return mode === 'preview' ? ['write', 'preview'] : [mode, 'preview'];
  return [mode];
}

/** Whether a pane is a tab (one pane on screen) rather than a column. */
export function isTabbed(panes: readonly Pane[]): boolean {
  return panes.length === 1;
}

/** Which of the visible panes are folded to a rail, and which are shown. */
export interface CollapseState {
  readonly document: boolean;
  readonly preview: boolean;
}

/** The pane that fills the workspace in focus mode, or `null`. */
export type FocusPane = 'write' | 'preview' | null;

/** One pane as the grid renders it. */
export interface PaneSlot {
  readonly pane: Pane;
  /** Folded to a thin rail with an expand handle. */
  readonly collapsed: boolean;
}

/**
 * The visible panes with their collapse state applied.
 *
 * Focus wins: the focused pane is the only expanded one and the others become
 * rails. Collapse applies only with two or more panes — a single tab can never
 * be folded away, there would be nothing left. The Writing area is never
 * collapsible: it is what the workspace is for.
 */
export function paneSlots(
  panes: readonly Pane[],
  collapsed: CollapseState,
  focus: FocusPane,
): readonly PaneSlot[] {
  if (panes.length === 1) return [{ pane: panes[0], collapsed: false }];
  if (focus && panes.includes(focus)) {
    return panes.map((pane) => ({ pane, collapsed: pane !== focus }));
  }
  const slots = panes.map((pane) => ({
    pane,
    collapsed:
      pane === 'document' ? collapsed.document : pane === 'preview' ? collapsed.preview : false,
  }));
  // Everything folded away would leave an empty grid: the writing area, or
  // the first pane, stays open.
  if (slots.every((slot) => slot.collapsed)) {
    const keep = slots.find((slot) => slot.pane === 'write') ?? slots[0];
    return slots.map((slot) => (slot === keep ? { ...slot, collapsed: false } : slot));
  }
  return slots;
}

/** Minimum column width per pane, in pixels (R13-014: never 0, never unusable). */
export const PANE_MIN_WIDTH_PX: Readonly<Record<Pane, number>> = {
  document: 240,
  write: 320,
  preview: 320,
};

/** Width of a collapsed rail, in pixels. */
export const RAIL_WIDTH_PX = 44;

/** Relative widths of the three panes, as fractions that sum to 1. */
export type PaneFractions = Readonly<Record<Pane, number>>;

/** The default proportions: a narrow settings column, the paper a little wider than the text. */
export const DEFAULT_PANE_FRACTIONS: PaneFractions = Object.freeze({
  document: 0.26,
  write: 0.36,
  preview: 0.38,
});

/**
 * Fractions after a splitter between two neighbouring expanded panes moved by
 * `deltaPx`. The two panes trade width; the others keep theirs. Each side is
 * clamped to its minimum, so no pane can be dragged to nothing.
 */
export function resizePanes(
  fractions: PaneFractions,
  left: Pane,
  right: Pane,
  deltaPx: number,
  totalPx: number,
): PaneFractions {
  if (totalPx <= 0 || left === right) return fractions;
  const leftPx = fractions[left] * totalPx;
  const rightPx = fractions[right] * totalPx;
  const pair = leftPx + rightPx;
  const minLeft = PANE_MIN_WIDTH_PX[left];
  const minRight = PANE_MIN_WIDTH_PX[right];
  if (pair < minLeft + minRight) return fractions;
  const nextLeft = Math.min(Math.max(leftPx + deltaPx, minLeft), pair - minRight);
  return {
    ...fractions,
    [left]: nextLeft / totalPx,
    [right]: (pair - nextLeft) / totalPx,
  };
}

/**
 * The CSS `grid-template-columns` value for a set of slots: `minmax(min, fr)`
 * per expanded pane, a fixed rail per collapsed one, and a splitter track
 * between two expanded neighbours. Fractions are renormalised over the
 * expanded panes so a collapsed pane's share goes to the others.
 */
export function gridColumns(slots: readonly PaneSlot[], fractions: PaneFractions): string {
  const expanded = slots.filter((slot) => !slot.collapsed);
  const sum = expanded.reduce((total, slot) => total + fractions[slot.pane], 0) || 1;
  const columns: string[] = [];
  slots.forEach((slot, index) => {
    if (slot.collapsed) {
      columns.push(`${RAIL_WIDTH_PX}px`);
    } else {
      const share = (fractions[slot.pane] / sum).toFixed(4);
      columns.push(`minmax(${PANE_MIN_WIDTH_PX[slot.pane]}px, ${share}fr)`);
    }
    const next = slots[index + 1];
    if (next && !slot.collapsed && !next.collapsed) columns.push('auto');
  });
  return columns.join(' ');
}

/** Whether a splitter sits after the slot at `index`: only between two expanded panes. */
export function hasSplitterAfter(slots: readonly PaneSlot[], index: number): boolean {
  const current = slots[index];
  const next = slots[index + 1];
  return Boolean(current && next && !current.collapsed && !next.collapsed);
}
