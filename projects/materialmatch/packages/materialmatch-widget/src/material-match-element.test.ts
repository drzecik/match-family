import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MaterialMatchElement } from './material-match-element';
import type { WidgetCalculationResult, WidgetConfiguration } from './types';

const configuration: WidgetConfiguration = {
  schemaVersion: '1',
  configurationVersion: '1.0',
  defaultWasteBasisPoints: 800,
  minimumWasteBasisPoints: 0,
  maximumWasteBasisPoints: 2000,
  allowPartialCart: true,
  calculation: { fixture: true },
};

const result: WidgetCalculationResult = {
  calculationId: 'calc-1',
  configurationVersion: '1.0',
  netAreaSquareMm: 20_000_000,
  wasteAreaSquareMm: 1_600_000,
  grossAreaSquareMm: 21_600_000,
  purchaseAreaSquareMm: 22_000_000,
  surplusAreaSquareMm: 400_000,
  totalPriceMinor: 249_900,
  warnings: [],
  steps: [{ id: 'packages', description: '21,6 m² ÷ 2,2 m² = 9,82; zaokrąglono w górę do 10.' }],
  lines: [
    {
      id: 'floor',
      sku: 'DEMO-PANEL-01',
      name: 'Fikcyjne panele',
      quantity: 10,
      unitLabel: 'opak.',
      unitPriceMinor: 24_990,
      totalPriceMinor: 249_900,
      status: 'available',
      required: true,
    },
  ],
};

function input(element: MaterialMatchElement, selector: string, value: string): void {
  const control = element.shadowRoot!.querySelector<HTMLInputElement>(selector)!;
  control.value = value;
  control.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('MaterialMatchElement', () => {
  beforeEach(() => {
    if (!customElements.get('material-match-test'))
      customElements.define('material-match-test', MaterialMatchElement);
    document.body.replaceChildren();
  });

  it('uses semantic labels and preserves Polish decimal input as integer measurements', async () => {
    const element = new MaterialMatchElement();
    element.configuration = configuration;
    element.calculator = vi.fn(() => result);
    document.body.append(element);

    input(element, '#room-0-length', '4');
    input(element, '#room-0-width', '5,0');
    input(element, '#room-0-doorWidth', '0,9');
    input(element, '#room-0-internalCornerCount', '6');
    input(element, '#room-0-externalCornerCount', '2');
    element.shadowRoot!.querySelector<HTMLFormElement>('form')!.requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.calculator).toHaveBeenCalledWith(
      expect.objectContaining({
        project: expect.objectContaining({
          wasteBasisPoints: 800,
          rooms: [
            expect.objectContaining({
              lengthMm: 4000,
              widthMm: 5000,
              doorWidthMm: 900,
              internalCornerCount: 6,
              externalCornerCount: 2,
            }),
          ],
        }),
      }),
    );
    expect(element.shadowRoot!.querySelector('table caption')?.textContent).toBe(
      'Produkty w zestawie',
    );
    expect(element.shadowRoot!.textContent).toContain('Kod produktu: DEMO-PANEL-01');
    expect(element.shadowRoot!.querySelector('td[data-label="Ilość"]')).not.toBeNull();
    expect(element.shadowRoot!.querySelector('td[data-label="Cena jednostkowa"]')).not.toBeNull();
    expect(element.shadowRoot!.querySelector('td[data-label="Razem"]')).not.toBeNull();
  });

  it('rejects an invalid required dimension and moves focus to it', () => {
    const element = new MaterialMatchElement();
    element.configuration = configuration;
    element.calculator = vi.fn(() => result);
    document.body.append(element);
    input(element, '#room-0-length', '-4');
    input(element, '#room-0-width', '5');

    element.shadowRoot!.querySelector<HTMLFormElement>('form')!.requestSubmit();

    const invalid = element.shadowRoot!.querySelector<HTMLInputElement>('#room-0-length')!;
    expect(invalid.getAttribute('aria-invalid')).toBe('true');
    expect(element.shadowRoot!.activeElement).toBe(invalid);
    expect(element.calculator).not.toHaveBeenCalled();
  });

  it('rejects fractional and negative corner counts', () => {
    const element = new MaterialMatchElement();
    element.configuration = configuration;
    element.calculator = vi.fn(() => result);
    document.body.append(element);
    input(element, '#room-0-length', '4');
    input(element, '#room-0-width', '5');
    input(element, '#room-0-internalCornerCount', '1.5');
    input(element, '#room-0-externalCornerCount', '-1');

    element.shadowRoot!.querySelector<HTMLFormElement>('form')!.requestSubmit();

    const invalid = element.shadowRoot!.querySelector<HTMLInputElement>(
      '#room-0-internalCornerCount',
    )!;
    expect(invalid.getAttribute('aria-invalid')).toBe('true');
    expect(element.shadowRoot!.activeElement).toBe(invalid);
    expect(element.calculator).not.toHaveBeenCalled();
  });

  it('escapes text supplied by configuration and calculation output', async () => {
    const element = new MaterialMatchElement();
    element.configuration = { ...configuration, brand: { name: '<img src=x onerror="alert(1)">' } };
    element.calculator = () => ({
      ...result,
      lines: [{ ...result.lines[0]!, name: '<script>alert(1)</script>' }],
    });
    document.body.append(element);
    expect(element.shadowRoot!.querySelector('img')).toBeNull();

    input(element, '#room-0-length', '4');
    input(element, '#room-0-width', '5');
    element.shadowRoot!.querySelector<HTMLFormElement>('form')!.requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.shadowRoot!.querySelector('script')).toBeNull();
    expect(element.shadowRoot!.textContent).toContain('<script>alert(1)</script>');
  });

  it('emits exact available cart quantities and explicitly reports omitted lines', async () => {
    const element = new MaterialMatchElement();
    element.configuration = configuration;
    element.calculator = () => ({
      ...result,
      lines: [
        ...result.lines,
        {
          id: 'underlay',
          sku: 'DEMO-UNDERLAY',
          name: 'Podkład',
          quantity: 3,
          unitLabel: 'rol.',
          unitPriceMinor: null,
          totalPriceMinor: null,
          status: 'missing-price',
          required: true,
        },
      ],
    });
    document.body.append(element);
    input(element, '#room-0-length', '4');
    input(element, '#room-0-width', '5');
    element.shadowRoot!.querySelector<HTMLFormElement>('form')!.requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const listener = vi.fn();
    element.addEventListener('materialmatch:add-to-cart', listener);

    element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="cart"]')!.click();

    expect(listener.mock.calls[0]![0].detail).toEqual({
      calculationId: 'calc-1',
      input: {
        project: {
          id: 'widget-project',
          wasteBasisPoints: 800,
          rooms: [
            {
              id: expect.any(String),
              name: 'Pomieszczenie 1',
              geometry: {
                kind: 'rectangle',
                lengthMillimeters: 4000,
                widthMillimeters: 5000,
              },
              excludedAreas: [],
              doors: [],
              corners: { internal: 4, external: 0 },
            },
          ],
        },
        selectedOptionalAccessoryIds: [],
      },
      lines: [
        { sku: 'DEMO-PANEL-01', quantity: 10 },
        { sku: 'DEMO-UNDERLAY', quantity: 3 },
      ],
      omittedLines: [{ sku: 'DEMO-UNDERLAY', reason: 'missing-price' }],
    });
  });

  it('renders one status for repeated warnings with the same user-facing message', async () => {
    const element = new MaterialMatchElement();
    element.configuration = configuration;
    element.calculator = () => ({
      ...result,
      warnings: [
        {
          code: 'OPTIONAL_ONE',
          message: 'Optional accessory omitted.',
          translationId: 'warning.optionalAccessoryNotSelected',
        },
        {
          code: 'OPTIONAL_TWO',
          message: 'Another optional accessory omitted.',
          translationId: 'warning.optionalAccessoryNotSelected',
        },
      ],
    });
    document.body.append(element);
    input(element, '#room-0-length', '4');
    input(element, '#room-0-width', '5');
    element.shadowRoot!.querySelector<HTMLFormElement>('form')!.requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.shadowRoot!.querySelectorAll('.mm-warning')).toHaveLength(1);
    expect(element.shadowRoot!.querySelector('.mm-warning')?.textContent).toBe(
      'Zestaw nie obejmuje dodatków opcjonalnych.',
    );
  });

  it('reads validated JSON from a non-executable embedded script', async () => {
    const element = new MaterialMatchElement();
    const script = document.createElement('script');
    script.type = 'application/json';
    script.dataset.materialmatchConfiguration = '';
    script.textContent = JSON.stringify(configuration);
    element.append(script);
    document.body.append(element);
    await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

    expect(element.configuration).toEqual(configuration);
    expect(element.shadowRoot!.querySelector('form')).not.toBeNull();
  });

  it('preserves measurements when a validated product configuration changes', () => {
    const element = new MaterialMatchElement();
    element.configuration = configuration;
    document.body.append(element);
    input(element, '#room-0-length', '4');
    input(element, '#room-0-width', '5');

    element.configuration = { ...configuration, configurationVersion: '1.1' };

    expect(element.shadowRoot!.querySelector<HTMLInputElement>('#room-0-length')?.value).toBe('4');
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('#room-0-width')?.value).toBe('5');
  });

  it('prevents duplicate asynchronous calculations', async () => {
    let resolveCalculation!: (value: WidgetCalculationResult) => void;
    const calculator = vi.fn(
      () => new Promise<WidgetCalculationResult>((resolve) => (resolveCalculation = resolve)),
    );
    const element = new MaterialMatchElement();
    element.configuration = configuration;
    element.calculator = calculator;
    document.body.append(element);
    input(element, '#room-0-length', '4');
    input(element, '#room-0-width', '5');
    const form = element.shadowRoot!.querySelector<HTMLFormElement>('form')!;

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(calculator).toHaveBeenCalledTimes(1);
    expect(form.getAttribute('aria-busy')).toBe('true');
    expect(
      element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="calculate"]')?.disabled,
    ).toBe(true);
    resolveCalculation(result);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(element.shadowRoot!.querySelector('#mm-result-title')).not.toBeNull();
  });

  it('discards a pending result after the calculation configuration changes', async () => {
    let resolveCalculation!: (value: WidgetCalculationResult) => void;
    const calculator = vi.fn(
      () => new Promise<WidgetCalculationResult>((resolve) => (resolveCalculation = resolve)),
    );
    const element = new MaterialMatchElement();
    element.configuration = configuration;
    element.calculator = calculator;
    document.body.append(element);
    input(element, '#room-0-length', '4');
    input(element, '#room-0-width', '5');
    const calculationListener = vi.fn();
    const resultStepListener = vi.fn();
    const cartListener = vi.fn();
    element.addEventListener('materialmatch:calculation-complete', calculationListener);
    element.addEventListener('materialmatch:step-change', (event) => {
      if (event.detail.step === 'result') resultStepListener(event);
    });
    element.addEventListener('materialmatch:add-to-cart', cartListener);

    element.shadowRoot!.querySelector<HTMLFormElement>('form')!.requestSubmit();
    expect(calculator).toHaveBeenCalledTimes(1);

    element.configuration = {
      ...configuration,
      configurationVersion: '1.1',
      calculation: { fixture: 'replacement' },
    };
    resolveCalculation(result);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.configuration?.configurationVersion).toBe('1.1');
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('#room-0-length')?.value).toBe('4');
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('#room-0-width')?.value).toBe('5');
    expect(element.shadowRoot!.querySelector('#mm-result-title')).toBeNull();
    expect(element.shadowRoot!.querySelector('[data-action="cart"]')).toBeNull();
    expect(
      element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="calculate"]')?.disabled,
    ).toBe(false);
    expect(calculationListener).not.toHaveBeenCalled();
    expect(resultStepListener).not.toHaveBeenCalled();
    expect(cartListener).not.toHaveBeenCalled();
  });

  it('rejects external logo URLs without creating a tracking request element', () => {
    const element = new MaterialMatchElement();
    element.configuration = {
      ...configuration,
      brand: { name: 'Sklep', logoUrl: 'https://tracking.example/pixel.png' },
    };
    document.body.append(element);

    expect(element.shadowRoot!.querySelector('.mm-brand__logo')).toBeNull();
    expect(element.shadowRoot!.querySelector('.mm-brand')?.textContent).toContain('Sklep');
  });

  it('restores validated integer measurements through the public host API', () => {
    const element = new MaterialMatchElement();
    element.configuration = configuration;
    document.body.append(element);

    element.setMeasurements(
      [
        {
          id: 'restored-room',
          name: 'Salon',
          lengthMm: 5000,
          widthMm: 4000,
          doorWidthMm: 900,
          excludedAreaSquareMm: 1_250_000,
        },
      ],
      850,
    );

    expect(element.shadowRoot!.querySelector<HTMLInputElement>('#room-0-length')?.value).toBe('5');
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('#room-0-doorWidth')?.value).toBe(
      '0,9',
    );
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('#room-0-excludedArea')?.value).toBe(
      '1,25',
    );
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('#mm-waste')?.value).toBe('8,5');
    expect(
      element.shadowRoot!.querySelector<HTMLInputElement>('#room-0-internalCornerCount')?.value,
    ).toBe('0');
    expect(
      element.shadowRoot!.querySelector<HTMLInputElement>('#room-0-externalCornerCount')?.value,
    ).toBe('0');
    expect(() => element.setMeasurements([], 800)).toThrow(TypeError);
  });

  it('restores, emits and trusts explicit corner counts', async () => {
    const element = new MaterialMatchElement();
    element.configuration = configuration;
    element.calculator = () => result;
    document.body.append(element);
    const measurementsListener = vi.fn();
    const cartListener = vi.fn();
    element.addEventListener('materialmatch:measurements-change', measurementsListener);
    element.addEventListener('materialmatch:add-to-cart', cartListener);

    element.setMeasurements([
      {
        id: 'corner-room',
        name: 'Korytarz',
        lengthMm: 5000,
        widthMm: 4000,
        doorWidthMm: 900,
        excludedAreaSquareMm: 0,
        internalCornerCount: 7,
        externalCornerCount: 3,
      },
    ]);

    expect(measurementsListener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          rooms: [expect.objectContaining({ internalCornerCount: 7, externalCornerCount: 3 })],
        }),
      }),
    );
    element.shadowRoot!.querySelector<HTMLFormElement>('form')!.requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 0));
    element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="cart"]')!.click();

    expect(cartListener.mock.calls[0]![0].detail.input.project.rooms[0].corners).toEqual({
      internal: 7,
      external: 3,
    });
    expect(() =>
      element.setMeasurements([
        {
          id: 'invalid-corners',
          name: 'Błąd',
          lengthMm: 5000,
          widthMm: 4000,
          doorWidthMm: 0,
          excludedAreaSquareMm: 0,
          internalCornerCount: -1,
        },
      ]),
    ).toThrow(TypeError);
  });
});
