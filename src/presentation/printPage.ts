import { printTitleFor } from '@/presentation/download';

/**
 * Opening the browser's print dialog for the print copy.
 *
 * Two browser quirks are handled here so no dialog has to know them (R13-001):
 *
 * - **Chrome prints the top layer.** An open `<dialog>` shown with
 *   `showModal()` lives in the browser's top layer, and Chrome has printed it
 *   over the page in some versions even with a print stylesheet hiding it. So
 *   the dialog that triggered the print is closed first, the browser is given
 *   one frame to flush layout, `print()` runs, and the dialog is reopened when
 *   the print dialog goes away. `print.css` hides `dialog` in the print medium
 *   as well; belt and braces, because the two failures look identical.
 * - **`afterprint` timing differs.** Firefox fires it before `print()` returns,
 *   Chrome after. Restoring on both paths is harmless and covers either order.
 *
 * The tab title becomes the PDF filename and Title (change 0015) for exactly
 * the duration of the dialog.
 */
export async function printPage(options: {
  document: { title: string; metadata: { subject?: string } } | null;
  appName: string;
  /** The dialog that asked for the print, closed for the duration of the browser dialog. */
  dialog?: HTMLDialogElement | null;
}): Promise<void> {
  const page = globalThis.document;
  const previousTitle = page.title;
  const dialog = options.dialog ?? null;
  const wasOpen = Boolean(dialog?.open);

  let restored = false;
  const restore = (): void => {
    if (restored) return;
    restored = true;
    page.title = previousTitle;
    globalThis.removeEventListener('afterprint', restore);
    if (wasOpen && dialog && !dialog.open && dialog.isConnected) dialog.showModal();
  };

  if (options.document) page.title = printTitleFor(options.document, options.appName);
  if (wasOpen && dialog) dialog.close();
  await nextFrame();

  globalThis.addEventListener('afterprint', restore);
  globalThis.print();
  restore();
}

/** Resolves after the browser has had one frame to lay out, or at once without a frame API. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof globalThis.requestAnimationFrame === 'function') {
      globalThis.requestAnimationFrame(() => resolve());
    } else {
      resolve();
    }
  });
}
