import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('product page, measurement form and result have no serious accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  const widget = page.locator('material-match');

  const pageScan = await new AxeBuilder({ page }).analyze();
  expect(
    pageScan.violations.filter((violation) =>
      ['critical', 'serious'].includes(violation.impact ?? ''),
    ),
  ).toEqual([]);

  await widget.locator('#room-0-length').fill('4');
  await widget.locator('#room-0-width').fill('5');
  await widget.locator('#room-0-doorWidth').fill('0,9');
  await widget.getByRole('button', { name: 'Oblicz materiały' }).click();
  await expect(widget.getByRole('heading', { name: 'Twój zestaw materiałów' })).toBeVisible();

  const resultScan = await new AxeBuilder({ page }).include('material-match').analyze();
  expect(
    resultScan.violations.filter((violation) =>
      ['critical', 'serious'].includes(violation.impact ?? ''),
    ),
  ).toEqual([]);
});
