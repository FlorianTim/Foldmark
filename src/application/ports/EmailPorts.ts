import type { FoldmarkDocument } from '@/domain/document/FoldmarkDocument';

/**
 * Preparing email, never sending it.
 *
 * Foldmark has no SMTP, no credentials and no server. What it does is produce
 * the parts of a message — a subject, a plain-text body, a restricted HTML
 * body, an `.eml` file — and hand them to the user's own mail client. The ports
 * are named for that: `renderer`, `builder`, never `sender`.
 *
 * Restricted HTML is a real constraint rather than a caution. Mail clients strip
 * or mangle most of CSS, and Foldmark generates HTML from a bounded Markdown
 * subset with everything escaped, so the output has no `<script>`, no `<style>`,
 * no external references and no user-controlled attributes anywhere in it.
 */

/** What both renderers need. */
export interface EmailRenderInput {
  readonly document: FoldmarkDocument;
  /** Sender name shown in the signature block, when one was resolved. */
  readonly senderName?: string;
  /** Lines appended below the signature, from the sender identity. */
  readonly footerLines?: readonly string[];
}

/** Turns a document into message bodies. */
export interface EmailRenderer {
  /** A plain-text body, hard-wrapped, safe to place in a `mailto:` URL. */
  renderPlainText(input: EmailRenderInput): string;

  /** A restricted HTML body: escaped text, a fixed tag set, no external references. */
  renderHtml(input: EmailRenderInput): string;
}

/** One file attached to a generated message. */
export interface EmailAttachment {
  readonly filename: string;
  readonly mimeType: string;
  readonly data: Blob;
}

/** Everything an `.eml` file needs. */
export interface EmlInput {
  readonly to?: string;
  readonly from?: string;
  readonly subject: string;
  readonly plainText: string;
  readonly html?: string;
  readonly attachments?: readonly EmailAttachment[];
  readonly date?: Date;
}

/** Builds an RFC 5322 message file the user can open in their mail client. */
export interface EmlBuilder {
  /**
   * Produces the message.
   *
   * @throws {HeaderInjectionError} When any header value contains a line break.
   */
  build(input: EmlInput): Promise<Blob>;
}
