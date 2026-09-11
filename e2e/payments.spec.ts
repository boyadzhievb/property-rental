import { test, expect, type Page } from '@playwright/test';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function setupWithReservation(page: Page) {
  await page.goto('/');
  const welcome = page.getByRole('heading', { name: 'Welcome' });
  if (await welcome.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByRole('button', { name: /configure app/i }).click();
  }
  await expect(page.getByText(/today/i).first()).toBeVisible();

  await page.locator('button.w-14.h-14').click();
  await page.getByText('New Guest').click();
  await page.getByPlaceholder('Guest Name').fill('Payment Test Guest');
  await page.getByPlaceholder('Phone Number').fill('+8888888888');
  await page.getByRole('button', { name: 'Next' }).click();

  const roomButtons = page.locator('[class*="rounded-full"][class*="text-sm"]');
  await roomButtons.first().click();

  const today = new Date();
  const inFiveDays = new Date();
  inFiveDays.setDate(inFiveDays.getDate() + 5);

  await page.locator('input[type="date"]').first().fill(formatDate(today));
  await page.locator('input[type="date"]').nth(1).fill(formatDate(inFiveDays));
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('New Reservation')).not.toBeVisible();
}

test.describe('Payment Recording', () => {
  test('records a payment and shows updated balance', async ({ page }) => {
    await setupWithReservation(page);

    await page.getByRole('button', { name: /calendar/i }).click();

    const bar = page.locator('.absolute.cursor-pointer', { hasText: 'Payment Test Guest' });
    await bar.click();

    // Verify payment section is visible
    await expect(page.getByText('Total').first()).toBeVisible();
    await expect(page.getByText('Paid').first()).toBeVisible();

    // Click Add to show payment form
    const addButton = page.locator('button', { hasText: /^add$/i });
    await addButton.click();

    // Fill payment form
    await page.locator('input[type="number"]').last().fill('200');

    // Select card payment method
    await page.locator('button', { hasText: 'card' }).click();

    // Record payment
    await page.getByRole('button', { name: /record payment/i }).click();

    // Payment should appear in history
    await expect(page.getByText('$200').first()).toBeVisible();
    await expect(page.getByText('card').first()).toBeVisible();
  });

  test('shows error when payment exceeds balance', async ({ page }) => {
    await setupWithReservation(page);

    await page.getByRole('button', { name: /calendar/i }).click();

    const bar = page.locator('.absolute.cursor-pointer', { hasText: 'Payment Test Guest' });
    await bar.click();

    const addButton = page.locator('button', { hasText: /^add$/i });
    await addButton.click();

    // Try to pay more than the total price
    await page.locator('input[type="number"]').last().fill('999999');
    await page.getByRole('button', { name: /record payment/i }).click();

    // Should show error message
    await expect(page.getByText(/exceeds remaining balance/i)).toBeVisible();
  });
});
