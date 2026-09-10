import Dexie, { type EntityTable } from 'dexie';
import type { Todo } from '@/domain/todo/Todo';

/** Dexie database owned by the configured application slug. */
export class AppDb extends Dexie {
  /** Indexed Todo table; the definite assignment is provided by Dexie at runtime. */
  public todos!: EntityTable<Todo, 'id'>;

  public constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({ todos: 'id, completed, createdAt, updatedAt' });
  }
}
