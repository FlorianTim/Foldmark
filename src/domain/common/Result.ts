/** Explicit success/failure value for domain operations that do not throw. */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/** Creates a successful domain result. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Creates a failed domain result. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
