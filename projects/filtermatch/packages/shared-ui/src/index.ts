export function formatDatePl(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long', timeZone: 'Europe/Warsaw' }).format(new Date(value));
}

export function formatMoneyPl(priceMinor: number, currency: string): string {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(priceMinor / 100);
}

export function verificationLabel(status: string): string {
  const labels: Record<string, string> = {
    verified_official: 'Potwierdzone oficjalnie',
    verified_multi_source: 'Potwierdzone w wielu źródłach',
    verified_supplier: 'Potwierdzone przez dostawcę',
    candidate: 'Kandydat — wymaga sprawdzenia',
    conflicting: 'Źródła sprzeczne',
    unknown: 'Brak wystarczających danych'
  };
  return labels[status] ?? status;
}

export function consumableCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'air-purifier-filter': 'Filtr zintegrowany',
    'air-purifier-filter-set': 'Kompletny zestaw filtrów',
    'air-purifier-hepa-filter': 'Filtr HEPA',
    'air-purifier-carbon-filter': 'Filtr węglowy',
    'air-purifier-prefilter': 'Filtr wstępny',
    'air-purifier-accessory': 'Akcesorium eksploatacyjne'
  };
  return labels[category] ?? category;
}

export function compatibilityRelationLabel(relationType: string): string {
  const labels: Record<string, string> = {
    required: 'Wymagany element',
    alternative: 'Zweryfikowana alternatywa',
    optional: 'Opcjonalne akcesorium'
  };
  return labels[relationType] ?? relationType;
}

export function serializeStructuredData(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}
