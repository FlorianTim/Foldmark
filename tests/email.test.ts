import { describe, expect, it } from 'vitest';
import { EmailHandoffService } from '@/application/usecases/EmailHandoffService';
import {
  assertSafeHeaderValue,
  buildMailtoUrl,
  HeaderInjectionError,
  isSafeHeaderValue,
  isValidEmailAddress,
  MAILTO_MAX_LENGTH,
  parseAddressList,
  quoteMimeFilename,
  suggestSubject,
} from '@/domain/email/EmailHeaders';
import {
  DefaultEmailRenderer,
  escapeHtml,
  wrap,
} from '@/infrastructure/email/DefaultEmailRenderer';
import { MimeEmlBuilder } from '@/infrastructure/email/MimeEmlBuilder';
import { letterFixture } from './helpers/fakes';

/**
 * Header injection is the one bug in this area that turns a letter-writing app
 * into a spam relay, so the tests lead with it.
 */
describe('header safety', () => {
  const injections = [
    'Antrag\r\nBcc: victim@example.invalid',
    'Antrag\nBcc: victim@example.invalid',
    'Antrag\rBcc: victim@example.invalid',
    // Not only CR and LF: a NUL, a vertical tab or a form feed is treated as
    // a separator by some clients, so the whole control range is refused.
    'Antrag\u0000Bcc: victim@example.invalid',
    'Antrag\u000BBcc: victim@example.invalid',
    'Antrag\u000CBcc: victim@example.invalid',
  ];

  it('rejects every way of smuggling a second header line', () => {
    for (const value of injections) {
      expect(isSafeHeaderValue(value), value).toBe(false);
      expect(() => assertSafeHeaderValue('Subject', value)).toThrowError(HeaderInjectionError);
    }
  });

  it('refuses rather than repairs, so an attempt cannot pass unnoticed', () => {
    // Stripping the break would produce a plausible-looking subject and hide
    // that something tried. Refusal is the whole policy.
    expect(() => assertSafeHeaderValue('Subject', 'A\r\nB')).toThrow();
  });

  it('bounds header length', () => {
    expect(isSafeHeaderValue('x'.repeat(998))).toBe(true);
    expect(isSafeHeaderValue('x'.repeat(999))).toBe(false);
  });

  it('accepts ordinary addresses and rejects the exotic ones', () => {
    expect(isValidEmailAddress('florian@example.invalid')).toBe(true);
    expect(isValidEmailAddress('a.b+c@sub.example.co.uk')).toBe(true);
    expect(isValidEmailAddress('"quoted local"@example.invalid')).toBe(false);
    expect(isValidEmailAddress('user@[192.168.0.1]')).toBe(false);
    expect(isValidEmailAddress('no-at-sign')).toBe(false);
    expect(isValidEmailAddress(`${'x'.repeat(250)}@example.invalid`)).toBe(false);
  });

  it('splits a recipient list', () => {
    expect(parseAddressList('a@example.invalid, b@example.invalid')).toEqual([
      'a@example.invalid',
      'b@example.invalid',
    ]);
  });

  it('neutralises a MIME filename instead of trusting it as a path', () => {
    expect(quoteMimeFilename('../../etc/passwd')).toBe('"__.._etc_passwd"');
    expect(quoteMimeFilename('a"b\\c.pdf')).toBe('"a_b_c.pdf"');
    expect(quoteMimeFilename('bad\r\nname.pdf')).toBe('"bad__name.pdf"');
    expect(quoteMimeFilename('')).toBe('"attachment"');
  });

  it('suggests a subject from what the document already says', () => {
    expect(suggestSubject({ subject: 'Antrag', title: 'T', fallback: 'F' })).toBe('Antrag');
    expect(suggestSubject({ title: 'Titel', fallback: 'F' })).toBe('Titel');
    expect(suggestSubject({ fallback: 'Nachricht' })).toBe('Nachricht');
    expect(suggestSubject({ subject: '  a\n  b  ', fallback: 'F' })).toBe('a b');
  });
});

describe('mailto links', () => {
  it('builds a link for a short message', () => {
    const url = buildMailtoUrl({
      to: 'a@example.invalid',
      subject: 'Antrag',
      body: 'Guten Tag',
    });
    expect(url).toBe('mailto:a@example.invalid?subject=Antrag&body=Guten+Tag');
  });

  it('returns null rather than a link that would silently truncate', () => {
    const url = buildMailtoUrl({ to: 'a@example.invalid', body: 'x'.repeat(MAILTO_MAX_LENGTH) });
    expect(url).toBeNull();
  });

  it('refuses an injected recipient', () => {
    expect(() =>
      buildMailtoUrl({ to: 'a@example.invalid\r\nBcc: b@example.invalid' }),
    ).toThrowError(HeaderInjectionError);
    expect(() => buildMailtoUrl({ to: 'not-an-address' })).toThrowError(HeaderInjectionError);
  });
});

describe('rendering message bodies', () => {
  const renderer = new DefaultEmailRenderer();

  it('escapes every character that could become markup', () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">&'`)).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;',
    );
  });

  it('never turns document text into HTML', () => {
    const document = letterFixture({
      bodyMarkdown: 'A **safe** <script>alert(1)</script> note',
    });
    const html = renderer.renderHtml({ document });

    expect(html).toContain('<strong>safe</strong>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('emits only the tag set it controls', () => {
    const document = letterFixture({
      bodyMarkdown: '# Titel\n\nAbsatz mit `code`.\n\n- eins\n- zwei',
    });
    const html = renderer.renderHtml({ document });
    const tags = [...html.matchAll(/<([a-z][a-z0-9]*)/gu)].map((match) => match[1]);
    expect(new Set(tags)).toEqual(new Set(['div', 'h2', 'p', 'code', 'ul', 'li']));
  });

  it('renders plain text with the RFC signature separator', () => {
    const document = letterFixture({
      metadata: {
        salutation: 'Sehr geehrte Damen und Herren,',
        closing: 'Mit freundlichen Grüßen',
      },
    });
    const text = renderer.renderPlainText({
      document,
      senderName: 'Florian Beispiel',
      footerLines: ['IBAN DE00'],
    });

    expect(text).toContain('Sehr geehrte Damen und Herren,');
    expect(text).toContain('Mit freundlichen Grüßen');
    expect(text).toContain('-- \nIBAN DE00');
    expect(text).not.toContain('<');
  });

  it('renders plain text without any Markdown or directive syntax (R13-003)', () => {
    const document = letterFixture({
      bodyMarkdown: [
        '**Sehr geehrte Frau Beispiel,**',
        '',
        'bitte beachten Sie [diesen Link](https://example.org) und *dies* sowie `Code`.',
        '',
        '- Punkt 1',
        '- Punkt 2',
        '',
        '1. Erstens',
        '2. Zweitens',
        '',
        '# Überschrift',
        '',
        '> Zitat',
        '',
        '| Spalte A | Spalte B |',
        '| -------- | -------- |',
        '| 1        | 2        |',
        '',
        '---',
        '',
        ':::note{type=info}',
        'Hinweis mit :red[Farbe].',
        ':::',
        '',
        '::page-break',
        '',
        'Ende :date[2026-01-02].',
      ].join('\n'),
    });
    const text = renderer.renderPlainText({ document });

    expect(text).toContain('Sehr geehrte Frau Beispiel,');
    // Wrapped at 72 columns, so the sentence is matched across a possible line break.
    expect(text).toMatch(
      /bitte beachten Sie diesen Link \(https:\/\/example\.org\) und\s+dies sowie\s+Code\./u,
    );
    expect(text).toContain('- Punkt 1\n- Punkt 2');
    expect(text).toContain('1. Erstens\n2. Zweitens');
    expect(text).toContain('Überschrift');
    expect(text).toContain('    Zitat');
    expect(text).toContain('Spalte A\tSpalte B\n1\t2');
    expect(text).toContain('Hinweis mit Farbe.');
    expect(text).toContain('Ende 2. Januar 2026.');
    for (const syntax of [
      '**',
      '*dies*',
      '`',
      '](',
      '# ',
      '> ',
      ' | ',
      '---',
      ':::',
      ':red[',
      ':date[',
      '::page-break',
    ]) {
      expect(text, syntax).not.toContain(syntax);
    }
  });

  it('wraps without breaking words', () => {
    const wrapped = wrap('aaa bbb ccc ddd', 7);
    expect(wrapped).toBe('aaa bbb\nccc ddd');
    expect(wrap('unbreakablelongword', 5)).toBe('unbreakablelongword');
  });

  it('renders the directive catalogue with the fixed tag set and palette values (change 0017)', () => {
    const document = letterFixture({
      bodyMarkdown: [
        ':red[rot] :highlight[gelb] :u[unter] :small[klein] H:sub[2]O x:sup[2] :gold[unbekannt]',
        '',
        ':::note{type=warning}',
        'Achtung.',
        ':::',
        '',
        ':::indent{level=2}',
        'Eingerückt.',
        ':::',
        '',
        '::page-break',
        '',
        ':::signature{lines=2}',
        'Max Muster',
        ':::',
        '',
        '![Logo](asset:abc){width=40mm}',
      ].join('\n'),
    });
    const html = renderer.renderHtml({ document });
    expect(html).toContain('<span style="color:#dc2626">rot</span>');
    expect(html).toContain('<mark style="background:#fef08a">gelb</mark>');
    expect(html).toContain('<u>unter</u>');
    expect(html).toContain('<small>klein</small>');
    expect(html).toContain('H<sub>2</sub>O x<sup>2</sup>');
    // Unknown inline: content only.
    expect(html).toContain(' unbekannt</p>');
    expect(html).toContain(
      '<div style="border:1px solid #59666c;padding:8px 12px;margin:8px 0"><p>Achtung.</p></div>',
    );
    expect(html).toContain('<div style="margin-left:48px"><p>Eingerückt.</p></div>');
    // A page break means nothing in a mail; an image cannot travel and shows its alt text.
    expect(html).not.toContain('page-break');
    expect(html).not.toContain('<img');
    expect(html).toContain('<em>[Logo]</em>');
    const tags = [...html.matchAll(/<([a-z][a-z0-9]*)/gu)].map((match) => match[1]);
    expect(new Set(tags)).toEqual(
      new Set(['div', 'p', 'span', 'mark', 'u', 'small', 'sub', 'sup', 'em']),
    );

    const text = renderer.renderPlainText({ document });
    expect(text).toContain('rot gelb unter klein H2O x2 unbekannt');
    expect(text).toContain('    Eingerückt.');
    expect(text).toContain('Max Muster\n\n\n____________________');
    expect(text).toContain('[Logo]');
  });
});

describe('building an EML file', () => {
  const builder = new MimeEmlBuilder();

  async function textOf(blob: Blob): Promise<string> {
    return blob.text();
  }

  it('produces a multipart/alternative message', async () => {
    const eml = await textOf(
      await builder.build({
        to: 'a@example.invalid',
        from: 'b@example.invalid',
        subject: 'Antrag',
        plainText: 'Guten Tag',
        html: '<p>Guten Tag</p>',
        date: new Date('2026-08-03T10:00:00.000Z'),
      }),
    );

    expect(eml).toContain('MIME-Version: 1.0');
    expect(eml).toContain('To: a@example.invalid');
    expect(eml).toContain('From: b@example.invalid');
    expect(eml).toContain('Subject: Antrag');
    expect(eml).toContain('Content-Type: multipart/alternative');
    expect(eml).toContain('Content-Type: text/plain; charset="utf-8"');
    expect(eml).toContain('Content-Type: text/html; charset="utf-8"');
    // Every line ends CRLF, as RFC 5322 requires.
    expect(eml.split('\n').every((line) => line === '' || line.endsWith('\r'))).toBe(true);
  });

  it('encodes a non-ASCII subject as an RFC 2047 word', async () => {
    const eml = await textOf(await builder.build({ subject: 'Grüße', plainText: 'x' }));
    expect(eml).toContain('Subject: =?UTF-8?B?');
    expect(eml).not.toContain('Subject: Grüße');
  });

  it('refuses to build a message with an injected header', async () => {
    await expect(
      builder.build({ subject: 'Antrag\r\nBcc: victim@example.invalid', plainText: 'x' }),
    ).rejects.toThrowError(HeaderInjectionError);

    await expect(
      builder.build({ subject: 'ok', to: 'a@example.invalid\nBcc: b', plainText: 'x' }),
    ).rejects.toThrowError(HeaderInjectionError);
  });

  it('attaches a file with a neutralised name', async () => {
    const eml = await textOf(
      await builder.build({
        subject: 'Anhang',
        plainText: 'x',
        attachments: [
          {
            filename: '../secret.pdf',
            mimeType: 'application/pdf',
            data: new Blob([new Uint8Array([1, 2, 3])], { type: 'application/pdf' }),
          },
        ],
      }),
    );

    expect(eml).toContain('Content-Type: multipart/mixed');
    expect(eml).toContain('Content-Disposition: attachment; filename="__secret.pdf"');
    expect(eml).not.toContain('../secret.pdf');
  });

  it('uses an unguessable boundary', async () => {
    const first = await textOf(await builder.build({ subject: 'a', plainText: 'x' }));
    const second = await textOf(await builder.build({ subject: 'a', plainText: 'x' }));
    const boundaryOf = (value: string): string => /boundary="([^"]+)"/u.exec(value)?.[1] ?? '';
    expect(boundaryOf(first)).not.toBe(boundaryOf(second));
  });
});

describe('the hand-off service', () => {
  const service = new EmailHandoffService(new DefaultEmailRenderer(), new MimeEmlBuilder());

  it('prepares subject, bodies and a usable mailto link', () => {
    const handoff = service.prepare(
      letterFixture({ metadata: { subject: 'Antrag', emailTo: 'amt@example.invalid' } }),
      { fallbackSubject: 'Nachricht' },
    );

    expect(handoff.subject).toBe('Antrag');
    expect(handoff.to).toBe('amt@example.invalid');
    expect(handoff.mailtoUrl).toContain('mailto:amt@example.invalid');
    expect(handoff.mailtoTooLong).toBe(false);
  });

  it('says the link is unusable rather than producing one that truncates', () => {
    const handoff = service.prepare(letterFixture({ bodyMarkdown: 'x'.repeat(5_000) }), {
      fallbackSubject: 'Nachricht',
    });
    expect(handoff.mailtoUrl).toBeNull();
    expect(handoff.mailtoTooLong).toBe(true);
  });

  it('refuses a document whose subject carries a line break', () => {
    expect(() =>
      service.prepare(letterFixture({ metadata: { subject: 'A\r\nBcc: x@example.invalid' } }), {
        fallbackSubject: 'Nachricht',
      }),
    ).toThrowError(HeaderInjectionError);
  });

  it('derives a safe filename from the subject', () => {
    expect(EmailHandoffService.filenameFor('Antrag auf Bescheinigung', 'eml')).toBe(
      'Antrag-auf-Bescheinigung.eml',
    );
    expect(EmailHandoffService.filenameFor('../../etc/passwd', 'eml')).toBe('etcpasswd.eml');
    expect(EmailHandoffService.filenameFor('', 'eml')).toBe('foldmark.eml');
  });
});
