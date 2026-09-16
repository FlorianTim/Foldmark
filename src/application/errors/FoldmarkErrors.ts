/**
 * Application errors.
 *
 * Each one carries a translation key rather than a message. The application
 * layer has no locale and no catalogue, and an error that reaches the UI as
 * English prose is an error the German UI cannot show — so the message is the
 * key and the presentation layer resolves it.
 */

/** Base class for failures the UI is expected to display rather than log. */
export class FoldmarkError extends Error {
  /**
   * @param translationKey Key under `errors.` in the message catalogue.
   * @param params Bounded values interpolated into the translated message.
   */
  public constructor(
    public readonly translationKey: string,
    public readonly params?: Readonly<Record<string, string | number>>,
  ) {
    super(translationKey);
    this.name = new.target.name;
  }
}

/** Input failed schema validation before it could be stored. */
export class InvalidInputError extends FoldmarkError {
  public constructor(field?: string) {
    super('errors.invalidInput', field ? { field } : undefined);
  }
}

/** A record the operation depends on does not exist. */
export class NotFoundError extends FoldmarkError {
  public constructor(kind: string) {
    super('errors.notFound', { kind });
  }
}

/** A bounded collection is full. */
export class LimitReachedError extends FoldmarkError {
  public constructor(kind: string, limit: number) {
    super('errors.limitReached', { kind, limit });
  }
}

/** A built-in record was modified, which is never allowed in place. */
export class ImmutableRecordError extends FoldmarkError {
  public constructor(kind: string) {
    super('errors.immutableRecord', { kind });
  }
}

/** An imported file was rejected, with the reason carried in the issues. */
export class ImportRejectedError extends FoldmarkError {
  public constructor(reason: string) {
    super('errors.importRejected', { reason });
  }
}

/** An asset failed the import rules — wrong type, too large, or impossible dimensions. */
export class AssetRejectedError extends FoldmarkError {
  public constructor(reason: string) {
    super('errors.assetRejected', { reason });
  }
}
