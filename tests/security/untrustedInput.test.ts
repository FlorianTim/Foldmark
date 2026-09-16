import { describe, expect, it } from 'vitest';
import { BackupService } from '@/application/usecases/BackupService';
import { isSafeRecordKey } from '@/domain/common/Schemas';
import { FoldmarkDocumentSchema } from '@/domain/document/DocumentSchema';
import { isColorName } from '@/domain/document/DocumentTheme';
import { parseMarkdown } from '@/domain/markdown/parseMarkdown';
import { PrintProfileSchema } from '@/domain/print/PrintProfileSchema';
import { MarkdownDocumentCodecImpl } from '@/infrastructure/codec/MarkdownDocumentCodecImpl';
import { parseFrontMatter } from '@/infrastructure/codec/frontMatter';
import { DefaultEmailRenderer } from '@/infrastructure/email/DefaultEmailRenderer';
import { safeFilename } from '@/presentation/download';
import {
  FakeAddressRepository,
  fakeHistory,
  FakeAssetRepository,
  FakeDocumentRepository,
  FakePrintProfileRepository,
  FakeSettingsStore,
  letterFixture,
} from '../helpers/fakes';

/**
 * The negative cases, in one place.
 *
 * Each of these is a boundary Foldmark crosses with data it did not create: a
 * Markdown file someone was sent, a backup from another machine, a record read
 * back out of IndexedDB. The tests assert what must **not** happen.
 */

const codec = new MarkdownDocumentCodecImpl();
const decodeDefaults = { id: 'imported', locale: 'de-DE', printProfileId: 'a4-blank' };

describe('untrusted Markdown', () => {
  it('never turns document text into markup', () => {
    const hostile = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<a href="javascript:alert(1)">click</a>',
      '<svg onload=alert(1)>',
      '<style>body{display:none}</style>',
    ];

    for (const source of hostile) {
      const blocks = parseMarkdown(source);
      const text = JSON.stringify(blocks);
      // The parser has no concept of HTML at all: the angle brackets survive as
      // text, which is what makes the Vue template render them harmlessly.
      expect(text).not.toContain('"kind":"html"');
      expect(blocks.every((block) => block.kind !== 'heading' || block.level <= 3)).toBe(true);
      expect(source.includes('<')).toBe(true);
    }
  });

  it('renders hostile Markdown into HTML email as escaped text', () => {
    const renderer = new DefaultEmailRenderer();
    const html = renderer.renderHtml({
      document: letterFixture({
        bodyMarkdown: '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>',
        metadata: { salutation: '<b>Hi</b>' },
      }),
    });

    for (const prohibited of ['<script', '<img', '<b>Hi']) {
      expect(html).not.toContain(prohibited);
    }
    // The words survive as escaped text — that is the point. What must not
    // exist is a real tag carrying an event handler.
    expect(html).not.toMatch(/<[a-z]+[^>]*\son[a-z]+=/iu);
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('onerror=alert(1)&gt;');
  });
});

describe('untrusted front matter', () => {
  it('cannot reach Object.prototype through a parsed document', () => {
    const attacks = ['__proto__: polluted', 'a:\n  __proto__: polluted', 'constructor: polluted'];
    for (const source of attacks) {
      expect(() => parseFrontMatter(source)).toThrow();
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('refuses the keys the preserved-metadata path would otherwise carry', () => {
    expect(isSafeRecordKey('__proto__')).toBe(false);
    expect(isSafeRecordKey('constructor')).toBe(false);
    expect(isSafeRecordKey('../escape')).toBe(false);
    expect(isSafeRecordKey('normalKey')).toBe(true);
  });

  it('bounds expansion so a small file cannot become a large structure', () => {
    // The classic YAML denial of service: anchors referenced repeatedly. The
    // subset has no anchors, so the file is refused rather than expanded.
    const billionLaughs = [
      'a: &a ["x","x","x","x","x","x","x","x","x"]',
      'b: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]',
      'c: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b]',
    ].join('\n');
    expect(() => parseFrontMatter(billionLaughs)).toThrow();
  });

  it('does not construct types from a tag', () => {
    expect(() => parseFrontMatter('a: !!js/function "function(){}"')).toThrow();
  });
});

describe('untrusted records crossing the persistence boundary', () => {
  it('rejects a document record with a non-finite coordinate', () => {
    const document = letterFixture({
      assetPlacements: [
        {
          id: 'p',
          assetId: 'a',
          surface: 'all',
          xMm: Number.POSITIVE_INFINITY,
          yMm: 0,
          widthMm: 10,
          rotationDeg: 0,
          opacity: 1,
          layer: 'content',
          fit: 'contain',
        },
      ],
    });
    expect(FoldmarkDocumentSchema.safeParse(document).success).toBe(false);
  });

  it('rejects unknown keys rather than silently dropping them', () => {
    const document = { ...letterFixture(), unexpected: 'value' };
    expect(FoldmarkDocumentSchema.safeParse(document).success).toBe(false);
  });

  it('rejects a profile whose stroke width is zero or negative', () => {
    const marker = {
      id: 'm',
      kind: 'fold',
      xMm: 5,
      yMm: 105,
      widthMm: 8,
      orientation: 'horizontal',
      strokeWidthMm: 0,
      lineStyle: 'solid',
      preview: true,
      print: true,
      surface: 'all',
      locked: false,
    };
    const profile = {
      id: 'p',
      version: 1,
      name: { de: 'a', en: 'a' },
      category: 'letter',
      builtIn: false,
      page: { widthMm: 210, heightMm: 297, orientation: 'portrait' },
      margins: { topMm: 20, rightMm: 20, bottomMm: 20, leftMm: 20 },
      capabilities: { foldMarks: true, addressWindow: false, duplex: false, bleed: false },
      markers: [marker],
      regions: {},
      standardsStatus: 'not-applicable',
    };
    expect(PrintProfileSchema.safeParse(profile).success).toBe(false);
  });
});

describe('untrusted backups', () => {
  function service(): BackupService {
    return new BackupService(
      new FakeDocumentRepository(),
      new FakeAddressRepository(),
      new FakePrintProfileRepository(),
      new FakeAssetRepository(),
      new FakeSettingsStore(),
      '0.1.0',
      fakeHistory(),
    );
  }

  it('refuses a payload that is not an object', async () => {
    for (const candidate of [null, 42, 'text', true]) {
      await expect(service().importAll(candidate)).rejects.toThrow();
    }
  });

  it('refuses an asset whose payload does not match its declared size', async () => {
    const backup = {
      format: 'foldmark-backup',
      version: 1,
      assets: [
        {
          asset: {
            id: 'a1',
            kind: 'image',
            mimeType: 'image/png',
            byteSize: 99_999,
            checksum: 'a'.repeat(64),
            widthPx: 10,
            heightPx: 10,
            createdAt: '2026-08-03T10:00:00.000Z',
          },
          dataBase64: 'AAAA',
        },
      ],
    };
    const report = await service().importAll(backup);
    expect(report.assets).toBe(0);
    expect(report.issues.some((issue) => issue.code === 'backup.recordRejected')).toBe(true);
  });
});

describe('untrusted filenames', () => {
  it('never produces a download name that can traverse a path', () => {
    expect(safeFilename('../../etc/passwd', 'md')).toBe('__.._etc_passwd.md');
    expect(safeFilename('C:\\Windows\\system32', 'md')).toBe('C__Windows_system32.md');
    expect(safeFilename('', 'md')).toBe('foldmark.md');
    expect(safeFilename('...', 'md')).toBe('_.md');
  });
});

describe('import never silently discards the user text', () => {
  it('hands the original source back when the file cannot be parsed', () => {
    const source = '---\nbroken: &anchor value\n---\n\nMein wichtiger Brief.\n';
    const result = codec.decode(source, decodeDefaults);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.source).toContain('Mein wichtiger Brief.');
  });

  it('drops a flow collection and reports the key rather than refusing the file (change 0017)', () => {
    const source = '---\ntitle: A\nbroken: [flow]\nkept: yes\n---\n\nMein wichtiger Brief.\n';
    const result = codec.decode(source, decodeDefaults);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.preserved.broken).toBeUndefined();
    expect(result.document.preserved.kept).toBe('yes');
    expect(result.document.bodyMarkdown).toContain('Mein wichtiger Brief.');
    expect(
      result.issues.some(
        (issue) => issue.code === 'import.flowCollectionDropped' && issue.params?.key === 'broken',
      ),
    ).toBe(true);
    // Nothing inside the brackets was interpreted: the subset did not grow.
    expect(JSON.stringify(result.document)).not.toContain('flow');
  });
});

describe('untrusted directives, colours and images (change 0017)', () => {
  it('never lets a directive, an attribute or a colour name reach markup', () => {
    const hostile = [
      ':red[<script>alert(1)</script>]',
      ':::note{type="x\\" onclick=\\"alert(1)"}\n<img src=x onerror=alert(1)>\n:::',
      ':gold[<b>x</b>]{onclick="alert(1)"}',
      ':color[x]{name="red; background: url(https://evil.example/t.png)"}',
      '![x](asset:../../etc/passwd)',
      '![x](https://evil.example/track.png)',
      '![x](javascript:alert(1))',
      '::page-break{onload=alert(1)}',
      ':date[<script>]',
    ];
    for (const source of hostile) {
      const blocks = parseMarkdown(source);
      const text = JSON.stringify(blocks);
      expect(text).not.toContain('"kind":"html"');
      // Attributes of unknown directives are not carried into the model; known
      // ones are validated against the catalogue, so an `onclick` attribute
      // cannot exist — it can only survive as inert text.
      for (const block of blocks) {
        if (block.kind === 'directive') {
          expect(Object.keys(block.attributes).every((key) => !key.startsWith('on'))).toBe(true);
        }
        if (block.kind !== 'paragraph') continue;
        for (const token of block.content) {
          // A colour is only ever a palette name; an image only ever a plain id.
          if (token.kind === 'color') expect(isColorName(token.color ?? '')).toBe(true);
          if (token.kind === 'image')
            expect(token.assetId).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*$/u);
        }
      }
      expect(text).not.toContain('evil.example/t.png"');
    }
    // Remote and scheme-abusing images are the text they were.
    expect(parseMarkdown('![x](https://evil.example/track.png)')[0]).toEqual({
      kind: 'paragraph',
      content: [{ kind: 'text', value: '![x](https://evil.example/track.png)' }],
    });
    expect(parseMarkdown('![x](asset:../../etc/passwd)')[0]).toEqual({
      kind: 'paragraph',
      content: [{ kind: 'text', value: '![x](asset:../../etc/passwd)' }],
    });
  });

  it('renders hostile directives into HTML email as escaped text with palette colours only', () => {
    const renderer = new DefaultEmailRenderer();
    const html = renderer.renderHtml({
      document: letterFixture({
        bodyMarkdown:
          ':red[<script>alert(1)</script>] :color[x]{name="red;background:url(x)"}\n\n:::note{type="x\\" onclick=\\"a()"}\nText\n:::',
      }),
    });
    expect(html).not.toContain('<script');
    // No element carries an event handler or a colour from the text.
    expect(html).not.toMatch(/<[a-z]+[^>]*\son[a-z]+=/iu);
    expect(html).not.toContain('url(');
    expect(html).toContain('&lt;script&gt;');
    // Only the fixed tag set with palette values.
    expect(html).toMatch(/<span style="color:#[0-9a-f]{6}">/u);
  });

  it('refuses a theme colour that is not a hex value, so no CSS can be smuggled through a file', () => {
    const source =
      '---\ntitle: A\ntheme:\n  highlight:\n    screen: "red; background: url(https://evil.example/x)"\n---\n\nText\n';
    const result = codec.decode(source, decodeDefaults);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.printOptions.theme).toBeUndefined();
    expect(JSON.stringify(result.document)).not.toContain('evil.example');
  });

  it('keeps unknown directives whole through the file round trip without interpreting them', () => {
    const body = ':::fancy{mode="x"}\n:gold[Wort]\n:::\n\n::custom-leaf';
    const encoded = codec.encode(letterFixture({ bodyMarkdown: body }));
    expect(encoded).toContain(body);
    const blocks = parseMarkdown(body);
    expect(blocks[0]).toMatchObject({
      kind: 'directive',
      name: 'fancy',
      known: false,
      attributes: {},
    });
    expect(blocks[1]).toMatchObject({
      kind: 'directive',
      name: 'custom-leaf',
      known: false,
      blocks: [],
    });
  });
});
