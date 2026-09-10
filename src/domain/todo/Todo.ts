/** Maximum Markdown source length accepted by the Todo demo. */
export const TODO_TITLE_MAX_LENGTH = 2_000;

/** Maximum number of records the bounded demo stores in one browser profile. */
export const TODO_COLLECTION_MAX_SIZE = 1_000;

/** Immutable Todo entity used across the domain and application layers. */
export interface Todo {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Creates a normalized Todo entity.
 *
 * @throws {Error} When the trimmed title is empty or longer than the supported maximum.
 */
export function createTodo(title: string, now = new Date()): Todo {
  const normalized = title.trim();
  if (normalized.length < 1 || normalized.length > TODO_TITLE_MAX_LENGTH) {
    throw new Error(`Todo title must contain 1–${TODO_TITLE_MAX_LENGTH} characters.`);
  }

  const timestamp = now.toISOString();
  return {
    id: crypto.randomUUID(),
    title: normalized,
    completed: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** Returns a new Todo with an updated completion state and modification timestamp. */
export function setTodoCompleted(todo: Todo, completed: boolean, now = new Date()): Todo {
  return { ...todo, completed, updatedAt: now.toISOString() };
}
