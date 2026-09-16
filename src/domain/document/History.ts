import { createId } from '@/domain/common/Ids';
import type { FoldmarkDocument } from '@/domain/document/FoldmarkDocument';

/**
 * Document history: checkpoints and the working copy.
 *
 * Two mechanisms, deliberately apart:
 *
 * - The **working copy** is written automatically shortly after every change
 *   and overwritten each time. It exists so a closed tab loses nothing; it is
 *   never a version.
 * - A **checkpoint** is a durable snapshot with an origin — a manual save, an
 *   import, a restore, or the automatic rule that fires at most once per
 *   interval of editing. Checkpoints are what the history lists.
 *
 * Both hold the *structured* document rather than its portable text, so a
 * restore brings back everything, asset placements included; exporting a
 * checkpoint runs it through the codec like any document.
 */

/** Why a checkpoint exists. */
export type CheckpointOrigin = 'manual' | 'automatic' | 'imported' | 'restore';

/** One durable version of a document. */
export interface Checkpoint {
  readonly id: string;
  readonly documentId: string;
  /** ISO-8601; when the checkpoint was taken. */
  readonly createdAt: string;
  readonly origin: CheckpointOrigin;
  /** The document as it was, validated on read like any stored record. */
  readonly document: FoldmarkDocument;
}

/** The automatically written state of an open document. */
export interface WorkingCopy {
  readonly documentId: string;
  /** ISO-8601; when it was written. */
  readonly savedAt: string;
  readonly document: FoldmarkDocument;
}

/** Most checkpoints kept per document before automatic ones are pruned. */
export const CHECKPOINTS_PER_DOCUMENT = 50;

/** Manual, import and restore checkpoints survive past the soft bound, up to this many. */
export const DURABLE_CHECKPOINTS_PER_DOCUMENT = 100;

/** The automatic rule fires at most once per this many milliseconds of editing. */
export const AUTOMATIC_CHECKPOINT_INTERVAL_MS = 10 * 60 * 1_000;

/** Debounce after the last change before the working copy is written. */
export const WORKING_COPY_DEBOUNCE_MS = 2_000;

/** Creates a checkpoint of a document as it is right now. */
export function createCheckpoint(
  document: FoldmarkDocument,
  origin: CheckpointOrigin,
  now = new Date(),
): Checkpoint {
  return {
    id: createId(),
    documentId: document.id,
    createdAt: now.toISOString(),
    origin,
    document: plainCopy(document),
  };
}

/**
 * A detached copy of a document.
 *
 * A JSON round trip rather than `structuredClone`: the document handed in may
 * be a framework's reactive proxy, which structured clone refuses, and a
 * Foldmark document is JSON data by definition — the portable format depends
 * on it.
 */
export function plainCopy(document: FoldmarkDocument): FoldmarkDocument {
  return JSON.parse(JSON.stringify(document)) as FoldmarkDocument;
}

/** Whether two documents differ in anything a checkpoint should record. */
export function hasContentChanged(left: FoldmarkDocument, right: FoldmarkDocument): boolean {
  // Opening a document is not editing it (change 0024), so the opened stamp
  // is ignored like the modification time.
  const strip = (document: FoldmarkDocument): string =>
    JSON.stringify({ ...document, updatedAt: undefined, lastOpenedAt: undefined });
  return strip(left) !== strip(right);
}

/**
 * The checkpoints to delete so a document stays within its bounds.
 *
 * Automatic checkpoints go first, oldest first, until the soft bound holds;
 * durable ones (manual, imported, restore) are only pruned past the hard
 * bound, and again oldest first. The newest checkpoint is never pruned.
 */
export function selectPrunable(
  checkpoints: readonly Checkpoint[],
  bounds = {
    perDocument: CHECKPOINTS_PER_DOCUMENT,
    durable: DURABLE_CHECKPOINTS_PER_DOCUMENT,
  },
): readonly string[] {
  const byAge = checkpoints.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const newest = byAge.at(-1)?.id;
  const prunable: string[] = [];
  let remaining = byAge.length;

  for (const checkpoint of byAge) {
    if (remaining <= bounds.perDocument) break;
    if (checkpoint.origin !== 'automatic' || checkpoint.id === newest) continue;
    prunable.push(checkpoint.id);
    remaining -= 1;
  }
  for (const checkpoint of byAge) {
    if (remaining <= bounds.durable) break;
    if (prunable.includes(checkpoint.id) || checkpoint.id === newest) continue;
    prunable.push(checkpoint.id);
    remaining -= 1;
  }
  return prunable;
}

/** Whether the automatic rule should fire, given the newest checkpoint. */
export function automaticCheckpointDue(
  latest: Checkpoint | null,
  now: Date,
  interval = AUTOMATIC_CHECKPOINT_INTERVAL_MS,
): boolean {
  if (!latest) return true;
  return now.getTime() - new Date(latest.createdAt).getTime() >= interval;
}

/** Checkpoints grouped by calendar day in the given time zone/locale, newest first. */
export function groupByDay(
  checkpoints: readonly Checkpoint[],
  locale: string,
): readonly { day: string; checkpoints: readonly Checkpoint[] }[] {
  const format = new Intl.DateTimeFormat(locale, { dateStyle: 'full' });
  const groups = new Map<string, Checkpoint[]>();
  for (const checkpoint of checkpoints
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const day = format.format(new Date(checkpoint.createdAt));
    groups.set(day, [...(groups.get(day) ?? []), checkpoint]);
  }
  return [...groups.entries()].map(([day, list]) => ({ day, checkpoints: list }));
}
