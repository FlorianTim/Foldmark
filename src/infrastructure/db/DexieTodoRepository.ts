import type { TodoRepository } from '@/application/ports/TodoRepository';
import type { Todo } from '@/domain/todo/Todo';
import { TodoListSchema, TodoSchema } from '@/domain/todo/TodoSchema';
import type { AppDb } from './AppDb';

/** IndexedDB adapter for the Todo repository port. */
export class DexieTodoRepository implements TodoRepository {
  public constructor(private readonly db: AppDb) {}

  /** Loads and validates persisted records before they re-enter the application. */
  public async list(): Promise<Todo[]> {
    const records = await this.db.todos.orderBy('createdAt').reverse().toArray();
    return TodoListSchema.parse(records);
  }

  /** Validates a record immediately before persistence. */
  public async save(todo: Todo): Promise<void> {
    await this.db.todos.put(TodoSchema.parse(todo));
  }

  /** Deletes one record by identifier. */
  public async delete(id: string): Promise<void> {
    await this.db.todos.delete(id);
  }

  /** Clears only this application's Todo table. */
  public async clear(): Promise<void> {
    await this.db.todos.clear();
  }
}
