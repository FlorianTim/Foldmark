import { describe, expect, it } from 'vitest';
import { NotFoundError } from '@/application/errors/FoldmarkErrors';
import { HistoryService } from '@/application/usecases/HistoryService';
import {
  automaticCheckpointDue,
  createCheckpoint,
  groupByDay,
  hasContentChanged,
  selectPrunable,
  type Checkpoint,
} from '@/domain/document/History';
import { reviseDocument } from '@/domain/document/FoldmarkDocument';
import { MarkdownDocumentCodecImpl } from '@/infrastructure/codec/MarkdownDocumentCodecImpl';
import {
  FakeCheckpointRepository,
  FakeDocumentRepository,
  FakeWorkingCopyStore,
  letterFixture,
} from './helpers/fakes';

const at = (minutes: number): Date => new Date(Date.UTC(2026, 8, 11, 10, minutes));

describe('checkpoint bounds', () => {
  const many = (count: number, origin: Checkpoint['origin']): Checkpoint[] =>
    Array.from({ length: count }, (_, index) =>
      createCheckpoint(letterFixture({ id: 'doc' }), origin, at(index)),
    );

  it('prunes the oldest automatic checkpoints first, never the newest', () => {
    const automatic = many(60, 'automatic');
    const manual = createCheckpoint(letterFixture({ id: 'doc' }), 'manual', at(0));
    const prunable = selectPrunable([...automatic, manual]);
    expect(prunable).toHaveLength(11);
    expect(prunable).toEqual(automatic.slice(0, 11).map((c) => c.id));
    expect(prunable).not.toContain(automatic.at(-1)!.id);
    expect(prunable).not.toContain(manual.id);
  });

  it('prunes durable checkpoints only past the hard bound', () => {
    const manual = many(105, 'manual');
    const prunable = selectPrunable(manual);
    expect(prunable).toEqual(manual.slice(0, 5).map((c) => c.id));
  });

  it('fires the automatic rule once per interval', () => {
    const latest = createCheckpoint(letterFixture(), 'automatic', at(0));
    expect(automaticCheckpointDue(null, at(0))).toBe(true);
    expect(automaticCheckpointDue(latest, at(9))).toBe(false);
    expect(automaticCheckpointDue(latest, at(10))).toBe(true);
  });

  it('ignores the timestamp when deciding whether content changed', () => {
    const document = letterFixture();
    expect(hasContentChanged(document, reviseDocument(document, {}))).toBe(false);
    expect(hasContentChanged(document, reviseDocument(document, { title: 'x' }))).toBe(true);
  });

  it('groups by day, newest first', () => {
    const today = createCheckpoint(letterFixture(), 'manual', new Date('2026-09-11T10:41:00Z'));
    const yesterday = createCheckpoint(letterFixture(), 'manual', new Date('2026-09-10T21:34:00Z'));
    const groups = groupByDay([yesterday, today], 'de');
    expect(groups).toHaveLength(2);
    expect(groups[0].checkpoints[0].id).toBe(today.id);
  });
});

describe('HistoryService', () => {
  function service() {
    const documents = new FakeDocumentRepository();
    const checkpoints = new FakeCheckpointRepository();
    const copies = new FakeWorkingCopyStore();
    return {
      history: new HistoryService(documents, checkpoints, copies, new MarkdownDocumentCodecImpl()),
      documents,
      checkpoints,
      copies,
    };
  }

  it('skips a checkpoint when nothing changed since the newest one', async () => {
    const { history } = service();
    const document = letterFixture();
    expect(await history.checkpoint(document, 'manual', at(0))).not.toBeNull();
    expect(await history.checkpoint(reviseDocument(document, {}), 'manual', at(1))).toBeNull();
    expect(await history.list(document.id)).toHaveLength(1);
  });

  it('restores without destroying the current version', async () => {
    const { history, documents } = service();
    const first = letterFixture({ title: 'Erste Fassung' });
    await documents.save(first);
    const checkpoint = (await history.checkpoint(first, 'manual', at(0)))!;

    const second = reviseDocument(first, { title: 'Zweite Fassung' }, at(5));
    await documents.save(second);

    const restored = await history.restore(checkpoint.id, at(10));
    expect(restored.title).toBe('Erste Fassung');
    expect(restored.id).toBe(first.id);
    expect((await documents.get(first.id))?.title).toBe('Erste Fassung');

    // The version that was replaced is itself a checkpoint now.
    const list = await history.list(first.id);
    expect(list.map((c) => [c.origin, c.document.title])).toEqual([
      ['restore', 'Zweite Fassung'],
      ['manual', 'Erste Fassung'],
    ]);
  });

  it('opens a checkpoint as a new document', async () => {
    const { history, documents } = service();
    const original = letterFixture({ title: 'Original' });
    await documents.save(original);
    const checkpoint = (await history.checkpoint(original, 'imported', at(0)))!;

    const copy = await history.openAsCopy(checkpoint.id, 'Kopie von Original', at(1));
    expect(copy.id).not.toBe(original.id);
    expect(copy.title).toBe('Kopie von Original');
    expect(await documents.list()).toHaveLength(2);
  });

  it('exports a checkpoint through the codec under a dated filename', async () => {
    const { history } = service();
    const checkpoint = (await history.checkpoint(
      letterFixture({ title: 'Antrag' }),
      'manual',
      new Date('2026-09-11T10:41:00Z'),
    ))!;
    const file = await history.export(checkpoint.id);
    expect(file.filename).toBe('Antrag (2026-09-11 10-41)');
    expect(file.content).toContain('title: Antrag');
  });

  it('offers a working copy only when it is newer and different', async () => {
    const { history } = service();
    const stored = reviseDocument(letterFixture(), {}, at(0));
    await history.saveWorkingCopy(reviseDocument(stored, { title: 'Weiter' }, at(2)), at(2));
    expect((await history.recoverableCopy(stored))?.document.title).toBe('Weiter');

    await history.saveWorkingCopy(reviseDocument(stored, {}, at(3)), at(3));
    expect(await history.recoverableCopy(stored)).toBeNull();
  });

  it('reports a missing checkpoint', async () => {
    const { history } = service();
    await expect(history.restore('missing')).rejects.toThrowError(NotFoundError);
  });
});
