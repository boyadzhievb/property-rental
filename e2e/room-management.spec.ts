import { test, expect, type Page } from '@playwright/test';

async function setupApp(page: Page) {
  await page.goto('/');
  const welcome = page.getByRole('heading', { name: 'Welcome' });
  if (await welcome.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByRole('button', { name: /configure app/i }).click();
  }
  await expect(page.getByText(/today/i).first()).toBeVisible();
}

async function navigateToRooms(page: Page) {
  await page.getByRole('button', { name: /rooms/i }).click();
  await expect(page.getByText('Rooms').first()).toBeVisible();
}

test.describe('Room Status Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
    await navigateToRooms(page);
  });

  test('rooms show Available status after setup', async ({ page }) => {
    await expect(page.getByText('Available').first()).toBeVisible();
  });

  test('can put a room into maintenance and back to available', async ({ page }) => {
    // Click "Mark for Maintenance" on first available room
    await page.getByRole('button', { name: /mark for maintenance/i }).first().click();

    // Room should now show Maintenance status
    await expect(page.getByText('Maintenance').first()).toBeVisible();

    // Click "Mark as Available" to restore it
    await page.getByRole('button', { name: /mark as available/i }).first().click();

    // Should be back to Available
    await expect(page.getByText('Available').first()).toBeVisible();
  });
});

test.describe('Room Editing', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
    await navigateToRooms(page);
  });

  test('can edit room name and price', async ({ page }) => {
    // Click the edit (pencil) button on first room card
    const editButton = page.locator('button').filter({ has: page.locator('svg.lucide-pencil') }).first();
    await editButton.click();

    // Should show edit form
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.clear();
    await nameInput.fill('Deluxe Suite');

    const priceInput = page.locator('input[type="number"]').first();
    await priceInput.clear();
    await priceInput.fill('250');

    // Save
    await page.getByRole('button', { name: /save/i }).click();

    // Should show updated name
    await expect(page.getByText('Deluxe Suite')).toBeVisible();
    await expect(page.getByText('$250')).toBeVisible();
  });

  test('can cancel editing a room', async ({ page }) => {
    const editButton = page.locator('button').filter({ has: page.locator('svg.lucide-pencil') }).first();
    await editButton.click();

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Edit form should disappear, edit button should be back
    await expect(page.locator('button').filter({ has: page.locator('svg.lucide-pencil') }).first()).toBeVisible();
  });
});

test.describe('Add Room', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
    await navigateToRooms(page);
  });

  test('can add a new room', async ({ page }) => {
    // Count initial rooms
    const initialRoomCards = await page.locator('[class*="bg-ios-card"][class*="rounded-3xl"][class*="p-5"]').count();

    // Click Add button
    await page.getByRole('button', { name: /add/i }).click();

    // Fill in new room form
    const inputs = page.locator('input[type="text"], input[type="number"]');
    const nameInput = inputs.first();
    await nameInput.fill('Pool House');

    // Submit the form
    await page.getByRole('button', { name: 'Add Room' }).click();

    // Should have one more room card
    await expect(page.getByText('Pool House')).toBeVisible();
  });
});
