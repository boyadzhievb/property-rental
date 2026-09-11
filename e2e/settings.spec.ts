import { test, expect, type Page } from '@playwright/test';

async function setupApp(page: Page) {
  await page.goto('/');
  const welcome = page.getByRole('heading', { name: 'Welcome' });
  if (await welcome.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByRole('button', { name: /configure app/i }).click();
  }
  await expect(page.getByText(/today/i).first()).toBeVisible();
}

async function navigateToSettings(page: Page) {
  await page.getByRole('button', { name: /settings/i }).click();
  await expect(page.getByText('Settings').first()).toBeVisible();
}

test.describe('Language Switching', () => {
  test('switches to French and back to English', async ({ page }) => {
    await setupApp(page);
    await navigateToSettings(page);

    // Click Language row to open picker
    await page.getByText('Language').click();

    // Select French
    await page.getByRole('button', { name: 'Français' }).click();

    // UI should now be in French — Settings becomes "Paramètres"
    await expect(page.getByText('Paramètres').first()).toBeVisible();

    // Switch back: click the language row (now labeled in French)
    await page.getByText('Langue').click();
    await page.getByRole('button', { name: 'English' }).click();

    await expect(page.getByText('Settings').first()).toBeVisible();
  });

  test('switches to Bulgarian', async ({ page }) => {
    await setupApp(page);
    await navigateToSettings(page);

    await page.getByText('Language').click();
    await page.getByRole('button', { name: 'Български' }).click();

    await expect(page.getByText('Настройки').first()).toBeVisible();
  });
});

test.describe('Theme Switching', () => {
  test('switches between light and dark themes', async ({ page }) => {
    await setupApp(page);
    await navigateToSettings(page);

    // Click Appearance row to open theme picker
    await page.getByText('Appearance').click();

    // Select Dark
    await page.getByRole('button', { name: 'Dark' }).click();

    // The html element should have dark class
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Switch back: click Appearance row again
    await page.getByText('Appearance').click();
    await page.getByRole('button', { name: 'Light' }).click();

    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});

test.describe('Data Reset', () => {
  test('resets data and returns to setup view', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await page.goto('/');
    await page.getByRole('button', { name: /seed with demo data/i }).click();
    await expect(page.getByText(/today/i).first()).toBeVisible();

    await navigateToSettings(page);

    // Click Reset Data
    await page.getByText(/reset data/i).click();

    // Should return to setup view
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  });
});
