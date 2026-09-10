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

      // 02 — the settings hub.
      await page.getByRole('button', { name: /einstellungen|settings/i }).click();
      await expect(page.getByRole('heading', { name: /einstellungen|settings/i })).toBeVisible();
      await shoot(page, profile, '02-settings');

      // 03 — privacy and data, where the destructive actions live.
      await page.getByRole('button', { name: /datenschutz und daten|privacy and data/i }).click();
      await expect(
        page.getByRole('heading', { name: /datenschutz und daten|privacy and data/i }),
      ).toBeVisible();
      await shoot(page, profile, '03-privacy');
    });
  }
});
