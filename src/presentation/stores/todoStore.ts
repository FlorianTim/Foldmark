import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { TodoInputError, TodoLimitError } from '@/application/errors/TodoErrors';
import { services } from '@/app/compositionRoot';
import type { Todo } from '@/domain/todo/Todo';

/** Translation keys emitted by the store instead of leaking raw persistence errors. */
export type TodoErrorKey = 'todo.errors.invalid' | 'todo.errors.limit' | 'todo.errors.persistence';

function errorKey(cause: unknown): TodoErrorKey {
  if (cause instanceof TodoInputError) return 'todo.errors.invalid';
  if (cause instanceof TodoLimitError) return 'todo.errors.limit';
  return 'todo.errors.persistence';
}

/** Pinia presentation store for asynchronous Todo screen state. */
export const useTodoStore = defineStore('todos', () => {
  const todos = ref<Todo[]>([]);
  const loading = ref(false);
  const error = ref<TodoErrorKey | null>(null);
  const remaining = computed(() => todos.value.filter((todo) => !todo.completed).length);

  async function run(action: () => Promise<void>): Promise<void> {
    error.value = null;
    try {
      await action();
    } catch (cause) {
      error.value = errorKey(cause);
    }
  }

  async function load(): Promise<void> {
    loading.value = true;
    await run(async () => {
      todos.value = await services.todo.list();
    });
    loading.value = false;
  }

  async function add(title: string): Promise<void> {
    await run(async () => {
      await services.todo.add(title);
      todos.value = await services.todo.list();
    });
  }

  async function toggle(todo: Todo): Promise<void> {
    await run(async () => {
      await services.todo.toggle(todo);
      todos.value = await services.todo.list();
    });
  }

  async function remove(id: string): Promise<void> {
    await run(async () => {
      await services.todo.remove(id);
      todos.value = await services.todo.list();
    });
  }

  async function clear(): Promise<void> {
    await run(async () => {
      await services.todo.clear();
      todos.value = [];
    });
  }

  return { todos, loading, error, remaining, load, add, toggle, remove, clear };
});
