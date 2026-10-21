export type TranslationId =
  | 'app.name'
  | 'action.addRoom'
  | 'action.back'
  | 'action.calculate'
  | 'action.addSetToCart'
  | 'action.removeRoom'
  | 'action.startOver'
  | 'step.measurements'
  | 'step.result'
  | 'steps.label'
  | 'brand.logoAlt'
  | 'field.roomName'
  | 'field.length'
  | 'field.width'
  | 'field.doorWidth'
  | 'field.excludedArea'
  | 'field.internalCorners'
  | 'field.externalCorners'
  | 'field.wastePercent'
  | 'field.roomNameHint'
  | 'field.lengthHint'
  | 'field.widthHint'
  | 'field.doorWidthHint'
  | 'field.excludedAreaHint'
  | 'field.internalCornersHint'
  | 'field.externalCornersHint'
  | 'field.wasteHint'
  | 'measurement.heading'
  | 'measurement.roomLegend'
  | 'measurement.intro'
  | 'result.heading'
  | 'result.measurementSummary'
  | 'result.products'
  | 'result.product'
  | 'result.productCode'
  | 'result.quantity'
  | 'result.unitPrice'
  | 'result.totalPrice'
  | 'result.netArea'
  | 'result.wasteArea'
  | 'result.grossArea'
  | 'result.purchaseArea'
  | 'result.surplusArea'
  | 'result.explanation'
  | 'result.total'
  | 'status.calculating'
  | 'status.ready'
  | 'unit.meter'
  | 'unit.squareMeter'
  | 'unit.piece'
  | 'unit.package'
  | 'validation.invalidNumber'
  | 'validation.positiveNumber'
  | 'validation.wasteRange'
  | 'validation.configuration'
  | 'error.calculation'
  | 'warning.partialCart'
  | 'warning.unavailable'
  | 'warning.missingPrice'
  | 'explanation.packages'
  | 'calculation.netArea'
  | 'calculation.perimeter'
  | 'calculation.skirtingLength'
  | 'calculation.wasteArea'
  | 'calculation.grossArea'
  | 'calculation.rawPackages'
  | 'calculation.finalPackages'
  | 'calculation.purchasedArea'
  | 'calculation.accessory.byArea'
  | 'calculation.accessory.byPerimeter'
  | 'calculation.accessory.byRoomCount'
  | 'calculation.accessory.byDoorCount'
  | 'calculation.accessory.byCornerCount'
  | 'calculation.accessory.byMainPackages'
  | 'calculation.accessory.fixed'
  | 'calculation.accessory.optional'
  | 'warning.productUnavailable'
  | 'warning.priceMissing'
  | 'warning.optionalAccessoryNotSelected'
  | 'warning.incompatibleAccessory';

export type TranslationDictionary = Readonly<Record<TranslationId, string>>;

export const polishTranslations: TranslationDictionary = {
  'app.name': 'MaterialMatch',
  'action.addRoom': 'Dodaj pomieszczenie',
  'action.back': 'Wróć do wymiarów',
  'action.calculate': 'Oblicz materiały',
  'action.addSetToCart': 'Dodaj zestaw do koszyka',
  'action.removeRoom': 'Usuń pomieszczenie',
  'action.startOver': 'Zacznij od początku',
  'step.measurements': 'Wymiary',
  'step.result': 'Zestaw',
  'steps.label': 'Etapy kalkulatora',
  'brand.logoAlt': 'Logo {name}',
  'field.roomName': 'Nazwa pomieszczenia (opcjonalnie)',
  'field.length': 'Długość',
  'field.width': 'Szerokość',
  'field.doorWidth': 'Łączna szerokość drzwi',
  'field.excludedArea': 'Powierzchnia do odjęcia',
  'field.internalCorners': 'Narożniki wewnętrzne',
  'field.externalCorners': 'Narożniki zewnętrzne',
  'field.wastePercent': 'Zapas materiału',
  'field.roomNameHint': 'Na przykład: Salon.',
  'field.lengthHint': 'Wpisz długość w metrach, na przykład 5 lub 5,25.',
  'field.widthHint': 'Wpisz szerokość w metrach, na przykład 4 lub 4,50.',
  'field.doorWidthHint': 'Wpisz łączną szerokość wszystkich drzwi w metrach.',
  'field.excludedAreaHint': 'Wpisz powierzchnię, której nie trzeba pokrywać, albo pozostaw 0.',
  'field.internalCornersHint': 'Podaj liczbę narożników wewnętrznych w pomieszczeniu.',
  'field.externalCornersHint': 'Podaj liczbę narożników zewnętrznych w pomieszczeniu.',
  'field.wasteHint': 'Dozwolony zapas: od {minimum}% do {maximum}%.',
  'measurement.heading': 'Wymiary projektu',
  'measurement.roomLegend': 'Pomieszczenie {number}',
  'measurement.intro':
    'Podaj wymiary prostokątnych pomieszczeń. Wynik możesz później poprawić bez ponownego zaczynania.',
  'result.heading': 'Twój zestaw materiałów',
  'result.measurementSummary': 'Podsumowanie pomiarów',
  'result.products': 'Produkty w zestawie',
  'result.product': 'Produkt',
  'result.productCode': 'Kod produktu',
  'result.quantity': 'Ilość',
  'result.unitPrice': 'Cena jednostkowa',
  'result.totalPrice': 'Razem',
  'result.netArea': 'Powierzchnia netto',
  'result.wasteArea': 'Zapas',
  'result.grossArea': 'Powierzchnia z zapasem',
  'result.purchaseArea': 'Kupowana powierzchnia',
  'result.surplusArea': 'Przewidywana nadwyżka',
  'result.explanation': 'Jak to obliczyliśmy',
  'result.total': 'Wartość zestawu',
  'status.calculating': 'Obliczamy potrzebne ilości…',
  'status.ready': 'Wynik jest gotowy.',
  'unit.meter': 'm',
  'unit.squareMeter': 'm²',
  'unit.piece': 'szt.',
  'unit.package': 'opak.',
  'validation.invalidNumber':
    'Sprawdź oznaczone pola. Użyj liczb większych od zera dla długości i szerokości.',
  'validation.positiveNumber': 'Wartość musi być większa od zera.',
  'validation.wasteRange': 'Zapas musi mieścić się w dozwolonym zakresie.',
  'validation.configuration': 'Konfiguracja kalkulatora jest nieprawidłowa.',
  'error.calculation': 'Nie udało się obliczyć zestawu. Sprawdź dane i spróbuj ponownie.',
  'warning.partialCart': 'Nie wszystkie pozycje można dodać do koszyka.',
  'warning.unavailable': 'Produkt jest obecnie niedostępny.',
  'warning.missingPrice': 'Produkt nie ma ustalonej ceny.',
  'explanation.packages':
    'Pełne opakowania zaokrąglamy w górę, dlatego kupowana powierzchnia może być większa od powierzchni z zapasem.',
  'calculation.netArea': 'Zsumowaliśmy powierzchnię pomieszczeń i odjęliśmy wykluczone obszary.',
  'calculation.perimeter': 'Zsumowaliśmy obwody pomieszczeń.',
  'calculation.skirtingLength': 'Od obwodu odjęliśmy łączną szerokość drzwi.',
  'calculation.wasteArea': 'Obliczyliśmy powierzchnię zapasu zgodnie z wybranym procentem.',
  'calculation.grossArea': 'Dodaliśmy zapas do powierzchni netto.',
  'calculation.rawPackages':
    'Podzieliliśmy powierzchnię z zapasem przez wydajność opakowania i zaokrągliliśmy w górę.',
  'calculation.finalPackages': 'Zastosowaliśmy minimalną ilość i wielokrotność zamówienia.',
  'calculation.purchasedArea':
    'Pomnożyliśmy liczbę opakowań przez powierzchnię jednego opakowania.',
  'calculation.accessory.byArea': 'Ilość akcesorium wynika z powierzchni projektu.',
  'calculation.accessory.byPerimeter':
    'Ilość akcesorium wynika z długości obwodu po odjęciu drzwi.',
  'calculation.accessory.byRoomCount': 'Ilość akcesorium wynika z liczby pomieszczeń.',
  'calculation.accessory.byDoorCount': 'Ilość akcesorium wynika z liczby drzwi.',
  'calculation.accessory.byCornerCount': 'Ilość akcesorium wynika z liczby narożników.',
  'calculation.accessory.byMainPackages':
    'Ilość akcesorium wynika z liczby opakowań materiału głównego.',
  'calculation.accessory.fixed': 'Zastosowaliśmy stałą ilość akcesorium.',
  'calculation.accessory.optional': 'Dodatek jest opcjonalny.',
  'warning.productUnavailable': 'Produkt jest obecnie niedostępny.',
  'warning.priceMissing': 'Produkt nie ma ustalonej ceny.',
  'warning.optionalAccessoryNotSelected': 'Zestaw nie obejmuje dodatków opcjonalnych.',
  'warning.incompatibleAccessory': 'Akcesorium jest niekompatybilne z wybranym materiałem.',
};

export function createTranslator(
  overrides: Partial<TranslationDictionary> = {},
): (id: TranslationId, variables?: Readonly<Record<string, string | number>>) => string {
  const translations = { ...polishTranslations, ...overrides };
  return (id, variables = {}) =>
    Object.entries(variables).reduce(
      (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
      translations[id],
    );
}

export function formatDecimal(value: number, locale = 'pl-PL', maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

export function formatMoney(minorUnits: number, currency: string, locale = 'pl-PL'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minorUnits / 100);
}
