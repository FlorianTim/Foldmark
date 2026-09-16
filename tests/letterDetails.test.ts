import { describe, expect, it } from 'vitest';
import { buildRenderPlan } from '@/application/render/buildRenderPlan';
import { onSubjectEdited, onTitleEdited } from '@/domain/document/documentSync';
import {
  hasLetterBlock,
  letterBlockText,
  replaceLetterBlock,
} from '@/domain/markdown/letterBlocks';
import { parseMarkdown } from '@/domain/markdown/parseMarkdown';
import { findBuiltInProfile } from '@/domain/print/builtInProfiles';
import { MarkdownDocumentCodecImpl } from '@/infrastructure/codec/MarkdownDocumentCodecImpl';
import { DefaultEmailRenderer } from '@/infrastructure/email/DefaultEmailRenderer';
import { letterFixture } from './helpers/fakes';

const din5008B = findBuiltInProfile('din5008-b')!;

/**
 * Change 0021: the letter details — salutation and closing as body blocks,
 * the one-time title/subject coupling, subject and date visibility, and the
 * two extra page-number formats.
 */
describe('salutation and closing blocks (R13-019)', () => {
  const body = 'Absatz eins.\n\nAbsatz zwei.';

  it('inserts the salutation at the top and the closing at the end', () => {
    const withSalutation = replaceLetterBlock(body, 'salutation', 'Sehr geehrte Frau Beispiel,');
    expect(withSalutation).toBe(
      ':::salutation\nSehr geehrte Frau Beispiel,\n:::\n\nAbsatz eins.\n\nAbsatz zwei.',
    );
    const both = replaceLetterBlock(withSalutation, 'closing', 'Mit freundlichen Grüßen');
    expect(both.endsWith('Absatz zwei.\n\n:::closing\nMit freundlichen Grüßen\n:::')).toBe(true);
    expect(hasLetterBlock(both, 'salutation')).toBe(true);
    expect(letterBlockText(both, 'closing')).toBe('Mit freundlichen Grüßen');
  });

  it('replaces the block in place and removes it when emptied', () => {
    const start = ':::salutation\nGuten Tag,\n:::\n\nText.\n\n:::closing\nGrüße\n:::';
    const replaced = replaceLetterBlock(start, 'salutation', 'Liebe Anna,');
    expect(replaced).toBe(':::salutation\nLiebe Anna,\n:::\n\nText.\n\n:::closing\nGrüße\n:::');
    expect(replaceLetterBlock(replaced, 'closing', '')).toBe(
      ':::salutation\nLiebe Anna,\n:::\n\nText.',
    );
    expect(replaceLetterBlock('Text.', 'closing', '   ')).toBe('Text.');
  });

  it('renders as plain paragraphs the renderers know by name', () => {
    const blocks = parseMarkdown(':::salutation\nGuten Tag,\n:::\n\nText.');
    expect(blocks[0]).toMatchObject({ kind: 'directive', name: 'salutation', known: true });
    const text = new DefaultEmailRenderer().renderPlainText({
      document: letterFixture({
        bodyMarkdown: ':::salutation\nGuten Tag,\n:::\n\nText.\n\n:::closing\nGrüße\n:::',
        metadata: { salutation: 'Guten Tag,', closing: 'Grüße' },
      }),
    });
    // The metadata copy is not prepended a second time.
    expect(text).toBe('Guten Tag,\n\nText.\n\nGrüße');
    expect(text).not.toContain(':::');
  });
});

describe('title and subject synchronise once (AC-DOC-003)', () => {
  const fresh = {
    title: 'Neuer Brief',
    subject: '',
    defaultTitle: 'Neuer Brief',
    titleTouched: false,
    subjectTouched: false,
  };

  it('fills the default title from the first subject, then leaves it alone', () => {
    const first = onSubjectEdited(fresh, 'Antrag');
    expect(first.title).toBe('Antrag');
    const second = onSubjectEdited({ ...fresh, ...first }, 'Antrag auf Bescheinigung');
    expect(second.title).toBe('Antrag auf Bescheinigung');
    // Once the title was typed into, the subject no longer drives it.
    const typed = onTitleEdited({ ...fresh, ...second }, 'Kurz');
    expect(onSubjectEdited({ ...fresh, ...typed }, 'Ganz anders').title).toBe('Kurz');
  });

  it('fills an empty subject from the first title, then leaves it alone', () => {
    const first = onTitleEdited(fresh, 'Mahnung');
    expect(first.subject).toBe('Mahnung');
    const subject = onSubjectEdited({ ...fresh, ...first }, 'Zweite Mahnung');
    expect(onTitleEdited({ ...fresh, ...subject }, 'Mahnung 2').subject).toBe('Zweite Mahnung');
  });

  it('never overwrites a title the user set before the subject', () => {
    const named = { ...fresh, title: 'Mein Titel' };
    expect(onSubjectEdited(named, 'Betreff').title).toBe('Mein Titel');
  });
});

describe('subject and date visibility, page-number formats', () => {
  it('leaves the subject and the date off the sheet when hidden', () => {
    const shown = buildRenderPlan({
      document: letterFixture(),
      profile: din5008B,
      target: 'print',
      mode: 'paper',
    });
    const hidden = buildRenderPlan({
      document: letterFixture({
        printOptions: {
          pageNumbers: { format: 'none', position: 'bottom-center', hideOnFirstPage: false },
          showSubject: false,
          showDate: false,
        },
      }),
      profile: din5008B,
      target: 'print',
      mode: 'paper',
    });
    const regions = (plan: typeof shown) => plan.pages[0].blocks.map((block) => block.region);
    expect(regions(shown)).toContain('subject');
    expect(regions(shown)).toContain('infoBlock');
    expect(regions(hidden)).not.toContain('subject');
    expect(regions(hidden)).not.toContain('infoBlock');
  });

  it('carries the flags and the new formats through the file (round trip)', () => {
    const codec = new MarkdownDocumentCodecImpl();
    const document = letterFixture({
      printOptions: {
        pageNumbers: { format: 'slash', position: 'bottom-right', hideOnFirstPage: false },
        showSubject: false,
      },
    });
    const text = codec.encode(document);
    expect(text).toContain('show:');
    expect(text).toContain('subject: false');
    expect(text).toContain('format: slash');
    const back = codec.decode(text, { id: 'x1', locale: 'de-DE', printProfileId: 'din5008-b' });
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.document.printOptions.showSubject).toBe(false);
      expect(back.document.printOptions.showDate).toBeUndefined();
      expect(back.document.printOptions.pageNumbers.format).toBe('slash');
    }
  });
});
