import { test, expect, type Page } from '@playwright/test';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function setupWithCleaningRoom(page: Page) {
  await page.goto('/');
  const welcome = page.getByRole('heading', { name: 'Welcome' });
  if (await welcome.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByRole('button', { name: /configure app/i }).click();
  }
  await expect(page.getByText(/today/i).first()).toBeVisible();
  page.on('dialog', d => d.accept());

  // Create a reservation, check in, then check out to get a room in Cleaning status
  await page.locator('button.w-14.h-14').click();
  await page.getByText('New Guest').click();
  await page.getByPlaceholder('Guest Name').fill('Task Test Guest');
  await page.getByPlaceholder('Phone Number').fill('+7777777777');
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

  // Check in and check out via calendar
  await page.getByRole('button', { name: /calendar/i }).click();
  const bar = page.locator('[class*="absolute"][class*="cursor-pointer"]', { hasText: 'Task Test Guest' });
  await bar.click();
  await expect(page.getByText('Reservation').first()).toBeVisible();
  await page.getByRole('button', { name: /check in/i }).click();

  await bar.click();
  await expect(page.getByText('Checked In').first()).toBeVisible();
  await page.getByRole('button', { name: /check out/i }).click();

  // Go back to Today view — should now have a cleaning task
  await page.getByRole('button', { name: /today/i }).click();
  await expect(page.getByText(/today/i).first()).toBeVisible();
}

test.describe('Task Management', () => {
  test('shows auto-generated cleaning task after checkout', async ({ page }) => {
    await setupWithCleaningRoom(page);
    await expect(page.getByText(/clean/i).first()).toBeVisible();
  });

  test('completing cleaning task marks room as Available', async ({ page }) => {
    await setupWithCleaningRoom(page);

    // Find the cleaning task toggle button (the circle)
    const cleaningTask = page.locator('.flex.items-center.p-4.gap-3', { hasText: /clean/i }).first();
    const toggleBtn = cleaningTask.locator('button.rounded-full').first();
    await toggleBtn.click();

    // Verify room is now Available
    await page.getByRole('button', { name: /rooms/i }).click();
    await expect(page.getByText('Available').first()).toBeVisible();
  });

  test('can add a manual task', async ({ page }) => {
    await page.goto('/');
    const welcome = page.getByRole('heading', { name: 'Welcome' });
    if (await welcome.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByRole('button', { name: /configure app/i }).click();
    }
    await expect(page.getByText(/today/i).first()).toBeVisible();

    // Click the "Add" button next to "Today's Tasks" heading to open the modal
    const tasksSection = page.locator('div', { hasText: /today.s tasks/i });
    const addButton = tasksSection.getByRole('button', { name: /^add$/i }).first();
    await addButton.click();

    // Fill task title in the modal
    await page.getByPlaceholder(/call maria/i).fill('Buy fresh towels');

    // Submit with the "Add Task" button
    await page.getByRole('button', { name: /add task/i }).click();

    // Task should appear in the list
    await expect(page.getByText('Buy fresh towels')).toBeVisible();
  });
});
