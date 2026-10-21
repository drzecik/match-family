import '@filtermatch/compatibility-widget/auto-register';

const events = document.querySelector('#events');
for (const eventName of [
  'filtermatch:ready',
  'filtermatch:search',
  'filtermatch:result',
  'filtermatch:no-result',
  'filtermatch:product-click',
  'filtermatch:config-error'
]) {
  document.addEventListener(eventName, (event) => {
    if (events && event instanceof CustomEvent) {
      events.textContent = eventMessage(eventName, event.detail as Record<string, unknown>);
    }
  });
}

function eventMessage(eventName: string, detail: Record<string, unknown>): string {
  if (eventName === 'filtermatch:ready') {
    return `Widget jest gotowy.\nUrządzenia w katalogu: ${detail.deviceCount ?? 0}\nProdukty w katalogu: ${detail.productCount ?? 0}`;
  }
  if (eventName === 'filtermatch:search') return 'Sprawdzanie modelu…';
  if (eventName === 'filtermatch:result') {
    const productIds = Array.isArray(detail.productIds) ? detail.productIds : [];
    return `Znaleziono jednoznaczne dopasowanie.\nLiczba pokazanych produktów: ${productIds.length}`;
  }
  if (eventName === 'filtermatch:no-result') {
    const reasons: Record<string, string> = {
      ambiguous: 'model jest niejednoznaczny',
      candidates: 'znaleziono tylko podobne modele',
      not_found: 'modelu nie ma w katalogu',
      no_products: 'brak zweryfikowanych produktów w sklepie'
    };
    return `Nie znaleziono bezpiecznego dopasowania.\nPowód: ${reasons[String(detail.reason)] ?? 'brak wystarczających danych'}`;
  }
  if (eventName === 'filtermatch:product-click') return 'Użytkownik otworzył kartę wybranego produktu.';
  return 'Widget ma nieprawidłową konfigurację. Sprawdź plik katalogu.';
}
