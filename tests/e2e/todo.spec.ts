import { expect, test, type Page } from '@playwright/test';

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

test.describe('template Todo demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await dismissIntro(page);
  });

  test('shows the empty state and ignores empty input', async ({ page }) => {
    await expect(page.getByText(/noch keine aufgaben|no todos yet/i)).toBeVisible();
    await page.getByRole('button', { name: /hinzufügen|add/i }).click();
    await expect(page.getByRole('listitem')).toHaveCount(0);
  });

  test('creates, completes, deletes, clears, and persists todos', async ({ page }) => {
    const input = page.getByLabel(/neue aufgabe in markdown|new todo in markdown/i);
    await input.fill('Template prüfen');
    await page.getByRole('button', { name: /hinzufügen|add/i }).click();

    const persistedRow = page.getByRole('listitem').filter({ hasText: 'Template prüfen' });
    await expect(persistedRow).toBeVisible();
    await persistedRow.getByRole('checkbox').check();
    await expect(persistedRow.locator('.safe-markdown')).toHaveClass(/completed/);

    await page.reload();
    await expect(page.getByText('Template prüfen')).toBeVisible();
    await page
      .getByRole('listitem')
      .getByRole('button', { name: /löschen|delete/i })
      .click();
    await expect(page.getByText('Template prüfen')).toHaveCount(0);

    for (const title of ['First', 'Second']) {
      await input.fill(title);
      await page.getByRole('button', { name: /hinzufügen|add/i }).click();
    }
    await page.getByRole('button', { name: /alle löschen|clear all/i }).click();
    await expect(page.getByRole('listitem')).toHaveCount(0);
  });

  test('enforces the configured title length in the UI', async ({ page }) => {
    const input = page.getByLabel(/neue aufgabe in markdown|new todo in markdown/i);
    await input.pressSequentially('x'.repeat(2_001));
    await expect(input).toHaveValue('x'.repeat(2_000));
  });

  test('renders the supported Markdown subset without interpreting HTML', async ({ page }) => {
    const input = page.getByLabel(/neue aufgabe in markdown|new todo in markdown/i);
    await input.fill('A **safe** <img src=x onerror=alert(1)> note');
    await expect(
      page.getByLabel(/markdown-vorschau|markdown preview/i).locator('strong'),
    ).toHaveText('safe');
    await page.getByRole('button', { name: /hinzufügen|add/i }).click();
    await expect(page.locator('.todo-list img')).toHaveCount(0);
    await expect(page.getByText('<img src=x onerror=alert(1)>', { exact: false })).toBeVisible();
  });

  test('deleting local data clears content and keeps preferences', async ({ page }) => {
    await page.getByLabel(/neue aufgabe in markdown|new todo in markdown/i).fill('Delete me');
    await page.getByRole('button', { name: /hinzufügen|add/i }).click();

    await page.getByRole('button', { name: /einstellungen|settings/i }).click();
    await page.getByRole('button', { name: /datenschutz und daten|privacy and data/i }).click();
    await page
      .getByRole('button', { name: /meine lokalen daten löschen|delete my local data/i })
      .click();
    await page.getByRole('button', { name: /jetzt löschen|delete now/i }).click();
    await expect(page.getByRole('status')).toContainText(/gelöscht|deleted/i);

    await page.reload();
    // The two destructive actions have different blast radii on purpose:
    // this one clears content, so the intro flag survives and the visitor is
    // not greeted as a first-time user again.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText(/noch keine aufgaben|no todos yet/i)).toBeVisible();
  });

  test('resetting settings clears preferences and keeps content', async ({ page }) => {
    await page.getByLabel(/neue aufgabe in markdown|new todo in markdown/i).fill('Keep me');
    await page.getByRole('button', { name: /hinzufügen|add/i }).click();

    await page.getByRole('button', { name: /einstellungen|settings/i }).click();
    await page.getByLabel(/sprache|language/i).selectOption('en');
    await page.getByRole('button', { name: /privacy and data/i }).click();
    await page.getByRole('button', { name: /^reset settings$/i }).click();
    await page.getByRole('button', { name: /^reset$/i }).click();

    await page.reload();
    // The mirror case: preferences are gone, so the intro returns and the
    // language is back to the default — but the todo is still there.
    await expect(page.getByRole('dialog')).toBeVisible();
    await dismissIntro(page);
    await expect(page.getByText('Keep me')).toBeVisible();
  });

  test('switches and persists language and every built-in theme', async ({ page }) => {
    await page.getByRole('button', { name: /einstellungen|settings/i }).click();
    await page.getByLabel(/sprache|language/i).selectOption('en');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    const themeSelect = page.getByLabel(/color theme/i);
    for (const theme of ['system', 'light', 'dark', 'paper', 'sepia', 'high-contrast', 'ocean']) {
      await themeSelect.selectOption(theme);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    }

    await page.reload();
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean');
  });

  test('follows the operating-system color preference in system theme', async ({ page }) => {
    await page.getByRole('button', { name: /einstellungen|settings/i }).click();
    const themeSelect = page.getByLabel(/farbthema|color theme/i);
    await themeSelect.selectOption('system');

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect
      .poll(() =>
        page
          .locator('html')
          .evaluate((element) => getComputedStyle(element).getPropertyValue('--app-bg').trim()),
      )
      .toBe('#10141b');

    await page.emulateMedia({ colorScheme: 'light' });
    await expect
      .poll(() =>
        page
          .locator('html')
          .evaluate((element) => getComputedStyle(element).getPropertyValue('--app-bg').trim()),
      )
      .toBe('#f3f5f7');
  });

  test('links notices through the configured Vite base and exposes basic landmarks', async ({
    page,
  }) => {
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await page.getByRole('button', { name: /über|about/i }).click();
    const notices = page.getByRole('link', { name: /third-party notices/i });
    await expect(notices).toHaveAttribute('href', /THIRD-PARTY-NOTICES\.generated\.md$/);
  });

  test('makes no third-party request and emits no console errors on first load', async ({
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
    await expect(page.getByRole('heading', { name: /to-do|todo/i })).toBeVisible();
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
