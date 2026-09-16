import type { DocumentAsset } from '@/domain/asset/DocumentAsset';
import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import {
  categoryForKind,
  isTwoSided,
  type FoldmarkDocument,
  type PostalAddress,
} from '@/domain/document/FoldmarkDocument';
import { isSafeHeaderValue, isValidEmailAddress } from '@/domain/email/EmailHeaders';
import type { ExportTarget } from '@/domain/export/ExportTarget';
import { region, type PrintProfile } from '@/domain/print/PrintProfile';
import { validateProfile } from '@/domain/print/validateProfile';

/**
 * Validating a document *for a target*.
 *
 * The same document is complete or incomplete depending on where it is going,
 * so there is no single "is this valid?" — a letter with no postal address is
 * unsendable on paper and perfectly fine as an email. Encoding that here, once,
 * is what keeps the export dialog from growing its own quiet copy of the rules.
 *
 * The function returns findings; it never blocks. Deciding what an error means
 * belongs to the use case that asked, because "you cannot print this" and "this
 * will look odd" are the same data with different consequences.
 */

/** Everything the check needs, resolved by the caller. */
export interface TargetValidationInput {
  readonly document: FoldmarkDocument;
  readonly profile: PrintProfile;
  readonly target: ExportTarget;
  /** Metadata for the assets the document references, to catch dangling ids. */
  readonly assets?: readonly DocumentAsset[];
  /** Whether a sender identity could be resolved for the document. */
  readonly hasSender?: boolean;
}

function isDeliverableAddress(address: PostalAddress | undefined): boolean {
  if (!address) return false;
  const hasRecipient = Boolean(address.person ?? address.organization);
  const hasPlace = Boolean(address.city) && Boolean(address.street ?? address.addressLine2);
  return hasRecipient && hasPlace;
}

function checkPostal(input: TargetValidationInput, issues: ValidationIssue[]): void {
  const { document, target } = input;
  const needsPostal = target === 'print' || target === 'pdf' || target === 'email-pdf';
  if (!needsPostal || document.kind === 'email') return;

  const recipient = document.metadata.recipient;
  if (!recipient) {
    // A warning, not an error (R13-010): a letter without a recipient prints
    // fine — an inside address is the writer's decision, and an empty sheet is
    // how the fold marks get checked against a ruler.
    issues.push({
      severity: 'warning',
      code: 'document.recipientRequired',
      path: 'metadata.recipient',
    });
    return;
  }
  if (!isDeliverableAddress(recipient)) {
    issues.push({
      severity: 'warning',
      code: 'document.recipientIncomplete',
      path: 'metadata.recipient',
    });
  }
  if (!recipient.postalCode) {
    issues.push({
      severity: 'warning',
      code: 'document.postalCodeMissing',
      path: 'metadata.recipient.postalCode',
    });
  }
}

function checkEmail(input: TargetValidationInput, issues: ValidationIssue[]): void {
  const { document, target } = input;
  const isEmailTarget =
    target === 'email-text' ||
    target === 'email-html' ||
    target === 'email-pdf' ||
    target === 'eml';
  if (!isEmailTarget) return;

  const to = document.metadata.emailTo?.trim();
  if (!to) {
    issues.push({ severity: 'warning', code: 'document.emailToMissing', path: 'metadata.emailTo' });
  } else if (!isValidEmailAddress(to)) {
    issues.push({ severity: 'error', code: 'document.emailToInvalid', path: 'metadata.emailTo' });
  }

  const subject = document.metadata.subject?.trim();
  if (!subject) {
    issues.push({ severity: 'warning', code: 'document.subjectMissing', path: 'metadata.subject' });
  } else if (!isSafeHeaderValue(subject)) {
    // A subject carrying a line break is not a formatting slip: it is the shape
    // of a header-injection attempt, and it has to fail loudly.
    issues.push({ severity: 'error', code: 'document.subjectUnsafe', path: 'metadata.subject' });
  }

  if (target === 'eml' && to && !isValidEmailAddress(to)) {
    issues.push({
      severity: 'error',
      code: 'document.emlRecipientInvalid',
      path: 'metadata.emailTo',
    });
  }
}

function checkBody(input: TargetValidationInput, issues: ValidationIssue[]): void {
  const { document, profile, target } = input;
  if (target === 'markdown') return;

  const hasSurfaceText = Object.values(document.surfaces).some((surface) =>
    Boolean(surface?.text?.trim()),
  );
  if (!document.bodyMarkdown.trim() && !hasSurfaceText) {
    issues.push({ severity: 'warning', code: 'document.bodyEmpty', path: 'bodyMarkdown' });
  }

  if (isTwoSided(document.kind) && !profile.duplex) {
    issues.push({
      severity: 'warning',
      code: 'document.twoSidedWithoutDuplexProfile',
      path: 'printProfileId',
    });
  }

  if (document.kind === 'postcard' && profile.duplex && !region(profile, 'address')) {
    issues.push({
      severity: 'error',
      code: 'document.postcardAddressRegionMissing',
      path: 'printProfileId',
    });
  }
}

function checkProfileFit(input: TargetValidationInput, issues: ValidationIssue[]): void {
  const { document, profile, target } = input;
  const expected = categoryForKind(document.kind);
  if (document.kind !== 'custom' && document.kind !== 'email' && profile.category !== expected) {
    issues.push({
      severity: 'warning',
      code: 'document.profileCategoryMismatch',
      path: 'printProfileId',
      params: { expected, actual: profile.category },
    });
  }

  if (target === 'print') {
    // The one thing a browser cannot do for the user: printer scaling. Every
    // physical measurement in Foldmark is correct only at 100 %.
    issues.push({ severity: 'info', code: 'export.scalingReminder' });
  }

  if (target === 'email-pdf' && document.exportPreferences.emailPdfIncludesPhysicalMarks) {
    issues.push({
      severity: 'info',
      code: 'export.emailPdfMarksEnabled',
      path: 'exportPreferences.emailPdfIncludesPhysicalMarks',
    });
  }

  if (profile.standardsStatus === 'draft-unverified' && (target === 'print' || target === 'pdf')) {
    issues.push({ severity: 'info', code: 'export.profileStandardsUnverified' });
  }
}

function checkReferences(input: TargetValidationInput, issues: ValidationIssue[]): void {
  const { document, assets } = input;
  if (!assets) return;
  const known = new Set(assets.map((asset) => asset.id));

  const referenced = [
    ...document.assetPlacements.map((placement) => placement.assetId),
    ...Object.values(document.surfaces).map((surface) => surface?.backgroundAssetId),
    document.metadata.signatureId,
  ].filter((id): id is string => Boolean(id));

  for (const id of new Set(referenced)) {
    if (!known.has(id)) {
      // The page still renders, with the image reported and left out.
      issues.push({
        severity: 'warning',
        code: 'document.assetMissing',
        path: 'assetPlacements',
        params: { assetId: id },
      });
    }
  }
}

function checkSender(input: TargetValidationInput, issues: ValidationIssue[]): void {
  const { document, profile, target, hasSender } = input;
  if (target === 'markdown' || hasSender === undefined) return;
  if (!hasSender && document.metadata.senderProfileId) {
    // The snapshot in the document still renders (ADR 0017); only the book entry is gone.
    issues.push({
      severity: 'warning',
      code: 'document.senderProfileMissing',
      path: 'metadata.senderProfileId',
    });
    return;
  }
  if (!hasSender && profile.capabilities.addressWindow) {
    issues.push({
      severity: 'warning',
      code: 'document.senderRecommended',
      path: 'metadata.senderProfileId',
    });
  }
}

/**
 * Validates a document against a profile for one export target.
 *
 * Profile problems are included, prefixed by their own codes: a user pressing
 * "Print" wants one list of reasons it will not work, not two panels to
 * reconcile.
 */
export function validateForTarget(input: TargetValidationInput): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  checkPostal(input, issues);
  checkEmail(input, issues);
  checkBody(input, issues);
  checkProfileFit(input, issues);
  checkReferences(input, issues);
  checkSender(input, issues);

  // Profile findings that are merely informational on their own stay
  // informational here; an unrenderable profile is an unprintable document.
  for (const issue of validateProfile(input.profile)) {
    if (issue.severity !== 'info') issues.push(issue);
  }

  const order = { error: 0, warning: 1, info: 2 } as const;
  return [...issues].sort((left, right) => order[left.severity] - order[right.severity]);
}
