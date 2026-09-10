import { afterEach, describe, expect, it, vi } from 'vitest';
import { TodoInputError, TodoLimitError } from '@/application/errors/TodoErrors';
import type { TodoRepository } from '@/application/ports/TodoRepository';
import { TodoService } from '@/application/usecases/TodoService';
import { TODO_COLLECTION_MAX_SIZE, TODO_TITLE_MAX_LENGTH, type Todo } from '@/domain/todo/Todo';

class MemoryTodoRepository implements TodoRepository {
  public records: Todo[] = [];

  public async list(): Promise<Todo[]> {
    return [...this.records];
  }

  public async save(todo: Todo): Promise<void> {
    this.records = [...this.records.filter(({ id }) => id !== todo.id), todo];
  }

  public async delete(id: string): Promise<void> {
    this.records = this.records.filter((todo) => todo.id !== id);
  }

  public async clear(): Promise<void> {
    this.records = [];
  }
}

describe('TodoService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('coordinates add, toggle, delete, and clear through the repository port', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'f1e2d3c4-b5a6-4789-8123-456789abcdef' });
    const repository = new MemoryTodoRepository();
    const service = new TodoService(repository);

    const created = await service.add('  Document the template  ');
    expect((await service.list())[0]?.title).toBe('Document the template');
    expect((await service.toggle(created)).completed).toBe(true);
    await service.remove(created.id);
    expect(await service.list()).toEqual([]);
    await service.add('One more');
    await service.clear();
    expect(await service.list()).toEqual([]);
  });

  it('maps invalid untrusted input to an application error', async () => {
    const service = new TodoService(new MemoryTodoRepository());
    await expect(service.add('x'.repeat(TODO_TITLE_MAX_LENGTH + 1))).rejects.toBeInstanceOf(
      TodoInputError,
    );
  });

  it('bounds local collection growth', async () => {
    const repository = new MemoryTodoRepository();
    repository.records = Array.from({ length: TODO_COLLECTION_MAX_SIZE }, (_, index) => ({
      id: `f1e2d3c4-b5a6-4789-8123-${String(index).padStart(12, '0')}`,
      title: `Todo ${index}`,
      completed: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }));
    const service = new TodoService(repository);
    await expect(service.add('One too many')).rejects.toBeInstanceOf(TodoLimitError);
  });
});
