import { z } from 'zod';
import { TODO_TITLE_MAX_LENGTH } from './Todo';

/** Runtime schema for records crossing the persistence boundary. */
export const TodoSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(TODO_TITLE_MAX_LENGTH),
    completed: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

/** Runtime schema for untrusted Todo title input. */
export const TodoTitleSchema = z.string().trim().min(1).max(TODO_TITLE_MAX_LENGTH);

/** Runtime schema for a complete collection loaded from IndexedDB. */
export const TodoListSchema = z.array(TodoSchema);
