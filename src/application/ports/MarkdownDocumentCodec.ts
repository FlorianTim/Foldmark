import type { MarginsMm, PageSizeMm } from '@/domain/common/Units';
import type { ValidationIssue } from '@/domain/common/ValidationIssue';
import type { FoldmarkDocument } from '@/domain/document/FoldmarkDocument';

/**
 * The portable-file boundary.
 *
 * Foldmark's canonical exchange format is Markdown with YAML front matter,
 * because a letter should still be a letter when Foldmark is not installed. The
 * codec is a port rather than a helper so the parser — the component most
 * exposed to files a user was sent — can be replaced or hardened without any
 * call site changing.
 *
 * Decoding **never throws for bad content**. A file that does not parse comes
 * back as a failure carrying the issues *and the original source*, so the
 * workspace can show the user what it received rather than swallowing their
 * document.
 */

/** The outcome of decoding one file. */
export type DecodeResult =
  | {
      readonly ok: true;
      readonly document: FoldmarkDocument;
      readonly issues: readonly ValidationIssue[];
    }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[]; readonly source: string };

/** Translates between documents and their portable Markdown representation. */
export interface MarkdownDocumentCodec {
  /**
   * Parses untrusted Markdown with YAML front matter.
   *
   * @param source Raw file content, of any origin.
   * @param defaults Values used for fields the file does not supply.
   */
  decode(
    source: string,
    defaults: { id: string; locale: string; printProfileId: string; now?: Date },
  ): DecodeResult;

  /**
   * Serializes a document to its canonical portable form.
   *
   * @param geometry The sheet the document is laid out on, so the file can
   *   carry Pandoc's `papersize` and `geometry` for the same page (change 0017).
   *   Without it the keys are carried over from the imported file, if any.
   */
  encode(document: FoldmarkDocument, geometry?: EncodeGeometry): string;
}

/** The page a document is printed on, as far as a Pandoc header can describe it. */
export interface EncodeGeometry {
  readonly page: PageSizeMm;
  readonly margins: MarginsMm;
}
