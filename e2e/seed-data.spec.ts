import { test, expect } from '@playwright/test';

test.describe('Seed Data', () => {
  test('loads demo data and shows populated dashboard', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /seed with demo data/i }).click();

    // Should land on Today view with property name
    await expect(page.getByText(/today/i).first()).toBeVisible();

    // Stats should be visible
    await expect(page.getByText('Arrivals')).toBeVisible();
    await expect(page.getByText('Departures')).toBeVisible();
    await expect(page.getByText('Occupied')).toBeVisible();
    await expect(page.getByText('Cleaning')).toBeVisible();
    await expect(page.getByText('Tasks')).toBeVisible();
  });

  test('seeded data shows rooms', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /seed with demo data/i }).click();
    await expect(page.getByText(/today/i).first()).toBeVisible();

    await page.getByRole('button', { name: /rooms/i }).click();

    // Should have multiple room cards
    const roomCards = page.locator('[class*="bg-ios-card"][class*="rounded-3xl"][class*="p-5"]');
    await expect(roomCards).not.toHaveCount(0);
  });

  test('seeded data shows guests with phone numbers', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /seed with demo data/i }).click();
    await expect(page.getByText(/today/i).first()).toBeVisible();

    await page.getByRole('button', { name: /guests/i }).click();

    // Should have guest entries with phone numbers
    await expect(page.getByText(/555-0100/).first()).toBeVisible();
  });

  test('seeded data shows reservations on calendar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /seed with demo data/i }).click();
    await expect(page.getByText(/today/i).first()).toBeVisible();

    await page.getByRole('button', { name: /calendar/i }).click();

    // Calendar should show room names in the left column
    const roomLabels = page.locator('[class*="w-20"]').filter({ hasText: /room|suite|studio|ocean|garden|villa/i });
    const count = await roomLabels.count();
    expect(count).toBeGreaterThan(0);
  });

  test('reports tab shows financial summary', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /seed with demo data/i }).click();
    await expect(page.getByText(/today/i).first()).toBeVisible();

    await page.getByRole('button', { name: /reports/i }).click();

    // Should show report cards
    await expect(page.getByText('Collected')).toBeVisible();
    await expect(page.getByText('Booked revenue')).toBeVisible();
    await expect(page.getByText('Outstanding')).toBeVisible();
    await expect(page.getByText('Occupancy')).toBeVisible();
  });
});
