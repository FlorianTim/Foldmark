import { describe, expect, it } from 'vitest';
import { buildRenderPlan } from '@/application/render/buildRenderPlan';
import { dateToken, formatIsoDate, migrateDateTokens, todayIso } from '@/domain/markdown/dateToken';
import { parseMarkdown } from '@/domain/markdown/parseMarkdown';
import { findBuiltInProfile } from '@/domain/print/builtInProfiles';
import { DefaultEmailRenderer } from '@/infrastructure/email/DefaultEmailRenderer';
import { letterFixture } from './helpers/fakes';

describe('date tokens', () => {
  it('stores ISO as a directive and refuses anything else', () => {
    expect(dateToken('2026-09-11')).toBe(':date[2026-09-11]');
    expect(() => dateToken('11.09.2026')).toThrow(RangeError);
    expect(todayIso(new Date(2026, 8, 1))).toBe('2026-09-01');
  });

  it('parse into a date token that every renderer formats in the document language', () => {
    expect(parseMarkdown('Dortmund, :date[2026-09-11]')).toEqual([
      {
        kind: 'paragraph',
        content: [
          { kind: 'text', value: 'Dortmund, ' },
          { kind: 'date', value: '2026-09-11' },
        ],
      },
    ]);
    expect(formatIsoDate('2026-09-11', 'de-DE')).toBe('11. September 2026');
    expect(formatIsoDate('2026-09-11', 'en-GB')).toBe('11 September 2026');
  });

  it('stay in the render plan source; the paper formats them where they are drawn', () => {
    const document = letterFixture({
      locale: 'de-DE',
      bodyMarkdown: `Dortmund, :date[2026-09-11]\n\nText.`,
    });
    const plan = buildRenderPlan({
      document,
      profile: findBuiltInProfile('din5008-b')!,
      target: 'print',
      mode: 'paper',
    });
    const body = plan.pages[0].blocks.find((block) => block.kind === 'markdown');
    expect(body && 'source' in body ? body.source : '').toContain('Dortmund, :date[2026-09-11]');
    expect(plan.locale).toBe('de-DE');
  });

  it('are rendered in the document language in email bodies', () => {
    const document = letterFixture({
      locale: 'en-GB',
      bodyMarkdown: 'Sent on :date[2026-09-11].',
    });
    const renderer = new DefaultEmailRenderer();
    expect(renderer.renderPlainText({ document })).toContain('Sent on 11 September 2026.');
    expect(renderer.renderHtml({ document })).toContain('Sent on 11 September 2026.');
  });

  it('migrate the 1.1 token and leave malformed ones alone', () => {
    expect(migrateDateTokens('{{date:2026-09-11}} {{date:heute}} {{date:2026-9-1}}')).toBe(
      ':date[2026-09-11] {{date:heute}} {{date:2026-9-1}}',
    );
    // The parser reads the old spelling too, so a stored 1.1 body renders before it is re-saved.
    expect(parseMarkdown('Am {{date:2026-09-11}}.')[0]).toEqual({
      kind: 'paragraph',
      content: [
        { kind: 'text', value: 'Am ' },
        { kind: 'date', value: '2026-09-11' },
        { kind: 'text', value: '.' },
      ],
    });
    // A date directive whose content is not a date shows what it says.
    expect(parseMarkdown(':date[heute]')[0]).toEqual({
      kind: 'paragraph',
      content: [{ kind: 'text', value: 'heute' }],
    });
  });
});
