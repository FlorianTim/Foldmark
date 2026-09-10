import type { Todo } from '@/domain/todo/Todo';

/** Persistence port required by the Todo application service. */
export interface TodoRepository {
  /** Lists all records in the repository's deterministic display order. */
  list(): Promise<Todo[]>;

  /** Inserts or replaces one validated Todo. */
  save(todo: Todo): Promise<void>;

  /** Removes one Todo by its opaque identifier. */
  delete(id: string): Promise<void>;

  /** Removes every Todo owned by this application. */
  clear(): Promise<void>;
}
