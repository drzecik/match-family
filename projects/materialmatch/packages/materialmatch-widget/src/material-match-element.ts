import { createTranslator, formatDecimal, formatMoney } from '@materialmatch/shared-ui';
import { sharedStyles } from '@materialmatch/shared-ui/styles';
import type {
  WidgetCalculationRequest,
  WidgetCalculationResult,
  WidgetCalculator,
  WidgetConfiguration,
  WidgetRoomMeasurement,
} from './types';
import type { CalculationInput } from '@materialmatch/domain';
import {
  escapeHtml,
  millimetersToMeterInput,
  parseMetersToMillimeters,
  parseNonNegativeInteger,
  parseSquareMetersToSquareMillimeters,
  squareMillimetersToSquareMeters,
  squareMillimetersToSquareMeterInput,
} from './utils';
import { calculateWithMaterialMatchEngine } from './engine-adapter';
import {
  parseWidgetConfigurationJson,
  safeBrandAssetUrl,
  validateWidgetConfiguration,
} from './widget-configuration';

interface EditableRoom {
  id: string;
  name: string;
  length: string;
  width: string;
  excludedArea: string;
  doorWidth: string;
  internalCornerCount: string;
  externalCornerCount: string;
}

const initialRoom = (): EditableRoom => ({
  id: globalThis.crypto?.randomUUID?.() ?? `room-${Date.now()}`,
  name: '',
  length: '',
  width: '',
  excludedArea: '0',
  doorWidth: '0',
  internalCornerCount: '4',
  externalCornerCount: '0',
});

export class MaterialMatchElement extends HTMLElement {
  static readonly observedAttributes = ['configuration'];

  readonly #root: ShadowRoot;
  #configuration: WidgetConfiguration | null = null;
  #calculator: WidgetCalculator | null = calculateWithMaterialMatchEngine;
  #rooms: EditableRoom[] = [initialRoom()];
  #wastePercent = '8';
  #result: WidgetCalculationResult | null = null;
  #trustedCalculationInput: CalculationInput | null = null;
  #connected = false;
  #busy = false;
  #configurationGeneration = 0;
  #configurationError: string | null = null;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
  }

  set configuration(value: WidgetConfiguration | null) {
    if (value === null) {
      this.#configurationGeneration += 1;
      this.#configuration = null;
      this.#configurationError = null;
      this.#result = null;
      this.#trustedCalculationInput = null;
      this.#busy = false;
    } else {
      this.#applyConfiguration(validateWidgetConfiguration(value));
    }
    if (this.#connected) {
      this.#render();
      if (this.#configuration) this.#announceReady();
    }
  }

  get configuration(): WidgetConfiguration | null {
    return this.#configuration;
  }

  set calculator(value: WidgetCalculator | null) {
    this.#calculator = value;
  }

  get calculator(): WidgetCalculator | null {
    return this.#calculator;
  }

  connectedCallback(): void {
    this.#connected = true;
    if (this.hasAttribute('configuration')) this.#readConfigurationAttribute();
    else if (!this.#configuration) this.#readEmbeddedConfiguration();
    this.#render();
    this.#announceReady();
  }

  attributeChangedCallback(name: string): void {
    if (name === 'configuration' && this.#connected) {
      this.#readConfigurationAttribute();
      this.#render();
      if (this.#configuration) this.#announceReady();
    }
  }

  setMeasurements(
    rooms: readonly WidgetRoomMeasurement[],
    wasteBasisPoints = this.#configuration?.defaultWasteBasisPoints ?? 800,
  ): void {
    if (rooms.length === 0) throw new TypeError('At least one room is required.');
    const configuration = this.#configuration;
    const measurementsAreValid = rooms.every(
      (room) =>
        Number.isSafeInteger(room.lengthMm) &&
        room.lengthMm > 0 &&
        Number.isSafeInteger(room.widthMm) &&
        room.widthMm > 0 &&
        Number.isSafeInteger(room.doorWidthMm) &&
        room.doorWidthMm >= 0 &&
        Number.isSafeInteger(room.excludedAreaSquareMm) &&
        room.excludedAreaSquareMm >= 0 &&
        (room.internalCornerCount === undefined ||
          (Number.isSafeInteger(room.internalCornerCount) && room.internalCornerCount >= 0)) &&
        (room.externalCornerCount === undefined ||
          (Number.isSafeInteger(room.externalCornerCount) && room.externalCornerCount >= 0)),
    );
    if (!measurementsAreValid) throw new TypeError('Measurements must use valid integer units.');
    if (
      !Number.isSafeInteger(wasteBasisPoints) ||
      wasteBasisPoints < (configuration?.minimumWasteBasisPoints ?? 0) ||
      wasteBasisPoints > (configuration?.maximumWasteBasisPoints ?? 10_000)
    )
      throw new TypeError('Waste must be inside the configured integer range.');
    this.#rooms = rooms.map((room) => ({
      id: room.id,
      name: room.name,
      length: millimetersToMeterInput(room.lengthMm),
      width: millimetersToMeterInput(room.widthMm),
      excludedArea: squareMillimetersToSquareMeterInput(room.excludedAreaSquareMm),
      doorWidth: millimetersToMeterInput(room.doorWidthMm),
      internalCornerCount: String(room.internalCornerCount ?? 0),
      externalCornerCount: String(room.externalCornerCount ?? 0),
    }));
    this.#wastePercent = String(wasteBasisPoints / 100).replace('.', ',');
    this.#result = null;
    this.#trustedCalculationInput = null;
    if (this.#connected) this.#render();
    this.#emitMeasurementsChange();
  }

  reset(): void {
    this.#rooms = [initialRoom()];
    this.#wastePercent = String((this.#configuration?.defaultWasteBasisPoints ?? 800) / 100);
    this.#result = null;
    this.#trustedCalculationInput = null;
    if (this.#connected) this.#render();
    this.#emit('materialmatch:step-change', { step: 'measurements' });
  }

  #readConfigurationAttribute(): void {
    const serialized = this.getAttribute('configuration');
    if (!serialized) return;
    this.#applyConfiguration(parseWidgetConfigurationJson(serialized));
  }

  #readEmbeddedConfiguration(): void {
    const script = this.querySelector<HTMLScriptElement>(
      'script[type="application/json"][data-materialmatch-configuration]',
    );
    if (script?.textContent)
      this.#applyConfiguration(parseWidgetConfigurationJson(script.textContent));
  }

  #applyConfiguration(result: ReturnType<typeof validateWidgetConfiguration>): void {
    this.#configurationGeneration += 1;
    this.#busy = false;
    if (!result.success || !result.configuration) {
      this.#configuration = null;
      this.#configurationError = result.issues.join('; ');
      if (this.#connected)
        this.#emit('materialmatch:error', {
          code: 'invalid-configuration',
          message: this.#configurationError,
        });
      return;
    }
    this.#configuration = result.configuration;
    this.#configurationError = null;
    this.#result = null;
    this.#trustedCalculationInput = null;
    this.#wastePercent = String(result.configuration.defaultWasteBasisPoints / 100);
  }

  #announceReady(): void {
    const configuration = this.#configuration;
    if (!configuration) return;
    queueMicrotask(() =>
      this.#emit('materialmatch:ready', {
        configurationVersion: configuration.configurationVersion,
      }),
    );
  }

  #render(): void {
    const configuration = this.#configuration;
    if (!configuration) {
      this.#root.innerHTML = `<style>${sharedStyles}</style><div class="mm-shell"><p class="mm-configuration-error" role="alert">Konfiguracja kalkulatora jest nieprawidłowa.</p></div>`;
      return;
    }
    const t = createTranslator(configuration.translations);
    this.#root.innerHTML = `<style>${sharedStyles}</style>${
      this.#result
        ? this.#resultTemplate()
        : `
      <main class="mm-shell" aria-labelledby="mm-title">
        <header class="mm-header">
          ${this.#brandTemplate()}
          <p>${escapeHtml(t('measurement.intro'))}</p>
        </header>
        ${this.#stepsTemplate('measurements')}
        <form class="mm-panel mm-stack" novalidate aria-busy="${this.#busy}">
          <h2>${escapeHtml(t('measurement.heading'))}</h2>
          <div class="mm-rooms mm-stack">${this.#rooms.map((room, index) => this.#roomTemplate(room, index)).join('')}</div>
          <div class="mm-field">
            <label for="mm-waste">${escapeHtml(t('field.wastePercent'))}</label>
            <div class="mm-field-row"><input id="mm-waste" name="waste" inputmode="decimal" autocomplete="off" value="${escapeHtml(this.#wastePercent)}" aria-describedby="mm-waste-hint"><span aria-hidden="true">%</span></div>
            <small id="mm-waste-hint">${escapeHtml(
              t('field.wasteHint', {
                minimum: formatDecimal(configuration.minimumWasteBasisPoints / 100),
                maximum: formatDecimal(configuration.maximumWasteBasisPoints / 100),
              }),
            )}</small>
          </div>
          <div class="mm-actions">
            <button class="mm-button mm-button--secondary" type="button" data-action="add-room">${escapeHtml(t('action.addRoom'))}</button>
            <button class="mm-button mm-button--primary" type="submit" data-action="calculate" ${this.#busy ? 'disabled' : ''}>${escapeHtml(this.#busy ? t('status.calculating') : t('action.calculate'))}</button>
          </div>
          <p class="mm-error" id="mm-form-error" role="alert" hidden></p>
          <p class="mm-sr-only" aria-live="polite" id="mm-status"></p>
        </form>
      </main>`
    }`;
    this.#bindEvents();
  }

  #brandTemplate(): string {
    const configuration = this.#configuration;
    if (!configuration) return '';
    const t = createTranslator(configuration.translations);
    const name = configuration.brand?.name ?? t('app.name');
    const logoUrl = safeBrandAssetUrl(configuration.brand?.logoUrl, this.ownerDocument.baseURI);
    return `<div class="mm-brand">${logoUrl ? `<img class="mm-brand__logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(t('brand.logoAlt', { name }))}">` : ''}<h1 id="mm-title">${escapeHtml(name)}</h1></div>`;
  }

  #stepsTemplate(active: 'measurements' | 'result'): string {
    const t = createTranslator(this.#configuration?.translations);
    return `<ol class="mm-steps" aria-label="${escapeHtml(t('steps.label'))}">
      <li ${active === 'measurements' ? 'aria-current="step"' : ''}><span>1</span>${escapeHtml(t('step.measurements'))}</li>
      <li ${active === 'result' ? 'aria-current="step"' : ''}><span>2</span>${escapeHtml(t('step.result'))}</li>
    </ol>`;
  }

  #roomTemplate(room: EditableRoom, index: number): string {
    const t = createTranslator(this.#configuration?.translations);
    const prefix = `room-${index}`;
    const field = (
      name: 'length' | 'width' | 'excludedArea' | 'doorWidth',
      translation: Parameters<typeof t>[0],
      hint: Parameters<typeof t>[0],
      unit: string,
      placeholder: string,
      required = false,
    ) => `
      <div class="mm-field">
        <label for="${prefix}-${name}">${escapeHtml(t(translation))}</label>
        <div class="mm-field-row"><input id="${prefix}-${name}" name="${name}" data-room-index="${index}" inputmode="decimal" autocomplete="off" value="${escapeHtml(room[name])}" placeholder="${placeholder}" aria-describedby="${prefix}-${name}-hint" ${required ? 'required' : ''}><span aria-hidden="true">${unit}</span></div>
        <small id="${prefix}-${name}-hint">${escapeHtml(t(hint))}</small>
      </div>`;
    return `<fieldset class="mm-room">
      <legend>${escapeHtml(t('measurement.roomLegend', { number: index + 1 }))}</legend>
      <div class="mm-grid">
        <div class="mm-field"><label for="${prefix}-name">${escapeHtml(t('field.roomName'))}</label><input id="${prefix}-name" name="name" data-room-index="${index}" value="${escapeHtml(room.name)}" placeholder="Salon" aria-describedby="${prefix}-name-hint"><small id="${prefix}-name-hint">${escapeHtml(t('field.roomNameHint'))}</small></div>
        ${field('length', 'field.length', 'field.lengthHint', 'm', '5,00', true)}
        ${field('width', 'field.width', 'field.widthHint', 'm', '4,00', true)}
        ${field('doorWidth', 'field.doorWidth', 'field.doorWidthHint', 'm', '0,90')}
        ${field('excludedArea', 'field.excludedArea', 'field.excludedAreaHint', 'm²', '0')}
        ${this.#integerField(room, index, 'internalCornerCount', 'field.internalCorners', 'field.internalCornersHint', '4')}
        ${this.#integerField(room, index, 'externalCornerCount', 'field.externalCorners', 'field.externalCornersHint', '0')}
      </div>
      ${this.#rooms.length > 1 ? `<button class="mm-button mm-button--quiet" type="button" data-action="remove-room" data-room-index="${index}">${escapeHtml(t('action.removeRoom'))}</button>` : ''}
    </fieldset>`;
  }

  #integerField(
    room: EditableRoom,
    index: number,
    name: 'internalCornerCount' | 'externalCornerCount',
    translation: 'field.internalCorners' | 'field.externalCorners',
    hint: 'field.internalCornersHint' | 'field.externalCornersHint',
    placeholder: string,
  ): string {
    const t = createTranslator(this.#configuration?.translations);
    const prefix = `room-${index}`;
    return `<div class="mm-field">
      <label for="${prefix}-${name}">${escapeHtml(t(translation))}</label>
      <input id="${prefix}-${name}" name="${name}" data-room-index="${index}" type="number" inputmode="numeric" min="0" step="1" autocomplete="off" value="${escapeHtml(room[name])}" placeholder="${placeholder}" aria-describedby="${prefix}-${name}-hint">
      <small id="${prefix}-${name}-hint">${escapeHtml(t(hint))}</small>
    </div>`;
  }

  #bindEvents(): void {
    const form = this.#root.querySelector('form');
    form?.addEventListener('input', (event) => this.#captureInput(event));
    form?.addEventListener('submit', (event) => void this.#submit(event));
    this.#root.querySelector('[data-action="add-room"]')?.addEventListener('click', () => {
      this.#rooms.push(initialRoom());
      this.#render();
      this.#root.querySelector<HTMLInputElement>(`#room-${this.#rooms.length - 1}-name`)?.focus();
      this.#emitMeasurementsChange();
    });
    this.#root.querySelectorAll('[data-action="remove-room"]').forEach((button) =>
      button.addEventListener('click', () => {
        const index = Number((button as HTMLElement).dataset.roomIndex);
        this.#rooms.splice(index, 1);
        this.#render();
        this.#emitMeasurementsChange();
      }),
    );
    this.#root.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      this.#result = null;
      this.#render();
      this.#emit('materialmatch:step-change', { step: 'measurements' });
      this.#root.querySelector('h2')?.focus();
    });
    this.#root
      .querySelector('[data-action="cart"]')
      ?.addEventListener('click', () => this.#emitCart());
  }

  #captureInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.name === 'waste') this.#wastePercent = input.value;
    else {
      const index = Number(input.dataset.roomIndex);
      const room = this.#rooms[index];
      if (room && input.name in room && input.name !== 'id') {
        (room as unknown as Record<string, string>)[input.name] = input.value;
      }
    }
    input.removeAttribute('aria-invalid');
    this.#emitMeasurementsChange();
  }

  #validatedRequest(): WidgetCalculationRequest | null {
    const configuration = this.#configuration;
    if (!configuration) return null;
    const waste = Number(this.#wastePercent.replace(',', '.'));
    let firstInvalid: HTMLInputElement | null = null;
    const rooms: WidgetRoomMeasurement[] = [];
    this.#rooms.forEach((room, index) => {
      const lengthMm = parseMetersToMillimeters(room.length);
      const widthMm = parseMetersToMillimeters(room.width);
      const doorWidthMm = parseMetersToMillimeters(room.doorWidth);
      const excludedAreaSquareMm = parseSquareMetersToSquareMillimeters(room.excludedArea);
      const internalCornerCount = parseNonNegativeInteger(room.internalCornerCount);
      const externalCornerCount = parseNonNegativeInteger(room.externalCornerCount);
      const parsedFields: readonly (readonly [string, number | null])[] = [
        ['length', lengthMm],
        ['width', widthMm],
        ['doorWidth', doorWidthMm],
        ['excludedArea', excludedAreaSquareMm],
        ['internalCornerCount', internalCornerCount],
        ['externalCornerCount', externalCornerCount],
      ];
      parsedFields.forEach(([field, value]) => {
        if (value === null || ((field === 'length' || field === 'width') && value <= 0)) {
          const input = this.#root.querySelector<HTMLInputElement>(`#room-${index}-${field}`);
          input?.setAttribute('aria-invalid', 'true');
          firstInvalid ??= input;
        }
      });
      if (
        lengthMm !== null &&
        widthMm !== null &&
        doorWidthMm !== null &&
        excludedAreaSquareMm !== null &&
        internalCornerCount !== null &&
        externalCornerCount !== null
      ) {
        rooms.push({
          id: room.id,
          name: room.name || `Pomieszczenie ${index + 1}`,
          lengthMm,
          widthMm,
          doorWidthMm,
          excludedAreaSquareMm,
          internalCornerCount,
          externalCornerCount,
        });
      }
    });
    const wasteBasisPoints = Math.round(waste * 100);
    const wasteInput = this.#root.querySelector<HTMLInputElement>('#mm-waste');
    if (
      !Number.isFinite(waste) ||
      wasteBasisPoints < configuration.minimumWasteBasisPoints ||
      wasteBasisPoints > configuration.maximumWasteBasisPoints
    ) {
      wasteInput?.setAttribute('aria-invalid', 'true');
      firstInvalid ??= wasteInput;
    }
    if (firstInvalid || rooms.length !== this.#rooms.length) {
      const message = createTranslator(configuration.translations)('validation.invalidNumber');
      const error = this.#root.querySelector<HTMLElement>('#mm-form-error');
      if (error) {
        error.textContent = message;
        error.hidden = false;
      }
      firstInvalid?.focus();
      return null;
    }
    const defaultVariantId = this.#defaultVariantId(configuration.calculation);
    return {
      configurationVersion: configuration.configurationVersion,
      calculation: configuration.calculation,
      ...(configuration.productNames ? { productNames: configuration.productNames } : {}),
      ...(defaultVariantId ? { variantId: defaultVariantId } : {}),
      selectedOptionalAccessoryIds: [],
      project: { id: 'widget-project', name: 'Projekt', rooms, wasteBasisPoints },
    };
  }

  async #submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.#busy) return;
    const request = this.#validatedRequest();
    if (!request) return;
    if (!this.#calculator) {
      this.#emit('materialmatch:error', {
        code: 'calculator-unavailable',
        message: 'Silnik obliczeniowy nie jest dostępny.',
      });
      return;
    }
    const configurationGeneration = this.#configurationGeneration;
    this.#busy = true;
    const form = this.#root.querySelector<HTMLFormElement>('form');
    const submitButton = this.#root.querySelector<HTMLButtonElement>('[data-action="calculate"]');
    form?.setAttribute('aria-busy', 'true');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = createTranslator(this.#configuration?.translations)(
        'status.calculating',
      );
    }
    const status = this.#root.querySelector<HTMLElement>('#mm-status');
    if (status)
      status.textContent = createTranslator(this.#configuration?.translations)(
        'status.calculating',
      );
    try {
      const result = await this.#calculator(request);
      if (configurationGeneration !== this.#configurationGeneration) return;
      this.#busy = false;
      this.#result = result;
      this.#trustedCalculationInput = this.#calculationInputFromRequest(request);
      this.#render();
      this.#emit('materialmatch:calculation-complete', { result });
      this.#emit('materialmatch:step-change', { step: 'result' });
      this.#root.querySelector<HTMLElement>('h2')?.focus();
    } catch (error) {
      if (configurationGeneration !== this.#configurationGeneration) return;
      this.#busy = false;
      form?.setAttribute('aria-busy', 'false');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = createTranslator(this.#configuration?.translations)(
          'action.calculate',
        );
      }
      const technicalMessage =
        error instanceof Error ? error.message : 'Nie udało się wykonać obliczenia.';
      this.#emit('materialmatch:error', {
        code: 'calculation-failed',
        message: technicalMessage,
      });
      const formError = this.#root.querySelector<HTMLElement>('#mm-form-error');
      if (formError) {
        formError.textContent = createTranslator(this.#configuration?.translations)(
          'error.calculation',
        );
        formError.hidden = false;
      }
    }
  }

  #resultTemplate(): string {
    const configuration = this.#configuration;
    const result = this.#result;
    if (!configuration || !result) return '';
    const t = createTranslator(configuration.translations);
    const locale = configuration.locale ?? 'pl-PL';
    const currency = configuration.currency ?? 'PLN';
    const area = (value: number) =>
      `${formatDecimal(squareMillimetersToSquareMeters(value), locale)} ${t('unit.squareMeter')}`;
    const unavailable = result.lines.filter((line) => line.status !== 'available');
    const warningMessages = [
      ...new Set([
        ...result.warnings.map((warning) =>
          warning.translationId ? t(warning.translationId) : warning.message,
        ),
        ...(unavailable.length ? [t('warning.partialCart')] : []),
      ]),
    ];
    return `<main class="mm-shell" aria-labelledby="mm-result-title">
      <header class="mm-header">${this.#brandTemplate()}</header>
      ${this.#stepsTemplate('result')}
      <section class="mm-panel mm-stack">
        <h2 id="mm-result-title" tabindex="-1">${escapeHtml(t('result.heading'))}</h2>
        <h3>${escapeHtml(t('result.measurementSummary'))}</h3>
        <dl class="mm-summary">
          <div><dt>${escapeHtml(t('result.netArea'))}</dt><dd>${area(result.netAreaSquareMm)}</dd></div>
          <div><dt>${escapeHtml(t('result.wasteArea'))}</dt><dd>${area(result.wasteAreaSquareMm)} (${escapeHtml(this.#wastePercent)}%)</dd></div>
          <div><dt>${escapeHtml(t('result.grossArea'))}</dt><dd>${area(result.grossAreaSquareMm)}</dd></div>
          <div><dt>${escapeHtml(t('result.purchaseArea'))}</dt><dd>${area(result.purchaseAreaSquareMm)}</dd></div>
          <div><dt>${escapeHtml(t('result.surplusArea'))}</dt><dd>${area(result.surplusAreaSquareMm)}</dd></div>
        </dl>
        ${warningMessages.map((warning) => `<p class="mm-warning" role="status">${escapeHtml(warning)}</p>`).join('')}
        <div class="mm-table-wrap" role="region" aria-labelledby="mm-products-caption" tabindex="0"><table class="mm-table">
          <caption id="mm-products-caption">${escapeHtml(t('result.products'))}</caption>
          <thead><tr><th scope="col">${escapeHtml(t('result.product'))}</th><th scope="col">${escapeHtml(t('result.quantity'))}</th><th scope="col">${escapeHtml(t('result.unitPrice'))}</th><th scope="col">${escapeHtml(t('result.totalPrice'))}</th></tr></thead>
          <tbody>${result.lines.map((line) => `<tr><th scope="row">${escapeHtml(line.name)}<br><small>${escapeHtml(t('result.productCode'))}: ${escapeHtml(line.sku)}</small>${line.status !== 'available' ? `<br><span class="mm-error">${escapeHtml(t(line.status === 'unavailable' ? 'warning.unavailable' : 'warning.missingPrice'))}</span>` : ''}</th><td data-label="${escapeHtml(t('result.quantity'))}">${formatDecimal(line.quantity, locale)} ${escapeHtml(line.unitLabel)}</td><td data-label="${escapeHtml(t('result.unitPrice'))}">${line.unitPriceMinor === null ? '—' : formatMoney(line.unitPriceMinor, currency, locale)}</td><td data-label="${escapeHtml(t('result.totalPrice'))}">${line.totalPriceMinor === null ? '—' : formatMoney(line.totalPriceMinor, currency, locale)}</td></tr>`).join('')}</tbody>
        </table></div>
        <p>${escapeHtml(t('explanation.packages'))}</p>
        <details class="mm-explanation"><summary>${escapeHtml(t('result.explanation'))}</summary><ol>${result.steps.map((step) => `<li>${escapeHtml(step.translationId ? t(step.translationId) : step.description)}${step.expression ? ` <code>${escapeHtml(step.expression)}</code>` : ''}</li>`).join('')}</ol></details>
        <p class="mm-total">${escapeHtml(t('result.total'))}: ${result.totalPriceMinor === null ? '—' : formatMoney(result.totalPriceMinor, currency, locale)}</p>
        <div class="mm-actions">
          <button class="mm-button mm-button--secondary" type="button" data-action="back">${escapeHtml(t('action.back'))}</button>
          <button class="mm-button mm-button--primary" type="button" data-action="cart" ${!configuration.allowPartialCart && unavailable.length ? 'disabled' : ''}>${escapeHtml(t('action.addSetToCart'))}</button>
        </div>
      </section>
    </main>`;
  }

  #emitMeasurementsChange(): void {
    const rooms = this.#rooms.flatMap((room, index): WidgetRoomMeasurement[] => {
      const lengthMm = parseMetersToMillimeters(room.length);
      const widthMm = parseMetersToMillimeters(room.width);
      const doorWidthMm = parseMetersToMillimeters(room.doorWidth);
      const excludedAreaSquareMm = parseSquareMetersToSquareMillimeters(room.excludedArea);
      const internalCornerCount = parseNonNegativeInteger(room.internalCornerCount);
      const externalCornerCount = parseNonNegativeInteger(room.externalCornerCount);
      return lengthMm === null ||
        widthMm === null ||
        doorWidthMm === null ||
        excludedAreaSquareMm === null ||
        internalCornerCount === null ||
        externalCornerCount === null
        ? []
        : [
            {
              id: room.id,
              name: room.name || `Pomieszczenie ${index + 1}`,
              lengthMm,
              widthMm,
              doorWidthMm,
              excludedAreaSquareMm,
              internalCornerCount,
              externalCornerCount,
            },
          ];
    });
    this.#emit('materialmatch:measurements-change', {
      rooms,
      wasteBasisPoints: Math.round(Number(this.#wastePercent.replace(',', '.')) * 100),
    });
  }

  #emitCart(): void {
    if (!this.#result || !this.#trustedCalculationInput) return;
    const omitted = this.#result.lines.filter((line) => line.status !== 'available');
    this.#emit('materialmatch:add-to-cart', {
      calculationId: this.#result.calculationId,
      input: this.#trustedCalculationInput,
      lines: this.#result.lines.map(({ sku, quantity }) => ({ sku, quantity })),
      omittedLines: omitted.map(({ sku, status }) => ({ sku, reason: status })),
    });
  }

  #defaultVariantId(calculation: unknown): string | undefined {
    if (typeof calculation !== 'object' || calculation === null || Array.isArray(calculation))
      return undefined;
    const value = (calculation as Record<string, unknown>).defaultVariantId;
    return typeof value === 'string' ? value : undefined;
  }

  #calculationInputFromRequest(request: WidgetCalculationRequest): CalculationInput {
    return {
      project: {
        id: request.project.id,
        rooms: request.project.rooms.map((room) => ({
          id: room.id,
          name: room.name,
          geometry: {
            kind: 'rectangle' as const,
            lengthMillimeters: room.lengthMm,
            widthMillimeters: room.widthMm,
          },
          excludedAreas:
            room.excludedAreaSquareMm > 0
              ? [{ id: `${room.id}-excluded`, areaSquareMillimeters: room.excludedAreaSquareMm }]
              : [],
          doors:
            room.doorWidthMm > 0
              ? [{ id: `${room.id}-doors`, widthMillimeters: room.doorWidthMm }]
              : [],
          corners: {
            internal: room.internalCornerCount ?? 0,
            external: room.externalCornerCount ?? 0,
          },
        })),
        wasteBasisPoints: request.project.wasteBasisPoints,
      },
      ...(request.variantId ? { variantId: request.variantId } : {}),
      selectedOptionalAccessoryIds: request.selectedOptionalAccessoryIds ?? [],
    };
  }

  #emit<T extends keyof HTMLElementEventMap>(
    name: T,
    detail: HTMLElementEventMap[T] extends CustomEvent<infer D> ? D : never,
  ): void {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
  }
}
