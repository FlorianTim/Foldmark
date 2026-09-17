import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RichTextEditorPort } from '@/application/ports/RichTextEditorPort';
import { milkdownEditorFactory } from '@/infrastructure/editor/MilkdownEditorAdapter';

/**
 * Round-trip fixtures for the rich editor (change 0010, definition of done).
 *
 * Each fixture is loaded, read back and compared. Where Milkdown normalises
 * Markdown the expected form is written out, so every accepted normalisation
 * is visible here rather than discovered in a diff.
 */
const FIXTURES: readonly { name: string; input: string; expected?: string }[] = [
  { name: 'paragraphs and blank lines', input: 'Erster Absatz.\n\nZweiter Absatz.' },
  { name: 'bold and italic', input: 'Ein **fettes** und ein *kursives* Wort.' },
  { name: 'links', input: 'Siehe [Foldmark](https://example.org/foldmark).' },
  { name: 'unicode', input: 'Grüße aus Köln – façade, naïve, 日本語, 🙂.' },
  { name: 'lists', input: '* eins\n* zwei\n* drei' },
  { name: 'ordered lists', input: '1. eins\n2. zwei\n3. drei' },
  { name: 'nested lists', input: '* eins\n  * eins a\n  * eins b\n* zwei' },
  {
    name: 'tables',
    input: '| A | B |\n| - | - |\n| 1 | 2 |',
    expected: '| A | B |\n| - | - |\n| 1 | 2 |',
  },
  { name: 'block quotes', input: '> Zitat\n> über zwei Zeilen' },
  // Accepted normalisations: remark writes a rule as `***` (which also keeps
  // it apart from a front-matter fence) and a hard break as a trailing `\\`.
  {
    name: 'horizontal rule',
    input: 'oben\n\n---\n\nunten',
    expected: 'oben\n\n***\n\nunten',
  },
  {
    name: 'hard line breaks',
    input: 'Zeile eins  \nZeile zwei',
    expected: 'Zeile eins\\\nZeile zwei',
  },
  { name: 'strikethrough', input: 'nicht ~~mehr~~ gültig' },
  { name: 'headings', input: '# Eins\n\n## Zwei\n\n### Drei\n\nText.' },
  {
    name: 'dangerous html stays text',
    input: 'Hallo <script>alert(1)</script> Welt',
  },
  {
    name: 'html block stays text',
    input: '<img src=x onerror=alert(1)>\n\nText danach.',
  },
  // Change 0017: directives, palette, dates, images. Accepted normalisations:
  // the Pandoc spellings and the 1.1 date token are written canonically, a
  // fence with a space loses it, and attribute values are quoted.
  { name: 'colour directives', input: 'Ein :red[rotes] und ein :light-green[grünes] Wort.' },
  { name: 'semantic colour alias', input: 'Bitte :danger[sofort] antworten.' },
  { name: 'nested formatting inside a colour', input: ':blue[ein **fettes** Wort]' },
  {
    name: 'inline directives',
    input: ':highlight[markiert] :u[unterstrichen] :small[klein] H:sub[2]O 2:sup[n]',
  },
  { name: 'date directive', input: 'Dortmund, :date[2026-09-11]' },
  {
    name: 'legacy date token is migrated',
    input: 'Dortmund, {{date:2026-09-11}}',
    expected: 'Dortmund, :date[2026-09-11]',
  },
  {
    name: 'pandoc inline spellings are read and written canonically',
    input: '[rot]{.red} und x^2^ und H~2~O',
    expected: ':red[rot] und x:sup[2] und H:sub[2]O',
  },
  { name: 'unknown inline directive is kept', input: 'Ein :gold[unbekanntes] Wort.' },
  {
    name: 'long colour spelling becomes the short one',
    input: ':color[x]{name=blue}',
    expected: ':blue[x]',
  },
  { name: 'note box', input: ':::note{type="warning"}\nAchtung.\n:::' },
  { name: 'indent', input: ':::indent{level="2"}\nEingerückt.\n:::' },
  { name: 'alignment', input: ':::align{to="right"}\nRechts.\n:::' },
  { name: 'signature', input: ':::signature{lines="4"}\nMax Muster\n:::' },
  { name: 'small block', input: ':::small\nKleingedrucktes.\n:::' },
  { name: 'page break', input: 'Seite eins.\n\n::page-break\n\nSeite zwei.' },
  {
    name: 'salutation and closing blocks (change 0021)',
    input:
      ':::salutation\nSehr geehrte Frau Beispiel,\n:::\n\nText.\n\n:::closing\nMit freundlichen Grüßen\n:::',
  },
  {
    name: 'three-colon page break becomes the leaf form',
    input: 'Seite eins.\n\n::: page-break\n\nSeite zwei.',
    expected: 'Seite eins.\n\n::page-break\n\nSeite zwei.',
  },
  { name: 'a colon before a word is text', input: 'Betreff:Antrag und 10:30 Uhr.' },
  {
    name: 'fence with a space is read and written without',
    input: '::: note\nHinweis.\n:::',
    expected: ':::note\nHinweis.\n:::',
  },
  { name: 'unknown block directive is kept', input: ':::fancy{mode="x"}\nInhalt.\n:::' },
  { name: 'unknown leaf directive is kept', input: '::rule-of-thumb' },
  { name: 'local image with width', input: '![Logo](asset:a1b2c3){width=60mm}' },
  { name: 'local image with layout', input: '![Logo](asset:a1b2c3){width=50% align=center}' },
  {
    name: 'local image layout is written in a fixed order',
    input: '![Logo](asset:a1b2c3){align=right width=100%}',
    expected: '![Logo](asset:a1b2c3){width=100% align=right}',
  },
  { name: 'remote image stays text', input: '![Tracker](https://example.org/x.png)' },
  // Change 0040: a QR code is a leaf directive whose label is the payload, taken
  // literally on both sides: what Markdown would read as emphasis or a
  // directive is neither read nor escaped. Accepted normalisations: attribute
  // values are quoted; brackets and backslashes are escaped and resolved again.
  {
    name: 'qr code with layout',
    input: 'Scan:\n\n::qr[https://example.org]{size=40mm align=center ec=H}\n\nDanke.',
    expected: 'Scan:\n\n::qr[https://example.org]{size="40mm" align="center" ec="H"}\n\nDanke.',
  },
  { name: 'qr payload is literal', input: '::qr[mailto:info@example.org?subject=Hi&body=a*b*_c_]' },
  {
    name: 'qr payload with brackets and backslashes',
    input: '::qr[x \\[1\\] y a\\\\*b c:\\dir]{size=25mm}',
    expected: '::qr[x \\[1\\] y a\\\\*b c:\\dir]{size="25mm"}',
  },
];

describe('rich editor round trip', () => {
  let element: HTMLElement;
  let editor: RichTextEditorPort | null = null;
  const changes: string[] = [];

  beforeEach(() => {
    // jsdom has no layout; ProseMirror's scroll-into-view asks for rectangles.
    const none = (): DOMRectList => [] as unknown as DOMRectList;
    const rect = (): DOMRect => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      toJSON: () => ({}),
    });
    Element.prototype.getClientRects ??= none;
    Range.prototype.getClientRects ??= none;
    Range.prototype.getBoundingClientRect ??= rect;
    element = document.createElement('div');
    document.body.append(element);
    changes.length = 0;
  });

  afterEach(async () => {
    await editor?.destroy();
    editor = null;
    element.remove();
  });

  async function mount(markdown: string): Promise<RichTextEditorPort> {
    editor = await milkdownEditorFactory.create({
      element,
      initialMarkdown: markdown,
      onChange: (next) => changes.push(next),
    });
    return editor;
  }

  const normalize = (value: string): string => value.replaceAll(/\s+$/gmu, '').trim();
  /** Outwaits the listener plugin's 200 ms debounce. */
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 260));

  for (const fixture of FIXTURES) {
    it(`keeps ${fixture.name}`, async () => {
      const port = await mount(fixture.input);
      const output = await port.getMarkdown();
      expect(normalize(output)).toBe(normalize(fixture.expected ?? fixture.input));
      // Loading is not a change — not even after the listener's debounce.
      await settle();
      expect(changes).toEqual([]);
    });
  }

  it('inserts, selects and updates a QR code (change 0040)', async () => {
    const port = await mount('Text.');
    port.run('qr', {
      payload: 'https://example.org',
      sizeMm: 30,
      align: 'left',
      errorCorrection: 'M',
    });
    expect(normalize(await port.getMarkdown())).toBe(
      normalize('Text.\n\n::qr[https://example.org]'),
    );
    // Drawn as an SVG path whose data is digits and letters, never the payload.
    const svg = element.querySelector('.md-qr svg');
    expect(svg?.getAttribute('width')).toBe('30mm');
    // Linear: every run is `M`, digits, `h`, digits, `v1h-`, digits, `z`; nothing overlaps.
    // eslint-disable-next-line security/detect-unsafe-regex
    expect(svg?.querySelector('path')?.getAttribute('d')).toMatch(/^(M\d+ \d+h\d+v1h-\d+z)+$/u);
    expect(element.querySelector('.md-qr')?.getAttribute('data-qr-payload')).toBe(
      'https://example.org',
    );
    // An update needs the node selected; the toolbar reports it once it is.
    port.run('qrUpdate', { payload: 'tel:+49', sizeMm: 45, align: 'right', errorCorrection: 'Q' });
    expect(normalize(await port.getMarkdown())).toBe(
      normalize('Text.\n\n::qr[https://example.org]'),
    );
    expect(port.selectionState().qr).toBeNull();
    expect(port.selectQr('https://example.org')).toBe(true);
    expect(port.selectQr('nope')).toBe(false);
    expect(port.selectionState().qr).toEqual({
      payload: 'https://example.org',
      sizeMm: 30,
      align: 'left',
      errorCorrection: 'M',
    });
    port.run('qrUpdate', { payload: 'tel:+49', sizeMm: 45, align: 'right', errorCorrection: 'Q' });
    expect(normalize(await port.getMarkdown())).toBe(
      normalize('Text.\n\n::qr[tel:+49]{size="45mm" align="right" ec="Q"}'),
    );
    expect(element.querySelector('.md-qr svg')?.getAttribute('width')).toBe('45mm');
    // A code without a payload is refused by the command, not written.
    port.run('qr', { payload: '', sizeMm: 30, align: 'left', errorCorrection: 'M' });
    expect(normalize(await port.getMarkdown())).toBe(
      normalize('Text.\n\n::qr[tel:+49]{size="45mm" align="right" ec="Q"}'),
    );
  });

  it('reads :highlight[…] back as the highlight mark, not the colour alias (R14-004)', async () => {
    const port = await mount('Ein :highlight[markiertes] Wort.');
    expect(element.querySelector('mark.md-highlight')?.textContent).toBe('markiertes');
    expect(element.querySelector('.md-color')).toBeNull();
    // The long spelling is the text colour of the same name and stays one.
    await port.loadMarkdown('Ein :color[gelbes]{name=highlight} Wort.');
    expect(element.querySelector('mark.md-highlight')).toBeNull();
    expect(element.querySelector('.md-color[data-color="highlight"]')?.textContent).toBe('gelbes');
  });

  it('never turns raw HTML into elements', async () => {
    await mount('<img src=x onerror=alert(1)> und <b onclick="x()">fett</b>');
    // ProseMirror's own cursor-placement image is not document content.
    expect(element.querySelector('img:not(.ProseMirror-separator)')).toBeNull();
    expect(element.querySelector('b')).toBeNull();
    expect(element.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('reloads content without firing a change and resets undo', async () => {
    const port = await mount('alt');
    await port.loadMarkdown('neu');
    expect(normalize(await port.getMarkdown())).toBe('neu');
    await settle();
    expect(changes).toEqual([]);
  });

  it('applies toolbar commands and reports them as Markdown', async () => {
    const port = await mount('');
    port.insertText('Wort');
    port.run('heading2');
    expect(normalize(await port.getMarkdown())).toBe('## Wort');
    await settle();
    expect(changes.length).toBeGreaterThan(0);
    expect(port.canUndo()).toBe(true);
    port.run('paragraph');
    expect(normalize(await port.getMarkdown())).toBe('Wort');
  });

  it('writes the directive catalogue from toolbar commands (change 0017)', async () => {
    const port = await mount('');
    port.insertText('Wort');
    // Select the word: the commands act on the selection.
    port.selectAll();

    port.run('color', 'light-green');
    expect(port.selectionState().color).toBe('light-green');
    expect(normalize(await port.getMarkdown())).toBe(':light-green[Wort]');
    // A second colour replaces the first; the same one removes it.
    port.run('color', 'danger');
    expect(normalize(await port.getMarkdown())).toBe(':danger[Wort]');
    port.run('color', 'danger');
    expect(normalize(await port.getMarkdown())).toBe('Wort');
    // An unknown name is refused by the command, not written.
    port.run('color', 'gold');
    expect(normalize(await port.getMarkdown())).toBe('Wort');

    port.run('highlight');
    expect(normalize(await port.getMarkdown())).toBe(':highlight[Wort]');
    port.run('highlight');
    port.run('underline');
    expect(normalize(await port.getMarkdown())).toBe(':u[Wort]');
    port.run('underline');

    port.run('note', 'warning');
    expect(normalize(await port.getMarkdown())).toBe(':::note{type="warning"}\nWort\n:::');
    expect(port.selectionState().block).toBe('note');
    port.run('note', 'warning');
    expect(normalize(await port.getMarkdown())).toBe('Wort');

    port.run('indent', '2');
    expect(normalize(await port.getMarkdown())).toBe(':::indent{level="2"}\nWort\n:::');
    port.run('indent', '2');

    port.run('pageBreak');
    expect(normalize(await port.getMarkdown())).toBe(normalize('Wort\n\n::page-break'));
  });

  it('inserts dates and local images as their directives', async () => {
    const port = await mount('');
    port.insertText('Am ');
    port.run('date', '2026-09-11');
    expect(normalize(await port.getMarkdown())).toBe('Am :date[2026-09-11]');
    // Not a date: nothing is inserted.
    port.run('date', 'heute');
    expect(normalize(await port.getMarkdown())).toBe('Am :date[2026-09-11]');

    await port.loadMarkdown('');
    port.run('image', { assetId: 'a1b2', widthMm: 60 });
    expect(normalize(await port.getMarkdown())).toBe('![](asset:a1b2){width=60mm}');
    await port.loadMarkdown('');
    port.run('image', 'a1b2');
    expect(normalize(await port.getMarkdown())).toBe('![](asset:a1b2)');

    // The image toolbar (R14-015): the selected image takes an alignment and a size.
    await port.loadMarkdown('![Logo](asset:a1b2){width=60mm}');
    port.selectAll();
    expect(port.selectionState().image).toBeNull();
    expect(port.selectImage('a1b2')).toBe(true);
    expect(port.selectionState().image).toEqual({ assetId: 'a1b2', widthMm: 60 });
    port.run('imageLayout', { layout: { align: 'center' } });
    expect(normalize(await port.getMarkdown())).toBe(
      '![Logo](asset:a1b2){width=60mm align=center}',
    );
    port.run('imageLayout', { layout: { widthPercent: 100 } });
    expect(normalize(await port.getMarkdown())).toBe(
      '![Logo](asset:a1b2){width=100% align=center}',
    );
    expect(port.selectionState().image).toEqual({
      assetId: 'a1b2',
      widthPercent: 100,
      align: 'center',
    });
    port.run('imageLayout', { layout: { widthMm: null, widthPercent: null, align: null } });
    expect(normalize(await port.getMarkdown())).toBe('![Logo](asset:a1b2)');
  });

  it('shows a local image through the app’s resolver and never a remote one', async () => {
    const resolved: string[] = [];
    editor = await milkdownEditorFactory.create({
      element,
      initialMarkdown: '![Logo](asset:a1b2){width=60mm} ![x](https://evil.example/t.png)',
      onChange: () => undefined,
      resolveAssetUrl: async (id) => {
        resolved.push(id);
        return 'blob:local-image';
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const images = [...element.querySelectorAll('img:not(.ProseMirror-separator)')];
    expect(resolved).toEqual(['a1b2']);
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe('blob:local-image');
    expect((images[0] as HTMLElement).style.width).toBe('60mm');
    expect(element.textContent).toContain('![x](https://evil.example/t.png)');
    expect(element.querySelector('img[src*="evil.example"]')).toBeNull();
  });
});
