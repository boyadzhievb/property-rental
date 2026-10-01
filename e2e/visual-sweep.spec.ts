import { test } from '@playwright/test';

test.describe('Visual screenshot sweep', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /seed with demo data/i }).click();
    await page.getByText(/today/i).first().waitFor();
  });

  test('Today dashboard', async ({ page }) => {
    await page.screenshot({ path: 'screenshots/01-today.png', fullPage: false });
  });

  test('Calendar view', async ({ page }) => {
    await page.getByRole('button', { name: /calendar/i }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/02-calendar.png', fullPage: false });
  });

  test('Rooms view', async ({ page }) => {
    await page.getByRole('button', { name: /rooms/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/03-rooms.png', fullPage: false });
  });

  test('Guests view', async ({ page }) => {
    await page.getByRole('button', { name: /guests/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/04-guests.png', fullPage: false });
  });

  test('Reports view', async ({ page }) => {
    await page.getByRole('button', { name: /reports/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/05-reports.png', fullPage: false });
  });

  test('Settings view', async ({ page }) => {
    await page.getByRole('button', { name: /settings/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/06-settings.png', fullPage: false });
  });

  test('New reservation — guest step', async ({ page }) => {
    const fab = page.getByRole('button', { name: /new reservation/i });
    await fab.waitFor();
    await fab.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'screenshots/07-reservation-guest-step.png', fullPage: false });
  });

  test('New reservation — stay details step', async ({ page }) => {
    const fab = page.getByRole('button', { name: /new reservation/i });
    await fab.waitFor();
    await fab.click();
    await page.waitForTimeout(400);

    // Select an existing guest by clicking their name
    await page.getByText('John Smith').first().click();

    // Go to step 2
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/08-reservation-stay-top.png', fullPage: false });

    // Scroll down to reveal recurrence section
    const scrollArea = page.locator('.overflow-y-auto').last();
    await scrollArea.evaluate(el => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'screenshots/09-reservation-stay-bottom.png', fullPage: false });
  });

  test('New reservation — new guest form', async ({ page }) => {
    const fab = page.getByRole('button', { name: /new reservation/i });
    await fab.waitFor();
    await fab.click();
    await page.waitForTimeout(400);

    // Switch to new guest form
    await page.getByText(/new guest/i).first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/07b-reservation-new-guest.png', fullPage: false });
  });

  test('Guest detail with payment history', async ({ page }) => {
    await page.getByRole('button', { name: /guests/i }).click();
    await page.waitForTimeout(300);

    // Open the first guest
    const guestCard = page.locator('main [class*="rounded-2xl"]').first();
    await guestCard.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/10-guest-detail.png', fullPage: false });
  });

  test('Calendar reservation detail', async ({ page }) => {
    await page.getByRole('button', { name: /calendar/i }).click();
    await page.waitForTimeout(500);

    // Click on a reservation bar (skip the skip-to-content link)
    const resBar = page.locator('main [class*="absolute"][class*="rounded-xl"]').first();
    if (await resBar.isVisible()) {
      await resBar.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'screenshots/11-calendar-detail.png', fullPage: false });
    }
  });
});
