import { describe, expect, it } from 'vitest';
import { validateForTarget } from '@/application/validation/validateForTarget';
import { hasBlockingIssue, type ValidationIssue } from '@/domain/common/ValidationIssue';
import type { ExportTarget } from '@/domain/export/ExportTarget';
import { findBuiltInProfile } from '@/domain/print/builtInProfiles';
import { letterFixture } from './helpers/fakes';

const din5008B = findBuiltInProfile('din5008-b')!;
const postcard = findBuiltInProfile('postcard-a6-landscape-duplex')!;
const photo = findBuiltInProfile('photo-10x15')!;

function codes(issues: readonly ValidationIssue[]): readonly string[] {
  return issues.map((issue) => issue.code);
}

function validate(target: ExportTarget, document = letterFixture(), profile = din5008B) {
  return validateForTarget({ document, profile, target });
}

/**
 * The point of validating *per target*: the same document is complete for one
 * output and incomplete for another, and the severity has to follow.
 */
describe('the same missing address, three targets', () => {
  const withoutRecipient = letterFixture({ metadata: { subject: 'Antrag' } });

  it('warns when printing, and never blocks (R13-010)', () => {
    const issues = validate('print', withoutRecipient);
    expect(codes(issues)).toContain('document.recipientRequired');
    expect(issues.find((issue) => issue.code === 'document.recipientRequired')?.severity).toBe(
      'warning',
    );
    // A letter without an inside address is printable; so is an empty sheet.
    expect(hasBlockingIssue(issues)).toBe(false);
    expect(hasBlockingIssue(validate('print', letterFixture({ bodyMarkdown: '' })))).toBe(false);
  });

  it('only warns for a PDF that will be attached to an email', () => {
    const issues = validate('email-pdf', withoutRecipient);
    expect(issues.find((issue) => issue.code === 'document.recipientRequired')?.severity).toBe(
      'warning',
    );
  });

  it('does not mention it at all when exporting Markdown', () => {
    expect(codes(validate('markdown', withoutRecipient))).not.toContain(
      'document.recipientRequired',
    );
  });
});

describe('postal checks', () => {
  it('accepts a complete address quietly', () => {
    const issues = validate('print');
    expect(codes(issues)).not.toContain('document.recipientIncomplete');
    expect(codes(issues)).not.toContain('document.postalCodeMissing');
    expect(hasBlockingIssue(issues)).toBe(false);
  });

  it('warns about an address that would not survive a sorting office', () => {
    const document = letterFixture({
      metadata: { recipient: { organization: 'Stadt Beispielstadt' } },
    });
    const issues = validate('print', document);
    expect(codes(issues)).toContain('document.recipientIncomplete');
    expect(codes(issues)).toContain('document.postalCodeMissing');
    // Incomplete is a warning: the user may know something the app does not.
    expect(hasBlockingIssue(issues)).toBe(false);
  });
});

describe('email checks', () => {
  it('blocks an invalid address and warns about a missing one', () => {
    const invalid = letterFixture({ metadata: { subject: 'A', emailTo: 'not-an-address' } });
    expect(
      validate('eml', invalid).find((issue) => issue.code === 'document.emailToInvalid')?.severity,
    ).toBe('error');

    const missing = letterFixture({ metadata: { subject: 'A' } });
    expect(
      validate('email-text', missing).find((issue) => issue.code === 'document.emailToMissing')
        ?.severity,
    ).toBe('warning');
  });

  it('blocks a subject that carries a line break', () => {
    const document = letterFixture({
      metadata: { subject: 'Antrag\r\nBcc: victim@example.invalid' },
    });
    const issues = validate('email-text', document);
    expect(codes(issues)).toContain('document.subjectUnsafe');
    expect(hasBlockingIssue(issues)).toBe(true);
  });

  it('mentions the suppressed marks only when they were switched back on', () => {
    expect(codes(validate('email-pdf'))).not.toContain('export.emailPdfMarksEnabled');

    const document = letterFixture();
    const withMarks = {
      ...document,
      exportPreferences: { ...document.exportPreferences, emailPdfIncludesPhysicalMarks: true },
    };
    expect(codes(validate('email-pdf', withMarks))).toContain('export.emailPdfMarksEnabled');
  });
});

describe('profile fit', () => {
  it('always reminds about printer scaling before printing', () => {
    const reminder = validate('print').find((issue) => issue.code === 'export.scalingReminder');
    expect(reminder?.severity).toBe('info');
  });

  it('says the DIN-style geometry is unverified when it is about to be printed', () => {
    expect(codes(validate('print'))).toContain('export.profileStandardsUnverified');
    expect(codes(validate('markdown'))).not.toContain('export.profileStandardsUnverified');
  });

  it('warns when the document kind and the profile disagree', () => {
    const document = letterFixture({ kind: 'postcard', printProfileId: din5008B.id });
    const issues = validate('print', document, din5008B);
    expect(codes(issues)).toContain('document.profileCategoryMismatch');
    expect(codes(issues)).toContain('document.twoSidedWithoutDuplexProfile');
  });

  it('accepts a postcard on its own duplex profile', () => {
    const document = letterFixture({
      kind: 'postcard',
      printProfileId: postcard.id,
      surfaces: { back: { text: 'Grüße' } },
    });
    const issues = validateForTarget({ document, profile: postcard, target: 'print' });
    expect(codes(issues)).not.toContain('document.twoSidedWithoutDuplexProfile');
    expect(hasBlockingIssue(issues)).toBe(false);
  });

  it('carries a blocking profile problem into the document checks', () => {
    const broken = { ...photo, capabilities: { ...photo.capabilities, addressWindow: true } };
    const issues = validateForTarget({
      document: letterFixture({ kind: 'photo-card' }),
      profile: broken,
      target: 'print',
    });
    expect(codes(issues)).toContain('profile.addressWindowRegionMissing');
    expect(hasBlockingIssue(issues)).toBe(true);
  });
});

describe('references and sender', () => {
  it('blocks a document pointing at an asset that is gone', () => {
    const document = letterFixture({ metadata: { signatureId: 'missing-signature' } });
    const issues = validateForTarget({
      document,
      profile: din5008B,
      target: 'print',
      assets: [],
    });
    expect(codes(issues)).toContain('document.assetMissing');
    // The page still renders without the image, so this is a warning (R13-010).
    expect(hasBlockingIssue(issues)).toBe(false);
  });

  it('warns about a document whose sender identity was deleted', () => {
    const document = letterFixture({ metadata: { senderProfileId: 'gone' } });
    const issues = validateForTarget({
      document,
      profile: din5008B,
      target: 'print',
      hasSender: false,
    });
    expect(codes(issues)).toContain('document.senderProfileMissing');
  });

  it('recommends a sender for an address-window profile without demanding one', () => {
    const issues = validateForTarget({
      document: letterFixture(),
      profile: din5008B,
      target: 'print',
      hasSender: false,
    });
    expect(issues.find((issue) => issue.code === 'document.senderRecommended')?.severity).toBe(
      'warning',
    );
  });
});

describe('ordering', () => {
  it('returns errors before warnings before notes', () => {
    const document = letterFixture({ metadata: { subject: 'A\r\nB' }, bodyMarkdown: '' });
    const severities = validate('email-text', document).map((issue) => issue.severity);
    const rank = { error: 0, warning: 1, info: 2 } as const;
    const ranks = severities.map((severity) => rank[severity]);
    expect([...ranks].sort((left, right) => left - right)).toEqual(ranks);
  });
});
