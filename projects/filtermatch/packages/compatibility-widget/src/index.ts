import {
  noResultEventDetail,
  prepareWidgetConfig,
  resolveWidgetQuery,
  type PreparedWidgetConfig,
  type WidgetConfig,
  type WidgetProduct
} from './core.js';

export * from './core.js';
export * from './bootstrap.js';

const DEFAULT_INTRO = 'Wpisz dokładny model. Wyniki dotyczą tylko produktów w tym sklepie.';

export class FilterMatchWidget extends HTMLElement {
  private configValue: WidgetConfig | null = null;
  private preparedConfig: PreparedWidgetConfig | null = null;

  set config(value: WidgetConfig) {
    this.configValue = value;
    try {
      this.preparedConfig = prepareWidgetConfig(value);
      this.render();
      this.emit('filtermatch:ready', {
        deviceCount: value.catalog.devices.length,
        productCount: value.catalog.products.length
      });
    } catch (error) {
      this.preparedConfig = null;
      this.renderConfigurationError();
      this.emit('filtermatch:config-error', {
        message: error instanceof Error ? error.message : 'Invalid widget configuration'
      });
    }
  }

  get config(): WidgetConfig | null {
    return this.configValue;
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    const config = this.preparedConfig;
    if (!config) {
      if (this.configValue) this.renderConfigurationError();
      else this.textContent = 'Widget oczekuje katalogu.';
      return;
    }
    const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
    const title = config.labels?.title ?? 'Znajdź filtr do urządzenia';
    const intro = config.labels?.intro ?? DEFAULT_INTRO;
    const submit = config.labels?.submit ?? 'Sprawdź';
    const color = config.theme?.color ?? '#12352f';
    const accent = config.theme?.accent ?? '#e9ff78';
    const background = config.theme?.background ?? '#ffffff';
    const radius = config.theme?.borderRadiusPx ?? 16;
    root.innerHTML = `
      <style>
        :host{--fm-color:${color};--fm-accent:${accent};--fm-background:${background};--fm-radius:${radius}px;display:block;font-family:system-ui,sans-serif;color:#17231f}
        *{box-sizing:border-box}.box{border:1px solid #d7ded9;border-radius:var(--fm-radius);padding:20px;background:var(--fm-background)}h2{margin:0 0 6px;font-size:22px}p{color:#5e6d67;line-height:1.5}
        form{display:flex;gap:8px}input{min-width:0;flex:1;border:1px solid #aebbb5;border-radius:8px;padding:11px}input:focus{outline:3px solid var(--fm-accent);outline-offset:1px}button{border:0;border-radius:8px;padding:11px 16px;background:var(--fm-color);color:#fff;font-weight:700;cursor:pointer}
        ul{list-style:none;padding:0;margin:16px 0 0}li{padding:12px 0;border-top:1px solid #d7ded9;display:flex;justify-content:space-between;gap:12px}a{color:var(--fm-color);font-weight:700}.tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:5px}.tag{font-size:11px;background:var(--fm-accent);padding:3px 6px;border-radius:4px}.tag.optional{background:#e8f0ff}.warning{background:#fff3d7;padding:10px;border-radius:8px}.status:empty{display:none}.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
        @media(max-width:520px){form,li{flex-direction:column}button{width:100%}}
      </style>
      <section class="box" aria-labelledby="fm-widget-title"><h2 id="fm-widget-title">${escapeHtml(title)}</h2><p>${escapeHtml(intro)}</p><form><label class="visually-hidden" for="fm-model">Model urządzenia</label><input id="fm-model" aria-label="Model urządzenia" required maxlength="200" placeholder="np. AirPure AP420/10"><button>${escapeHtml(submit)}</button></form><div class="status" role="status" aria-live="polite"></div></section>`;
    root.querySelector('form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = root.querySelector('input');
      if (!(input instanceof HTMLInputElement)) return;
      this.search(input.value);
    });
  }

  private renderConfigurationError(): void {
    const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
    root.innerHTML = '<p role="alert">Widget ma nieprawidłową konfigurację i nie może pokazać wyników.</p>';
  }

  private search(query: string): void {
    const config = this.preparedConfig;
    const status = this.shadowRoot?.querySelector('[role="status"]');
    if (!config || !status) return;
    const result = resolveWidgetQuery(config, query);
    const queryDetail = config.privacy?.emitNoResultEvents === true
      && config.privacy?.includeNormalizedQueryInEvents === true
      ? { normalizedQuery: result.normalizedQuery }
      : {};
    this.emit('filtermatch:search', queryDetail);
    if (result.status !== 'resolved') {
      const candidate = result.status === 'ambiguous' || result.status === 'candidates';
      const message = result.status === 'no_products'
        ? (config.labels?.noProducts ?? 'Brak zweryfikowanych produktów w katalogu sklepu.')
        : candidate
          ? 'Wybierz dokładniejszy model. Nie pokazujemy produktów dla niepotwierdzonego urządzenia.'
          : (config.labels?.noModel ?? 'Brak modelu w katalogu sklepu.');
      status.innerHTML = `<p class="warning">${escapeHtml(message)}</p>`;
      const noResultDetail = noResultEventDetail(config, result);
      if (noResultDetail) this.emit('filtermatch:no-result', noResultDetail);
      return;
    }
    const edgeByProduct = new Map(result.edges.map((edge) => [edge.productId, edge]));
    status.innerHTML = `<ul>${result.products.map((product) => productMarkup(product, edgeByProduct.get(product.id)?.relationType)).join('')}</ul>`;
    for (const link of Array.from(status.querySelectorAll<HTMLAnchorElement>('a[data-product-id]'))) {
      link.addEventListener('click', () => this.emit('filtermatch:product-click', {
        deviceId: result.deviceId,
        productId: link.dataset.productId
      }));
    }
    this.emit('filtermatch:result', {
      deviceId: result.deviceId,
      productIds: result.products.map(({ id }) => id),
      ...queryDetail
    });
  }

  private emit(name: string, detail: Record<string, unknown>): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }
}

function productMarkup(product: WidgetProduct, relationType?: string): string {
  const kind = product.kind === 'original' ? 'Oryginał' : 'Zamiennik';
  const relation = relationType === 'required'
    ? '<span class="tag relation">Produkt wymagany</span>'
    : relationType === 'alternative'
      ? '<span class="tag relation">Zweryfikowana alternatywa</span>'
      : relationType === 'optional'
        ? '<span class="tag optional">Akcesorium opcjonalne</span>'
        : '';
  return `<li><span><span class="tags"><span class="tag">${kind}</span>${relation}</span>${escapeHtml(product.name)}</span><a data-product-id="${escapeHtml(product.id)}" href="${safePublicUrl(product.url)}" rel="nofollow noopener noreferrer">Zobacz</a></li>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character);
}

function safePublicUrl(value: string): string {
  const parsed = new URL(value);
  return escapeHtml(parsed.href);
}

export function registerFilterMatchWidget(): void {
  if (!customElements.get('filter-match-widget')) customElements.define('filter-match-widget', FilterMatchWidget);
}
