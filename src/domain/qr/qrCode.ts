import { encode } from 'uqr';
import { QR_SIZE_MM, type ImageAlignment } from '@/domain/markdown/directives';

/**
 * QR codes (R15-011, change 0040).
 *
 * A QR code in a document is *text*: `::qr[https://example.org]{size=30mm}`
 * in the file, encoded into modules whenever the block is drawn — in the
 * editor, in the preview, on paper. Nothing is stored but the payload, so a
 * code never goes stale, never bloats a backup and never leaves the browser.
 * The encoder (`uqr`, MIT, no dependencies) is pure arithmetic; this module
 * wraps it so the renderers depend on a matrix and a path, not on a library.
 *
 * What is checked here is what a scanner needs and what a printer can do:
 * the payload fits the symbol, the modules are not smaller than a printer
 * resolves, and the quiet zone is part of the drawn size rather than an
 * afterthought the next paragraph eats.
 */

/** The error-correction levels of ISO/IEC 18004, lowest to highest redundancy. */
export const QR_ERROR_CORRECTION_LEVELS = ['L', 'M', 'Q', 'H'] as const;

/** One error-correction level. `M` is the default: 15 % recoverable, the usual choice for print. */
export type QrErrorCorrection = (typeof QR_ERROR_CORRECTION_LEVELS)[number];

/** Longest payload accepted, in characters. Version 40 holds more, but not on a letter. */
export const QR_PAYLOAD_MAX_LENGTH = 1000;

/** The quiet zone the standard asks for: four modules of white on every side. */
export const QR_QUIET_ZONE_MODULES = 4;

/**
 * Below this module size a code is drawn but flagged: 0.5 mm is about the
 * smallest module an office printer renders and a phone camera resolves
 * reliably at reading distance.
 */
export const QR_MIN_MODULE_MM = 0.5;

/** What a QR block asks for, validated. */
export interface QrCodeSpec {
  readonly payload: string;
  readonly sizeMm: number;
  readonly align: ImageAlignment;
  readonly errorCorrection: QrErrorCorrection;
}

/** The encoded symbol without its quiet zone: `modules[row][column]` is `true` for dark. */
export interface QrMatrix {
  readonly version: number;
  readonly size: number;
  readonly modules: readonly (readonly boolean[])[];
}

/** Why a payload is refused. */
export type QrPayloadIssue = 'empty' | 'too-long' | 'control-characters' | 'line-breaks';

/** Whether a name is an error-correction level. */
export function isQrErrorCorrection(value: string): value is QrErrorCorrection {
  return (QR_ERROR_CORRECTION_LEVELS as readonly string[]).includes(value);
}

/**
 * Checks a payload before it is encoded or written to a file. A leaf
 * directive is one line, so a line break cannot be carried; control
 * characters are refused rather than dropped, because a payload that was
 * silently changed is a code that opens something else.
 */
export function validateQrPayload(payload: string): QrPayloadIssue | null {
  if (payload.trim().length === 0) return 'empty';
  if (payload.length > QR_PAYLOAD_MAX_LENGTH) return 'too-long';
  if (/[\n\r]/u.test(payload)) return 'line-breaks';
  for (const character of payload) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return 'control-characters';
  }
  return null;
}

/**
 * Encodes a payload into a module matrix, or `null` when it cannot be a
 * code — empty, too long for version 40 at the requested level, or refused
 * by `validateQrPayload`. Never throws: an unencodable payload is a state the
 * renderer draws as a placeholder, not an error that stops a page.
 */
export function encodeQrMatrix(
  payload: string,
  errorCorrection: QrErrorCorrection = 'M',
): QrMatrix | null {
  if (validateQrPayload(payload) !== null) return null;
  try {
    const result = encode(payload, { ecc: errorCorrection, border: 0 });
    return { version: result.version, size: result.size, modules: result.data };
  } catch {
    return null;
  }
}

/** The side of one module when the code, quiet zone included, is drawn at `sizeMm`. */
export function qrModuleSizeMm(sizeMm: number, matrix: QrMatrix): number {
  return sizeMm / (matrix.size + 2 * QR_QUIET_ZONE_MODULES);
}

/** The number of modules across the drawn symbol, quiet zone included: the SVG `viewBox` side. */
export function qrViewBoxSize(matrix: QrMatrix): number {
  return matrix.size + 2 * QR_QUIET_ZONE_MODULES;
}

/**
 * The dark modules as one SVG path in module units, offset by the quiet
 * zone. Horizontal runs are merged so the path stays short and the printer
 * sees no hairline gaps between neighbours. The string holds digits, `M`,
 * `h`, `v` and `z` only — nothing from the payload reaches it.
 */
export function qrModulePath(matrix: QrMatrix): string {
  const offset = QR_QUIET_ZONE_MODULES;
  const parts: string[] = [];
  for (const [row, modules] of matrix.modules.entries()) {
    let column = 0;
    while (column < modules.length) {
      if (!modules[column]) {
        column += 1;
        continue;
      }
      let run = 1;
      while (column + run < modules.length && modules[column + run]) run += 1;
      parts.push(`M${column + offset} ${row + offset}h${run}v1h-${run}z`);
      column += run;
    }
  }
  return parts.join('');
}

/** Whether a code at this size prints modules a scanner can still resolve. */
export function qrPrintQuality(sizeMm: number, matrix: QrMatrix): 'ok' | 'small' {
  return qrModuleSizeMm(sizeMm, matrix) >= QR_MIN_MODULE_MM ? 'ok' : 'small';
}

/** The kinds a payload is composed from in the dialog; `text` is anything else. */
export type QrPayloadKind = 'url' | 'email' | 'phone' | 'text';

/** What a payload looks like, so the dialog can reopen an existing code in the right tab. */
export function qrPayloadKind(payload: string): QrPayloadKind {
  if (/^https?:\/\//iu.test(payload)) return 'url';
  if (/^mailto:/iu.test(payload)) return 'email';
  if (/^tel:/iu.test(payload)) return 'phone';
  return 'text';
}

/** The fields of one payload kind, as the dialog collects them. */
export interface QrPayloadFields {
  readonly kind: QrPayloadKind;
  readonly text: string;
  /** For `email`: an optional subject line. */
  readonly subject?: string;
}

/**
 * Composes a payload from the dialog's fields. A URL is taken as typed once
 * it has a scheme; an e-mail address becomes a `mailto:` link with an
 * optional subject; a phone number becomes `tel:` with only digits and a
 * leading `+`, the form every phone dials.
 */
export function composeQrPayload(fields: QrPayloadFields): string {
  const text = fields.text.trim();
  switch (fields.kind) {
    case 'url':
      return text && !/^[a-z][a-z0-9+.-]*:/iu.test(text) ? `https://${text}` : text;
    case 'email': {
      if (!text) return '';
      const subject = fields.subject?.trim();
      return subject ? `mailto:${text}?subject=${encodeURIComponent(subject)}` : `mailto:${text}`;
    }
    case 'phone': {
      const digits = text.replace(/[^\d+]/gu, '');
      const normalized = digits.startsWith('+')
        ? `+${digits.slice(1).replaceAll('+', '')}`
        : digits.replaceAll('+', '');
      return normalized ? `tel:${normalized}` : '';
    }
    default:
      return text;
  }
}

/**
 * Takes a payload apart into the fields the dialog shows, the inverse of
 * `composeQrPayload` as far as the spelling allows.
 */
export function decomposeQrPayload(payload: string): QrPayloadFields {
  const kind = qrPayloadKind(payload);
  if (kind === 'email') {
    const rest = payload.slice('mailto:'.length);
    const question = rest.indexOf('?');
    if (question === -1) return { kind, text: rest };
    const parameters = new URLSearchParams(rest.slice(question + 1));
    const subject = parameters.get('subject') ?? undefined;
    return { kind, text: rest.slice(0, question), ...(subject ? { subject } : {}) };
  }
  if (kind === 'phone') return { kind, text: payload.slice('tel:'.length) };
  return { kind, text: payload };
}

/**
 * The file spelling of a QR block: `::qr[payload]{size=30mm align=center ec=H}`,
 * with attributes at their defaults left out. The label is written literally
 * — the reader takes it as typed — so only the three characters that would
 * end or escape it are escaped.
 */
export function serializeQrDirective(spec: QrCodeSpec): string {
  const label = spec.payload.replaceAll('\\', '\\\\').replaceAll('[', '\\[').replaceAll(']', '\\]');
  const attributes: string[] = [];
  if (spec.sizeMm !== QR_SIZE_MM.fallback) attributes.push(`size=${spec.sizeMm}mm`);
  if (spec.align !== 'left') attributes.push(`align=${spec.align}`);
  if (spec.errorCorrection !== 'M') attributes.push(`ec=${spec.errorCorrection}`);
  return `::qr[${label}]${attributes.length ? `{${attributes.join(' ')}}` : ''}`;
}
