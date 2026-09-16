export function validateForTarget(
  document: FoldmarkDocument,
  profile: PrintProfile,
  target: ExportTarget,
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (target === 'print' && document.kind === 'letter' && !document.metadata.recipient) {
    issues.push({ severity: 'error', code: 'recipient.required', path: 'metadata.recipient' });
  }

  if (profile.category === 'photo' && profile.markers.some((m) => m.kind === 'fold' && m.print)) {
    issues.push({ severity: 'warning', code: 'profile.photoFoldMarksUnexpected' });
  }

  if (target === 'email-pdf' && profile.markers.some((m) => m.print)) {
    issues.push({ severity: 'info', code: 'export.emailPdfMarksSuppressed' });
  }

  return issues;
}
