import { MaterialMatchElement } from '@materialmatch/materialmatch-widget';
import type { WidgetConfiguration } from '@materialmatch/materialmatch-widget';
import { referenceFlooringConfiguration } from '@materialmatch/test-fixtures';
import './styles.css';

if (!customElements.get('material-match'))
  customElements.define('material-match', MaterialMatchElement);

const productNames: Readonly<Record<string, string>> = {
  'fictional-floor-panel': 'Fikcyjne panele Natural 8',
  underlay: 'Fikcyjny podkład 10 m²',
  'vapor-barrier': 'Fikcyjna folia paroizolacyjna',
  skirting: 'Fikcyjna listwa 2,4 m',
  'internal-corner': 'Narożnik wewnętrzny',
  'external-corner': 'Narożnik zewnętrzny',
  connector: 'Łącznik',
  'end-cap': 'Zakończenie',
  'threshold-profile': 'Profil progowy',
  'installation-tape': 'Taśma montażowa',
};

const widgetConfiguration: WidgetConfiguration = {
  schemaVersion: String(referenceFlooringConfiguration.version.schemaVersion),
  configurationVersion: `${referenceFlooringConfiguration.version.schemaVersion}.${referenceFlooringConfiguration.version.revision}`,
  locale: referenceFlooringConfiguration.locale,
  currency: referenceFlooringConfiguration.currency,
  defaultWasteBasisPoints: referenceFlooringConfiguration.wasteRule.defaultBasisPoints,
  minimumWasteBasisPoints: referenceFlooringConfiguration.wasteRule.minimumBasisPoints,
  maximumWasteBasisPoints: referenceFlooringConfiguration.wasteRule.maximumBasisPoints,
  allowPartialCart: true,
  brand: { name: 'MaterialMatch' },
  productNames,
  calculation: referenceFlooringConfiguration,
};

const unitLabel = (saleUnit: 'package' | 'piece' | 'roll'): string =>
  saleUnit === 'package' ? 'opak.' : saleUnit === 'roll' ? 'rol.' : 'szt.';
const cartPresentationBySku = new Map<string, { name: string; unit: string }>([
  ...referenceFlooringConfiguration.mainProduct.variants.map(
    (variant) =>
      [
        variant.sku,
        {
          name: productNames[referenceFlooringConfiguration.mainProduct.id] ?? 'Materiał główny',
          unit: unitLabel(variant.package.saleUnit),
        },
      ] as const,
  ),
  ...referenceFlooringConfiguration.accessories.map(
    (product) =>
      [
        product.variant.sku,
        {
          name: productNames[product.id] ?? 'Akcesorium',
          unit: unitLabel(product.variant.package.saleUnit),
        },
      ] as const,
  ),
]);

const calculator = document.querySelector<MaterialMatchElement>('#material-calculator');
if (!calculator) throw new Error('MaterialMatch element is missing from demo page.');
calculator.configuration = widgetConfiguration;

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required demo element is missing: ${selector}`);
  return element;
}

const cart = requiredElement<HTMLElement>('#demo-cart');
const cartLines = requiredElement<HTMLUListElement>('#cart-lines');
const cartCount = requiredElement<HTMLElement>('#cart-count');
const cartButton = requiredElement<HTMLButtonElement>('.cart-button');
const cartBackdrop = requiredElement<HTMLElement>('#cart-backdrop');
const closeCartButton = requiredElement<HTMLButtonElement>('#close-cart');
const demoEvent = requiredElement<HTMLElement>('#demo-event');

function openCart(): void {
  cart.hidden = false;
  cartBackdrop.hidden = false;
  cartButton.setAttribute('aria-expanded', 'true');
  document.body.classList.add('cart-open');
  cart.querySelector<HTMLElement>('h2')?.focus();
}

function closeCart(): void {
  cart.hidden = true;
  cartBackdrop.hidden = true;
  cartButton.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('cart-open');
  cartButton.focus();
}

calculator.addEventListener('materialmatch:ready', () => {
  demoEvent.textContent = 'Kalkulator gotowy';
});

calculator.addEventListener('materialmatch:calculation-complete', () => {
  demoEvent.textContent = 'Projekt obliczony';
});

calculator.addEventListener('materialmatch:step-change', (event) => {
  if (event.detail.step === 'measurements') demoEvent.textContent = 'Edytujesz wymiary';
});

calculator.addEventListener('materialmatch:add-to-cart', (event) => {
  cartLines.replaceChildren(
    ...event.detail.lines.map((line) => {
      const item = document.createElement('li');
      const presentation = cartPresentationBySku.get(line.sku);
      item.textContent = `${presentation?.name ?? 'Produkt'}: ${line.quantity} ${presentation?.unit ?? 'szt.'}`;
      return item;
    }),
  );
  cartCount.textContent = String(event.detail.lines.reduce((sum, line) => sum + line.quantity, 0));
  demoEvent.textContent = 'Zestaw dodany do koszyka';
  openCart();
});

cartButton.addEventListener('click', openCart);
closeCartButton.addEventListener('click', closeCart);
cartBackdrop.addEventListener('click', closeCart);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !cart.hidden) closeCart();
});
