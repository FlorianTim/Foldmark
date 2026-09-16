import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

/**
 * Captures the screenshots the documentation references.
 *
 * The output layout is a shared LumbreCode contract, not a local choice:
 * `design/screenshots/<profile>/<id>.png`, with the profiles declared in
 * `docs/public-site/screenshot-profiles.json`. A Flutter integration test
 * writes into the same layout, so a guide can reference `{{screenshot:id}}`
 * without knowing which stack produced the image.
 *
 * Runs only in the `screenshots` Playwright project
 * (`npm run screenshots:capture`). Capturing is slower than the functional
 * suite and its output is reviewed by eye, so it does not belong in the
 * pull-request gate — it runs when documentation is regenerated.
 *
 * Every declared shot is captured in every profile. `render_app_help.py`
 * then decides which one a document actually uses and fails when it is
 * missing.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

interface Profile {
  name: string;
  label: string;
  width: number;
  height: number;
}

/**
 * Profile and shot names are the only parts of a written path that do not
 * come from this file. The schema constrains them to kebab-case, but a JSON
 * file on disk is still input — so the constraint is enforced here too,
 * before any of it reaches the file system.
 */
const ALLOWED = 'abcdefghijklmnopqrstuvwxyz0123456789-';

/**
 * Deliberately character-by-character rather than a kebab-case regular
 * expression: the obvious pattern for this shape nests quantifiers and is
 * flagged as a backtracking risk. A scan is linear, and the input is a name
 * of a few characters.
 */
function isSafeSegment(value: string): boolean {
  if (value.length === 0 || value.length > 64) return false;
  if (value.startsWith('-') || value.endsWith('-') || value.includes('--')) return false;
  return [...value].every((character) => ALLOWED.includes(character));
}

const profiles: Profile[] = JSON.parse(
  readFileSync(join(root, 'docs/public-site/screenshot-profiles.json'), 'utf-8'),
).profiles;

for (const profile of profiles) {
  if (!isSafeSegment(profile.name)) {
    throw new Error(`Unsafe screen profile name: ${profile.name}`);
  }
}

async function shoot(page: Page, profile: Profile, id: string): Promise<void> {
  if (!isSafeSegment(id)) throw new Error(`Unsafe screenshot id: ${id}`);
  // Filling a field scrolls it into view — the window on a narrow screen, the
  // pane itself on a wide one. Both are reset, or a documentation screenshot
  // ends up showing the middle of a form.
  await page.evaluate(() => {
    globalThis.scrollTo(0, 0);
    for (const pane of document.querySelectorAll('.workspace-pane')) pane.scrollTop = 0;
  });
  const directory = join(root, 'design', 'screenshots', profile.name);
  /* eslint-disable-next-line security/detect-non-literal-fs-filename --
     Both path segments pass isSafeSegment above, and the root is derived
     from this file's own location, so no caller-controlled string reaches
     the file system. */
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: join(directory, `${id}.png`) });
}

test.describe('documentation screenshots', () => {
  for (const profile of profiles) {
    test(`captures the declared shots at ${profile.label}`, async ({ page }) => {
      await page.setViewportSize({ width: profile.width, height: profile.height });

      // 01 — the intro, on its data step, which is the one worth showing.
      await page.goto('./');
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: /weiter|next/i }).click();
      await shoot(page, profile, '01-intro');

      // Leave the intro the way a visitor would.
      const skip = page.getByRole('button', { name: /überspringen|skip/i });
      if (await skip.isVisible()) await skip.click();

      // The demo data (change 0026) is what every documentation screen shows:
      // it is inserted through the settings, the only entry point there is.
      await page.getByRole('button', { name: /einstellungen|settings/i }).click();
      await expect(page.getByRole('heading', { name: /einstellungen|settings/i })).toBeVisible();
      await page.getByTestId('settings-development').click();
      await page.getByTestId('demo-data-insert').click();
      await expect(page.getByTestId('demo-data-count')).toContainText('20');

      // 02 — the settings, on their first category.
      await page.getByTestId('settings-general').click();
      await shoot(page, profile, '02-settings');

      // 03 — privacy and data, where the inventory and the destructive actions live.
      await page.getByTestId('settings-privacy').click();
      await page.getByRole('button', { name: /datenschutz und daten|privacy and data/i }).click();
      await expect(
        page.getByRole('heading', { name: /datenschutz und daten|privacy and data/i }),
      ).toBeVisible();
      await shoot(page, profile, '03-privacy');

      // 06 — the file manager with folders and documents of every kind (change 0024).
      await page.getByRole('button', { name: /^dokumente$|^documents$/i }).click();
      await expect(page.locator('.file-row-folder')).toHaveCount(2);
      await shoot(page, profile, '06-documents');

      // 07 — the contact directory, grouped by initial (change 0025).
      await page.getByRole('button', { name: /kontaktverzeichnis|contact directory/i }).click();
      await expect(page.locator('.contact-row')).toHaveCount(20);
      await shoot(page, profile, '07-contacts');

      // 04 — the workspace. The whole product in one screen: the settings, the
      // writing area and the sheet with its marks. The demo invitation is a
      // real letter with a table of contents worth of text and a note box.
      await page.getByRole('button', { name: /^dokumente$|^documents$/i }).click();
      await page
        .locator('.file-row-folder', { hasText: 'Verein' })
        .getByRole('button')
        .first()
        .click();
      await page
        .locator('.file-row', { hasText: /Einladung Mitgliederversammlung/ })
        .locator('.file-name')
        .click();
      await expect(page.getByRole('button', { name: /schließen|close/i })).toBeVisible();
      // On a phone the preview is its own tab; on a laptop it is already there.
      const tabs = page.getByRole('tablist', { name: /arbeitsbereich|workspace/i });
      if (await tabs.count())
        await tabs.getByRole('tab', { name: /^vorschau$|^preview$/i }).click();
      await expect(page.locator('.preview-sheet .paper').first()).toBeVisible();
      await expect(page.locator('.preview-pages')).toContainText('Tagesordnung');
      await shoot(page, profile, '04-workspace');

      // 05 — a print profile with its marker coordinates, which is the claim
      // the product makes and the one a reader will want to see stated.
      await page.getByRole('button', { name: /schließen|close/i }).click();
      await page.getByRole('button', { name: /druckprofile|print profiles/i }).click();
      await page.getByTestId('profile-din5008-b').click();
      await expect(page.getByText('148.5 mm').first()).toBeVisible();
      await shoot(page, profile, '05-profiles');
    });
  }
});
