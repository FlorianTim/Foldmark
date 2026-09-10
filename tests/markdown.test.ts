import { describe, expect, it } from 'vitest';
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
        items: [[{ kind: 'text', value: 'first' }], [{ kind: 'code', value: 'second' }]],
      },
    ]);
  });

  it('keeps HTML, links and malformed delimiters as inert text', () => {
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

  it('parses headings and caps the level at three', () => {
    expect(parseMarkdown('# One\n## Two\n#### Deep')).toEqual([
      { kind: 'heading', level: 1, content: [{ kind: 'text', value: 'One' }] },
      { kind: 'heading', level: 2, content: [{ kind: 'text', value: 'Two' }] },
      { kind: 'heading', level: 3, content: [{ kind: 'text', value: 'Deep' }] },
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
