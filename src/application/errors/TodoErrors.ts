/** Error raised when untrusted Todo input violates a domain constraint. */
export class TodoInputError extends Error {
  public constructor() {
    super('Todo input is invalid.');
    this.name = 'TodoInputError';
  }
}

/** Error raised when the bounded demo reaches its local record limit. */
export class TodoLimitError extends Error {
  public constructor() {
    super('Todo collection limit reached.');
    this.name = 'TodoLimitError';
  }
}
