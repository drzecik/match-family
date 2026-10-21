import { expect, test } from '@playwright/test';

test('builds the complete synthetic travel rig', async ({ page }) => {
  await page.goto('/#builder');
  await expect(
    page.getByRole('heading', { name: 'Przetestuj pełny przepływ konfiguratora' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Podróżny vlog' }).click();
  await expect(page.getByText('Zestaw jest kompletny')).toBeVisible();
  await expect(page.getByLabel('Klatka')).toHaveValue('motionrig-n7-form-cage');
  await expect(page.getByText('Klatka i mocowania potwierdzone')).toBeVisible();
  await expect(page.getByText('Udźwig i gabaryty potwierdzone')).toBeVisible();
  await expect(page.getByLabel('Filtr okrągły')).toHaveValue('clearfilter-vnd-67');
  await expect(page.getByLabel('Pierścień zwiększający średnicę')).toHaveValue('clearfilter-step-up-49-67');
  await expect(
    page.getByText('Zgodne przez dokładny pierścień zwiększający średnicę, z ograniczeniami'),
  ).toBeVisible();
  await expect(page.getByLabel('Źródło zasilania')).toHaveValue('powerframe-pd-72');
  await expect(page.getByLabel('Przewód zasilający')).toHaveValue('powerframe-usbc-pd-60-cable');
  await expect(page.getByText('Zgodne tylko jako zasilanie stacjonarne')).toBeVisible();
  await expect(page.getByText('Masa zestawu: 1029 g', { exact: false })).toBeVisible();
  await expect(page.getByText('2431 g')).toBeVisible();
  await expect(page.getByText('8 h 6 min', { exact: false })).toBeVisible();
  await expect(
    page
      .getByRole('heading', { name: 'Lista zakupowa' })
      .locator('..')
      .getByText('MotionRig N7 Form Cage', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Relacje niepotwierdzone').locator('..').getByText('0'),
  ).toBeVisible();
});

test('rejects a card that is too small for the planned recording time', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Podróżny vlog' }).click();
  await page.getByLabel('Karta pamięci').selectOption('swiftcard-v90-128');
  await expect(page.getByText('Karta jest za mała na planowany czas')).toBeVisible();
  await expect(page.getByText('Zestaw ma konflikt krytyczny')).toBeVisible();
});

test('supports a direct filter without an unnecessary ring', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Podróżny vlog' }).click();
  await page.getByLabel('Filtr okrągły').selectOption('clearfilter-protect-49');
  await page.getByLabel('Pierścień zwiększający średnicę').selectOption('');
  await expect(page.getByText('Filtr i kompendium potwierdzone')).toBeVisible();
  await expect(page.getByText('Zestaw wymaga uzupełnienia')).toBeVisible();
  await expect(page.getByText('Nie można potwierdzić stabilizatora')).toBeVisible();
});

test('rejects a matching thread when the clear aperture causes vignetting', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Podróżny vlog' }).click();
  await page.getByLabel('Filtr okrągły').selectOption('clearfilter-vnd-49-narrow');
  await page.getByLabel('Pierścień zwiększający średnicę').selectOption('');
  await expect(page.getByText('Konflikt mechaniczny albo winietowanie')).toBeVisible();
  await expect(page.getByText('Zestaw ma konflikt krytyczny')).toBeVisible();
});

test('keeps the candidate matte-box path unknown and non-recommendable', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByLabel('Urządzenie główne').selectOption('novacam-x1');
  await page.getByLabel('Obiektyw').selectOption('clearlens-l50');
  await page.getByLabel('Filtr okrągły').selectOption('clearfilter-cpl-82');
  await page.getByLabel('Kompendium').selectOption('motionrig-matte-cine-95-candidate');
  await expect(page.getByText('Nie można potwierdzić toru optycznych akcesoriów')).toBeVisible();
  await expect(page.getByText('Zestaw jest kompletny')).not.toBeVisible();
});

test('rejects USB-C shape without the required USB PD profile', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Podróżny vlog' }).click();
  await page.getByLabel('Źródło zasilania').selectOption('powerframe-legacy-5');
  await expect(page.getByText('Brak wymaganego profilu USB Power Delivery')).toBeVisible();
  await expect(page.getByText('Zestaw ma konflikt krytyczny')).toBeVisible();
});

test('does not recommend an incomplete electrical path', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Podróżny vlog' }).click();
  await page.getByLabel('Przewód zasilający').selectOption('');
  await expect(page.getByText('Nie można potwierdzić toru zasilania')).toBeVisible();
  await expect(page.getByText('Nie można potwierdzić stabilizatora')).toBeVisible();
  await expect(page.getByText('Zestaw wymaga uzupełnienia')).toBeVisible();
});

test('rejects a body-specific cage mounted on the wrong camera', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Podróżny vlog' }).click();
  await page.getByLabel('Klatka').selectOption('motionrig-x1-form-cage');
  await expect(page.getByText('Klatka nie pasuje do tego korpusu')).toBeVisible();
  await expect(page.getByText('Zestaw ma konflikt krytyczny')).toBeVisible();
});

test('rejects a camera rig on the phone-only gimbal', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Podróżny vlog' }).click();
  await page.getByLabel('Stabilizator gimbalowy').selectOption('motionrig-pocket-lite');
  await expect(page.getByText('Przekroczony udźwig stabilizatora')).toBeVisible();
  await expect(page.getByText('Zestaw ma konflikt krytyczny')).toBeVisible();
});

test('invalidates the mechanical profile when a scoped component changes', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Podróżny vlog' }).click();
  await page.getByLabel('Mikrofon / odbiornik').selectOption('echomic-lav-r');
  await expect(page.getByText('Nie można potwierdzić klatki')).toBeVisible();
  await expect(page.getByText('Nie można potwierdzić stabilizatora')).toBeVisible();
  await expect(page.getByText('Zestaw wymaga uzupełnienia')).toBeVisible();
});

test('builds the mobile template with the phone gimbal', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Mobilne krótkie filmy pionowe' }).click();
  await expect(page.getByLabel('Stabilizator gimbalowy')).toHaveValue('motionrig-pocket-lite');
  await expect(page.getByText('Udźwig i gabaryty potwierdzone')).toBeVisible();
  await expect(page.getByText('Zestaw jest kompletny')).toBeVisible();
});

test('validates the complete studio M3 path end to end', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Studio YouTube' }).click();
  await expect(
    page.getByLabel('Monitor, rejestrator lub urządzenie do transmisji'),
  ).toHaveValue('viewframe-field-5');
  await expect(
    page.getByRole('heading', { name: 'Aparat → przewód → obraz' }).locator('..').locator('..'),
  ).toContainText('Zgodne z jawnymi ograniczeniami');
  await expect(
    page
      .getByRole('heading', { name: 'Zestaw → głowica → statyw lub teleprompter' })
      .locator('..')
      .locator('..'),
  ).toContainText('Zgodne z jawnymi ograniczeniami');
  await expect(
    page
      .getByRole('heading', { name: 'Lampa → modyfikator → statyw → zasilanie' })
      .locator('..')
      .locator('..'),
  ).toContainText('Zgodne z jawnymi ograniczeniami');
  await expect(page.getByText('Zestaw jest kompletny')).toBeVisible();
  await expect(
    page.getByText('Relacje niepotwierdzone').locator('..').getByText('0'),
  ).toBeVisible();
});

test('rejects a protocol-compatible connector paired with a legacy video cable', async ({
  page,
}) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Film produktowy' }).click();
  await page.getByLabel('Przewód obrazu').selectOption('signalbridge-micro-a-hdmi14');
  await expect(
    page.getByRole('heading', { name: 'Aparat → przewód → obraz' }).locator('..').locator('..'),
  ).toContainText('Konfiguracja niezgodna');
  await expect(page.getByText('Zestaw ma konflikt krytyczny')).toBeVisible();
});

test('rejects an unsafe light power supply with the wrong exact voltage', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Film produktowy' }).click();
  await page.getByLabel('Zasilacz lampy').selectOption('powerframe-ac-75-15v');
  await expect(
    page
      .getByRole('heading', { name: 'Lampa → modyfikator → statyw → zasilanie' })
      .locator('..')
      .locator('..'),
  ).toContainText('Konfiguracja niezgodna');
  await expect(page.getByText('Zestaw ma konflikt krytyczny')).toBeVisible();
});

test('loads all ten use cases and validates the complete podcast workflow', async ({ page }) => {
  await page.goto('/#builder');
  await expect(page.getByLabel('Szablony demonstracyjne').getByRole('button')).toHaveCount(10);
  await page.getByRole('button', { name: 'Podcast', exact: true }).click();
  await expect(page.getByLabel('Urządzenie główne')).toHaveValue('');
  await expect(page.getByLabel('Urządzenie nagrywające podcast')).toHaveValue('flowcompute-studio-m2');
  await expect(
    page
      .getByRole('heading', { name: 'Urządzenie nagrywające → interfejs → mikrofony' })
      .locator('..')
      .locator('..'),
  ).toContainText('Zgodne z jawnymi ograniczeniami');
  await expect(page.getByText('Zestaw jest kompletny')).toBeVisible();
});

test('validates direct storage ingest and rejects USB-C without the exact bus', async ({
  page,
}) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Nagranie eventowe' }).click();
  await expect(
    page
      .getByRole('heading', { name: 'Komputer → stacja dokująca → czytnik → nośnik' })
      .locator('..')
      .locator('..'),
  ).toContainText('Konfiguracja potwierdzona');
  await expect(page.getByText('Zestaw jest kompletny')).toBeVisible();

  await page
    .locator('label.field', { hasText: /^Stacja dokująca/ })
    .locator('select')
    .selectOption('datadock-pro-tb4');
  await page.getByLabel('Czytnik lub obudowa dysku').selectOption('swiftreader-cfxb-pro');
  await page.getByLabel('Nośnik docelowy').selectOption('swiftcard-cfxb-256');
  await page.getByLabel('Zasilacz stacji dokującej').selectOption('powerframe-dock-100');
  await expect(
    page
      .getByRole('heading', { name: 'Komputer → stacja dokująca → czytnik → nośnik' })
      .locator('..')
      .locator('..'),
  ).toContainText('Konfiguracja niezgodna');
  await expect(page.getByText('Zestaw ma konflikt krytyczny')).toBeVisible();
});

test('keeps the unverified mobile condenser podcast path unknown', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Podcast', exact: true }).click();
  await page.getByLabel('Urządzenie nagrywające podcast').selectOption('novacam-pocket-c');
  await page.getByLabel('Interfejs audio').selectOption('echocast-solo-c');
  await page.getByLabel('Mikrofon podcastowy 1').selectOption('echomic-studio-c1');
  await page.getByLabel('Mikrofon podcastowy 2').selectOption('');
  await page.getByLabel('Zasilacz interfejsu').selectOption('');
  await expect(
    page
      .getByRole('heading', { name: 'Urządzenie nagrywające → interfejs → mikrofony' })
      .locator('..')
      .locator('..'),
  ).toContainText('Brak dokładnie zweryfikowanego profilu');
  await expect(page.getByText('Zestaw jest kompletny')).not.toBeVisible();
});

test('candidate relation is not presented as verified', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByLabel('Urządzenie główne').selectOption('novacam-pocket-c');
  await page.getByLabel('Mikrofon / odbiornik').selectOption('echomic-shot-s');
  await expect(page.getByText('Brak potwierdzonej relacji')).toBeVisible();
  await expect(page.getByText('Zgodne bezpośrednio')).not.toBeVisible();
});

test('explains and adds the exact TRRS to TRS audio adapter', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByLabel('Mikrofon / odbiornik').selectOption('echomic-lav-r');
  const audioCard = page
    .getByRole('heading', { name: 'Urządzenie → audio' })
    .locator('..')
    .locator('..');
  await expect(audioCard).toContainText('Zgodne z ograniczeniami');
  await expect(audioCard).toContainText('Adapter musi być podłączony w kierunku TRRS → TRS.');
  const addAdapter = page.getByRole('button', {
    name: '+ Dodaj wymagane: EchoMic TRRS–TRS Adapter',
  });
  await expect(addAdapter).toBeVisible();
  await addAdapter.click();
  await expect(addAdapter).not.toBeVisible();
});

test('evaluates mount conversion and electronic lens limitations from evidence', async ({
  page,
}) => {
  await page.goto('/#builder');
  await page.getByLabel('Urządzenie główne').selectOption('novacam-x1');
  await page.getByLabel('Obiektyw').selectOption('clearlens-l50');
  const opticsCard = page
    .getByRole('heading', { name: 'Aparat → obiektyw' })
    .locator('..')
    .locator('..');
  await expect(opticsCard).toContainText('Zgodne z ograniczeniami');
  await expect(opticsCard).toContainText('Adapter nie przekazuje sterowania autofokusem.');
  await expect(
    page.getByRole('button', { name: '+ Dodaj wymagane: ClearLens X–L Smart Adapter' }),
  ).toBeVisible();
});

test('rejects an SD card for the CFexpress-only 8K recording mode', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByLabel('Urządzenie główne').selectOption('novacam-x1');
  await page.getByLabel('Karta pamięci').selectOption('swiftcard-v90-512');
  await expect(page.getByText('Nieobsługiwany format karty')).toBeVisible();
  await expect(page.getByText('Zestaw ma konflikt krytyczny')).toBeVisible();
});

test('sanitizes untrusted shared rig state before evaluation', async ({ page }) => {
  const encoded = encodeURIComponent(
    Buffer.from(
      JSON.stringify({
        deviceId: 'novacam-n7',
        cageId: 'not-a-catalog-product',
        powerSourceId: 'unknown-power-source',
        powerCableId: 'unknown-power-cable',
        filterId: 'unknown-filter',
        stepUpRingId: 'unknown-ring',
        matteBoxId: 'unknown-matte-box',
        extraIds: 'not-an-array',
        plannedMinutes: -50,
      }),
    ).toString('base64'),
  );
  await page.goto(`/#rig=${encoded}`);
  await expect(page.getByLabel('Klatka')).toHaveValue('motionrig-n7-form-cage');
  await expect(page.getByLabel('Źródło zasilania')).toHaveValue('powerframe-pd-72');
  await expect(page.getByLabel('Filtr okrągły')).toHaveValue('clearfilter-vnd-67');
  await expect(page.getByLabel('Pierścień zwiększający średnicę')).toHaveValue('clearfilter-step-up-49-67');
  await expect(page.getByLabel('Planowany czas nagrania')).toHaveValue('60');
  await expect(page.getByText('Klatka i mocowania potwierdzone')).toBeVisible();
});

test('shares and restores a versioned local-only rig link', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Podróżny vlog' }).click();
  await page.getByRole('button', { name: 'Udostępnij link' }).click();
  await expect(page).toHaveURL(/#rigv1=/);
  await page.reload();
  await expect(page.getByText('Zestaw jest kompletny')).toBeVisible();
  await expect(page.getByLabel('Filtr okrągły')).toHaveValue('clearfilter-vnd-67');
});

test('imports a versioned rig file and rejects unknown products', async ({ page }) => {
  await page.goto('/#builder');
  const validRig = {
    schemaVersion: '1.0.0',
    synthetic: true,
    notForProduction: true,
    deviceId: 'novacam-pocket-c',
    selectedProductIds: ['novacam-pocket-c', 'echomic-air-c-rx', 'motionrig-pocket-lite'],
    ownedProductIds: ['novacam-pocket-c'],
    plannedMinutes: 45,
    exportedAt: '2026-07-17T12:00:00.000Z',
  };
  const importInput = page.getByLabel('Importuj JSON');
  await expect(importInput).toBeEnabled();
  await importInput.setInputFiles({
    name: 'rig.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(validRig)),
  });
  await expect(page.getByText('Zestaw został zaimportowany')).toBeVisible();
  await expect(page.getByLabel('Urządzenie główne')).toHaveValue('novacam-pocket-c');

  await importInput.setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ deviceId: 'unknown-product' })),
  });
  await expect(
    page.getByText(
      'Nie udało się zaimportować zestawu: plik zawiera nieznane albo brakujące urządzenie.',
    ),
  ).toBeVisible();
});

test('mobile viewport exposes core controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#builder');
  await expect(page.getByLabel('Urządzenie główne')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Eksportuj JSON' })).toBeVisible();
});
