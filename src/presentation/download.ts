/**
 * Handing a file to the user.
 *
 * Foldmark never uploads and never has a server, so "export" means "produce a
 * blob and let the browser save it". The object URL is revoked on the next
 * frame rather than immediately: revoking synchronously after `click()` races
 * the download in some browsers, and a leaked URL for one animation frame is
 * the cheaper mistake.
 *
 * The filename is sanitized here as well as at every call site that builds one.
 * A download filename is a path the operating system will interpret, and it is
 * derived from a document title the user — or a file they were sent — supplied.
 */

/** Characters that must not reach a download filename. */
// eslint-disable-next-line no-control-regex
const UNSAFE_FILENAME = /[\u0000-\u001F\u007F"\\/:*?<>|]/gu;

/** A filename safe to hand to the browser, always with the given extension. */
export function safeFilename(base: string, extension: string): string {
  const cleaned = base.replaceAll(UNSAFE_FILENAME, '_').replace(/^\.+/u, '_').trim().slice(0, 80);
  return `${cleaned || 'foldmark'}.${extension}`;
}

/**
 * The page title to print under.
 *
 * Browsers take the print dialog's filename suggestion and the PDF's Title
 * field from `document.title`; this is the one place Foldmark can reach either.
 * Title first, then subject, then the app name — the same sanitisation as a
 * download name, because a title becomes a path in the save dialog.
 */
export function printTitleFor(
  document: { title: string; metadata: { subject?: string } },
  appName: string,
): string {
  const candidate = [document.title, document.metadata.subject, appName]
    .map((value) => (value ?? '').replaceAll(/\s+/gu, ' ').trim())
    .find((value) => value !== '');
  return safeFilename(candidate ?? appName, 'pdf').slice(0, -'.pdf'.length);
}

/** Saves a blob under the given name. */
export function downloadBlob(data: Blob, filename: string): void {
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  globalThis.requestAnimationFrame(() => URL.revokeObjectURL(url));
}

/** Saves a UTF-8 text file. */
export function downloadText(text: string, filename: string, mimeType = 'text/plain'): void {
  downloadBlob(new Blob([text], { type: `${mimeType};charset=utf-8` }), filename);
}

/**
 * Copies text to the clipboard, reporting whether it worked.
 *
 * The clipboard API needs a permission and a secure context, and both can be
 * absent. The caller shows a textarea to copy from by hand when this returns
 * `false` — an export path that silently does nothing is worse than one that
 * asks for one more click.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
