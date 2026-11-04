import { test, expect } from '@playwright/test';

test.describe('Currency from device region', () => {
  test.use({ locale: 'de-DE' });

  test('setup pre-selects the euro and prices are shown in euros', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Currency')).toHaveValue('EUR');

    await page.getByRole('button', { name: /configure app/i }).click();
    await expect(page.getByText(/today/i).first()).toBeVisible();

    await page.getByRole('button', { name: /rooms/i }).click();
    await expect(page.getByText('€100').first()).toBeVisible();
    await expect(page.getByText('$100')).toHaveCount(0);
  });
});
