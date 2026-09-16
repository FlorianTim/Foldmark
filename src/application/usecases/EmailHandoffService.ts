import type { EmailAttachment, EmailRenderer, EmlBuilder } from '@/application/ports/EmailPorts';
import type { SenderProfile } from '@/domain/address/SenderProfile';
import type { FoldmarkDocument } from '@/domain/document/FoldmarkDocument';
import {
  assertSafeHeaderValue,
  buildMailtoUrl,
  isValidEmailAddress,
  suggestSubject,
} from '@/domain/email/EmailHeaders';

/**
 * The email hand-off.
 *
 * Foldmark prepares a message and gives it to the user. It never claims to have
 * sent anything, and the vocabulary here keeps that honest: `prepare`, not
 * `send`. A user who believes a letter has gone will not check their outbox.
 *
 * Four modes exist because mail clients differ so much:
 *
 * - **plain text** works everywhere and can go straight into a `mailto:` URL,
 *   until the URL gets too long — which is why {@link prepare} reports whether
 *   the link is usable instead of producing one that silently truncates.
 * - **HTML** is for pasting into a composer that accepts formatting.
 * - **PDF attachment** is the default for a formal letter: the layout survives.
 * - **EML** hands over a complete message file, attachments included.
 */
export class EmailHandoffService {
  public constructor(
    private readonly renderer: EmailRenderer,
    private readonly eml: EmlBuilder,
  ) {}

  /**
   * Assembles everything a hand-off needs.
   *
   * @throws {HeaderInjectionError} When the subject or recipient carries a line break.
   */
  public prepare(
    document: FoldmarkDocument,
    options: { sender?: SenderProfile; fallbackSubject: string },
  ): EmailHandoff {
    // The raw values are checked **before** the suggestion collapses whitespace.
    // `suggestSubject` turns any run of whitespace into a single space, which
    // would quietly repair a `\r\n` into something that passes the header check
    // — and hide that a document tried to add a header line.
    for (const candidate of [document.metadata.subject, document.title]) {
      if (candidate !== undefined) assertSafeHeaderValue('Subject', candidate);
    }

    const subject = assertSafeHeaderValue(
      'Subject',
      suggestSubject({
        subject: document.metadata.subject,
        title: document.title,
        fallback: options.fallbackSubject,
      }),
    );
    // Control characters are refused outright (a header-injection attempt);
    // an address that is merely malformed is left out of the hand-off, so
    // the mail client still opens and the dialog can say what is wrong.
    const rawTo = document.metadata.emailTo
      ? assertSafeHeaderValue('To', document.metadata.emailTo)
      : undefined;
    const to = rawTo && isValidEmailAddress(rawTo) ? rawTo : undefined;

    const input = {
      document,
      senderName: options.sender?.name ?? document.metadata.signerName,
      footerLines: options.sender?.footerLines,
    };
    const plainText = this.renderer.renderPlainText(input);
    const html = this.renderer.renderHtml(input);
    const mailto = buildMailtoUrl({ to, subject, body: plainText });

    return {
      to,
      subject,
      plainText,
      html,
      mailtoUrl: mailto,
      // A `null` URL is not an error, it is the honest answer: the message is
      // longer than a link can carry, so the UI offers copy-and-paste instead.
      mailtoTooLong: mailto === null,
    };
  }

  /**
   * Builds an `.eml` file for the prepared message.
   *
   * @throws {HeaderInjectionError} When a header value would break the message.
   */
  public buildEml(
    handoff: EmailHandoff,
    options: { from?: string; attachments?: readonly EmailAttachment[]; date?: Date } = {},
  ): Promise<Blob> {
    return this.eml.build({
      to: handoff.to,
      from: options.from,
      subject: handoff.subject,
      plainText: handoff.plainText,
      html: handoff.html,
      attachments: options.attachments,
      date: options.date,
    });
  }

  /** A filename for a downloaded message or attachment, derived from the subject. */
  public static filenameFor(subject: string, extension: string): string {
    const base = subject
      .replaceAll(/[^\p{L}\p{N} _-]/gu, '')
      .trim()
      .replaceAll(/\s+/gu, '-')
      .slice(0, 60);
    return `${base || 'foldmark'}.${extension}`;
  }
}

/** A message prepared for hand-off, with everything the UI needs to offer it. */
export interface EmailHandoff {
  readonly to?: string;
  readonly subject: string;
  readonly plainText: string;
  readonly html: string;
  /** `null` when the message is too long for a `mailto:` link. */
  readonly mailtoUrl: string | null;
  readonly mailtoTooLong: boolean;
}
