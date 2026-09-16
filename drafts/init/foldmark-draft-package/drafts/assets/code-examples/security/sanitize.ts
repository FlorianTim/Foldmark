import DOMPurify from 'dompurify';

export function sanitizeDocumentHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['style', 'srcset'],
    ALLOW_DATA_ATTR: false,
  });
}

export function isAllowedLink(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
