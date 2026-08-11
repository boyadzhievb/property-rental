import { test, expect, type Page } from '@playwright/test';

async function setupApp(page: Page) {
  await page.goto('/');
  const welcome = page.getByRole('heading', { name: 'Welcome' });
  if (await welcome.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByRole('button', { name: /configure app/i }).click();
  }
  await expect(page.getByText(/today/i).first()).toBeVisible();
}

async function seedApp(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /seed with demo data/i }).click();
  await expect(page.getByText(/today/i).first()).toBeVisible();
}

test.describe('Reservation Creation - New Guest', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
  });

  test('creates a reservation with a new guest', async ({ page }) => {
    await page.locator('button.rounded-full').click();
    await expect(page.getByText('New Reservation')).toBeVisible();

    // Step 1: Create a new guest
    await page.getByText('New Guest').click();
    await page.getByPlaceholder('Guest Name').fill('John Doe');
    await page.getByPlaceholder('Phone Number').fill('+1234567890');
    await page.getByPlaceholder(/email/i).fill('john@example.com');

    // Go to step 2
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2: Stay details
    await expect(page.getByText('Stay Details')).toBeVisible();

    // Select first room
    const roomButtons = page.locator('[class*="rounded-full"][class*="text-sm"]');
    await roomButtons.first().click();

    // Set dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 8);

    const checkInInput = page.locator('input[type="date"]').first();
    const checkOutInput = page.locator('input[type="date"]').nth(1);

    await checkInInput.fill(formatDate(tomorrow));
    await checkOutInput.fill(formatDate(nextWeek));

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    // Modal should close
    await expect(page.getByText('New Reservation')).not.toBeVisible();

    // Verify guest appears in guests tab
    await page.getByRole('button', { name: /guests/i }).click();
    await expect(page.getByText('John Doe')).toBeVisible();
  });

  test('validates guest name is required', async ({ page }) => {
    await page.locator('button.rounded-full').click();
    await page.getByText('New Guest').click();

    // Try to proceed without filling name
    await page.getByRole('button', { name: 'Next' }).click();

    // Should show validation error and stay on step 1
    await expect(page.getByText('New Guest').first()).toBeVisible();
  });

  test('validates room selection is required', async ({ page }) => {
    await page.locator('button.rounded-full').click();
    await page.getByText('New Guest').click();
    await page.getByPlaceholder('Guest Name').fill('Test User');
    await page.getByPlaceholder('Phone Number').fill('+1111111111');

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Stay Details')).toBeVisible();

    // Try to save without selecting a room or dates
    await page.getByRole('button', { name: 'Save' }).click();

    // Should show validation error
    await expect(page.getByText('Stay Details')).toBeVisible();
  });
});

test.describe('Reservation Creation - Existing Guest', () => {
  test('creates reservation selecting from seeded guests', async ({ page }) => {
    await seedApp(page);

    await page.locator('button.rounded-full').click();
    await expect(page.getByText('New Reservation')).toBeVisible();

    // Should show guest list with search
    await expect(page.getByPlaceholder('Search guests...')).toBeVisible();

    // Select first guest from the list
    const guestButtons = page.locator('[class*="w-full"][class*="flex"][class*="items-center"][class*="justify-between"][class*="p-4"]');
    await guestButtons.first().click();

    // Go to step 2
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Stay Details')).toBeVisible();
  });

  test('can search guests by name', async ({ page }) => {
    await seedApp(page);

    await page.locator('button.rounded-full').click();
    const searchInput = page.getByPlaceholder('Search guests...');
    await searchInput.fill('zzzznonexistent');

    await expect(page.getByText('No guests found')).toBeVisible();
  });
});

test.describe('Reservation - Date Conflict', () => {
  test('prevents double-booking a room', async ({ page }) => {
    await setupApp(page);

    // Create first reservation
    await page.locator('button.rounded-full').click();
    await page.getByText('New Guest').click();
    await page.getByPlaceholder('Guest Name').fill('First Guest');
    await page.getByPlaceholder('Phone Number').fill('+1111111111');
    await page.getByRole('button', { name: 'Next' }).click();

    const roomButtons = page.locator('[class*="rounded-full"][class*="text-sm"]');
    await roomButtons.first().click();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const inFiveDays = new Date();
    inFiveDays.setDate(inFiveDays.getDate() + 5);

    await page.locator('input[type="date"]').first().fill(formatDate(tomorrow));
    await page.locator('input[type="date"]').nth(1).fill(formatDate(inFiveDays));
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('New Reservation')).not.toBeVisible();

    // Try to create overlapping reservation for same room
    await page.locator('button.rounded-full').click();
    await page.getByText('New Guest').click();
    await page.getByPlaceholder('Guest Name').fill('Second Guest');
    await page.getByPlaceholder('Phone Number').fill('+2222222222');
    await page.getByRole('button', { name: 'Next' }).click();

    // Select same room
    await roomButtons.first().click();

    // Overlapping dates
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const inFourDays = new Date();
    inFourDays.setDate(inFourDays.getDate() + 4);

    await page.locator('input[type="date"]').first().fill(formatDate(dayAfterTomorrow));
    await page.locator('input[type="date"]').nth(1).fill(formatDate(inFourDays));
    await page.getByRole('button', { name: 'Save' }).click();

    // Should show conflict error
    await expect(page.getByText(/already booked/i)).toBeVisible();
  });
});

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
