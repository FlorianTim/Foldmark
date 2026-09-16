import { onScopeDispose, watchEffect, type Ref } from 'vue';
import type { PageSizeMm } from '@/domain/common/Units';
import { roundMm } from '@/domain/common/Units';

/**
 * Telling the printer how big the paper is.
 *
 * `@page { size: … }` is the only way to ask a browser for a specific sheet,
 * and it cannot be expressed as an inline style or scoped to an element — it
 * has to be a real stylesheet rule. Foldmark's page size is per profile, so the
 * rule has to be written at runtime.
 *
 * It is written through a **constructable stylesheet** rather than an injected
 * `<style>` element. The app ships a strict `style-src 'self'` policy with no
 * `'unsafe-inline'`, which blocks an injected `<style>` outright; a stylesheet
 * built in script and adopted through CSSOM is not inline content and is
 * unaffected. Keeping the policy strict was worth the extra few lines.
 *
 * Where constructable stylesheets are unavailable the composable does nothing,
 * and printing falls back to the browser's default paper. The preview stays
 * correct either way, because it is sized in millimetres by its own CSS.
 */
export function usePrintPageSize(page: Ref<PageSizeMm | null>): void {
  const supported =
    typeof globalThis.CSSStyleSheet === 'function' &&
    'replaceSync' in globalThis.CSSStyleSheet.prototype &&
    Array.isArray(document.adoptedStyleSheets);

  if (!supported) return;

  const sheet = new CSSStyleSheet();
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

  watchEffect(() => {
    const size = page.value;
    sheet.replaceSync(
      size
        ? `@page { size: ${roundMm(size.widthMm)}mm ${roundMm(size.heightMm)}mm; margin: 0; }`
        : '',
    );
  });

  onScopeDispose(() => {
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
      (candidate) => candidate !== sheet,
    );
  });
}
