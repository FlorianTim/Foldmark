import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTodo, setTodoCompleted, TODO_TITLE_MAX_LENGTH } from '@/domain/todo/Todo';

describe('Todo domain', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('normalizes and creates a todo', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'f1e2d3c4-b5a6-4789-8123-456789abcdef' });
    const todo = createTodo('  Test  ', new Date('2026-01-01T00:00:00Z'));
    expect(todo.title).toBe('Test');
    expect(todo.completed).toBe(false);
  });

  it('toggles immutably', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'f1e2d3c4-b5a6-4789-8123-456789abcdef' });
    const original = createTodo('A');
    const updated = setTodoCompleted(original, true);
    expect(updated.completed).toBe(true);
    expect(original.completed).toBe(false);
  });

  it.each([' ', 'x'.repeat(TODO_TITLE_MAX_LENGTH + 1)])('rejects invalid title %j', (title) => {
    expect(() => createTodo(title)).toThrow();
  });
});
