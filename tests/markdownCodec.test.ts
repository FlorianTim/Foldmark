import { describe, expect, it } from 'vitest';
import { MarkdownDocumentCodecImpl } from '@/infrastructure/codec/MarkdownDocumentCodecImpl';
import { letterFixture } from './helpers/fakes';

const codec = new MarkdownDocumentCodecImpl();
const defaults = {
  id: 'imported-document',
  locale: 'de-DE',
  printProfileId: 'a4-blank',
  now: new Date('2026-08-03T10:00:00.000Z'),
};

/** The example letter from the draft package, verbatim. */
const DRAFT_LETTER = `---
foldmarkVersion: 1
kind: letter
title: Antrag auf Ausstellung einer Bescheinigung
locale: de-DE
printProfile: din5008-b
senderProfileId: sender-private
recipient:
  organization: Stadt Beispielstadt
  department: Bürgerbüro
  street: Rathausplatz 1
  postalCode: "12345"
  city: Beispielstadt
  countryCode: DE
date: 2026-08-03
subject: Antrag auf Ausstellung einer Bescheinigung
signatureId: signature-default
export:
  pdf:
    includePhysicalMarks: true
  emailPdf:
    includePhysicalMarks: false
---

Sehr geehrte Damen und Herren,

hiermit beantrage ich die Ausstellung einer Bescheinigung.

Mit freundlichen Grüßen

Florian Beispiel
`;

describe('decoding the canonical format', () => {
  it('reads the draft example without loss', () => {
    const result = codec.decode(DRAFT_LETTER, defaults);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { document } = result;
    expect(document.kind).toBe('letter');
    expect(document.printProfileId).toBe('din5008-b');
    expect(document.metadata.recipient?.department).toBe('Bürgerbüro');
    expect(document.metadata.recipient?.postalCode).toBe('12345');
    expect(document.metadata.date).toBe('2026-08-03');
    expect(document.metadata.signatureId).toBe('signature-default');
    expect(document.exportPreferences.pdfIncludesPhysicalMarks).toBe(true);
    expect(document.exportPreferences.emailPdfIncludesPhysicalMarks).toBe(false);
    expect(document.bodyMarkdown).toContain('hiermit beantrage ich');
  });

  it('falls back to the supplied defaults for what the file does not say', () => {
    const result = codec.decode('Just a body.\n', defaults);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.printProfileId).toBe('a4-blank');
    expect(result.document.locale).toBe('de-DE');
    expect(result.issues.some((issue) => issue.code === 'import.noFrontMatter')).toBe(true);
  });

  it('preserves unknown top-level scalars through a round trip', () => {
    const source = '---\ntitle: A\ncustomField: kept\n---\n\nBody\n';
    const decoded = codec.decode(source, defaults);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;

    expect(decoded.document.preserved.customField).toBe('kept');
    expect(codec.encode(decoded.document)).toContain('customField: kept');
  });

  it('preserves one-level mappings and lists of scalars, drops deeper structures (change 0017)', () => {
    const source =
      '---\ntitle: A\nweird:\n  nested:\n    deep: value\nflat:\n  key: value\nitems:\n  - one\n  - two\n---\n\nBody\n';
    const decoded = codec.decode(source, defaults);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.document.preserved.weird).toBeUndefined();
    expect(decoded.document.preserved.flat).toEqual({ key: 'value' });
    expect(decoded.document.preserved.items).toEqual(['one', 'two']);
    expect(decoded.issues.some((issue) => issue.code === 'import.metadataDropped')).toBe(true);
    const encoded = codec.encode(decoded.document);
    expect(encoded).toContain('flat:\n  key: value');
    expect(encoded).toContain('items:\n  - one\n  - two');
  });

  it('returns the original source when the file cannot be understood', () => {
    const broken = '---\ntitle: A\nalias: *nope\n---\n\nBody\n';
    const result = codec.decode(broken, defaults);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // The user gets their text back. Swallowing it would be the worst outcome.
    expect(result.source).toBe(broken);
    expect(result.issues[0].code).toBe('import.frontMatterInvalid');
  });

  it('refuses a format version it does not know', () => {
    const future = '---\nfoldmarkVersion: 99\ntitle: A\n---\n\nBody\n';
    const result = codec.decode(future, defaults);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.code === 'import.unsupportedFormatVersion')).toBe(
      true,
    );
  });

  it('refuses a file larger than the accepted maximum', () => {
    const huge = 'x'.repeat(MarkdownDocumentCodecImpl.MAX_SOURCE_LENGTH + 1);
    const result = codec.decode(huge, defaults);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.code === 'import.fileTooLarge')).toBe(true);
  });

  it('downgrades an unknown document kind instead of failing the import', () => {
    const source = '---\nkind: origami\ntitle: A\n---\n\nBody\n';
    const result = codec.decode(source, defaults);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.kind).toBe('custom');
    expect(result.issues.some((issue) => issue.code === 'import.unknownKind')).toBe(true);
  });

  it('does not carry Markdown body content into metadata', () => {
    const source = '---\ntitle: A\n---\n\n---\nnot: front matter\n---\n';
    const result = codec.decode(source, defaults);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.preserved.not).toBeUndefined();
    expect(result.document.bodyMarkdown).toContain('not: front matter');
  });
});

describe('encoding', () => {
  it('round-trips a document through encode and decode', () => {
    const original = letterFixture();
    const encoded = codec.encode(original);
    const decoded = codec.decode(encoded, { ...defaults, id: original.id });

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;

    expect(decoded.document.title).toBe(original.title);
    expect(decoded.document.kind).toBe(original.kind);
    expect(decoded.document.printProfileId).toBe(original.printProfileId);
    expect(decoded.document.metadata.recipient).toEqual(original.metadata.recipient);
    expect(decoded.document.metadata.subject).toBe(original.metadata.subject);
    expect(decoded.document.metadata.date).toBe(original.metadata.date);
    expect(decoded.document.exportPreferences).toEqual(original.exportPreferences);
    expect(decoded.document.bodyMarkdown.trim()).toBe(original.bodyMarkdown.trim());
  });

  it('keeps the contact a recipient snapshot came from (R14-012)', () => {
    const original = letterFixture({
      metadata: { ...letterFixture().metadata, recipientContactId: 'contact-1' },
    });
    const encoded = codec.encode(original);
    expect(encoded).toContain('recipientContactId: contact-1');
    const decoded = codec.decode(encoded, { ...defaults, id: original.id });
    expect(decoded.ok && decoded.document.metadata.recipientContactId).toBe('contact-1');
    expect(decoded.ok && decoded.document.preserved).not.toHaveProperty('recipientContactId');
  });

  it('writes a regular subject only as the deviation and reads it back (R14-003)', () => {
    const bold = letterFixture();
    expect(codec.encode(bold)).not.toContain('subjectWeight');

    const regular = letterFixture({ printOptions: { ...bold.printOptions, subjectBold: false } });
    const encoded = codec.encode(regular);
    expect(encoded).toContain('subjectWeight: regular');
    const decoded = codec.decode(encoded, { ...defaults, id: regular.id });
    expect(decoded.ok && decoded.document.printOptions.subjectBold).toBe(false);
    expect(decoded.ok && decoded.document.preserved).not.toHaveProperty('subjectWeight');
  });

  it('round-trips the sender snapshot as a flat address map plus footer lines', () => {
    const base = letterFixture();
    const original = {
      ...base,
      metadata: {
        ...base.metadata,
        senderProfileId: 'a1b2c3d4-0000-4000-8000-000000000001',
        sender: {
          name: 'Privat',
          postal: { person: 'Max Beispiel', street: 'Weg 1', postalCode: '10115', city: 'Berlin' },
          email: 'max@example.org',
          footerLines: ['IBAN DE00 0000', 'USt-IdNr. DE000'],
        },
      },
    };
    const encoded = codec.encode(original);
    expect(encoded).toContain('sender:');
    expect(encoded).toContain('  name: Privat');
    expect(encoded).toContain('senderFooter:');

    const decoded = codec.decode(encoded, { ...defaults, id: original.id });
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.document.metadata.sender).toEqual(original.metadata.sender);
    expect(decoded.document.metadata.senderProfileId).toBe(original.metadata.senderProfileId);
    expect(decoded.document.preserved).toEqual({});
  });

  it('starts with a fenced block and keeps the body readable', () => {
    const encoded = codec.encode(letterFixture());
    expect(encoded.startsWith('---\nfoldmarkVersion: 1\n')).toBe(true);
    expect(encoded).toContain('\n---\n\nSehr geehrte Damen und Herren,');
  });

  it('never lets a preserved key shadow one Foldmark understands', () => {
    const document = letterFixture({ preserved: { title: 'hijacked', extra: 'fine' } });
    const encoded = codec.encode(document);
    expect(encoded).toContain('title: Antrag');
    expect(encoded).not.toContain('title: hijacked');
    expect(encoded).toContain('extra: fine');
  });
});
