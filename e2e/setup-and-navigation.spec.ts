import { test, expect } from '@playwright/test';

test.describe('App Setup', () => {
  test('shows setup view on first visit', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
    await expect(page.getByText("set up your property")).toBeVisible();
  });

  test('can configure property and reach main app', async ({ page }) => {
    await page.goto('/');

    const nameInput = page.locator('input[type="text"]');
    await nameInput.clear();
    await nameInput.fill('Test Villa');

    const roomsInput = page.locator('input[type="number"]');
    await roomsInput.clear();
    await roomsInput.fill('3');

    await page.getByRole('button', { name: /configure app/i }).click();

    await expect(page.getByText(/today/i).first()).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const welcome = page.getByRole('heading', { name: 'Welcome' });
    if (await welcome.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByRole('button', { name: /configure app/i }).click();
    }
    await expect(page.getByText(/today/i).first()).toBeVisible();
  });

  test('can navigate between all tabs', async ({ page }) => {
    const tabs = ['Today', 'Calendar', 'Rooms', 'Guests', 'Settings'];
    for (const tab of tabs) {
      await page.getByRole('button', { name: new RegExp(tab, 'i') }).click();
    }
  });

  test('FAB button opens new reservation modal', async ({ page }) => {
    const fab = page.locator('button.rounded-full');
    await fab.click();
    await expect(page.getByText('New Reservation')).toBeVisible();
  });
});
