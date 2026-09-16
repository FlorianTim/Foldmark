/**
 * UI preferences, as data.
 *
 * The template keeps preferences in a declarative registry backed by
 * `localStorage`, which lives in the presentation layer — where it belongs, as
 * it is presentation state. Backup, however, has to include it: restoring a
 * backup that brings back every letter but loses the language and the default
 * sender is a restore that still feels like a loss.
 *
 * So the application layer sees preferences through this port: an opaque
 * key/value snapshot it can write to a file and read back, with no opinion
 * about what any of it means.
 */
export interface SettingsStore {
  /** Every stored preference, in its stored form. */
  snapshot(): Readonly<Record<string, string>>;

  /**
   * Writes preferences back.
   *
   * @returns How many were applied. Unknown keys are ignored rather than
   *   stored, so a backup from a newer version cannot inject arbitrary keys.
   */
  restore(values: Readonly<Record<string, string>>): number;

  /** Removes every preference this application owns. */
  clear(): void;
}
