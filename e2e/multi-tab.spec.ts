import { test, expect, type Page } from '@playwright/test';

async function openApp(page: Page) {
  await page.goto('/');
  const welcome = page.getByRole('heading', { name: 'Welcome' });
  // isVisible() checks once without waiting; first wait until either screen has rendered.
  await expect(welcome.or(page.getByText(/today/i).first())).toBeVisible({ timeout: 10000 });
  if (await welcome.isVisible()) {
    await page.getByRole('button', { name: /configure app/i }).click();
  }
  await expect(page.getByText(/today/i).first()).toBeVisible();
}

async function openRooms(page: Page) {
  await page.getByRole('button', { name: /rooms/i }).click();
  await expect(page.getByText('Rooms').first()).toBeVisible();
}

// Two pages in one browser context share IndexedDB and BroadcastChannel, like two tabs.
test.describe('Changes in another tab', () => {
  test('a room status change shows up in the other tab without reloading', async ({ page, context }) => {
    await openApp(page);
    await openRooms(page);
    await expect(page.getByText('Maintenance')).toHaveCount(0);

    const otherTab = await context.newPage();
    await openApp(otherTab);
    await openRooms(otherTab);
    await otherTab.getByRole('button', { name: /mark for maintenance/i }).first().click();
    await expect(otherTab.getByText('Maintenance').first()).toBeVisible();

    await expect(page.getByText('Maintenance').first()).toBeVisible();
  });

  test('a renamed property shows up in the other tab', async ({ page, context }) => {
    await openApp(page);
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(page.getByText('Seaside Lodge')).toHaveCount(0);

    const otherTab = await context.newPage();
    await openApp(otherTab);
    await otherTab.getByRole('button', { name: /settings/i }).click();
    await otherTab.getByText('Owner Account').click();
    await otherTab.getByLabel('Property Name').fill('Seaside Lodge');
    await otherTab.getByLabel('Property Name').press('Enter');
    await expect(otherTab.getByText('Seaside Lodge')).toBeVisible();

    await expect(page.getByText('Seaside Lodge')).toBeVisible();
  });
});
