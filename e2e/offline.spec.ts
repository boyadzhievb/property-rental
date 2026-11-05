import { test, expect } from '@playwright/test';

// The service worker only exists in the production build: run with E2E_SERVER=preview after
// `npm run build` (CI's smoke job does). Against the dev server these tests are skipped.
test.skip(process.env.E2E_SERVER !== 'preview', 'needs the production build (E2E_SERVER=preview)');

async function openApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  const welcome = page.getByRole('heading', { name: 'Welcome' });
  await expect(welcome.or(page.getByText(/today/i).first())).toBeVisible({ timeout: 10000 });
  if (await welcome.isVisible()) {
    await page.getByRole('button', { name: /configure app/i }).click();
  }
  await expect(page.getByText(/today/i).first()).toBeVisible();
}

test.describe('Offline (service worker)', () => {
  test('the app still opens after going offline', async ({ page, context }) => {
    await openApp(page);
    // Wait until the worker controls the page, i.e. the app shell is precached.
    await page.waitForFunction(async () => (await navigator.serviceWorker.ready).active?.state === 'activated');
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByText(/today/i).first()).toBeVisible();
    await page.getByRole('button', { name: /rooms/i }).click();
    await expect(page.getByText('Room 1').first()).toBeVisible();
  });

  test('standalone pages are not replaced by the app', async ({ page }) => {
    await page.goto('/privacy-policy.html');
    await expect(page.locator('#root')).toHaveCount(0);
  });

  test('the web manifest and its icons load', async ({ page, request }) => {
    await page.goto('/');
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifest = await (await request.get(new URL(manifestHref!, page.url()).href)).json();
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      const response = await request.get(new URL(icon.src, new URL(manifestHref!, page.url())).href);
      expect(response.status(), icon.src).toBe(200);
      expect(response.headers()['content-type']).toContain('image/png');
    }
  });
});
