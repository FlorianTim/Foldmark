import { describe, expect, it, vi } from 'vitest';
import type { AppDb } from '@/infrastructure/db/AppDb';
import { DexieTodoRepository } from '@/infrastructure/db/DexieTodoRepository';

function databaseReturning(records: unknown[]): AppDb {
  return {
    todos: {
      orderBy: vi.fn(() => ({ reverse: () => ({ toArray: async () => records }) })),
    },
  } as unknown as AppDb;
}

describe('DexieTodoRepository', () => {
  it('rejects corrupted records at the persistence boundary', async () => {
    const repository = new DexieTodoRepository(databaseReturning([{ id: 'not-a-uuid' }]));
    await expect(repository.list()).rejects.toThrow();
  });

  it('returns valid records', async () => {
    const records = [
      {
        id: 'f1e2d3c4-b5a6-4789-8123-456789abcdef',
        title: 'Valid',
        completed: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const repository = new DexieTodoRepository(databaseReturning(records));
    await expect(repository.list()).resolves.toEqual(records);
  });
});
