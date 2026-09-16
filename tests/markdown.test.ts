import { describe, expect, it } from 'vitest';
import { parseImageLayout, serializeImageLayout } from '@/domain/markdown/directives';
import { parseMarkdown } from '@/presentation/markdown/parseMarkdown';

describe('safe Markdown parser', () => {
  it('parses the documented bounded subset', () => {
    expect(parseMarkdown('A **bold** and _small_ note\n- first\n- `second`')).toEqual([
      {
        kind: 'paragraph',
        content: [
          { kind: 'text', value: 'A ' },
          { kind: 'strong', value: 'bold' },
          { kind: 'text', value: ' and ' },
          { kind: 'emphasis', value: 'small' },
          { kind: 'text', value: ' note' },
        ],
      },
      {
        kind: 'list',
        ordered: false,
        items: [
          { content: [{ kind: 'text', value: 'first' }], depth: 0 },
          { content: [{ kind: 'code', value: 'second' }], depth: 0 },
        ],
      },
    ]);
  });

  it('keeps HTML, unsafe links and malformed delimiters as inert text', () => {
    expect(
      parseMarkdown('<img src=x onerror=alert(1)> [link](javascript:alert(1)) **open'),
    ).toEqual([
      {
        kind: 'paragraph',
        content: [
          {
            kind: 'text',
            value: '<img src=x onerror=alert(1)> [link](javascript:alert(1)) **open',
          },
        ],
      },
    ]);
  });

  it('parses all six heading levels (change 0022)', () => {
    expect(parseMarkdown('# One\n## Two\n#### Deep\n###### Six')).toEqual([
      { kind: 'heading', level: 1, content: [{ kind: 'text', value: 'One' }] },
      { kind: 'heading', level: 2, content: [{ kind: 'text', value: 'Two' }] },
      { kind: 'heading', level: 4, content: [{ kind: 'text', value: 'Deep' }] },
      { kind: 'heading', level: 6, content: [{ kind: 'text', value: 'Six' }] },
    ]);
  });

  it('treats a hash without a space as ordinary text', () => {
    expect(parseMarkdown('#nothashtag')).toEqual([
      { kind: 'paragraph', content: [{ kind: 'text', value: '#nothashtag' }] },
    ]);
  });

  it('joins wrapped lines into one paragraph and splits on a blank line', () => {
    // Bundled help documents are wrapped prose; one paragraph per line would
    // render them as a stack of disconnected fragments.
    expect(parseMarkdown('first line\nsecond line\n\nnext block')).toEqual([
      { kind: 'paragraph', content: [{ kind: 'text', value: 'first line second line' }] },
      { kind: 'paragraph', content: [{ kind: 'text', value: 'next block' }] },
    ]);
  });

  it('still refuses HTML inside a heading', () => {
    expect(parseMarkdown('# <script>alert(1)</script>')).toEqual([
      {
        kind: 'heading',
        level: 1,
        content: [{ kind: 'text', value: '<script>alert(1)</script>' }],
      },
    ]);
  });
});

describe('the editor-sized subset (change 0010)', () => {
  it('parses numbered and nested lists with depth', () => {
    expect(parseMarkdown('1. eins\n2. zwei\n   * zwei a')).toEqual([
      {
        kind: 'list',
        ordered: true,
        items: [
          { content: [{ kind: 'text', value: 'eins' }], depth: 0 },
          { content: [{ kind: 'text', value: 'zwei' }], depth: 0 },
          { content: [{ kind: 'text', value: 'zwei a' }], depth: 1 },
        ],
      },
    ]);
  });

  it('parses block quotes recursively and bounds the depth', () => {
    expect(parseMarkdown('> Zitat\n> **fett**')).toEqual([
      {
        kind: 'blockquote',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              { kind: 'text', value: 'Zitat ' },
              { kind: 'strong', value: 'fett' },
            ],
          },
        ],
      },
    ]);
    const deep = parseMarkdown('> > > > vier');
    let level = 0;
    let block = deep[0];
    while (block?.kind === 'blockquote') {
      level += 1;
      block = block.blocks[0];
    }
    expect(level).toBe(3);
  });

  it('parses GFM tables and pads short rows', () => {
    expect(parseMarkdown('| A | B |\n| - | - |\n| 1 |')).toEqual([
      {
        kind: 'table',
        header: [[{ kind: 'text', value: 'A' }], [{ kind: 'text', value: 'B' }]],
        rows: [[[{ kind: 'text', value: '1' }], [{ kind: 'text', value: '' }]]],
      },
    ]);
  });

  it('parses rules, hard breaks, strikethrough and safe links', () => {
    expect(parseMarkdown('oben\n\n***\n\nZeile eins\\\nZeile zwei')).toEqual([
      { kind: 'paragraph', content: [{ kind: 'text', value: 'oben' }] },
      { kind: 'rule' },
      {
        kind: 'paragraph',
        content: [
          { kind: 'text', value: 'Zeile eins' },
          { kind: 'break', value: '' },
          { kind: 'text', value: 'Zeile zwei' },
        ],
      },
    ]);
    expect(
      parseMarkdown('nicht ~~mehr~~ [Foldmark](https://example.org) [x](javascript:1)'),
    ).toEqual([
      {
        kind: 'paragraph',
        content: [
          { kind: 'text', value: 'nicht ' },
          { kind: 'strikethrough', value: 'mehr' },
          { kind: 'text', value: ' ' },
          { kind: 'link', value: 'Foldmark', href: 'https://example.org' },
          { kind: 'text', value: ' [x](javascript:1)' },
        ],
      },
    ]);
  });
});

describe('directives, palette, dates and images (change 0017)', () => {
  it('parses colour directives in both spellings and marks unknown colours', () => {
    expect(
      parseMarkdown(':red[rot] :light-green[grün] :color[blau]{name=blue} :danger[!]'),
    ).toEqual([
      {
        kind: 'paragraph',
        content: [
          { kind: 'color', value: 'rot', color: 'red' },
          { kind: 'text', value: ' ' },
          { kind: 'color', value: 'grün', color: 'light-green' },
          { kind: 'text', value: ' ' },
          { kind: 'color', value: 'blau', color: 'blue' },
          { kind: 'text', value: ' ' },
          { kind: 'color', value: '!', color: 'danger' },
        ],
      },
    ]);
    // Unknown never breaks: `:gold[…]` is its content, marked, with its name kept.
    expect(parseMarkdown(':gold[Wort] und :color[x]{name=gold}')).toEqual([
      {
        kind: 'paragraph',
        content: [
          { kind: 'directive', value: 'Wort', name: 'gold' },
          { kind: 'text', value: ' und ' },
          { kind: 'directive', value: 'x', name: 'color' },
        ],
      },
    ]);
  });

  it('nests formatting inside a container token and keeps the plain value', () => {
    expect(parseMarkdown(':blue[ein **fettes** Wort]')).toEqual([
      {
        kind: 'paragraph',
        content: [
          {
            kind: 'color',
            value: 'ein fettes Wort',
            color: 'blue',
            children: [
              { kind: 'text', value: 'ein ' },
              { kind: 'strong', value: 'fettes' },
              { kind: 'text', value: ' Wort' },
            ],
          },
        ],
      },
    ]);
  });

  it('parses the fixed inline directives and the Pandoc spellings', () => {
    expect(
      parseMarkdown(':highlight[a] :u[b] :small[c] H:sub[2]O x:sup[2] [d]{.red} y^3^ H~2~O'),
    ).toEqual([
      {
        kind: 'paragraph',
        content: [
          { kind: 'highlight', value: 'a' },
          { kind: 'text', value: ' ' },
          { kind: 'underline', value: 'b' },
          { kind: 'text', value: ' ' },
          { kind: 'small', value: 'c' },
          { kind: 'text', value: ' H' },
          { kind: 'sub', value: '2' },
          { kind: 'text', value: 'O x' },
          { kind: 'sup', value: '2' },
          { kind: 'text', value: ' ' },
          { kind: 'color', value: 'd', color: 'red' },
          { kind: 'text', value: ' y' },
          { kind: 'sup', value: '3' },
          { kind: 'text', value: ' H' },
          { kind: 'sub', value: '2' },
          { kind: 'text', value: 'O' },
        ],
      },
    ]);
    // Double tilde is still strikethrough.
    expect(parseMarkdown('~~weg~~')[0]).toEqual({
      kind: 'paragraph',
      content: [{ kind: 'strikethrough', value: 'weg' }],
    });
  });

  it('keeps a colon before a word as text', () => {
    expect(parseMarkdown('Betreff:Antrag um 10:30')).toEqual([
      { kind: 'paragraph', content: [{ kind: 'text', value: 'Betreff:Antrag um 10:30' }] },
    ]);
  });

  it('parses the block catalogue with validated attributes', () => {
    const blocks = parseMarkdown(
      [
        ':::indent{level=2}',
        'Eingerückt.',
        ':::',
        '',
        ':::align{to=right}',
        'Rechts.',
        ':::',
        '',
        ':::note{type=warning}',
        'Achtung **jetzt**.',
        ':::',
        '',
        ':::signature{lines=9}',
        'Max Muster',
        ':::',
        '',
        ':::small',
        'Klein.',
        ':::',
      ].join('\n'),
    );
    expect(
      blocks.map((block) =>
        block.kind === 'directive' ? [block.name, block.attributes] : block.kind,
      ),
    ).toEqual([
      ['indent', { level: '2' }],
      ['align', { to: 'right' }],
      ['note', { type: 'warning' }],
      // 9 is outside 1..6 and falls back to the default.
      ['signature', { lines: '3' }],
      ['small', {}],
    ]);
    const note = blocks[2];
    expect(note.kind === 'directive' && note.known).toBe(true);
    expect(note.kind === 'directive' ? note.blocks : []).toEqual([
      {
        kind: 'paragraph',
        content: [
          { kind: 'text', value: 'Achtung ' },
          { kind: 'strong', value: 'jetzt' },
          { kind: 'text', value: '.' },
        ],
      },
    ]);
  });

  it('reads the page break in every spelling and keeps an unknown block as its content', () => {
    for (const spelling of ['::page-break', '::: page-break', ':::page-break\n:::']) {
      expect(parseMarkdown(`Eins.\n\n${spelling}\n\nZwei.`).map((block) => block.kind)).toEqual([
        'paragraph',
        'pageBreak',
        'paragraph',
      ]);
    }
    expect(parseMarkdown(':::fancy{mode=x}\nInhalt.\n:::')).toEqual([
      {
        kind: 'directive',
        name: 'fancy',
        known: false,
        attributes: {},
        blocks: [{ kind: 'paragraph', content: [{ kind: 'text', value: 'Inhalt.' }] }],
      },
    ]);
    // A fence with a space is the Pandoc habit and is read the same way.
    expect(parseMarkdown('::: note\nHinweis.\n:::')[0]).toMatchObject({
      kind: 'directive',
      name: 'note',
      known: true,
    });
  });

  it('reads an image layout block: width in mm or %, alignment, in any order (R14-015)', () => {
    const image = (source: string) => {
      const [block] = parseMarkdown(source);
      return block?.kind === 'paragraph' ? block.content[0] : undefined;
    };
    expect(image('![a](asset:b){width=50% align=center}')).toEqual({
      kind: 'image',
      value: 'a',
      assetId: 'b',
      widthPercent: 50,
      align: 'center',
    });
    expect(image('![a](asset:b){align="right" width=80mm}')).toEqual({
      kind: 'image',
      value: 'a',
      assetId: 'b',
      widthMm: 80,
      align: 'right',
    });
    expect(image('![a](asset:b){width=100%}')).toEqual({
      kind: 'image',
      value: 'a',
      assetId: 'b',
      widthPercent: 100,
    });
    // `left` is the default and is not reported; unknown attributes and bad values are ignored.
    expect(image('![a](asset:b){align=left foo=bar width=250%}')).toEqual({
      kind: 'image',
      value: 'a',
      assetId: 'b',
    });
    expect(serializeImageLayout({ widthPercent: 50, align: 'center' })).toBe(
      '{width=50% align=center}',
    );
    expect(serializeImageLayout({ widthMm: 60 })).toBe('{width=60mm}');
    expect(serializeImageLayout({ align: 'left' })).toBe('');
    expect(parseImageLayout({ width: '75 %', align: 'CENTER' })).toEqual({
      widthPercent: 75,
      align: 'center',
    });
  });

  it('keeps only local images and their width; anything else is text', () => {
    expect(
      parseMarkdown('![Logo](asset:a1b2){width=60mm} ![x](https://example.org/x.png)'),
    ).toEqual([
      {
        kind: 'paragraph',
        content: [
          { kind: 'image', value: 'Logo', assetId: 'a1b2', widthMm: 60 },
          { kind: 'text', value: ' ![x](https://example.org/x.png)' },
        ],
      },
    ]);
    // An unusable width is ignored, not an error; a data URI is text.
    expect(parseMarkdown('![a](asset:b){width=9999mm} ![c](data:image/png;base64,AAAA)')).toEqual([
      {
        kind: 'paragraph',
        content: [
          { kind: 'image', value: 'a', assetId: 'b' },
          { kind: 'text', value: ' ![c](data:image/png;base64,AAAA)' },
        ],
      },
    ]);
  });

  it('keeps an ordered list start and flattens nesting into depth', () => {
    expect(parseMarkdown('3. drei\n4. vier\n   - a')).toEqual([
      {
        kind: 'list',
        ordered: true,
        start: 3,
        items: [
          { content: [{ kind: 'text', value: 'drei' }], depth: 0 },
          { content: [{ kind: 'text', value: 'vier' }], depth: 0 },
          { content: [{ kind: 'text', value: 'a' }], depth: 1 },
        ],
      },
    ]);
  });
});
