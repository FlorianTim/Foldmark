import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The journeys that have to work for Foldmark to be worth using.
 *
 * These are deliberately end-to-end rather than component tests: the product
 * claim is "what you see is what the printer receives", and that claim spans
 * the domain, the render plan, the stylesheet and the browser's own layout. The
 * only place it can be checked is a real page.
 */

/**
 * Leaves the first-visit intro.
 *
 * Skip is on every step and has the same effect as finishing, so a test does
 * not have to know how many steps the intro currently has.
 */
async function dismissIntro(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: /überspringen|skip/i });
  if (await skip.isVisible()) await skip.click();
}

/** Creates a document of one kind through the "+ New" menu (change 0024). */
async function newDocument(page: Page, kind: RegExp): Promise<void> {
  await page.getByRole('menuitem', { name: /^\+ neu$|^\+ new$/i }).click();
  await page.getByRole('menuitem', { name: kind }).click();
}

/** Creates a letter and waits for the workspace to be ready. */
async function newLetter(page: Page): Promise<void> {
  await newDocument(page, /^brief$|^letter$/i);
  await expect(page.getByRole('button', { name: /schließen|close/i })).toBeVisible();
}

/** Opens the action menu of one file-manager row. */
async function rowMenu(page: Page, name: RegExp): Promise<void> {
  await page.getByRole('button', { name }).click();
  await expect(page.getByRole('menu')).toBeVisible();
}

/**
 * Makes one of the three areas visible. On a wide viewport all three are on
 * screen and the tabs do not exist; on a narrow one the area is a tab.
 */
async function mode(page: Page, name: 'document' | 'write' | 'preview'): Promise<void> {
  const label = {
    document: /dokumenteinstellungen|document settings/i,
    write: /schreibbereich|writing area/i,
    preview: /^vorschau$|^preview$/i,
  }[name];
  const tabs = page.getByRole('tablist', { name: /arbeitsbereich|workspace/i });
  if (await tabs.count()) {
    await tabs.getByRole('tab', { name: label }).click();
    return;
  }
  // A folded pane is expanded through its rail.
  const rail = page.locator(`.workspace-rail[data-pane="${name}"]`);
  if (await rail.isVisible()) await rail.getByRole('button').click();
}

/**
 * Puts the body editor into one of its two views through the mode switch
 * (R14-006): `aria-checked` is true for the Markdown source.
 */
async function editorView(page: Page, view: 'visual' | 'source'): Promise<void> {
  const toggle = page.getByTestId('view-switch');
  const checked = (await toggle.getAttribute('aria-checked')) === 'true';
  if (checked !== (view === 'source')) await toggle.click();
  if (view === 'source') {
    await expect(page.getByLabel(/brieftext in markdown|letter body in markdown/i)).toBeVisible();
  } else {
    await expect(page.locator('.rich-host .ProseMirror')).toBeVisible();
  }
}

/** Switches the body editor to the Markdown source view (a textarea the tests can fill). */
async function sourceView(page: Page): Promise<void> {
  await editorView(page, 'source');
}

/**
 * Selects a one-line block's text with the keyboard — caret at the end, then
 * Shift+Home — and waits until the browser reports the selection. A
 * triple-click right after a toolbar button proved unreliable in headless
 * Chromium; the keys are what the browser itself handles.
 */
async function selectText(page: Page, block: Locator, text: string): Promise<void> {
  await block.click();
  await page.keyboard.press('End');
  await page.keyboard.press('Shift+Home');
  await expect.poll(() => page.evaluate(() => String(getSelection() ?? ''))).toContain(text);
}

/** Opens one of the three output dialogs (change 0019). */
async function openOutput(page: Page, which: 'print' | 'export' | 'email'): Promise<void> {
  await page.getByTestId(`open-${which}`).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

/** The millimetre offsets of the marks currently drawn on the preview sheet. */
async function markerOffsets(page: Page): Promise<string[]> {
  return page
    .locator('.preview-sheet .print-marker')
    .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).style.top));
}

test.describe('Foldmark', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await dismissIntro(page);
  });

  test('shows the empty state and creates the first letter', async ({ page }) => {
    await expect(page.getByText(/noch keine dokumente|no documents yet/i)).toBeVisible();
    await newLetter(page);
    await expect(page.locator('.preview-sheet .paper').first()).toBeVisible();
  });

  test('renders the DIN-style fold and punch marks at their physical coordinates', async ({
    page,
  }) => {
    await newLetter(page);
    // The whole product in one assertion: the marks are positioned in CSS
    // millimetres taken straight from the print profile.
    expect(await markerOffsets(page)).toEqual(['105mm', '148.5mm', '210mm']);

    const paper = page.locator('.preview-sheet .paper').first();
    await expect(paper).toHaveAttribute('style', /210mm/);
    await expect(paper).toHaveAttribute('style', /297mm/);
  });

  test('keeps printed marks independent of the guides toggle, on screen and on paper', async ({
    page,
  }) => {
    await newLetter(page);
    const before = await markerOffsets(page);
    expect(before).toEqual(['105mm', '148.5mm', '210mm']);

    // Guides are preview-only helpers; the DIN-style marks are ink and stay (R13-004).
    await page.getByRole('button', { name: /hilfslinien ausblenden|hide guides/i }).click();
    expect(await markerOffsets(page)).toEqual(before);
    await expect(page.locator('.print-root .print-marker')).toHaveCount(3);
    await page.getByRole('button', { name: /hilfslinien einblenden|show guides/i }).click();

    // The printed-marks switch is the document's decision and reaches both copies.
    await page.getByRole('checkbox', { name: /druckmarken|printed marks/i }).uncheck();
    expect(await markerOffsets(page)).toEqual([]);
    await expect(page.locator('.print-root .print-marker')).toHaveCount(0);
    await page.getByRole('checkbox', { name: /druckmarken|printed marks/i }).check();
    expect(await markerOffsets(page)).toEqual(before);
    await expect(page.locator('.print-root .print-marker')).toHaveCount(3);
  });

  test('shows an image from the library in the editor, the preview and the print copy', async ({
    page,
  }) => {
    // A 400 × 300 PNG drawn on a canvas and handed to the library's file input.
    await page.getByRole('button', { name: /^bilder$|^images$/i }).click();
    await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('no canvas');
      context.fillStyle = '#174a5b';
      context.fillRect(0, 0, 400, 300);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('no blob');
      const input = document.querySelector<HTMLInputElement>('input[type=file]');
      if (!input) throw new Error('no input');
      const transfer = new DataTransfer();
      transfer.items.add(new File([blob], 'demo.png', { type: 'image/png' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('.asset-card')).toHaveCount(1);

    await page.getByRole('button', { name: /^dokumente$|^documents$/i }).click();
    await newLetter(page);
    await mode(page, 'write');
    await editorView(page, 'visual');
    const editor = page.locator('.rich-host .ProseMirror');
    await editor.click();
    await page.keyboard.type('Ein Bild:');
    await page.keyboard.press('Enter');

    // The image dialog: the library shows a thumbnail, title, dimensions and size (AC-ASSET-003).
    await page.getByTestId('editor-image').click();
    await page.locator('.image-choice').first().click();
    await expect(page.getByTestId('image-preview')).toContainText('400 × 300 px');
    await expect(page.getByTestId('image-preview').locator('img')).toHaveAttribute('src', /^blob:/);
    await page.getByTestId('image-width').fill('80');
    await page.getByTestId('image-insert').click();

    // Visible in all three places, resolved to the same local bytes (R13-002).
    await expect(editor.locator('img.md-image')).toHaveAttribute('src', /^blob:/);
    await expect(page.locator('.preview-sheet img.md-image').first()).toHaveAttribute(
      'src',
      /^blob:/,
    );
    await expect(page.locator('.print-root img.md-image')).toHaveCount(1);
    await expect(page.locator('.md-image-missing')).toHaveCount(0);

    // Alignment and size from the image toolbar (R14-015): the file spells it as
    // an attribute block, and preview and print copy draw the same.
    await editor.locator('img.md-image').click();
    await expect(page.getByTestId('image-align-center')).toBeVisible();
    await page.getByTestId('image-align-center').click();
    await page.getByTestId('image-size-50').click();
    await expect(page.getByTestId('image-size-label')).toHaveText('50 %');
    await expect(editor.locator('img.md-image')).toHaveAttribute('data-align', 'center');
    const printed = page.locator('.print-root img.md-image');
    await expect(printed).toHaveClass(/md-image-align-center/);
    await expect(printed).toHaveCSS('margin-left', /^(?!0px)/);
    await expect(printed).toHaveAttribute('style', /width: 50%/);
    await editorView(page, 'source');
    await expect(page.getByLabel(/brieftext in markdown|letter body in markdown/i)).toHaveValue(
      /!\[[^\]]*\]\(asset:[^)]+\)\{width=50% align=center\}/,
    );
    await editorView(page, 'visual');

    // And after a save and reload.
    await page.getByRole('button', { name: /^speichern$|^save$/i }).click();
    await expect(page.locator('.save-status')).toHaveText(/gespeichert ·|saved ·/i);
    await page.reload();
    await page.locator('.document-open').first().click();
    await expect(page.locator('.preview-sheet img.md-image').first()).toHaveAttribute(
      'src',
      /^blob:/,
    );
  });

  test('hides every dialog in the print medium so Chrome prints only the paper', async ({
    page,
  }) => {
    await newLetter(page);
    await openOutput(page, 'print');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.emulateMedia({ media: 'print' });
    // The open modal is not part of the printed page; the print copy is. The
    // shell is hidden as a whole (R14-001), so its parts are checked for
    // being laid out, not for their own `display`.
    await expect(page.locator('dialog[open]')).toBeHidden();
    await expect(page.locator('.print-root')).toHaveCSS('display', 'block');
    await expect(page.locator('.workspace-grid')).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
  });

  test('prints nothing but the paper, even with the Format menu open (R14-001)', async ({
    page,
  }) => {
    await newLetter(page);
    await page.getByRole('menuitem', { name: /^format$/i }).click();
    await expect(page.getByRole('menu', { name: /^format$/i })).toBeVisible();

    await page.emulateMedia({ media: 'print' });
    // Print isolation: of everything under `body`, only the print copy is laid out.
    const visible = await page.evaluate(() =>
      Array.from(document.body.children)
        .filter((node) => getComputedStyle(node).display !== 'none')
        .map((node) => node.className),
    );
    expect(visible).toEqual(['print-root']);
    await expect(page.locator('.app-menu')).toBeHidden();
    await expect(page.locator('.rich-toolbar')).toBeHidden();
    // A one-page letter is one sheet — no blank second page.
    await expect(page.locator('.print-root .paper')).toHaveCount(1);
    await page.emulateMedia({ media: 'screen' });
  });

  test('zooming never moves a mark', async ({ page }) => {
    await newLetter(page);
    const before = await markerOffsets(page);

    for (const label of [/100 %/, /breite|width/i, /ganze seite|whole page/i]) {
      await page.getByRole('button', { name: label }).click();
      expect(await markerOffsets(page)).toEqual(before);
    }
  });

  test('files a letter in a folder, archives it and brings it back (change 0024)', async ({
    page,
  }) => {
    await newLetter(page);
    await page.getByRole('button', { name: /schließen|close/i }).click();

    // A folder from the "+ New" menu; the letter is moved into it.
    await newDocument(page, /^ordner$|^folder$/i);
    await page.getByTestId('prompt-value').fill('Versicherungen');
    await page.getByRole('button', { name: /^anlegen$|^create$/i }).click();
    const folderRow = page.locator('.file-row-folder', { hasText: 'Versicherungen' });
    await expect(folderRow).toBeVisible();

    await rowMenu(page, /aktionen für neuer brief|actions for new letter/i);
    await page.getByRole('menuitem', { name: /^verschieben$|^move$/i }).click();
    await page.getByTestId('move-target').selectOption({ label: 'Versicherungen' });
    await page.getByTestId('move-confirm').click();
    await expect(page.locator('.file-row', { hasText: /neuer brief|new letter/i })).toHaveCount(0);

    // Down the folder: the breadcrumb shows the path, the row shows the folder.
    await folderRow.getByRole('button', { name: 'Versicherungen', exact: true }).click();
    await expect(page.getByRole('navigation', { name: /ordnerpfad|folder path/i })).toContainText(
      'Versicherungen',
    );
    const letterRow = page.locator('.file-row', { hasText: /neuer brief|new letter/i });
    await expect(letterRow).toContainText('Versicherungen');

    // Archived: gone from the folder, listed in the archive, back after a restore.
    await rowMenu(page, /aktionen für neuer brief|actions for new letter/i);
    await page.getByRole('menuitem', { name: /^archivieren$|^archive$/i }).click();
    await expect(letterRow).toHaveCount(0);
    await page.getByTestId('toggle-archive').click();
    await expect(page.getByRole('heading', { name: /^archiv$|^archive$/i })).toBeVisible();
    await expect(letterRow).toBeVisible();
    await rowMenu(page, /aktionen für neuer brief|actions for new letter/i);
    await page.getByRole('menuitem', { name: /^wiederherstellen$|^restore$/i }).click();
    await expect(page.getByText(/nichts archiviert|nothing archived/i)).toBeVisible();

    // The archive stamp is not an edit: no version was written for it.
    await page.getByTestId('toggle-archive').click();
    await expect(letterRow).toBeVisible();

    // Deleting the folder keeps its content and moves it up one level.
    await page
      .getByRole('navigation', { name: /ordnerpfad|folder path/i })
      .getByRole('button')
      .first()
      .click();
    await rowMenu(page, /aktionen für versicherungen|actions for versicherungen/i);
    await page.getByRole('menuitem', { name: /^löschen$|^delete$/i }).click();
    await page.getByTestId('confirm').click();
    await expect(folderRow).toHaveCount(0);
    await expect(letterRow).toBeVisible();
  });

  test('keeps a letter, its recipient and its body across a reload', async ({ page }) => {
    await newLetter(page);

    await page.getByLabel(/^titel$|^title$/i).fill('Antrag auf Bescheinigung');
    await page.getByLabel(/organisation|organization/i).fill('Stadt Beispielstadt');
    await page.getByLabel(/straße und hausnummer|street and number/i).fill('Rathausplatz 1');
    await page.getByLabel(/^plz$|postal code/i).fill('12345');
    await page.getByLabel(/^ort$|^city$/i).fill('Beispielstadt');
    await mode(page, 'write');
    await sourceView(page);
    await page
      .getByLabel(/brieftext in markdown|letter body in markdown/i)
      .fill('Sehr geehrte Damen und Herren,\n\nhiermit beantrage ich eine Bescheinigung.');

    await expect(page.locator('.save-status')).toHaveText(/nicht gespeichert|unsaved/i);
    await page.getByRole('button', { name: /^speichern$|^save$/i }).click();
    await expect(page.locator('.save-status')).toHaveText(
      /gespeichert · \d{2}:\d{2}|saved · \d{2}:\d{2}/i,
    );

    await page.reload();
    await page.getByRole('button', { name: /^antrag auf bescheinigung/i }).click();

    // The workspace remembers the last mode; the title lives in Document mode.
    await mode(page, 'document');
    await expect(page.getByLabel(/^titel$|^title$/i)).toHaveValue('Antrag auf Bescheinigung');
    await expect(page.locator('.paper-block').first()).toContainText('Stadt Beispielstadt');
    await expect(page.locator('.preview-pages')).toContainText('hiermit beantrage ich');
  });

  test('keeps unsaved work in an automatic copy and offers it after a reload', async ({ page }) => {
    await newLetter(page);
    await page.getByLabel(/^titel$|^title$/i).fill('Nicht gespeichert, aber da');
    // The working copy is written two seconds after the last change.
    await expect(page.locator('.save-status')).toHaveText(/entwurf gesichert|draft saved/i, {
      timeout: 6_000,
    });

    await page.reload();
    // The list still shows the stored title; the newer title lives in the copy.
    await page.locator('.document-open').first().click();
    await expect(
      page.getByText(/automatisch gesicherten stand|automatically saved state/i),
    ).toBeVisible();
    await page.getByRole('button', { name: /weiterarbeiten|continue from it/i }).click();
    await mode(page, 'document');
    await expect(page.getByLabel(/^titel$|^title$/i)).toHaveValue('Nicht gespeichert, aber da');
  });

  test('lists saved versions and restores one without losing the current', async ({ page }) => {
    await newLetter(page);
    await page.getByLabel(/^titel$|^title$/i).fill('Fassung eins');
    await page.getByRole('button', { name: /^speichern$|^save$/i }).click();
    await expect(page.locator('.save-status')).toHaveText(/gespeichert ·|saved ·/i);
    await page.getByLabel(/^titel$|^title$/i).fill('Fassung zwei');
    await page.getByRole('button', { name: /^speichern$|^save$/i }).click();
    await expect(page.locator('.save-status')).toHaveText(/gespeichert ·|saved ·/i);

    await page.getByRole('button', { name: /^verlauf$|^history$/i }).click();
    const dialog = page.getByRole('dialog', { name: /dokumentverlauf|document history/i });
    await expect(dialog.locator('.history-entry')).toHaveCount(2);

    // The older entry is listed last; restoring it keeps "Fassung zwei" as a version.
    await dialog
      .locator('.history-entry')
      .last()
      .getByRole('button', { name: /wiederherstellen|restore/i })
      .click();
    await expect(dialog.getByText(/wiederhergestellt|restored/i)).toBeVisible();
    // "Fassung zwei" was already the newest checkpoint, so nothing new is
    // written — and nothing is lost: both versions stay listed.
    await expect(dialog.locator('.history-entry')).toHaveCount(2);
    await dialog
      .getByRole('button', { name: /schließen|close/i })
      .first()
      .click();
    await expect(page.getByLabel(/^titel$|^title$/i)).toHaveValue('Fassung eins');
  });

  test('writes in the visual editor and reads the same Markdown back in the source view', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await newLetter(page);
    await mode(page, 'write');
    await editorView(page, 'visual');

    const editor = page.locator('.rich-host .ProseMirror');
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('Sehr geehrte Damen und Herren,');
    await page.keyboard.press('Enter');
    await page.keyboard.type('hiermit ');
    await page.keyboard.press('Control+b');
    await page.keyboard.type('fett');
    await page.keyboard.press('Control+b');
    await page.keyboard.type(' bestellt.');

    // The preview renders the same body the editor holds.
    await expect(page.locator('.preview-pages')).toContainText('hiermit fett bestellt.');
    await expect(page.locator('.preview-sheet strong')).toHaveText('fett');

    // Undo is real history, not a re-parse.
    await expect(page.getByRole('button', { name: /rückgängig|undo/i })).toBeEnabled();

    // Convenience commands: today's date goes in as a directive and renders per locale.
    await page.getByRole('button', { name: /^datum$|^date$/i }).click();
    await page.getByRole('button', { name: /datum heute|today's date/i }).click();
    await expect(page.locator('.preview-pages')).toContainText(/\d{1,2}\.? \w+ 2\d{3}/);

    // The source view shows the Markdown the editor wrote.
    await editorView(page, 'source');
    await expect(page.getByLabel(/brieftext in markdown|letter body in markdown/i)).toHaveValue(
      /hiermit \*\*fett\*\* bestellt\.:date\[\d{4}-\d{2}-\d{2}\]/,
    );

    // No CSP violation, no console error while the editor was in use — the
    // production build runs with `style-src 'self'` and no inline allowance.
    expect(errors).toEqual([]);
  });

  test('formats with directives: colour, note box, page break, and a document theme', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await newLetter(page);
    await mode(page, 'write');
    await editorView(page, 'visual');
    const editor = page.locator('.rich-host .ProseMirror');
    await editor.click();
    await page.keyboard.type('Wichtiger Hinweis.');
    await page.keyboard.press('Control+a');

    // A colour by name: the editor and the preview paint the same screen value.
    await page.getByTestId('editor-color').click();
    await page.getByTestId('editor-color-panel').locator('[data-color="light-green"]').click();
    await expect(editor.locator('.md-color[data-color="light-green"]')).toHaveText(
      'Wichtiger Hinweis.',
    );
    const preview = page.locator('.preview-sheet');
    await expect(preview.locator('.md-color')).toHaveCSS('color', 'rgb(74, 222, 128)');

    // A note box around it, then a page break after it.
    await page.getByTestId('editor-layout').click();
    await page.locator('[data-layout="noteWarning"]').click();
    await expect(preview.locator('.md-note.md-note-warning')).toContainText('Wichtiger Hinweis.');
    await page.getByRole('button', { name: /seitenumbruch|page break/i }).click();
    await editor.locator('.md-page-break').waitFor();
    // The cursor is on the new page.
    await page.keyboard.type('Auf der zweiten Seite.');
    await expect(page.locator('.preview-stage')).toHaveCount(2);
    await expect(page.locator('.preview-stage').last()).toContainText('Auf der zweiten Seite.');

    // The file carries directives, never HTML or colour values.
    await editorView(page, 'source');
    const source = page.getByLabel(/brieftext in markdown|letter body in markdown/i);
    await expect(source).toHaveValue(
      /:::note\{type="warning"\}\n:light-green\[Wichtiger Hinweis\.\]\n:::/,
    );
    await expect(source).toHaveValue(/::page-break/);
    await expect(source).not.toHaveValue(/#|<span/);

    // The document theme is the paper's, not the app's: a larger size re-paginates.
    await mode(page, 'document');
    await expect(page.getByTestId('document-theme')).toBeVisible();
    await page.getByTestId('theme-font-size').fill('14');
    await page.getByTestId('theme-font-size').press('Tab');
    await expect(page.locator('.preview-sheet .block-markdown').first()).toHaveCSS(
      'font-size',
      /18\.\d+px/,
    );

    // The print copy uses the palette's print value for the same name.
    await expect(page.locator('.print-root .md-color').first()).toHaveCSS(
      'color',
      'rgb(21, 128, 61)',
    );

    expect(errors).toEqual([]);
  });

  test('runs Format menu commands on the selection, the subject and through the keys (R14-003)', async ({
    page,
  }) => {
    await newLetter(page);
    await mode(page, 'write');
    await editorView(page, 'visual');
    const editor = page.locator('.rich-host .ProseMirror');
    await editor.click();
    await page.keyboard.type('Wichtig');
    await page.keyboard.press('Control+a');

    // The menu bar reaches the editor: bold, then a heading, then alignment.
    await page.getByRole('menuitem', { name: /^format$/i }).click();
    await page.getByRole('menuitem', { name: /^(fett|bold)(\s|$)/i }).click();
    await expect(editor.locator('strong')).toHaveText('Wichtig');
    await page.getByRole('menuitem', { name: /^format$/i }).click();
    await page.getByRole('menuitem', { name: /überschrift 2|heading 2/i }).click();
    await expect(editor.locator('h2 strong')).toHaveText('Wichtig');

    // Highlight survives the whole chain (R14-004): editor → Markdown → editor → preview → print copy.
    // The word is selected with the mouse, the way a writer does it.
    await selectText(page, editor.locator('h2'), 'Wichtig');
    await page.getByTestId('editor-highlight').click();
    await expect(editor.locator('mark.md-highlight')).toHaveText('Wichtig');
    await editorView(page, 'source');
    await expect(page.getByLabel(/brieftext in markdown|letter body in markdown/i)).toHaveValue(
      /:highlight\[Wichtig\]/,
    );
    await editorView(page, 'visual');
    await expect(editor.locator('mark.md-highlight')).toHaveText('Wichtig');
    await expect(editor.locator('.md-color')).toHaveCount(0);
    await expect(page.locator('.preview-sheet mark.md-highlight').first()).toHaveText('Wichtig');
    await expect(page.locator('.print-root mark.md-highlight').first()).toHaveText('Wichtig');

    // Clear formatting takes every mark off (R14-005); the keys use the same path (R14-008).
    await selectText(page, editor.locator('h2'), 'Wichtig');
    await page.getByTestId('editor-clear-formatting').click();
    await expect(editor.locator('mark, strong')).toHaveCount(0);
    await selectText(page, editor.locator('h2'), 'Wichtig');
    await page.keyboard.press('Control+i');
    await expect(editor.locator('em')).toHaveText('Wichtig');
    await page.keyboard.press('Control+\\');
    await expect(editor.locator('em')).toHaveCount(0);

    // The subject is a block: Format → Bold toggles the whole line's weight on paper.
    await mode(page, 'document');
    const subject = page.getByTestId('subject');
    await subject.fill('Antrag');
    await expect(page.locator('.print-root .paper-block[data-style="subject"]')).toHaveCSS(
      'font-weight',
      '700',
    );
    await subject.focus();
    await page.keyboard.press('Control+b');
    await expect(page.locator('.print-root .paper-block[data-style="subject"]')).toHaveCSS(
      'font-weight',
      '400',
    );
    await page.getByRole('menuitem', { name: /^format$/i }).click();
    await page.getByRole('menuitem', { name: /^(fett|bold)(\s|$)/i }).click();
    await expect(page.locator('.print-root .paper-block[data-style="subject"]')).toHaveCSS(
      'font-weight',
      '700',
    );
    // Without an editing surface, the Format entries are disabled.
    await page.getByLabel(/^titel$|^title$/i).focus();
    await page.getByRole('menuitem', { name: /^format$/i }).click();
    await expect(page.getByRole('menuitem', { name: /^(kursiv|italic)(\s|$)/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await page.keyboard.press('Escape');
  });

  test('offers one toolbar in both views: headings to six, a sized table, a link with text', async ({
    page,
  }) => {
    await newLetter(page);
    await mode(page, 'write');
    await editorView(page, 'visual');
    const editor = page.locator('.rich-host .ProseMirror');
    await editor.click();
    await page.keyboard.type('Kapitel');
    await page.getByTestId('editor-block').selectOption('heading4');
    await expect(editor.locator('h4')).toHaveText('Kapitel');
    await expect(page.locator('.preview-sheet h5').first()).toHaveText('Kapitel');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');

    // A table of two rows and four columns from the size fields (AC-EDIT-006).
    await page.getByTestId('editor-table').click();
    await page.getByLabel(/^zeilen$|^rows$/i).fill('2');
    await page.getByLabel(/^spalten$|^columns$/i).fill('4');
    await page.getByRole('button', { name: /^einfügen$|^insert$/i }).click();
    await expect(editor.locator('table tr')).toHaveCount(2);
    await expect(editor.locator('table tr').first().locator('th, td')).toHaveCount(4);
    // Inside a cell, a table or an image cannot be inserted (AC-EDIT-010).
    await editor.locator('table td').first().click();
    await page.keyboard.type('Zelle');
    await expect(page.getByTestId('editor-table')).toBeDisabled();
    await expect(page.getByTestId('editor-image')).toBeDisabled();

    // A link with its own text, from the dialog (AC-EDIT-007).
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.getByTestId('editor-link').click();
    await page.getByTestId('link-text').fill('Foldmark');
    await page.getByTestId('link-url').fill('https://example.org/foldmark');
    await page.getByRole('button', { name: /link setzen|set link/i }).click();
    await expect(editor.locator('a[href="https://example.org/foldmark"]')).toHaveText('Foldmark');

    // Colour with a reset (AC-EDIT-004).
    await editor.locator('a').first().click({ clickCount: 3 });
    await page.getByTestId('editor-color').click();
    await page.getByTestId('editor-color-panel').locator('[data-color="red"]').click();
    await expect(editor.locator('.md-color[data-color="red"]')).toHaveCount(1);
    await page.getByTestId('editor-color').click();
    await page.getByTestId('editor-color-reset').click();
    await expect(editor.locator('.md-color')).toHaveCount(0);

    // The source view shares the toolbar: bold wraps the selection in `**`.
    await editorView(page, 'source');
    const source = page.getByLabel(/brieftext in markdown|letter body in markdown/i);
    await expect(source).toHaveValue(/#### Kapitel/);
    await expect(source).toHaveValue(/\[Foldmark\]\(https:\/\/example\.org\/foldmark\)/);
    await source.focus();
    await source.evaluate((node) => (node as HTMLTextAreaElement).setSelectionRange(5, 12));
    await page.getByRole('button', { name: /^(fett|bold)(\s|$)/i }).click();
    await expect(source).toHaveValue(/#### \*\*Kapitel\*\*/);
    await expect(page.getByRole('button', { name: /rückgängig|undo/i })).toBeDisabled();
  });

  test('numbers the pages from the plan and shows every page in the preview', async ({ page }) => {
    await newLetter(page);
    await mode(page, 'write');
    await sourceView(page);
    const paragraphs = Array.from({ length: 70 }, (_, i) => `Absatz ${i + 1} mit etwas Text.`);
    await page
      .getByLabel(/brieftext in markdown|letter body in markdown/i)
      .fill(paragraphs.join('\n\n'));
    await mode(page, 'document');
    await expect(page.getByTestId('section-page-numbers')).toBeVisible();
    await page.getByTestId('page-number-format').selectOption('page-of');

    // Every page is on screen, and the last one says so.
    const sheets = page.locator('.preview-stage');
    await expect(sheets).toHaveCount(3);
    await expect(sheets.last().locator('.paper-page-number')).toHaveText(
      /seite 3 von 3|page 3 of 3/i,
    );

    await page.getByLabel(/auf der ersten seite ausblenden|hide on the first page/i).check();
    await expect(sheets.first().locator('.paper-page-number')).toHaveCount(0);
    await expect(sheets.last().locator('.paper-page-number')).toHaveCount(1);

    // The two formats added in 1.3 (AC-DOC-007).
    await page.getByTestId('page-number-format').selectOption('slash');
    await expect(sheets.last().locator('.paper-page-number')).toHaveText('3 / 3');
    await page.getByTestId('page-number-format').selectOption('of');
    await expect(sheets.last().locator('.paper-page-number')).toHaveText(/3 von 3|3 of 3/);
  });

  test('lays out three areas, folds and focuses them without losing the editor', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await newLetter(page);
    // Automatic: all three areas on a wide window (AC-WS-001), with two splitters.
    await expect(page.locator('.workspace-pane:visible')).toHaveCount(3);
    await expect(page.getByRole('separator')).toHaveCount(2);

    const editor = page.locator('.rich-host .ProseMirror');
    await editor.click();
    await page.keyboard.type('Bleibt erhalten.');

    // Folding the settings pane leaves a rail; the editor keeps its text (AC-WS-004).
    await page.getByTestId('collapse-document').click();
    await expect(page.locator('.workspace-rail[data-pane="document"]')).toBeVisible();
    await expect(page.locator('.workspace-pane:visible')).toHaveCount(2);
    await expect(editor).toContainText('Bleibt erhalten.');
    await page.locator('.workspace-rail[data-pane="document"]').getByRole('button').click();
    await expect(page.locator('.workspace-pane:visible')).toHaveCount(3);

    // Focus mode gives the writing area the workspace; Escape leaves it (AC-WS-005).
    await page.getByTestId('focus-write').click();
    await expect(page.locator('.workspace-pane:visible')).toHaveCount(1);
    await expect(page.locator('.workspace-rail:visible')).toHaveCount(2);
    await page.keyboard.press('Escape');
    await expect(page.locator('.workspace-pane:visible')).toHaveCount(3);

    // A splitter moves by keyboard and never folds a pane to nothing (AC-WS-003).
    const splitter = page.getByRole('separator').first();
    const before = await page.locator('.pane-document').evaluate((node) => node.clientWidth);
    await splitter.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const after = await page.locator('.pane-document').evaluate((node) => node.clientWidth);
    expect(after).toBeGreaterThan(before);
    await page.keyboard.press('Home');
    const minimum = await page.locator('.pane-document').evaluate((node) => node.clientWidth);
    // `clientWidth` excludes the two 1 px borders of the 240 px minimum column.
    expect(minimum).toBeGreaterThanOrEqual(236);

    // A named combination (AC-WS-002).
    await page.getByLabel(/bereiche|areas/i).selectOption('write-preview');
    await expect(page.locator('.workspace-pane:visible')).toHaveCount(2);
    await expect(page.locator('.pane-document')).toBeHidden();

    // The brand mark returns to the workspace (AC-WS-006).
    await page.getByRole('link', { name: /foldmark/i }).click();
    await expect(page.getByRole('heading', { name: /^dokumente$|^documents$/i })).toBeVisible();
    await expect(page.locator('.file-row', { hasText: /neuer brief|new letter/i })).toBeVisible();
  });

  test('checks the document without blocking a letter that has no recipient', async ({ page }) => {
    await newLetter(page);
    // A missing address is a warning (R13-010): the badge says 0 errors.
    await expect(page.locator('.checks-badge')).toContainText('✕ 0');

    await page.getByTestId('check-document').click();
    const check = page.getByRole('dialog', { name: /dokument prüfen|check document/i });
    await expect(check.locator('.check-summary')).toContainText(/ausgabefähig|ready for output/i);
    await expect(
      check.getByText(/fehlt die empfängeranschrift|postal address is required/i),
    ).toBeVisible();
    await check
      .getByRole('button', { name: /^schließen$|^close$/i })
      .first()
      .click();

    // The print dialog offers Print regardless (AC-PRINT-004), and Escape closes it.
    await openOutput(page, 'print');
    await expect(page.getByTestId('print-confirm')).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // A backdrop click closes a non-destructive dialog and focus returns to its trigger.
    await openOutput(page, 'export');
    await page.getByRole('dialog').click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('open-export')).toBeFocused();

    // Email without an address: a warning, and the mail client still opens.
    await openOutput(page, 'email');
    const email = page.getByRole('dialog');
    await expect(email.getByText(/keine e-mail-adresse|no email address/i)).toBeVisible();
    await expect(email.getByTestId('email-open-client')).toHaveAttribute('href', /^mailto:\?/);
  });

  test('prints under the document title and restores the tab title afterwards', async ({
    page,
  }) => {
    // The print dialog cannot be driven; the title it would use can be observed.
    await page.addInitScript(() => {
      window.print = () => {
        (window as unknown as { __printedAs: string }).__printedAs = document.title;
      };
    });
    await page.reload();
    await dismissIntro(page);
    await newLetter(page);
    await page.getByLabel(/^titel$|^title$/i).fill('Antrag: Bescheinigung/2026');
    await page.getByLabel(/straße und hausnummer|street and number/i).fill('Rathausplatz 1');
    await page.getByLabel(/^plz$|postal code/i).fill('12345');
    await page.getByLabel(/^ort$|^city$/i).fill('Beispielstadt');
    await page.getByLabel(/organisation|organization/i).fill('Stadt Beispielstadt');

    await openOutput(page, 'print');
    await page.getByTestId('print-confirm').click();

    const printedAs = await page.evaluate(
      () => (window as unknown as { __printedAs: string }).__printedAs,
    );
    expect(printedAs).toBe('Antrag_ Bescheinigung_2026');
    await expect(page).toHaveTitle('Foldmark');
  });

  test('exports a document as Markdown and reads it back without loss', async ({ page }) => {
    await newLetter(page);
    await page.getByLabel(/^titel$|^title$/i).fill('Round Trip');
    await page.getByLabel(/^betreff$|^subject$/i).fill('Antrag');
    await mode(page, 'write');
    await sourceView(page);
    await page
      .getByLabel(/brieftext in markdown|letter body in markdown/i)
      .fill('Erster Absatz.\n\nZweiter Absatz.');
    await page.getByRole('button', { name: /^speichern$|^save$/i }).click();

    await openOutput(page, 'export');
    await page.getByRole('radio', { name: /markdown/i }).check();

    const download = page.waitForEvent('download');
    await page.getByTestId('export-confirm').click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('Round Trip.md');

    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const content = Buffer.concat(chunks).toString('utf8');

    expect(content).toContain('foldmarkVersion: 1');
    expect(content).toContain('title: Round Trip');
    expect(content).toContain('subject: Antrag');
    expect(content).toContain('Zweiter Absatz.');
    // Pandoc's page keys, derived from the print profile (change 0017).
    expect(content).toContain('lang: ');
    expect(content).toContain('papersize: a4');
    expect(content).toContain('geometry:');

    // And the file the app just wrote is a file the app can read.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: /^schließen$|^close$/i }).click();
    await page.getByLabel(/markdown importieren|import markdown/i).setInputFiles({
      name: 'round-trip.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from(content, 'utf8'),
    });
    // The preview first (R14-014): title and kind, then Import.
    await expect(page.getByTestId('import-preview')).toContainText('Round Trip');
    await page.getByTestId('import-confirm').click();
    await mode(page, 'document');
    await expect(page.getByLabel(/^titel$|^title$/i)).toHaveValue('Round Trip');
    await expect(page.locator('.preview-pages')).toContainText('Zweiter Absatz.');
  });

  test('saves a document as a template and starts a new one from it (change 0039)', async ({
    page,
  }) => {
    await newLetter(page);
    await mode(page, 'document');
    await page.getByTestId('subject').fill('Antrag auf Akteneinsicht');
    await mode(page, 'write');
    await sourceView(page);
    await page
      .getByLabel(/brieftext in markdown|letter body in markdown/i)
      .fill(
        ['Sehr geehrte Damen und Herren,', '', 'hiermit beantrage ich Akteneinsicht.'].join('\n'),
      );
    await expect(page.locator('.preview-pages')).toContainText('Akteneinsicht');

    // File → Save as template…, with the subject taken along.
    await page.getByRole('menuitem', { name: /^datei$|^file$/i }).click();
    await page.getByRole('menuitem', { name: /als vorlage speichern|save as template/i }).click();
    const dialog = page.getByRole('dialog', { name: /als vorlage speichern|save as template/i });
    await expect(dialog.getByTestId('template-name')).toHaveValue('Antrag auf Akteneinsicht');
    await dialog.getByTestId('template-name').fill('Behördenbrief');
    await dialog.getByTestId('template-include-subject').check();
    await expect(dialog.getByTestId('template-premium')).toHaveCount(0);
    await dialog.getByTestId('template-save').click();
    await expect(page.getByTestId('template-saved')).toContainText('Behördenbrief');

    // A second template is premium, free during the test phase — and still saved.
    await page.getByRole('menuitem', { name: /^datei$|^file$/i }).click();
    await page.getByRole('menuitem', { name: /als vorlage speichern|save as template/i }).click();
    await expect(dialog.getByTestId('template-premium')).toContainText(/testphase|test phase/i);
    await dialog.getByTestId('template-name').fill('Zweite');
    await dialog.getByTestId('template-save').click();
    await expect(page.getByTestId('template-saved')).toContainText('Zweite');
    await page.getByTestId('template-saved').getByRole('button').click();

    // + New lists the templates; a new letter from one carries body and subject, today's date.
    await page.getByRole('button', { name: /^schließen$|^close$/i }).click();
    await page.getByRole('menuitem', { name: /^\+ neu$|^\+ new$/i }).click();
    await page.getByRole('menuitem', { name: 'Behördenbrief' }).click();
    await expect(page.getByRole('button', { name: /schließen|close/i })).toBeVisible();
    await expect(page.locator('.preview-pages')).toContainText('Akteneinsicht');
    await mode(page, 'document');
    await expect(page.getByTestId('subject')).toHaveValue('Antrag auf Akteneinsicht');
    // Today in the browser's own calendar, not UTC's.
    const today = await page.evaluate(() => {
      const now = new Date();
      const pad = (value: number) => String(value).padStart(2, '0');
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    });
    await expect(page.getByLabel(/^datum$|^date$/i)).toHaveValue(today);
    await expect(page.getByTestId('section-recipient').getByLabel(/^ort$|^city$/i)).toHaveValue('');

    // Manage: rename and delete; the new document stays.
    await page.getByRole('button', { name: /^schließen$|^close$/i }).click();
    await page.getByRole('menuitem', { name: /^\+ neu$|^\+ new$/i }).click();
    await page.getByRole('menuitem', { name: /vorlagen verwalten|manage templates/i }).click();
    const manage = page.getByRole('dialog', { name: /^vorlagen$|^templates$/i });
    await expect(manage.locator('.template-row')).toHaveCount(2);
    await manage.getByRole('button', { name: /umbenennen: zweite|rename: zweite/i }).click();
    await manage.getByTestId('template-edit-name').fill('Zweite Vorlage');
    await manage.getByTestId('template-edit-save').click();
    await expect(manage).toContainText('Zweite Vorlage');
    await manage
      .getByRole('button', { name: /löschen: zweite vorlage|delete: zweite vorlage/i })
      .click();
    await page.getByRole('button', { name: /^löschen$|^delete$/i }).click();
    await expect(manage.locator('.template-row')).toHaveCount(1);
    await manage.locator('.app-dialog-close').click();
    await expect(page.locator('.document-open')).toHaveCount(2);
  });

  test('hands back the original text when an imported file cannot be parsed', async ({ page }) => {
    const broken = '---\ntitle: A\nalias: *nope\n---\n\nMein wichtiger Brief.\n';
    await page.getByLabel(/markdown importieren|import markdown/i).setInputFiles({
      name: 'broken.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from(broken, 'utf8'),
    });

    // The preview cannot import it, and the letter is not lost: handed back verbatim.
    await expect(page.getByTestId('import-confirm')).toBeDisabled();
    await expect(page.getByLabel(/originalinhalt|original file content/i)).toHaveValue(broken);
    await page.getByTestId('import-skip').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('imports a dropped Markdown file after a preview and refuses other files (R14-014)', async ({
    page,
  }) => {
    const panel = page.locator('.file-manager');
    /** Drops files on the file manager the way the browser would. */
    const drop = (files: { name: string; type: string; content: string }[]) =>
      panel.evaluate((node, list) => {
        const transfer = new DataTransfer();
        for (const file of list) {
          transfer.items.add(new File([file.content], file.name, { type: file.type }));
        }
        for (const type of ['dragenter', 'dragover', 'drop'] as const) {
          node.dispatchEvent(
            new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }),
          );
        }
      }, files);

    await drop([{ name: 'photo.png', type: 'image/png', content: 'not markdown' }]);
    await expect(page.getByText(/nur markdown-dokumente|only markdown documents/i)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const letter = [
      '---',
      'foldmarkVersion: 1',
      'kind: letter',
      'title: Abgelegt',
      'x-foo: bar',
      '---',
      '',
      'Hallo.',
      '',
    ].join('\n');
    await drop([{ name: 'abgelegt.md', type: 'text/markdown', content: letter }]);
    const preview = page.getByTestId('import-preview');
    await expect(preview).toContainText('Abgelegt');
    // An unknown key is shown as kept, and the stored document keeps it.
    await expect(preview).toContainText('x-foo');
    await page.getByTestId('import-confirm').click();
    await mode(page, 'document');
    await expect(page.getByLabel(/^titel$|^title$/i)).toHaveValue('Abgelegt');
    await expect(page.locator('.preview-pages')).toContainText('Hallo.');
  });

  test('never interprets HTML in a document body', async ({ page }) => {
    await newLetter(page);
    await mode(page, 'write');
    await sourceView(page);
    await page
      .getByLabel(/brieftext in markdown|letter body in markdown/i)
      .fill('A **safe** <img src=x onerror=alert(1)> note');

    const sheet = page.locator('.preview-pages');
    await expect(sheet.locator('strong')).toHaveText('safe');
    await expect(sheet.locator('img')).toHaveCount(0);
    await expect(sheet).toContainText('<img src=x onerror=alert(1)>');
  });

  test('gives a postcard a front and a back, in print order', async ({ page }) => {
    await newDocument(page, /^postkarte$|^postcard$/i);
    await mode(page, 'write');
    await expect(page.getByRole('tab', { name: /vorderseite|front/i })).toBeVisible();

    // Two surfaces, front first.
    const surfaces = page.getByRole('group', { name: /seite wählen|choose a side/i });
    await expect(surfaces.getByRole('button')).toHaveCount(2);

    await page.getByRole('tab', { name: /rückseite|back/i }).click();
    await page
      .getByLabel(/nachricht auf der rückseite|message on the back/i)
      .fill('Liebe Erika, sonnige Grüße!');
    await expect(page.locator('.preview-pages')).toContainText('sonnige Grüße');

    // The divider prints; the safe area does not.
    const printed = await page
      .locator('.preview-sheet .print-marker.marker-printed')
      .evaluateAll((nodes) => nodes.map((node) => node.className));
    expect(printed.join(' ')).toContain('marker-separator');
  });

  test('shows the print profiles with their measurements and the unverified claim', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /druckprofile|print profiles/i }).click();
    await page.getByTestId('profile-din5008-b').click();

    await expect(page.getByText('105 mm').first()).toBeVisible();
    await expect(page.getByText('148.5 mm').first()).toBeVisible();
    // The app never claims conformance it has not verified.
    await expect(
      page.getByText(/nicht gegen eine lizenzierte|not been checked against/i).first(),
    ).toBeVisible();

    // A built-in profile offers a copy rather than an edit.
    await expect(page.getByRole('button', { name: /kopie anlegen|create a copy/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /profil löschen|delete profile/i })).toHaveCount(
      0,
    );
  });

  test('stores a contact and puts it on a letter', async ({ page }) => {
    await page.getByRole('button', { name: /kontaktverzeichnis|contact directory/i }).click();
    await page.getByTestId('new-contact').click();
    const dialog = page.getByRole('dialog', { name: /neuer kontakt|new contact/i });
    await expect(dialog).toBeVisible();
    // Country first; the default is Germany and the list is local.
    await expect(dialog.getByTestId('country')).toHaveValue(/deutschland|germany/i);
    await dialog.getByLabel(/organisation|organization/i).fill('Stadt Beispielstadt');
    await dialog.getByLabel(/straße und hausnummer|street and number/i).fill('Rathausplatz 1');
    await dialog.getByLabel(/^ort$|^city$/i).fill('Beispielstadt');
    await dialog.getByTestId('contact-save').click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Stadt Beispielstadt').first()).toBeVisible();
    // Alphabetical sections, and the roles as actions on the row.
    await expect(page.locator('.address-initial').first()).toHaveText('S');
    await page.getByRole('button', { name: /aktionen für|actions for/i }).click();
    await page.getByRole('menuitemcheckbox', { name: /^primär$|^primary$/i }).click();
    await expect(page.getByText(/primäradresse|primary address/i).first()).toBeVisible();

    await page.getByRole('button', { name: /^dokumente$|^documents$/i }).click();
    await newLetter(page);
    await mode(page, 'document');

    // The recipient combobox, by keyboard only: type, arrow, Enter.
    const picker = page.getByRole('combobox', {
      name: /kontaktverzeichnis|contact directory/i,
    });
    await picker.fill('beispiel');
    await expect(page.getByRole('option', { name: /Stadt Beispielstadt/ })).toBeVisible();
    await picker.press('ArrowDown');
    await picker.press('Enter');

    await expect(page.getByLabel(/^ort$|^city$/i).first()).toHaveValue('Beispielstadt');
    await expect(page.locator('.preview-pages')).toContainText('Rathausplatz 1');

    // The primary address is the sender a new letter starts with.
    await expect(page.getByRole('combobox', { name: /^absender$|^sender$/i })).toHaveValue(
      /^Stadt Beispielstadt/,
    );

    // The snapshot is the document's (R14-012): an edit here shows as "changed",
    // the reset takes the contact's data again, the directory is untouched.
    const recipientSection = page.getByTestId('section-recipient');
    await expect(page.getByTestId('reset-recipient')).toHaveCount(0);
    await recipientSection.getByLabel(/^ort$|^city$/i).fill('Anderswo');
    await expect(page.locator('.preview-pages')).toContainText('Anderswo');
    await page.getByTestId('reset-recipient').click();
    await expect(recipientSection.getByLabel(/^ort$|^city$/i)).toHaveValue('Beispielstadt');
    await expect(page.getByTestId('reset-recipient')).toHaveCount(0);
  });

  test('imports contacts from a vCard with a review of probable duplicates (R14-013)', async ({
    page,
  }) => {
    // One contact exists; the file brings her again (same e-mail) plus one new person.
    await page.getByRole('button', { name: /kontaktverzeichnis|contact directory/i }).click();
    await page.getByTestId('new-contact').click();
    const dialog = page.getByRole('dialog', { name: /neuer kontakt|new contact/i });
    await dialog.getByTestId('contact-first-name').fill('Erika');
    await dialog.getByTestId('contact-last-name').fill('Beispiel');
    await dialog.getByLabel(/^ort$|^city$/i).fill('Berlin');
    await dialog.getByTestId('add-emails').click();
    await dialog.getByTestId('emails-0').fill('erika.beispiel@example.org');
    await dialog.getByTestId('contact-save').click();
    await expect(dialog).toBeHidden();

    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Dr. Erika Beispiel',
      'N:Beispiel;Erika;;Dr.;',
      'EMAIL:Erika.Beispiel@example.org',
      'TEL:+49 170 1234567',
      'ADR;TYPE=HOME:;;Gartenweg 3;Potsdam;;14467;DE',
      'END:VCARD',
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Max Mustermann',
      'N:Mustermann;Max;;;',
      'ADR:;;Musterstraße 1;Musterstadt;;54321;Deutschland',
      'END:VCARD',
      '',
    ].join('\n');
    await page.getByLabel(/kontakte importieren|import contacts/i).setInputFiles({
      name: 'kontakte.vcf',
      mimeType: 'text/vcard',
      buffer: Buffer.from(vcard, 'utf8'),
    });
    const review = page.getByRole('dialog', { name: /kontakte importieren|import contacts/i });
    await expect(review.getByTestId('contact-import-summary')).toContainText(/2/);
    await expect(review.getByTestId('import-row-new')).toHaveCount(1);
    await expect(review.getByTestId('import-row-existing')).toHaveCount(1);
    await expect(review.getByTestId('import-row-existing')).toContainText(
      /gleiche e-mail|same e-mail/i,
    );
    // The duplicate is merged on request, never on its own: Potsdam joins Erika's addresses.
    await review
      .getByTestId('import-row-existing')
      .getByLabel(/zusammenführen|merge/i)
      .check();
    await review.getByTestId('contact-import-confirm').click();
    await expect(review).toBeHidden();
    await expect(page.getByTestId('import-notice')).toContainText(/1/);
    await expect(page.getByText('Max Mustermann')).toBeVisible();
    await expect(page.locator('.contact-row').filter({ hasText: 'Erika' })).toHaveCount(1);
    await page
      .locator('.contact-row')
      .filter({ hasText: 'Erika' })
      .locator('.contact-open')
      .click();
    const edit = page.getByRole('dialog');
    await expect(edit.getByTestId('contact-address-1').getByLabel(/^ort$|^city$/i)).toHaveValue(
      'Potsdam',
    );
    await expect(edit.getByTestId('phones-0')).toHaveValue('+49 170 1234567');
  });

  test('keeps a contact with two e-mail addresses and finds it by city (change 0025)', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /kontaktverzeichnis|contact directory/i }).click();
    await page.getByTestId('new-contact').click();
    const dialog = page.getByRole('dialog', { name: /neuer kontakt|new contact/i });
    await dialog.getByTestId('contact-first-name').fill('Anna');
    await dialog.getByTestId('contact-last-name').fill('Müller');

    // The country as one searchable combobox: "nige" offers Niger, then Nigeria (AC-CONTACT-003).
    const country = dialog.getByTestId('country');
    await country.fill('nige');
    await expect(page.getByRole('option').first()).toContainText(/^niger/i);
    await expect(page.getByRole('option').nth(1)).toContainText(/^nigeria/i);
    await country.press('Enter');
    await expect(country).toHaveValue(/^niger$/i);
    await dialog.getByLabel(/^ort$|^city$/i).fill('Berlin');

    // Two e-mail addresses; the second becomes primary (AC-CONTACT-007).
    await dialog.getByTestId('add-emails').click();
    await dialog.getByTestId('emails-0').fill('privat@example.org');
    await dialog.getByTestId('add-emails').click();
    await dialog.getByTestId('emails-1').fill('arbeit@example.org');
    await dialog.getByTestId('emails-1-primary').check();
    await dialog.getByTestId('contact-save').click();
    await expect(dialog).toBeHidden();

    const row = page.locator('.contact-row', { hasText: 'Anna Müller' });
    await expect(row).toContainText('arbeit@example.org');
    await expect(row).toContainText('Berlin');

    // The search covers the city and folds the umlaut (AC-CONTACT-006).
    await page.getByTestId('contact-search').fill('berlin');
    await expect(row).toBeVisible();
    await page.getByTestId('contact-search').fill('muller');
    await expect(row).toBeVisible();
    await page.getByTestId('contact-search').fill('hamburg');
    await expect(row).toHaveCount(0);
    await expect(page.getByText(/keine kontakte passen|no contacts match/i)).toBeVisible();
    await page.getByTestId('contact-search').fill('');

    // Reopening shows both addresses; closing with a change asks first (AC-CONTACT-008).
    await row.getByRole('button', { name: /bearbeiten|edit/i }).click();
    const edit = page.getByRole('dialog', { name: /kontakt bearbeiten|edit contact/i });
    await expect(edit.getByTestId('emails-1')).toHaveValue('arbeit@example.org');
    await expect(edit.getByTestId('emails-1-primary')).toBeChecked();
    await edit.getByTestId('contact-first-name').fill('Annika');
    await edit
      .getByRole('button', { name: /schließen|close/i })
      .first()
      .click();
    await expect(page.getByRole('dialog', { name: /verwerfen|discard/i })).toBeVisible();
    await page.getByTestId('confirm').click();
    await expect(edit).toBeHidden();
    await expect(row).toContainText('Anna Müller');
  });

  test('inserts and removes the demo data through the settings (change 0026)', async ({ page }) => {
    await page.getByRole('button', { name: /^einstellungen$|^settings$/i }).click();
    await page.getByTestId('settings-development').click();
    await page.getByTestId('demo-data-insert').click();
    await expect(page.getByTestId('demo-data-count')).toContainText('20');

    // Twenty contacts on one page, alphabetically, the primary one marked.
    await page.getByRole('button', { name: /kontaktverzeichnis|contact directory/i }).click();
    await expect(page.locator('.contact-row')).toHaveCount(20);
    await expect(page.locator('.address-initial').first()).toHaveText('A');
    await expect(page.getByText(/primäradresse|primary address/i).first()).toBeVisible();

    // Folders and documents of every kind, one of them archived.
    await page.getByRole('button', { name: /^dokumente$|^documents$/i }).click();
    await expect(page.locator('.file-row-folder')).toHaveCount(2);
    await page.getByTestId('toggle-archive').click();
    await expect(page.locator('.file-row', { hasText: /archiviert|archived/i })).toHaveCount(1);

    // Removal takes exactly the demo records and leaves the rest.
    await page.getByTestId('toggle-archive').click();
    await newLetter(page);
    await page.getByRole('button', { name: /^speichern$|^save$/i }).click();
    await page.getByRole('button', { name: /schließen|close/i }).click();
    await page.getByRole('button', { name: /^einstellungen$|^settings$/i }).click();
    await page.getByTestId('settings-development').click();
    await page.getByTestId('demo-data-remove').click();
    await expect(page.getByTestId('demo-data-count')).toContainText(/0 .*0 .*0 .*0/);
    await page.getByRole('button', { name: /^dokumente$|^documents$/i }).click();
    await expect(page.locator('.file-row')).toHaveCount(1);
    await page.getByRole('button', { name: /kontaktverzeichnis|contact directory/i }).click();
    await expect(page.getByText(/noch keine kontakte|no contacts yet/i)).toBeVisible();
  });

  test('counts, exports and deletes the local data', async ({ page }) => {
    await newLetter(page);
    await page.getByLabel(/^titel$|^title$/i).fill('Delete me');
    await page.getByRole('button', { name: /^speichern$|^save$/i }).click();
    await page.getByRole('button', { name: /schließen|close/i }).click();

    await page.getByRole('button', { name: /einstellungen|settings/i }).click();
    await page.getByTestId('settings-privacy').click();
    await page.getByRole('button', { name: /datenschutz und daten|privacy and data/i }).click();

    // The inventory is counted from storage, so it has to show the document.
    await expect(page.getByText(/was lokal gespeichert ist|what is stored locally/i)).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /alle daten exportieren|export all data/i }).click();
    expect((await download).suggestedFilename()).toMatch(
      /^foldmark-backup-\d{4}-\d{2}-\d{2}\.json$/,
    );

    await page
      .getByRole('button', { name: /meine lokalen daten löschen|delete my local data/i })
      .click();
    await page.getByRole('button', { name: /jetzt löschen|delete now/i }).click();
    await expect(page.getByRole('status').filter({ hasText: /gelöscht|deleted/i })).toBeVisible();

    await page.reload();
    // Content is gone; the intro flag is a preference and survives.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText(/noch keine dokumente|no documents yet/i)).toBeVisible();
  });

  test('resetting settings clears preferences and keeps content', async ({ page }) => {
    await newLetter(page);
    await page.getByLabel(/^titel$|^title$/i).fill('Keep me');
    await page.getByRole('button', { name: /^speichern$|^save$/i }).click();
    await page.getByRole('button', { name: /schließen|close/i }).click();

    await page.getByRole('button', { name: /einstellungen|settings/i }).click();
    await page.getByLabel(/sprache|language/i).selectOption('en');
    // A document default is a preference too (change 0028).
    await page.getByTestId('settings-documents').click();
    await page.getByTestId('default-page-numbers').selectOption('page-of');
    await page.getByTestId('settings-data').click();
    await page.getByTestId('delete-settings').click();
    await page.getByTestId('confirm').click();
    await expect(page.getByTestId('delete-done')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('dialog')).toBeVisible();
    await dismissIntro(page);
    await expect(page.getByText('Keep me').first()).toBeVisible();
  });

  test('applies the document defaults to a new letter (change 0028)', async ({ page }) => {
    await page.getByRole('button', { name: /einstellungen|settings/i }).click();
    await page.getByTestId('settings-documents').click();
    await page.getByTestId('default-page-numbers').selectOption('page-of');
    await page.getByTestId('default-date-format').selectOption('numeric');
    await page.getByTestId('settings-fonts').click();
    await page.getByTestId('default-font-family').selectOption('serif');

    await page.getByRole('button', { name: /^dokumente$|^documents$/i }).click();
    await newLetter(page);
    await mode(page, 'document');
    await expect(page.getByTestId('page-number-format')).toHaveValue('page-of');
    // The numeric date shows on the sheet: day.month.year without a month name.
    await expect(page.locator('.preview-pages')).toContainText(/\d{1,2}\.\d{1,2}\.20\d{2}/);
    const fontStack = await page
      .locator('.preview-sheet .paper')
      .first()
      .evaluate((node) => (node as HTMLElement).style.getPropertyValue('--md-font-family'));
    expect(fontStack.toLowerCase()).toContain('serif');
    expect(fontStack.toLowerCase()).not.toContain('sans-serif');
  });

  test('switches and persists language and every built-in theme', async ({ page }) => {
    await page.getByRole('button', { name: /einstellungen|settings/i }).click();
    await page.getByLabel(/sprache|language/i).selectOption('en');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await page.getByTestId('settings-appearance').click();
    const themeSelect = page.getByLabel(/color theme/i);
    for (const theme of ['system', 'light', 'dark', 'paper', 'sepia', 'high-contrast', 'ocean']) {
      await themeSelect.selectOption(theme);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    }

    await page.reload();
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean');
  });

  test('exposes landmarks and the generated third-party notices', async ({ page }) => {
    await expect(
      page.getByRole('navigation', { name: /hauptnavigation|primary navigation/i }),
    ).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();

    await page.getByRole('button', { name: /über|about/i }).click();
    // The structured library list (R13-008) keeps a link to the generated Markdown notices.
    await page.getByRole('button', { name: /open-source/i }).click();
    const notices = page.getByRole('link', { name: /third-party notices/i });
    await expect(notices).toHaveAttribute('href', /THIRD-PARTY-NOTICES\.generated\.md$/);
    await expect(page.locator('.open-source-table tbody tr').first()).toBeVisible();
  });

  test('makes no third-party request and emits no console error on first load', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const externalRequests: string[] = [];
    const consoleErrors: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.hostname !== '127.0.0.1') externalRequests.push(request.url());
    });
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('./');
    await expect(page.getByRole('heading', { name: /dokumente|documents/i })).toBeVisible();
    expect(externalRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
    await context.close();
  });
});

test('shows a useful error when IndexedDB is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined });
  });
  await page.goto('./');
  await dismissIntro(page);
  await expect(page.getByRole('alert')).toContainText(/lokale speicher|local storage/i);
});

test('keeps the first-run notice usable on a small viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('./');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /einstellungen öffnen|open settings/i }).click();
  await expect(page.getByRole('heading', { name: /einstellungen|settings/i })).toBeVisible();
});
