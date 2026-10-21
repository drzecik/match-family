import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('white-label widget returns only verified merchant products and emits private events', async ({ page }) => {
  await page.goto('http://127.0.0.1:45322/');
  await expect(page).toHaveTitle('Demonstrator widgetu FilterMatch');
  await expect(page.getByRole('heading', { name: 'Dobierz filtr lub akcesorium' })).toBeVisible();
  await page.getByLabel('Model urządzenia').fill('AP 420 /10');
  await page.getByRole('button', { name: 'Pokaż produkty' }).click();

  await expect(page.getByText('AirPure Pure 420 — filtr oryginalny')).toBeVisible();
  await expect(page.getByText('CleanFlow CF420 — filtr zamienny')).toBeVisible();
  await expect(page.getByText('AirPure 420 — zestaw uszczelniający')).toBeVisible();
  await expect(page.getByText('Produkt wymagany')).toBeVisible();
  await expect(page.getByText('Zweryfikowana alternatywa')).toBeVisible();
  await expect(page.getByText('Akcesorium opcjonalne')).toBeVisible();
  await expect(page.getByText('HomeBreeze 420 — niezweryfikowany kandydat')).toHaveCount(0);

  const eventOutput = page.locator('#events');
  await expect(eventOutput).toContainText('Znaleziono jednoznaczne dopasowanie');
  await expect(eventOutput).not.toContainText('znormalizowane');
  await expect(eventOutput).not.toContainText('maybe420');
  await expect(page.locator('body')).not.toContainText(/\bfixture\b|\bSynthetic\b/u);
});

test('white-label widget reports no result without disclosing the query', async ({ page }) => {
  await page.goto('http://127.0.0.1:45322/');
  await page.getByLabel('Model urządzenia').fill('MODEL 999/XX');
  await page.getByRole('button', { name: 'Pokaż produkty' }).click();
  await expect(page.getByText(/Brak modelu|Wybierz dokładniejszy model/u)).toBeVisible();
  await expect(page.locator('#events')).toContainText('Nie znaleziono bezpiecznego dopasowania');
  await expect(page.locator('#events')).not.toContainText('MODEL 999');
});

test('widget demonstrator meets automated accessibility checks', async ({ page }) => {
  await page.goto('http://127.0.0.1:45322/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, JSON.stringify(results.violations)).toEqual([]);
});
