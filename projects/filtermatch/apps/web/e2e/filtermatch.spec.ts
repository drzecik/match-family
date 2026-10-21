import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function waitForSearchHydration(page: Page) {
  await expect(page.locator('astro-island:not([ssr])')).toHaveCount(1);
}

test('alias resolves to verified filters while candidate and stale price stay hidden', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('note')).toContainText('wszystkie marki i oferty');
  await waitForSearchHydration(page);
  await page.getByLabel('Model oczyszczacza').fill('AP 100 / PL');
  await page.getByRole('button', { name: 'Sprawdź model' }).click();
  await expect(page.getByText('Znaleziono jednoznaczny model')).toBeVisible();
  await page.getByRole('link', { name: /Wybierz AIRPURE AP100\/PL/i }).click();

  await expect(page).toHaveURL(/\/urzadzenia\/airpure-ap100-pl\/$/u);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AirPure AP100/PL');
  await expect(page.locator('.filter-card')).toHaveCount(2);
  await expect(page.getByText('PureFilter 100 — kompletny zestaw demonstracyjny')).toBeVisible();
  await expect(page.getByText('CF100 — demonstracyjny zestaw zamienny')).toBeVisible();
  await expect(page.getByText(/HomeBreeze/u)).toHaveCount(0);
  await expect(page.getByText('Demonstracyjna instrukcja zgodności modelu AP100')).toBeVisible();
  await expect(page.getByText(/10 lipca 2026/u).first()).toBeVisible();
  await expect(page.getByText('129,99 zł')).toBeVisible();
  await expect(page.getByText('89,99 zł')).toBeVisible();
  await expect(page.getByText('79,99 zł')).toHaveCount(0);
  await expect(page.getByText('Cena nieaktualna')).toBeVisible();
  await expect(page.getByText('Sponsorowane')).toBeVisible();
});

test('similar digit is not silently resolved and no-result is actionable', async ({ page }) => {
  await page.goto('/');
  await waitForSearchHydration(page);
  const input = page.getByLabel('Model oczyszczacza');
  await input.fill('AP 109 / PL');
  await page.getByRole('button', { name: 'Sprawdź model' }).click();
  await expect(page.getByText(/Nie znaleźliśmy|Czy chodziło/u)).toBeVisible();
  await expect(page.getByText('Pasujące filtry')).toHaveCount(0);

  await input.fill('zupełnie nieznany model');
  await page.getByRole('button', { name: 'Sprawdź model' }).click();
  await expect(page.getByText('Nie znaleźliśmy tego modelu')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Zgłoś brakujące urządzenie' })).toBeVisible();
});

test('key screens meet automated accessibility checks', async ({ page }) => {
  await page.goto('/metodologia/');
  await expect(page.getByRole('heading', { name: 'Rola sztucznej inteligencji' })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/verified_official|verified_multi_source|verified_supplier|candidate|conflicting|unknown/u);

  for (const path of ['/', '/metodologia/', '/urzadzenia/airpure-ap100-pl/', '/materialy/airpure-purefilter-100/']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${path}: ${JSON.stringify(results.violations)}`).toEqual([]);
  }
});
