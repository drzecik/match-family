import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('builder has no serious or critical automated accessibility violations', async ({ page }) => {
  await page.goto('/#builder');
  await expect(page.getByLabel('Urządzenie główne')).toBeEnabled();
  const results = await new AxeBuilder({ page }).include('main').analyze();
  const blocking = results.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical',
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});

test('catalog and evidence methodology have no serious or critical violations', async ({
  page,
}) => {
  for (const path of ['/katalog', '/metodologia']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).include('main').analyze();
    const blocking = results.violations.filter(
      ({ impact }) => impact === 'serious' || impact === 'critical',
    );
    expect(blocking, `${path}: ${JSON.stringify(blocking, null, 2)}`).toEqual([]);
  }
});
