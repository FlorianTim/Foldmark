/**
 * Export targets.
 *
 * The target is what turns one document into many outputs, and it is an
 * explicit domain concept rather than a flag on the exporter because validation
 * depends on it: a missing postal address is an error for `print` and
 * irrelevant for `markdown`, and a printed fold mark is expected on `print` and
 * wrong on `email-pdf`.
 *
 * Foldmark **prepares** output. It never sends anything: there is no SMTP, no
 * upload, no delivery. The wording in the UI has to match, because a person who
 * believes a letter was sent will not check their mail client.
 */

/** Every output Foldmark can produce or hand off. */
export type ExportTarget =
  'print' | 'pdf' | 'email-pdf' | 'email-text' | 'email-html' | 'eml' | 'markdown';

/** Targets that produce physical paper or a faithful representation of it. */
export const PHYSICAL_TARGETS: readonly ExportTarget[] = ['print', 'pdf'];

/** Targets that hand content to a mail client. */
export const EMAIL_TARGETS: readonly ExportTarget[] = [
  'email-pdf',
  'email-text',
  'email-html',
  'eml',
];

/** Whether the target renders a physical surface at all. */
export function isPhysicalTarget(target: ExportTarget): boolean {
  return target === 'print' || target === 'pdf' || target === 'email-pdf';
}

/**
 * Whether printed helper marks belong on this target by default.
 *
 * `email-pdf` says no: the recipient of an attachment is not going to fold it
 * into an envelope, and crop marks make a letter look like a proof sheet. The
 * user can still turn them on per document.
 */
export function defaultIncludesPhysicalMarks(target: ExportTarget): boolean {
  return target === 'print' || target === 'pdf';
}

/** Which document surfaces the target renders. */
export function rendersAllSurfaces(target: ExportTarget): boolean {
  return isPhysicalTarget(target);
}
