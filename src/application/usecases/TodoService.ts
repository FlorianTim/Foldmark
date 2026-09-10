import { TodoInputError, TodoLimitError } from '@/application/errors/TodoErrors';
import type { TodoRepository } from '@/application/ports/TodoRepository';
import {
  createTodo,
  setTodoCompleted,
  TODO_COLLECTION_MAX_SIZE,
  type Todo,
} from '@/domain/todo/Todo';
import { TodoTitleSchema } from '@/domain/todo/TodoSchema';

/** Coordinates Todo domain behavior through the persistence port. */
export class TodoService {
  public constructor(private readonly repository: TodoRepository) {}

  /** Returns the current Todo collection. */
  public list(): Promise<Todo[]> {
    return this.repository.list();
  }

  /**
   * Validates and stores a new Todo.
   *
   * @throws {TodoInputError} When the title is invalid.
   * @throws {TodoLimitError} When the bounded demo collection is full.
   */
  public async add(rawTitle: string): Promise<Todo> {
    const parsedTitle = TodoTitleSchema.safeParse(rawTitle);
    if (!parsedTitle.success) {
      throw new TodoInputError();
    }

    const current = await this.repository.list();
    if (current.length >= TODO_COLLECTION_MAX_SIZE) {
      throw new TodoLimitError();
    }

    const todo = createTodo(parsedTitle.data);
    await this.repository.save(todo);
    return todo;
  }

  /** Toggles and persists one Todo without mutating the supplied entity. */
  public async toggle(todo: Todo): Promise<Todo> {
    const updated = setTodoCompleted(todo, !todo.completed);
    await this.repository.save(updated);
    return updated;
  }

  /** Removes one Todo. */
  public remove(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  /** Removes the complete Todo collection. */
  public clear(): Promise<void> {
    return this.repository.clear();
  }
}
