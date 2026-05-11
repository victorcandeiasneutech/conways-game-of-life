import { test, expect } from '@playwright/test';

test('happy path — blinker runs for at least one generation', async ({ page }) => {
  await page.goto('/');

  // Resize grid to 10×10
  await page.getByLabel('Width').fill('10');
  await page.getByLabel('Height').fill('10');
  await page.getByRole('button', { name: 'Resize' }).click();

  // Click three adjacent cells in row 4 to form a horizontal blinker.
  // Canvas is 120×120px (10 cells × 12px each, CELL_PX constant in page.tsx).
  const canvas = page.locator('canvas');
  const CELL = 12;

  for (const col of [4, 5, 6]) {
    await canvas.click({
      position: { x: col * CELL + CELL / 2, y: 4 * CELL + CELL / 2 },
    });
  }

  // Start the simulation
  await page.getByRole('button', { name: 'Play' }).click();

  // Assert the generation counter reaches >= 1 — no sleeps, no exact count
  await expect
    .poll(
      async () =>
        parseInt((await page.getByTestId('gen-count').textContent()) ?? '0', 10),
      { timeout: 5000 },
    )
    .toBeGreaterThanOrEqual(1);
});
