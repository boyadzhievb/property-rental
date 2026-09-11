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
  await page.getByPlaceholder('Guest Name').fill('Test CheckIn');
  await page.getByPlaceholder('Phone Number').fill('+9999999999');
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

async function openReservationModal(page: Page) {
  const bar = page.locator('[class*="absolute"][class*="cursor-pointer"]', { hasText: 'Test CheckIn' });
  await bar.click();
  await expect(page.getByText('Reservation').first()).toBeVisible();
}

test.describe('Check-In / Check-Out Flow', () => {
  test('check in a confirmed reservation via calendar', async ({ page }) => {
    await setupWithReservation(page);
    page.on('dialog', d => d.accept());

    await page.getByRole('button', { name: /calendar/i }).click();
    await openReservationModal(page);
    await expect(page.getByText('Confirmed').first()).toBeVisible();

    await page.getByRole('button', { name: /check in/i }).click();

    // Modal closes after action — re-open to verify
    await openReservationModal(page);
    await expect(page.getByText('Checked In').first()).toBeVisible();
  });

  test('check out a checked-in reservation via calendar', async ({ page }) => {
    await setupWithReservation(page);
    page.on('dialog', d => d.accept());

    await page.getByRole('button', { name: /calendar/i }).click();

    // Check in first
    await openReservationModal(page);
    await page.getByRole('button', { name: /check in/i }).click();

    // Now check out
    await openReservationModal(page);
    await expect(page.getByText('Checked In').first()).toBeVisible();
    await page.getByRole('button', { name: /check out/i }).click();

    // Verify checked out
    await openReservationModal(page);
    await expect(page.getByText('Checked Out').first()).toBeVisible();

    // Close modal and verify room moved to Cleaning
    await page.locator('[role="dialog"]').locator('button').first().click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await page.getByRole('button', { name: /rooms/i }).click();
    await expect(page.getByText('Cleaning').first()).toBeVisible();
  });
});

test.describe('Cancellation Flow', () => {
  test('cancel a confirmed reservation', async ({ page }) => {
    await setupWithReservation(page);
    page.on('dialog', d => d.accept());

    await page.getByRole('button', { name: /calendar/i }).click();
    await openReservationModal(page);
    await expect(page.getByText('Confirmed').first()).toBeVisible();

    await page.getByRole('button', { name: /cancel reservation/i }).click();

    // Re-open to verify
    await openReservationModal(page);
    await expect(page.getByText('Cancelled').first()).toBeVisible();
  });

  test('cancel a checked-in reservation sets room to Cleaning', async ({ page }) => {
    await setupWithReservation(page);
    page.on('dialog', d => d.accept());

    await page.getByRole('button', { name: /calendar/i }).click();

    // Check in first
    await openReservationModal(page);
    await page.getByRole('button', { name: /check in/i }).click();

    // Cancel
    await openReservationModal(page);
    await page.getByRole('button', { name: /cancel reservation/i }).click();

    // Verify cancelled
    await openReservationModal(page);
    await expect(page.getByText('Cancelled').first()).toBeVisible();

    // Close modal and verify room is Cleaning
    await page.locator('[role="dialog"]').locator('button').first().click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await page.getByRole('button', { name: /rooms/i }).click();
    await expect(page.getByText('Cleaning').first()).toBeVisible();
  });
});
