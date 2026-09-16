/**
 * The save status shown in the workspace bar.
 *
 * Five states, derived — never stored — from what the workspace store already
 * tracks. Deriving keeps the indicator honest: it cannot say "saved" while a
 * write is in flight, because "saving" is computed from the very flag the write
 * sets. The 1.1 autosave and the document history read the same status, so the
 * vocabulary is fixed here once.
 */
export type SaveStatus =
  /** Created in this session and never saved by hand. */
  | { readonly kind: 'new' }
  | { readonly kind: 'unsaved' }
  | { readonly kind: 'saving' }
  /** `draft` when the time refers to the working copy rather than the record. */
  | { readonly kind: 'saved'; readonly at: Date; readonly draft: boolean }
  /** The last save failed; the working copy is still dirty. */
  | { readonly kind: 'error'; readonly messageKey: string };

/** What the derivation needs from the workspace store. */
export interface SaveStatusInput {
  readonly open: boolean;
  readonly dirty: boolean;
  readonly saving: boolean;
  /** Translation key of the failure that ended the last save, or `null`. */
  readonly saveError: string | null;
  /** When the working copy last matched storage, or `null` for a document created this session. */
  readonly lastSavedAt: Date | null;
  /** When the working copy was last written automatically, or `null`. */
  readonly autosavedAt: Date | null;
  /** Edits made since the working copy was last written. */
  readonly pendingEdits: boolean;
}

/** Derives the status. Returns `null` when no document is open. */
export function deriveSaveStatus(input: SaveStatusInput): SaveStatus | null {
  if (!input.open) return null;
  if (input.saving) return { kind: 'saving' };
  if (input.saveError !== null) return { kind: 'error', messageKey: input.saveError };
  if (input.pendingEdits) return { kind: 'unsaved' };
  if (input.dirty && input.autosavedAt)
    return { kind: 'saved', at: input.autosavedAt, draft: true };
  if (input.dirty) return { kind: 'unsaved' };
  if (input.lastSavedAt === null) return { kind: 'new' };
  return { kind: 'saved', at: input.lastSavedAt, draft: false };
}

/** The glyph shown before the status text, so colour is never the only signal. */
export const SAVE_STATUS_GLYPH: Readonly<Record<SaveStatus['kind'], string>> = {
  new: '○',
  unsaved: '●',
  saving: '…',
  saved: '✓',
  error: '!',
};
