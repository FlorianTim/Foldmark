import type { EmailAttachment, EmlBuilder, EmlInput } from '@/application/ports/EmailPorts';
import { assertSafeHeaderValue, quoteMimeFilename } from '@/domain/email/EmailHeaders';

/** Anything outside printable US-ASCII, which a header may only carry encoded. */
const NON_ASCII = /[^\u0020-\u007E]/u;

/**
 * Building an `.eml` file.
 *
 * The security property this class exists to guarantee: **no value supplied by
 * a document can add a header line**. Every header value goes through
 * {@link assertSafeHeaderValue}, which throws on a control character rather than
 * stripping it — a subject carrying `\r\nBcc:` is an attempt, not a typo, and
 * silently repairing it would hide that a file tried.
 *
 * Bodies are base64-encoded rather than quoted-printable. Quoted-printable
 * needs soft line breaks, an escape table and a length rule, and every one of
 * those is a place to get UTF-8 wrong; base64 has none of that and costs a third
 * more bytes in a file that is opened once.
 *
 * Boundaries come from `crypto.getRandomValues`, so no content can guess or
 * collide with one and close a part early.
 */
export class MimeEmlBuilder implements EmlBuilder {
  /** Line ending required by RFC 5322. */
  private static readonly CRLF = '\r\n';

  /**
   * Builds the message.
   *
   * @throws {HeaderInjectionError} When any header value contains a line break.
   */
  public async build(input: EmlInput): Promise<Blob> {
    const subject = assertSafeHeaderValue('Subject', input.subject);
    const to = input.to ? assertSafeHeaderValue('To', input.to) : undefined;
    const from = input.from ? assertSafeHeaderValue('From', input.from) : undefined;
    const attachments = input.attachments ?? [];

    const alternativeBoundary = MimeEmlBuilder.boundary('alt');
    const mixedBoundary = MimeEmlBuilder.boundary('mix');

    const headers: string[] = [
      'MIME-Version: 1.0',
      `Date: ${(input.date ?? new Date()).toUTCString()}`,
      `Subject: ${MimeEmlBuilder.encodeHeader(subject)}`,
    ];
    if (from) headers.push(`From: ${from}`);
    if (to) headers.push(`To: ${to}`);
    headers.push(
      attachments.length
        ? `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`
        : `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    );

    const alternative = MimeEmlBuilder.alternativePart(
      alternativeBoundary,
      input.plainText,
      input.html,
    );

    const parts: string[] = [headers.join(MimeEmlBuilder.CRLF), ''];

    if (attachments.length === 0) {
      parts.push(alternative);
      return new Blob([parts.join(MimeEmlBuilder.CRLF)], { type: 'message/rfc822' });
    }

    parts.push(
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      '',
      alternative,
    );

    for (const attachment of attachments) {
      parts.push(`--${mixedBoundary}`, ...(await MimeEmlBuilder.attachmentPart(attachment)));
    }
    parts.push(`--${mixedBoundary}--`, '');

    return new Blob([parts.join(MimeEmlBuilder.CRLF)], { type: 'message/rfc822' });
  }

  private static alternativePart(boundary: string, plainText: string, html?: string): string {
    const lines: string[] = [
      `--${boundary}`,
      'Content-Type: text/plain; charset="utf-8"',
      'Content-Transfer-Encoding: base64',
      '',
      MimeEmlBuilder.base64Text(plainText),
    ];
    if (html) {
      lines.push(
        `--${boundary}`,
        'Content-Type: text/html; charset="utf-8"',
        'Content-Transfer-Encoding: base64',
        '',
        MimeEmlBuilder.base64Text(html),
      );
    }
    lines.push(`--${boundary}--`, '');
    return lines.join(MimeEmlBuilder.CRLF);
  }

  private static async attachmentPart(attachment: EmailAttachment): Promise<readonly string[]> {
    const filename = quoteMimeFilename(attachment.filename);
    const mimeType = assertSafeHeaderValue('Content-Type', attachment.mimeType);
    const payload = MimeEmlBuilder.wrapBase64(
      MimeEmlBuilder.base64Bytes(new Uint8Array(await attachment.data.arrayBuffer())),
    );
    return [
      `Content-Type: ${mimeType}; name=${filename}`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename=${filename}`,
      '',
      payload,
      '',
    ];
  }

  /**
   * Encodes a header value as RFC 2047 when it is not plain ASCII.
   *
   * `Betreff: Grüße` is legal only as an encoded word, and clients that receive
   * raw UTF-8 in a header render it differently or not at all.
   */
  private static encodeHeader(value: string): string {
    if (!NON_ASCII.test(value)) return value;
    return `=?UTF-8?B?${MimeEmlBuilder.base64Text(value).replaceAll('\r\n', '')}?=`;
  }

  private static base64Text(value: string): string {
    return MimeEmlBuilder.wrapBase64(MimeEmlBuilder.base64Bytes(new TextEncoder().encode(value)));
  }

  private static base64Bytes(bytes: Uint8Array): string {
    const chunkSize = 0x8000;
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return globalThis.btoa(binary);
  }

  /** Base64 must be folded at 76 characters to stay inside the line-length limit. */
  private static wrapBase64(value: string): string {
    const lines: string[] = [];
    for (let offset = 0; offset < value.length; offset += 76) {
      lines.push(value.slice(offset, offset + 76));
    }
    return lines.join(MimeEmlBuilder.CRLF);
  }

  private static boundary(prefix: string): string {
    const random = crypto.getRandomValues(new Uint8Array(12));
    const hex = [...random].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `=_foldmark_${prefix}_${hex}`;
  }
}
