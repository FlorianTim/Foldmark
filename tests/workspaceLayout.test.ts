import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PANE_FRACTIONS,
  gridColumns,
  hasSplitterAfter,
  PANE_MIN_WIDTH_PX,
  paneSlots,
  panesFor,
  resizePanes,
  THREE_PANE_MIN_WIDTH,
  TWO_PANE_MIN_WIDTH,
} from '@/presentation/workspace/workspaceLayout';
import { appSettings } from '@/presentation/settings/settingsRegistry';

describe('visible panes', () => {
  it('follows the width in automatic mode (AC-WS-001)', () => {
    expect(panesFor(375, 'auto', 'write')).toEqual(['write']);
    expect(panesFor(TWO_PANE_MIN_WIDTH - 1, 'auto', 'document')).toEqual(['document']);
    expect(panesFor(TWO_PANE_MIN_WIDTH, 'auto', 'document')).toEqual(['document', 'preview']);
    expect(panesFor(TWO_PANE_MIN_WIDTH, 'auto', 'preview')).toEqual(['write', 'preview']);
    expect(panesFor(THREE_PANE_MIN_WIDTH - 1, 'auto', 'write')).toEqual(['write', 'preview']);
    // A laptop in landscape shows all three.
    expect(panesFor(1280, 'auto', 'write')).toEqual(['document', 'write', 'preview']);
  });

  it('honours every named combination from the two-pane width on (AC-WS-002)', () => {
    expect(panesFor(1100, 'document-write', 'preview')).toEqual(['document', 'write']);
    expect(panesFor(1100, 'write-preview', 'document')).toEqual(['write', 'preview']);
    expect(panesFor(1100, 'document-preview', 'write')).toEqual(['document', 'preview']);
    expect(panesFor(1100, 'all', 'write')).toEqual(['document', 'write', 'preview']);
    expect(panesFor(2560, 'preview', 'write')).toEqual(['preview']);
  });

  it('degrades a combination to the active tab below the two-pane width', () => {
    expect(panesFor(800, 'all', 'preview')).toEqual(['preview']);
    expect(panesFor(800, 'document-write', 'preview')).toEqual(['document']);
    expect(panesFor(0, 'auto', 'document')).toEqual(['document']);
  });

  it('reads the 1.1 layout values as their named successors', () => {
    expect(appSettings.workspaceLayout.decode('tabs')).toBe('write');
    expect(appSettings.workspaceLayout.decode('two')).toBe('auto');
    expect(appSettings.workspaceLayout.decode('three')).toBe('all');
    expect(appSettings.workspaceLayout.decode('nonsense')).toBeNull();
  });
});

describe('collapsing and focus', () => {
  const all = ['document', 'write', 'preview'] as const;
  const open = { document: false, preview: false };

  it('folds the side panes but never the writing area (AC-WS-004)', () => {
    const slots = paneSlots(all, { document: true, preview: true }, null);
    expect(slots.map((slot) => slot.collapsed)).toEqual([true, false, true]);
  });

  it('never folds a single tab', () => {
    expect(paneSlots(['preview'], { document: true, preview: true }, null)).toEqual([
      { pane: 'preview', collapsed: false },
    ]);
  });

  it('keeps one pane open when both panes of a pair are folded', () => {
    const slots = paneSlots(['document', 'preview'], { document: true, preview: true }, null);
    expect(slots.filter((slot) => !slot.collapsed)).toHaveLength(1);
  });

  it('gives the focused pane the whole workspace (AC-WS-005)', () => {
    expect(paneSlots(all, open, 'preview').map((slot) => slot.collapsed)).toEqual([
      true,
      true,
      false,
    ]);
    expect(paneSlots(all, open, 'write').map((slot) => slot.collapsed)).toEqual([
      true,
      false,
      true,
    ]);
  });
});

describe('resizing', () => {
  it('trades width between neighbours and never goes below a minimum (AC-WS-003)', () => {
    const total = 1400;
    const moved = resizePanes(DEFAULT_PANE_FRACTIONS, 'document', 'write', 100, total);
    expect(moved.document * total).toBeCloseTo(DEFAULT_PANE_FRACTIONS.document * total + 100, 6);
    expect(moved.preview).toBe(DEFAULT_PANE_FRACTIONS.preview);
    expect(moved.document + moved.write + moved.preview).toBeCloseTo(1, 6);

    const squeezed = resizePanes(DEFAULT_PANE_FRACTIONS, 'document', 'write', -10_000, total);
    expect(squeezed.document * total).toBeCloseTo(PANE_MIN_WIDTH_PX.document, 6);
    const stretched = resizePanes(DEFAULT_PANE_FRACTIONS, 'document', 'write', 10_000, total);
    expect(stretched.write * total).toBeCloseTo(PANE_MIN_WIDTH_PX.write, 6);
  });

  it('renders rails, minmax columns and splitter tracks', () => {
    const slots = paneSlots(
      ['document', 'write', 'preview'],
      { document: true, preview: false },
      null,
    );
    const columns = gridColumns(slots, DEFAULT_PANE_FRACTIONS);
    expect(columns).toMatch(/^44px minmax\(320px, 0\.\d+fr\) auto minmax\(320px, 0\.\d+fr\)$/u);
    expect(hasSplitterAfter(slots, 0)).toBe(false);
    expect(hasSplitterAfter(slots, 1)).toBe(true);
    expect(hasSplitterAfter(slots, 2)).toBe(false);
  });

  it('stores widths as fractions and refuses a zero pane', () => {
    const { decode, encode } = appSettings.workspacePaneWidths;
    expect(decode(encode({ document: 0.2, write: 0.5, preview: 0.3 }))).toEqual({
      document: 0.2,
      write: 0.5,
      preview: 0.3,
    });
    expect(decode('0,1,1')).toBeNull();
    expect(decode('a,b,c')).toBeNull();
    expect(appSettings.workspaceCollapsed.decode('document')).toEqual({
      document: true,
      preview: false,
    });
    expect(appSettings.workspaceCollapsed.decode('write')).toBeNull();
  });
});
