import { describe, expect, it } from 'vitest';
import { InvalidInputError, LimitReachedError } from '@/application/errors/FoldmarkErrors';
import type { FeatureUsageStore } from '@/application/ports/FeatureUsageStore';
import { markdownHeightMm } from '@/application/render/textMetrics';
import { QrCodeService } from '@/application/usecases/QrCodeService';
import { featureState, type PremiumFeatureId } from '@/domain/entitlement/premiumFeatures';
import { resolveBlockAttributes, unescapeDirectiveLabel } from '@/domain/markdown/directives';
import {
  composeQrPayload,
  decomposeQrPayload,
  encodeQrMatrix,
  qrModulePath,
  qrModuleSizeMm,
  qrPayloadKind,
  qrPrintQuality,
  qrViewBoxSize,
  serializeQrDirective,
  validateQrPayload,
  QR_PAYLOAD_MAX_LENGTH,
} from '@/domain/qr/qrCode';
import { parseMarkdown } from '@/presentation/markdown/parseMarkdown';

/** The block a QR directive parses into, or the whole list when it is not one. */
const qr = (source: string) => {
  const [first] = parseMarkdown(source);
  return first?.kind === 'qr' ? first : parseMarkdown(source);
};

describe('QR directive in the file (change 0040)', () => {
  it('reads `::qr[payload]{size align ec}` with defaults for what is missing', () => {
    expect(qr('::qr[https://example.org]')).toEqual({
      kind: 'qr',
      payload: 'https://example.org',
      sizeMm: 30,
      align: 'left',
      errorCorrection: 'M',
    });
    expect(qr('::qr[https://example.org]{size=40mm align=center ec=H}')).toEqual({
      kind: 'qr',
      payload: 'https://example.org',
      sizeMm: 40,
      align: 'center',
      errorCorrection: 'H',
    });
    // Out of range and unknown values fall back; the size reads with or without the unit.
    expect(qr('::qr[x]{size="25" align=middle ec=X}')).toMatchObject({
      sizeMm: 25,
      align: 'left',
      errorCorrection: 'M',
    });
    expect(qr('::qr[x]{size=500mm}')).toMatchObject({ sizeMm: 30 });
    expect(resolveBlockAttributes('qr', { size: '12.5' })).toMatchObject({ size: '30' });
  });

  it('takes the payload literally: no directive, emphasis or link is read inside it', () => {
    expect(qr('::qr[mailto:info@example.org?subject=Hi]')).toMatchObject({
      payload: 'mailto:info@example.org?subject=Hi',
    });
    expect(qr('::qr[a*b*_c_ `d` ~~e~~ ^2^ [x]{.red} &amp; <b>]')).toMatchObject({
      payload: 'a*b*_c_ `d` ~~e~~ ^2^ [x]{.red} &amp; <b>',
    });
    // Backslash escapes are the one thing resolved, so a bracket can be carried.
    expect(qr('::qr[a\\]b\\[c\\\\d\\:e]')).toMatchObject({ payload: 'a]b[c\\d:e' });
    expect(unescapeDirectiveLabel('\\*x\\* \\a')).toBe('*x* \\a');
  });

  it('reads a code inside a container and leaves an empty one as an empty payload', () => {
    expect(parseMarkdown(':::align{to=center}\n::qr[https://example.org]\n:::')).toMatchObject([
      {
        kind: 'directive',
        name: 'align',
        blocks: [{ kind: 'qr', payload: 'https://example.org' }],
      },
    ]);
    expect(qr('::qr')).toMatchObject({ kind: 'qr', payload: '' });
    // A three-colon spelling with content is not a leaf: unknown container, content shown.
    expect(parseMarkdown(':::qr\nhttps://example.org\n:::')).toMatchObject([
      { kind: 'directive', name: 'qr', known: false },
    ]);
  });

  it('writes the directive with escapes and without default attributes', () => {
    expect(
      serializeQrDirective({
        payload: 'https://example.org/a_b',
        sizeMm: 30,
        align: 'left',
        errorCorrection: 'M',
      }),
    ).toBe('::qr[https://example.org/a_b]');
    const written = serializeQrDirective({
      payload: 'x [1] \\ y]',
      sizeMm: 45,
      align: 'right',
      errorCorrection: 'Q',
    });
    expect(written).toBe('::qr[x \\[1\\] \\\\ y\\]]{size=45mm align=right ec=Q}');
    expect(qr(written)).toMatchObject({
      payload: 'x [1] \\ y]',
      sizeMm: 45,
      align: 'right',
      errorCorrection: 'Q',
    });
  });

  it('occupies its size in the height estimate, bounded by the box', () => {
    expect(markdownHeightMm('::qr[x]{size=40mm}', 'body', 100)).toBeCloseTo(40, 5);
    expect(markdownHeightMm('::qr[x]{size=80mm}', 'body', 50)).toBeCloseTo(50, 5);
  });
});

describe('QR encoding', () => {
  it('encodes a payload into a square matrix and a path of module runs', () => {
    const matrix = encodeQrMatrix('https://example.org', 'M');
    expect(matrix).not.toBeNull();
    if (!matrix) return;
    expect(matrix.version).toBe(2);
    expect(matrix.size).toBe(25);
    expect(matrix.modules).toHaveLength(25);
    // The finder pattern: the top-left corner is a 7 × 7 frame.
    expect(matrix.modules[0]?.slice(0, 7)).toEqual([true, true, true, true, true, true, true]);
    expect(matrix.modules[1]?.slice(0, 7)).toEqual([true, false, false, false, false, false, true]);
    expect(qrViewBoxSize(matrix)).toBe(33);
    const path = qrModulePath(matrix);
    expect(path.startsWith('M4 4h7v1h-7z')).toBe(true);
    // Linear: every run is `M`, digits, `h`, digits, `v1h-`, digits, `z`; nothing overlaps.
    // eslint-disable-next-line security/detect-unsafe-regex
    expect(path).toMatch(/^(M\d+ \d+h\d+v1h-\d+z)+$/u);
  });

  it('is deterministic and refuses what cannot be a code', () => {
    expect(encodeQrMatrix('Hallo')).toEqual(encodeQrMatrix('Hallo'));
    expect(encodeQrMatrix('')).toBeNull();
    expect(encodeQrMatrix('   ')).toBeNull();
    expect(encodeQrMatrix('a' + String.fromCodePoint(7) + 'b')).toBeNull();
    expect(encodeQrMatrix('a\nb')).toBeNull();
    expect(encodeQrMatrix('x'.repeat(QR_PAYLOAD_MAX_LENGTH + 1))).toBeNull();
    expect(validateQrPayload('x'.repeat(QR_PAYLOAD_MAX_LENGTH))).toBeNull();
    // A thousand characters at the highest level do not fit a symbol either.
    expect(encodeQrMatrix('ü'.repeat(QR_PAYLOAD_MAX_LENGTH), 'H')).toBeNull();
  });

  it('flags modules a printer will not resolve', () => {
    const matrix = encodeQrMatrix('https://example.org/some/longer/path?with=query&and=more', 'M');
    if (!matrix) throw new Error('unencodable');
    expect(qrModuleSizeMm(30, matrix)).toBeCloseTo(30 / (matrix.size + 8), 6);
    expect(qrPrintQuality(30, matrix)).toBe('ok');
    expect(qrPrintQuality(15, matrix)).toBe('small');
  });

  it('composes and takes apart the payload kinds', () => {
    expect(composeQrPayload({ kind: 'url', text: 'example.org/x' })).toBe('https://example.org/x');
    expect(composeQrPayload({ kind: 'url', text: 'http://example.org' })).toBe(
      'http://example.org',
    );
    expect(composeQrPayload({ kind: 'email', text: 'a@b.de', subject: 'Hallo Welt' })).toBe(
      'mailto:a@b.de?subject=Hallo%20Welt',
    );
    expect(composeQrPayload({ kind: 'phone', text: '+49 (0)231 / 12 34-56' })).toBe(
      'tel:+490231123456',
    );
    expect(composeQrPayload({ kind: 'text', text: '  Nur Text  ' })).toBe('Nur Text');
    expect(qrPayloadKind('HTTPS://x.y')).toBe('url');
    expect(decomposeQrPayload('mailto:a@b.de?subject=Hallo%20Welt')).toEqual({
      kind: 'email',
      text: 'a@b.de',
      subject: 'Hallo Welt',
    });
    expect(decomposeQrPayload('tel:+4923112')).toEqual({ kind: 'phone', text: '+4923112' });
    expect(decomposeQrPayload('WIFI:S:x;;')).toEqual({ kind: 'text', text: 'WIFI:S:x;;' });
  });
});

describe('QrCodeService: the gate and the counter', () => {
  const store = (): FeatureUsageStore & { counts: Record<string, number> } => {
    const counts: Record<string, number> = {};
    return {
      counts,
      read: (feature: PremiumFeatureId) => counts[feature] ?? 0,
      increment: (feature: PremiumFeatureId) => (counts[feature] = (counts[feature] ?? 0) + 1),
    };
  };

  it('counts a generated code, not a refused one, and never an edit', () => {
    const usage = store();
    const service = new QrCodeService(usage);
    expect(service.state()).toEqual({ mode: 'free', used: 0, limit: 5 });
    expect(
      service.generate({ payload: ' https://example.org ', sizeMm: 200, align: 'center' }),
    ).toEqual({
      payload: 'https://example.org',
      sizeMm: 80,
      align: 'center',
      errorCorrection: 'M',
    });
    expect(usage.counts['qr.generate']).toBe(1);
    expect(() => service.generate({ payload: '' })).toThrow(InvalidInputError);
    expect(() => service.generate({ payload: 'a' + String.fromCodePoint(0) + 'b' })).toThrow(
      InvalidInputError,
    );
    expect(() => service.generate({ payload: 'x'.repeat(5000) })).toThrow(InvalidInputError);
    expect(usage.counts['qr.generate']).toBe(1);
    expect(service.prepare({ payload: 'x', errorCorrection: 'H', align: 'up' })).toEqual({
      payload: 'x',
      sizeMm: 30,
      align: 'left',
      errorCorrection: 'H',
    });
    expect(usage.counts['qr.generate']).toBe(1);
  });

  it('is free up to the allowance and beta-free beyond it during the test phase', () => {
    const usage = store();
    const service = new QrCodeService(usage);
    for (let index = 0; index < 5; index += 1) service.generate({ payload: `code ${index}` });
    expect(service.state()).toEqual({ mode: 'beta-free', used: 5, limit: 5 });
    // Still generates: the test phase locks nothing.
    expect(service.generate({ payload: 'six' }).payload).toBe('six');
    expect(usage.counts['qr.generate']).toBe(6);
    // What a live phase would answer, and what the service does with it.
    expect(featureState('qr.generate', 5, 'live')).toEqual({ mode: 'locked', used: 5, limit: 5 });
    const locked = new QrCodeService({
      read: () => 5,
      increment: () => {
        throw new Error('must not count a locked use');
      },
    });
    locked.state = () => ({ mode: 'locked', used: 5, limit: 5 });
    expect(() => locked.generate({ payload: 'x' })).toThrow(LimitReachedError);
  });
});
