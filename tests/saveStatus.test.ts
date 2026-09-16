import { describe, expect, it } from 'vitest';
import { SAVE_STATUS_GLYPH, deriveSaveStatus } from '@/presentation/stores/saveStatus';

const at = new Date('2026-09-11T10:41:00Z');
const base = {
  open: true,
  dirty: false,
  saving: false,
  saveError: null,
  lastSavedAt: at,
  autosavedAt: null,
  pendingEdits: false,
};

describe('the save status', () => {
  it('is absent when no document is open', () => {
    expect(deriveSaveStatus({ ...base, open: false })).toBeNull();
  });

  it('calls a document created this session "new" until it is saved', () => {
    expect(deriveSaveStatus({ ...base, lastSavedAt: null })).toEqual({ kind: 'new' });
  });

  it('reports "saved" with the time of the last write', () => {
    expect(deriveSaveStatus(base)).toEqual({ kind: 'saved', at, draft: false });
  });

  it('turns "unsaved" on the first edit, even for a brand-new document', () => {
    expect(deriveSaveStatus({ ...base, dirty: true, pendingEdits: true })).toEqual({
      kind: 'unsaved',
    });
    expect(deriveSaveStatus({ ...base, dirty: true, lastSavedAt: null })).toEqual({
      kind: 'unsaved',
    });
  });

  it('calls a written working copy "saved" as a draft, until the next edit', () => {
    const copied = new Date('2026-09-11T10:43:00Z');
    expect(deriveSaveStatus({ ...base, dirty: true, autosavedAt: copied })).toEqual({
      kind: 'saved',
      at: copied,
      draft: true,
    });
    expect(
      deriveSaveStatus({ ...base, dirty: true, autosavedAt: copied, pendingEdits: true }),
    ).toEqual({ kind: 'unsaved' });
  });

  it('shows "saving" while a write is in flight, whatever else is true', () => {
    expect(deriveSaveStatus({ ...base, saving: true, dirty: true })).toEqual({ kind: 'saving' });
    expect(
      deriveSaveStatus({ ...base, saving: true, saveError: 'errors.storageUnavailable' }),
    ).toEqual({ kind: 'saving' });
  });

  it('keeps a failed save visible until the next edit or save clears it', () => {
    expect(deriveSaveStatus({ ...base, dirty: true, saveError: 'errors.quota' })).toEqual({
      kind: 'error',
      messageKey: 'errors.quota',
    });
  });

  it('has a distinct glyph for every state, so colour is never the only signal', () => {
    const glyphs = Object.values(SAVE_STATUS_GLYPH);
    expect(new Set(glyphs).size).toBe(glyphs.length);
    expect(Object.keys(SAVE_STATUS_GLYPH).sort()).toEqual(
      ['error', 'new', 'saved', 'saving', 'unsaved'].sort(),
    );
  });
});
