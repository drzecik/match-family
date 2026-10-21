import { expect, test } from '@playwright/test';

test('builder presents statuses, dimensions, evidence and search metadata in Polish', async ({
  page,
}) => {
  await page.goto('/#builder');
  await expect(page.getByLabel('Urządzenie główne')).toBeEnabled();

  const audioCard = page.getByRole('heading', { name: 'Urządzenie → audio' }).locator('../..');
  await audioCard.getByText('Wymiary i dowody').click();
  await expect(audioCard.getByText('Połączenie fizyczne', { exact: true })).toBeVisible();
  await expect(audioCard.getByText('Sygnał i protokół', { exact: true })).toBeVisible();
  await expect(audioCard.getByText('oficjalna instrukcja', { exact: false }).first()).toBeVisible();

  await page.getByLabel('Szukaj modelu lub aliasu').fill('N-7');
  await expect(page.getByText('dopasowanie: inna nazwa modelu', { exact: false })).toBeVisible();

  const graphLabel = await page
    .locator('.hero-graph')
    .evaluate((element) => getComputedStyle(element, '::after').content);
  const text = await page.locator('body').innerText();
  expect(graphLabel).toContain('FIKCYJNY KATALOG DEMONSTRACYJNY');
  expect(text).toContain(
    'Brak kolizji i winietowania potwierdzono wyłącznie przy zachowaniu podanych ograniczeń.',
  );
  expect(text).not.toMatch(
    /\b(?:READY|CHECK|SYNTHETIC|candidate|unknown|Collision-free|Workflow|short-form)\b/,
  );
});

test('public catalog and compatibility pages do not expose graph identifiers as copy', async ({
  page,
}) => {
  await page.goto('/katalog');
  await expect(page.getByRole('heading', { name: 'Urządzenia rejestrujące' })).toBeVisible();
  await expect(page.getByText('aparat lub kamera', { exact: false }).first()).toBeVisible();

  await page.goto('/zgodnosc/n7-n23');
  await expect(page.getByText('Zgodne bezpośrednio')).toBeVisible();
  await expect(page.getByText('oficjalna instrukcja', { exact: false }).first()).toBeVisible();

  const text = await page.locator('body').innerText();
  expect(text).not.toContain('directly_compatible');
  expect(text).not.toContain('official_specification');
});
