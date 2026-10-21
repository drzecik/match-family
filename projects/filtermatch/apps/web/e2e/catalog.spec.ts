import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('expanded catalog exposes the complete verified demo scope and hides negative fixtures', async ({ page }) => {
  await page.goto('/katalog/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Urządzenia, elementy i akcesoria');
  await expect(page.getByText('4', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('9', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /HomeBreeze HB200\/PL/u })).toBeVisible();
  await expect(page.getByRole('link', { name: /HomeBreeze HB200\/DE/u })).toBeVisible();
  await expect(page.getByRole('link', { name: /CleanFlow CF300\/10/u })).toBeVisible();
  await expect(page.getByText(/niezweryfikowany|sprzecznymi źródłami/u)).toHaveCount(0);
  // Coverage is stated against a named scope and revision, never against the market.
  const banner = page.getByRole('note');
  await expect(banner).toContainText('demo-catalog-v1');
  await expect(banner).toContainText('Nie opisuje ona dostępności ani pokrycia rynku.');
  await expect(banner).not.toContainText('kompletn');
});

test('device result separates required set, alternative and optional accessory with package contents', async ({ page }) => {
  await page.goto('/urzadzenia/homebreeze-hb200-pl/');
  await expect(page.locator('.filter-card')).toHaveCount(3);

  const required = page.locator('.relation-group').filter({ has: page.getByRole('heading', { name: 'Wymagane materiały (1)' }) });
  const alternatives = page.locator('.relation-group').filter({ has: page.getByRole('heading', { name: 'Zweryfikowane alternatywy (1)' }) });
  const accessories = page.locator('.relation-group').filter({ has: page.getByRole('heading', { name: 'Opcjonalne akcesoria (1)' }) });
  await expect(required.locator('.filter-card')).toHaveCount(1);
  await expect(alternatives.locator('.filter-card')).toHaveCount(1);
  await expect(accessories.locator('.filter-card')).toHaveCount(1);

  // The accessory must live in its own group, never among required materials.
  await expect(accessories.getByText('Breeze 200 — ramka montażowa i uszczelka (dane demonstracyjne)')).toBeVisible();
  await expect(accessories.getByText('Nie są wymagane do zgodności ani do wymiany filtrów.')).toBeVisible();
  await expect(required.getByText('Breeze 200 — ramka montażowa i uszczelka (dane demonstracyjne)')).toHaveCount(0);

  await expect(required.getByText('1 × filtr HEPA Breeze 200 — element demonstracyjny')).toBeVisible();
  await expect(required.getByText('1 × filtr węglowy Breeze 200 — element demonstracyjny')).toBeVisible();
  await expect(accessories.getByText('1 × ramka montażowa — element demonstracyjny')).toBeVisible();
  await expect(accessories.getByText('1 × uszczelka obwodowa — element demonstracyjny')).toBeVisible();
  await expect(page.getByText('CF200 HEPA — niezweryfikowany kandydat demonstracyjny')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/\bfixture\b|\bSynthetic\b/u);
});

test('regional variants remain distinct and show different required element structure', async ({ page }) => {
  await page.goto('/urzadzenia/homebreeze-hb200-de/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('HB200/DE');
  await expect(page.locator('.filter-card')).toHaveCount(3);
  const required = page.locator('.relation-group').filter({ has: page.getByRole('heading', { name: 'Wymagane materiały (2)' }) });
  await expect(required.locator('.filter-card')).toHaveCount(2);
  await expect(required.getByText('Breeze 200 — oryginalny filtr HEPA (dane demonstracyjne)')).toBeVisible();
  await expect(required.getByText('Breeze 200 — oryginalny filtr węglowy (dane demonstracyjne)')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Opcjonalne akcesoria/u })).toHaveCount(0);
});

test('non-publishable device stays noindex and never shows compatibility', async ({ page }) => {
  await page.goto('/urzadzenia/airpure-ap101-pl/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  await expect(page.locator('.filter-card')).toHaveCount(0);
  await expect(page.getByText(/HB101.+sprzecznymi źródłami/u)).toHaveCount(0);
});

test('local correction form prepares a report without sending data', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:45321' });
  await page.goto('/urzadzenia/homebreeze-hb200-pl/');
  await page.getByLabel('Opisz problem').fill('Brakuje informacji o liczbie elementów w zestawie.');
  await page.getByRole('button', { name: 'Skopiuj przygotowane zgłoszenie' }).click();
  await expect(page.getByRole('status')).toHaveText('Zgłoszenie skopiowane do schowka.');
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain('Encja: homebreeze-hb200-pl');
});

test('expanded catalog and accessory result meet automated accessibility checks', async ({ page }) => {
  for (const path of ['/katalog/', '/urzadzenia/homebreeze-hb200-pl/', '/materialy/homebreeze-breeze200-seal-frame/']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${path}: ${JSON.stringify(results.violations)}`).toEqual([]);
  }
});
