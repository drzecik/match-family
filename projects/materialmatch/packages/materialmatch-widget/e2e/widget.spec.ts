import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const fixture of ['fixture.html', 'fixture-iife.html']) {
  test(`${fixture} registers the standalone element and completes the reference flow`, async ({
    page,
  }) => {
    await page.goto(`/e2e/${fixture}`);
    const widget = page.locator('material-match');
    await widget.locator('#room-0-length').fill('4');
    await widget.locator('#room-0-width').fill('5');
    await widget.locator('#room-0-doorWidth').fill('0,9');
    await expect(widget.getByLabel('Narożniki wewnętrzne')).toHaveValue('4');
    await expect(widget.getByLabel('Narożniki zewnętrzne')).toHaveValue('0');
    await widget.getByLabel('Narożniki wewnętrzne').fill('6');
    await widget.getByLabel('Narożniki zewnętrzne').fill('2');
    await widget.getByRole('button', { name: 'Oblicz materiały' }).click();

    await expect(widget.getByRole('heading', { name: 'Twój zestaw materiałów' })).toBeVisible();
    await expect(widget.getByRole('row', { name: /Fikcyjne panele Natural 8/ })).toContainText(
      '10 opak.',
    );
    const accessibility = await new AxeBuilder({ page }).include('material-match').analyze();
    expect(
      accessibility.violations.filter((violation) =>
        ['critical', 'serious'].includes(violation.impact ?? ''),
      ),
    ).toEqual([]);
  });
}
