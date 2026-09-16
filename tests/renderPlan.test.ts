import { describe, expect, it } from 'vitest';
import {
  buildRenderPlan,
  formatDocumentDate,
  paginateBody,
} from '@/application/render/buildRenderPlan';
import { referencedAssetIds, visibleScreenMarkers } from '@/application/render/RenderPlan';
import { markdownHeightMm, splitParagraphs } from '@/application/render/textMetrics';
import { createSenderProfile } from '@/domain/address/SenderProfile';
import type { DocumentAsset } from '@/domain/asset/DocumentAsset';
import { parseMarkdown } from '@/domain/markdown/parseMarkdown';
import { findBuiltInProfile } from '@/domain/print/builtInProfiles';
import { letterFixture } from './helpers/fakes';

const din5008B = findBuiltInProfile('din5008-b')!;
const a4Blank = findBuiltInProfile('a4-blank')!;
const postcard = findBuiltInProfile('postcard-a6-landscape-duplex')!;

const sender = createSenderProfile({
  name: 'Privat',
  postal: {
    person: 'Florian Beispiel',
    street: 'Lambrostraße 1',
    postalCode: '10115',
    city: 'Berlin',
  },
  footerLines: ['IBAN DE00 0000', 'USt-IdNr. DE000000000'],
});

describe('the render plan', () => {
  it('places the fold and punch marks at their stored physical coordinates', () => {
    const plan = buildRenderPlan({
      document: letterFixture(),
      profile: din5008B,
      target: 'print',
      mode: 'paper',
    });

    expect(plan.pages[0].markers.map((marker) => marker.yMm)).toEqual([105, 148.5, 210]);
    expect(plan.includesPhysicalMarks).toBe(true);
  });

  it('is identical whichever zoom the preview happens to use', () => {
    // Zoom lives in the preview as a CSS transform and never reaches the plan.
    // This test is the guard: the plan has no notion of scale at all, so the
    // same inputs must produce a byte-identical structure every time.
    const input = {
      document: letterFixture(),
      profile: din5008B,
      target: 'print' as const,
      mode: 'paper' as const,
    };
    expect(JSON.stringify(buildRenderPlan(input))).toBe(JSON.stringify(buildRenderPlan(input)));
  });

  it('is a pure function — no clock, no randomness', () => {
    const document = letterFixture();
    const first = buildRenderPlan({ document, profile: din5008B, target: 'print', mode: 'paper' });
    const second = buildRenderPlan({ document, profile: din5008B, target: 'print', mode: 'paper' });
    expect(first).toEqual(second);
  });

  it('suppresses printed marks for the email PDF by default', () => {
    const plan = buildRenderPlan({
      document: letterFixture(),
      profile: din5008B,
      target: 'email-pdf',
      mode: 'paper',
    });
    expect(plan.includesPhysicalMarks).toBe(false);
    expect(plan.pages[0].markers).toEqual([]);
  });

  it('honours a document that asks for marks in its email PDF', () => {
    const document = letterFixture();
    const plan = buildRenderPlan({
      document: {
        ...document,
        exportPreferences: { ...document.exportPreferences, emailPdfIncludesPhysicalMarks: true },
      },
      profile: din5008B,
      target: 'email-pdf',
      mode: 'paper',
    });
    expect(plan.includesPhysicalMarks).toBe(true);
    expect(plan.pages[0].markers).toHaveLength(3);
  });

  it('draws preview-only guides on screen and never on paper', () => {
    const screen = buildRenderPlan({
      document: letterFixture({ kind: 'postcard' }),
      profile: postcard,
      target: 'print',
      mode: 'screen',
    });
    const paper = buildRenderPlan({
      document: letterFixture({ kind: 'postcard' }),
      profile: postcard,
      target: 'print',
      mode: 'paper',
    });

    expect(screen.pages[0].markers.map((marker) => marker.id)).toContain('safe');
    expect(paper.pages.flatMap((page) => page.markers).map((marker) => marker.id)).not.toContain(
      'safe',
    );
  });

  describe('the preview guides toggle', () => {
    // Two switches (R13-004): the guides toggle governs preview-only guides,
    // the document's printed-marks preference governs the ink — on screen and
    // on paper alike. The paper plan is built without ever seeing the toggle.
    const screen = buildRenderPlan({
      document: letterFixture({ kind: 'postcard' }),
      profile: postcard,
      target: 'print',
      mode: 'screen',
    });
    const paper = buildRenderPlan({
      document: letterFixture({ kind: 'postcard' }),
      profile: postcard,
      target: 'print',
      mode: 'paper',
    });
    const ids = (markers: readonly { id: string }[]) => markers.map((marker) => marker.id);

    it('shows preview-only guides and printed marks alike when guides are on', () => {
      const [front, back] = screen.pages;
      const frontShown = visibleScreenMarkers(front, true);
      const backShown = visibleScreenMarkers(back, true);

      expect(ids(frontShown)).toContain('safe');
      expect(frontShown.every((marker) => !marker.print)).toBe(true);
      expect(ids(backShown)).toContain('divider');
      expect(backShown.some((marker) => marker.print)).toBe(true);
      expect(frontShown).toEqual(front.markers);
      expect(backShown).toEqual(back.markers);
    });

    it('keeps printed marks on screen when guides are off — they are ink, not guides', () => {
      const [front, back] = screen.pages;
      expect(visibleScreenMarkers(front, false)).toEqual([]);
      expect(ids(visibleScreenMarkers(back, false))).toEqual(['divider']);
    });

    it('takes a printed mark off the screen when the document prints without marks', () => {
      const plan = buildRenderPlan({
        document: letterFixture({
          kind: 'postcard',
          exportPreferences: {
            ...letterFixture().exportPreferences,
            pdfIncludesPhysicalMarks: false,
          },
        }),
        profile: postcard,
        target: 'print',
        mode: 'screen',
      });
      const back = plan.pages[1];
      expect(ids(back.markers)).not.toContain('divider');
      expect(ids(back.markers)).toContain('safe');
      expect(visibleScreenMarkers(back, false)).toEqual([]);
    });

    it('never draws a marker the profile keeps off screen, whatever the toggle', () => {
      // print: true, preview: false — a mark that reaches the paper but is not
      // meant to be seen on screen, e.g. a cut line hidden from the preview.
      const hidden = { ...postcard.markers[0], id: 'cut-hidden', preview: false, print: true };
      const profile = { ...postcard, markers: [...postcard.markers, hidden] };
      const plan = buildRenderPlan({
        document: letterFixture({ kind: 'postcard' }),
        profile,
        target: 'print',
        mode: 'screen',
      });

      expect(ids(visibleScreenMarkers(plan.pages[0], true))).not.toContain('cut-hidden');
      expect(ids(visibleScreenMarkers(plan.pages[0], false))).not.toContain('cut-hidden');
    });

    it('leaves the paper plan untouched in both toggle states', () => {
      const printed = ids(paper.pages.flatMap((page) => page.markers));
      expect(printed).toContain('divider');
      expect(printed).not.toContain('safe');
      // The paper plan takes no toggle input at all; the type is the guarantee.
      expect(paper.includesPhysicalMarks).toBe(true);
    });
  });

  it('places the recipient in the address window, with the sender return line above it', () => {
    const plan = buildRenderPlan({
      document: letterFixture(),
      profile: din5008B,
      target: 'print',
      mode: 'paper',
      sender,
    });

    const block = plan.pages[0].blocks.find(
      (candidate) => candidate.kind === 'lines' && candidate.region === 'addressWindow',
    );
    expect(block).toBeDefined();
    if (block?.kind !== 'lines') return;

    expect(block.lines[0]).toContain('Florian Beispiel');
    expect(block.lines).toContain('Stadt Beispielstadt');
    expect(block.box).toEqual({ xMm: 20, yMm: 45, widthMm: 85, heightMm: 45, surface: 'all' });
  });

  it('reports when a profile has no address field at all', () => {
    const plan = buildRenderPlan({
      document: letterFixture({ printProfileId: 'a4-blank' }),
      profile: a4Blank,
      target: 'print',
      mode: 'paper',
    });
    expect(plan.issues.some((issue) => issue.code === 'render.noAddressRegion')).toBe(true);
  });

  it('renders both postcard surfaces, front first', () => {
    const document = letterFixture({
      kind: 'postcard',
      printProfileId: postcard.id,
      surfaces: {
        front: { caption: 'Viele Grüße!' },
        back: { text: 'Liebe Erika,\n\nsonnige Grüße.' },
      },
    });
    const plan = buildRenderPlan({ document, profile: postcard, target: 'print', mode: 'paper' });

    expect(plan.pages).toHaveLength(2);
    expect(plan.pages[0].surface).toBe('front');
    expect(plan.pages[1].surface).toBe('back');

    const backRegions = plan.pages[1].blocks.map((block) => block.region);
    expect(backRegions).toContain('message');
    expect(backRegions).toContain('address');

    const frontRegions = plan.pages[0].blocks.map((block) => block.region);
    expect(frontRegions).toContain('caption');
    expect(frontRegions).not.toContain('address');
  });

  it('reports a missing asset instead of rendering a hole', () => {
    const document = letterFixture({
      assetPlacements: [
        {
          id: 'p1',
          assetId: 'gone',
          surface: 'all',
          xMm: 10,
          yMm: 10,
          widthMm: 40,
          rotationDeg: 0,
          opacity: 1,
          layer: 'content',
          fit: 'contain',
        },
      ],
    });
    const plan = buildRenderPlan({
      document,
      profile: din5008B,
      target: 'print',
      mode: 'paper',
      assets: [],
    });
    expect(plan.issues.some((issue) => issue.code === 'render.assetMissing')).toBe(true);
    expect(referencedAssetIds(plan)).toEqual([]);
  });

  it('warns when a placed image is too coarse for its printed size', () => {
    const asset: DocumentAsset = {
      id: 'photo',
      kind: 'image',
      mimeType: 'image/jpeg',
      byteSize: 1_000,
      checksum: 'a'.repeat(64),
      widthPx: 400,
      heightPx: 300,
      createdAt: '2026-08-03T10:00:00.000Z',
    };
    const document = letterFixture({
      assetPlacements: [
        {
          id: 'p1',
          assetId: 'photo',
          surface: 'all',
          xMm: 10,
          yMm: 10,
          widthMm: 150,
          rotationDeg: 0,
          opacity: 1,
          layer: 'content',
          fit: 'contain',
        },
      ],
    });
    const plan = buildRenderPlan({
      document,
      profile: din5008B,
      target: 'print',
      mode: 'paper',
      assets: [asset],
    });
    expect(plan.issues.some((issue) => issue.code === 'render.imageResolutionLow')).toBe(true);
    expect(referencedAssetIds(plan)).toEqual(['photo']);
  });

  it('lists the assets of body images so the preview can resolve them (R13-002)', () => {
    const document = letterFixture({
      bodyMarkdown: [
        'Ein Bild:',
        '',
        '![Logo](asset:logo-1){width=40mm}',
        '',
        ':::note',
        'Und eines im Kasten: ![Foto](asset:photo-2)',
        ':::',
        '',
        '::page-break',
        '',
        '| a | b |',
        '| - | - |',
        '| ![x](asset:cell-3) | ![remote](https://example.org/x.png) |',
      ].join('\n'),
    });
    const plan = buildRenderPlan({ document, profile: din5008B, target: 'print', mode: 'screen' });
    expect(referencedAssetIds(plan)).toEqual(['logo-1', 'photo-2', 'cell-3']);
  });

  it('formats the document date in the document language, in UTC', () => {
    expect(formatDocumentDate('2026-08-03', 'de-DE')).toBe('3. August 2026');
    expect(formatDocumentDate('2026-08-03', 'en-GB')).toBe('3 August 2026');
    expect(formatDocumentDate('not-a-date', 'de-DE')).toBe('not-a-date');
  });
});

describe('pagination', () => {
  const bodyBox = { xMm: 25, yMm: 105, widthMm: 165, heightMm: 167 };
  const continuation = { xMm: 25, yMm: 45, widthMm: 165, heightMm: 232 };

  it('keeps a short letter on one page', () => {
    expect(paginateBody('Kurzer Text.', bodyBox, continuation)).toHaveLength(1);
  });

  it('splits a long letter across pages at paragraph boundaries', () => {
    const paragraph = 'Ein Absatz mit einigem Text, der über mehrere Zeilen läuft. '.repeat(6);
    const source = Array.from({ length: 30 }, () => paragraph).join('\n\n');
    const pages = paginateBody(source, bodyBox, continuation);

    expect(pages.length).toBeGreaterThan(1);
    // Nothing is lost and nothing is duplicated.
    expect(pages.join('\n\n').replaceAll(/\s+/gu, ' ').trim()).toBe(
      source.replaceAll(/\s+/gu, ' ').trim(),
    );
  });

  it('gives every page content that fits the box it was assigned', () => {
    const paragraph = 'Absatz. '.repeat(30);
    const source = Array.from({ length: 20 }, () => paragraph).join('\n\n');
    const pages = paginateBody(source, bodyBox, continuation);

    for (const [index, page] of pages.entries()) {
      const box = index === 0 ? bodyBox : continuation;
      expect(markdownHeightMm(page, 'body', box.widthMm)).toBeLessThanOrEqual(box.heightMm + 0.01);
    }
  });

  it('renders an over-long single paragraph rather than dropping it', () => {
    const monster = 'x'.repeat(40_000);
    const pages = paginateBody(monster, bodyBox, continuation);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toBe(monster);
  });

  it('reports the overflow it could not solve', () => {
    const document = letterFixture({ bodyMarkdown: 'x'.repeat(40_000) });
    const plan = buildRenderPlan({
      document,
      profile: din5008B,
      target: 'print',
      mode: 'paper',
    });
    expect(plan.issues.some((issue) => issue.code === 'render.bodyOverflow')).toBe(true);
  });

  it('counts the same blocks the preview parser produces', () => {
    // The slices are the parser's own block sources (change 0016): a wrapped
    // paragraph keeps its line break, a list is split into its items.
    const source = '# Überschrift\n\nEin Absatz\nüber zwei Zeilen.\n\n- eins\n- zwei';
    expect(splitParagraphs(source)).toEqual([
      '# Überschrift',
      'Ein Absatz\nüber zwei Zeilen.',
      '- eins',
      '- zwei',
    ]);
    // The same count as the preview's blocks, list items counted individually.
    const blocks = parseMarkdown(source);
    const rendered = blocks.reduce(
      (total, block) => total + (block.kind === 'list' ? block.items.length : 1),
      0,
    );
    expect(splitParagraphs(source)).toHaveLength(rendered);
  });

  it('keeps the number of a sliced ordered list item and honours a page break (change 0017)', () => {
    expect(splitParagraphs('1. eins\n2. zwei\n3. drei')).toEqual(['1. eins', '2. zwei', '3. drei']);
    expect(splitParagraphs('3. drei\n4. vier')).toEqual(['3. drei', '4. vier']);
    const box = { xMm: 0, yMm: 0, widthMm: 160, heightMm: 200 };
    expect(paginateBody('Eins.\n\n::page-break\n\nZwei.', box, box)).toEqual(['Eins.', 'Zwei.']);
    // A break at the very top or two in a row never yield an empty page.
    expect(
      paginateBody('::page-break\n\nEins.\n\n::page-break\n\n::page-break\n\nZwei.', box, box),
    ).toEqual(['Eins.', 'Zwei.']);
    // A trailing break opens no page (R14-002, superseding R13-006): a blank
    // sheet needs its own command, and a one-page letter prints one sheet.
    expect(paginateBody('Eins.\n\n::page-break', box, box)).toEqual(['Eins.']);
    expect(paginateBody('Eins.\n\n::page-break\n\n::page-break', box, box)).toEqual(['Eins.']);
    expect(paginateBody('::page-break', box, box)).toEqual([]);
  });

  it('prints a one-page letter on exactly one sheet, with or without a trailing break (R14-002)', () => {
    for (const body of ['Nur ein Absatz.', 'Nur ein Absatz.\n\n::page-break']) {
      const plan = buildRenderPlan({
        document: letterFixture({ bodyMarkdown: body }),
        profile: din5008B,
        target: 'print',
        mode: 'paper',
      });
      expect(plan.pages).toHaveLength(1);
    }
  });

  it('turns paragraph / page break / paragraph into two rendered pages (R13-006)', () => {
    const plan = buildRenderPlan({
      document: letterFixture({ bodyMarkdown: 'Absatz eins.\n\n::page-break\n\nAbsatz zwei.' }),
      profile: din5008B,
      target: 'print',
      mode: 'paper',
    });
    expect(plan.pages).toHaveLength(2);
    const bodies = plan.pages.map(
      (page) => page.blocks.find((block) => block.kind === 'markdown')?.source,
    );
    expect(bodies).toEqual(['Absatz eins.', 'Absatz zwei.']);
  });
});
