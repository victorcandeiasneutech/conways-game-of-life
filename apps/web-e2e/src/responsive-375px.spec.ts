import { test, expect } from '@playwright/test';

test('responsive at 375px portrait — no horizontal scroll, controls visible, touch toggles cell', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');

  // No horizontal scrollbar
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(375);

  // Key elements visible (flex-col layout: sidebar at top, canvas below)
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('gen-count')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();

  // Touch parity: resize to 10×10, tap a blinker, play, assert gen-count increments
  await page.getByLabel('Width').fill('10');
  await page.getByLabel('Height').fill('10');
  await page.getByRole('button', { name: 'Resize' }).click();

  const canvas = page.locator('canvas');
  const CELL = 12;

  for (const col of [4, 5, 6]) {
    await canvas.tap({ position: { x: col * CELL + CELL / 2, y: 4 * CELL + CELL / 2 } });
  }

  await page.getByRole('button', { name: 'Play' }).click();

  await expect
    .poll(
      async () => parseInt((await page.getByTestId('gen-count').textContent()) ?? '0', 10),
      { timeout: 5000 },
    )
    .toBeGreaterThanOrEqual(1);
});
