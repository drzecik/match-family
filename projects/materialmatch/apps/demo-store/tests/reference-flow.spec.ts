import { expect, test } from '@playwright/test';

test('product page presents the value proposition and routes to the live calculator', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Mniej zgadywania. Więcej gotowych koszyków.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Kalkulator, który rozumie produkt.' }),
  ).toBeVisible();
  await expect(page.getByText('Bez zewnętrznej usługi')).toBeVisible();
  await expect(page.getByText('Dane zostają w sklepie')).toBeVisible();

  await page.getByRole('link', { name: 'Policz przykładowy projekt' }).click();
  await expect(
    page.getByRole('heading', { name: 'Przelicz sprawdzony scenariusz krok po kroku.' }),
  ).toBeVisible();
  await expect(page.locator('material-match')).toBeVisible();

  const viewport = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.contentWidth).toBeLessThanOrEqual(viewport.viewportWidth);
});

test('reference room calculates exact packages and adds available lines to the demo cart', async ({
  page,
}) => {
  await page.goto('/');
  const widget = page.locator('material-match');
  await widget.locator('#room-0-length').fill('4');
  await widget.locator('#room-0-width').fill('5');
  await widget.locator('#room-0-doorWidth').fill('0,9');
  await widget.getByRole('button', { name: 'Oblicz materiały' }).click();

  await expect(widget.getByRole('heading', { name: 'Twój zestaw materiałów' })).toBeVisible();
  await expect(widget.getByText('20 m²', { exact: true })).toBeVisible();
  await expect(widget.getByText('21,6 m²', { exact: true })).toBeVisible();
  await expect(widget.getByRole('row', { name: /Fikcyjne panele Natural 8/ })).toContainText(
    '10 opak.',
  );
  await expect(widget.getByRole('row', { name: /Fikcyjny podkład 10 m²/ })).toContainText('3 rol.');
  await expect(widget.getByRole('row', { name: /Fikcyjna listwa 2,4 m/ })).toContainText('8 szt.');

  await widget.getByRole('button', { name: 'Dodaj zestaw do koszyka' }).click();
  await expect(page.getByRole('heading', { name: 'Twój zestaw', exact: true })).toBeFocused();
  await expect(page.locator('#cart-lines li')).toHaveCount(3);
  await expect(page.locator('.cart-button')).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Escape');
  await expect(page.locator('#demo-cart')).toBeHidden();
  await expect(page.locator('.cart-button')).toBeFocused();
});

test('keyboard user receives validation feedback and can correct the project', async ({ page }) => {
  await page.goto('/');
  const widget = page.locator('material-match');
  await widget.locator('#room-0-length').fill('-1');
  await widget.locator('#room-0-width').fill('5');
  await widget.getByRole('button', { name: 'Oblicz materiały' }).click();

  await expect(widget.locator('#room-0-length')).toBeFocused();
  await expect(widget.locator('#room-0-length')).toHaveAttribute('aria-invalid', 'true');
  await expect(widget.getByRole('alert')).toContainText('Sprawdź oznaczone pola');
});
