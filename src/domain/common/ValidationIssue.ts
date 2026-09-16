/**
 * Validation results.
 *
 * Foldmark validates a document *against a target*, not in the abstract: a
 * letter with no recipient is an error when it is going in an envelope and
 * merely a note when it is being saved. So an issue carries the severity that
 * applies to the target it was produced for, and the caller never re-derives it.
 *
 * The `code` is a translation key suffix rather than a message. Nothing in the
 * domain or application layer may produce user-facing prose — that is what let
 * German and English stay complete without a second catalogue of error strings
 * hidden inside the use cases.
 */

/** How much a validation issue matters for the target it was produced for. */
export type IssueSeverity = 'error' | 'warning' | 'info';

/** One validation finding, ready to be translated and pointed at a field. */
export interface ValidationIssue {
  readonly severity: IssueSeverity;
  /** Stable translation-key suffix, resolved as `validation.<code>`. */
  readonly code: string;
  /** Dotted path into the document or profile the issue refers to, when there is one. */
  readonly path?: string;
  /** Bounded, already-safe values interpolated into the translated message. */
  readonly params?: Readonly<Record<string, string | number>>;
}

/** Whether any issue in the list blocks the operation it was produced for. */
export function hasBlockingIssue(issues: readonly ValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}

/** Counts issues per severity, for the summary a validation panel shows. */
export function summarizeIssues(
  issues: readonly ValidationIssue[],
): Readonly<Record<IssueSeverity, number>> {
  return {
    error: issues.filter((issue) => issue.severity === 'error').length,
    warning: issues.filter((issue) => issue.severity === 'warning').length,
    info: issues.filter((issue) => issue.severity === 'info').length,
  };
}
