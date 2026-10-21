# Model danych FilterMatch

Ostatnia aktualizacja: 2026-07-17.

## Zasady ogólne

- Każdy rekord ma stabilny, nieznaczący identyfikator.
- Publiczna relacja kompatybilności zawsze wskazuje co najmniej jeden prawidłowy `SourceEvidence`.
- Relacje i dowody zachowują historię decyzji; nie nadpisujemy silniejszego dowodu słabszym.
- Daty są zapisywane jako ISO 8601 w UTC, a daty bez godziny jako `YYYY-MM-DD` tylko wtedy, gdy źródło nie daje większej precyzji.
- Kwoty są liczbami całkowitymi w najmniejszej jednostce waluty.
- URL przechodzi whitelistę protokołów `https:` oraz ewentualnie kontrolowane `http:` tylko dla jawnego wyjątku operatorskiego; publiczny build preferuje i domyślnie wymaga HTTPS.
- Wszystkie dane syntetyczne mają jednocześnie `synthetic: true` i `notForProduction: true`.
- `schemaVersion` jest wymagane na poziomie pliku lub paczki importowej. Bieżąca wersja to `2`; migrację opisuje `docs/migrations/2026-07-17-versioned-collections-v2.md`.

Źródłowe pliki v2 używają koperty `{ schemaVersion: 2, kind, records }`. Wygenerowane snapshoty używają `{ schemaVersion: 2, generatedAt, data }`. Loader nie interpretuje gołej tablicy jako bieżących danych.

## Wspólne statusy

`VerificationStatus`:

- `verified_official` — oficjalna dokumentacja producenta urządzenia lub oficjalna lista kompatybilności;
- `verified_multi_source` — kilka niezależnych i zgodnych źródeł;
- `verified_supplier` — dokumentacja producenta zamiennika lub wiarygodnego dystrybutora;
- `candidate` — propozycja wymagająca ręcznej kontroli;
- `conflicting` — źródła prowadzą do sprzecznych wniosków;
- `deprecated` — relacja historyczna, nieważna lub wycofana;
- `rejected` — propozycja sprawdzona i odrzucona;
- `unknown` — brak danych do decyzji.

Dozwolone statusy publikacyjne konfiguruje polityka. `candidate`, `conflicting`, `rejected`, `unknown` i `deprecated` nigdy nie mogą być przedstawione jako bieżąca kompatybilność.

## Device

```ts
type Device = {
  id: string;
  brand: string;
  canonicalModel: string;
  regionalVariant?: string;
  series?: string;
  category: DeviceCategory;
  aliases: string[];
  identifiers: Record<string, string>;
  lifecycleStatus: "active" | "discontinued" | "unknown";
  sourceReferences: string[];
  verificationStatus: VerificationStatus;
  lastVerifiedAt?: string;
  synthetic?: boolean;
  notForProduction?: boolean;
};
```

`canonicalModel` zachowuje znaczący zapis producenta. `regionalVariant` nie może być bezpowrotnie usunięty przez normalizację. Alias w encji jest wygodnym odniesieniem; źródłem prawdy dla zatwierdzenia i normalizacji aliasów jest `SearchAlias`.

## Consumable

```ts
type Consumable = {
  id: string;
  brand: string;
  canonicalName: string;
  sku: string;
  ean?: string;
  category: ConsumableCategory;
  originalOrReplacement: "original" | "replacement";
  includedElements: Array<{ name: string; quantity: number }>;
  dimensions?: {
    widthMm?: number;
    heightMm?: number;
    depthMm?: number;
    diameterMm?: number;
  };
  attributes: Record<string, string | number | boolean>;
  lifecycleStatus: "active" | "discontinued" | "unknown";
  sourceReferences: string[];
  synthetic?: boolean;
  notForProduction?: boolean;
};
```

`attributes` są walidowane według kategorii; nie są dowolnym kanałem HTML ani kodu. EAN jest ciągiem, aby zachować zera wiodące, i podlega kontroli sumy, jeśli format ją definiuje.

### Semantyka `includedElements`

`includedElements` opisuje fizyczną zawartość jednego SKU, a nie osobne relacje kompatybilności. Każdy element ma niepustą nazwę i dodatnią, całkowitą `quantity`. Przykładowo jeden zintegrowany wkład jest jednym elementem z ilością `1`, a zestaw filtra HEPA i filtra węglowego ma dwa elementy. Kolejność nie niesie znaczenia kompatybilności.

Element zestawu nie jest automatycznie samodzielnym `Consumable`. Jeżeli można go kupić lub dopasować oddzielnie, otrzymuje własny rekord, SKU i `CompatibilityEdge` z własnym dowodem. Nazwa elementu w `includedElements` nie może służyć do wyszukiwania kompatybilności ani łączenia oferty bez kontrolowanego identyfikatora.

Określenie „kompletny zestaw” jest dozwolone tylko wtedy, gdy dowód relacji potwierdza, że zawartość tego SKU pokrywa cały zestaw wymagany w danym wariancie urządzenia. To twierdzenie jest zależne od modelu i relacji; sama liczba elementów nie dowodzi kompletności.

## CompatibilityEdge

```ts
type CompatibilityEdge = {
  id: string;
  deviceId: string;
  consumableId: string;
  relationType: "required" | "optional" | "alternative";
  verificationStatus: VerificationStatus;
  confidence: number; // zakres 0..1; nie zastępuje decyzji reviewera
  evidenceIds: string[];
  notes?: string;
  validFrom?: string;
  validTo?: string;
  lastVerifiedAt?: string;
  synthetic?: boolean;
  notForProduction?: boolean;
};
```

`confidence` komunikuje jakość dowodu, ale nie zastępuje statusu. Wysokie confidence przy `candidate` nie czyni relacji publikowalną. `validTo` w przeszłości wyklucza prezentację relacji jako bieżącej. `notes` są tekstem inertnym i po escaping.

Znaczenie `relationType`:

- `required` — materiał albo zestaw wymagany dla opisanego procesu wymiany;
- `alternative` — udowodniona alternatywa dla produktu lub zestawu wymaganego; nie oznacza dodatkowego elementu do zakupu;
- `optional` — kompatybilne akcesorium lub materiał dodatkowy, którego brak nie uniemożliwia użycia wymaganej konfiguracji.

Akcesorium jest modelowane jako `Consumable` w odpowiedniej kontrolowanej kategorii i ma krawędź `optional`. W MVP nazwa typu `Consumable` obejmuje technicznie każdy produkt dobierany do modelu, także akcesorium; jego właściwą rolę określają kategoria i relacja. Akcesorium musi posiadać własny dowód kompatybilności dla dokładnego urządzenia. Nie dziedziczy zgodności z innego produktu, zestawu, serii ani podobieństwa nazwy. Jeżeli akcesorium jest częścią sprzedawanego zestawu, może równocześnie wystąpić opisowo w `includedElements`; nie tworzy to drugiej relacji bez osobnego rekordu i dowodu.

Niezmienniki:

- istnieją oba końce relacji;
- relacja publikowalna ma niepuste `evidenceIds`;
- każdy wskazany dowód istnieje i wspiera tę decyzję;
- urządzenie, materiał i krawędź syntetyczna mają obie flagi syntetyczności;
- sponsorowanie ani obecność oferty nie wpływają na status;
- relacja wycofana lub po `validTo` nie jest bieżącą kompatybilnością;
- `optional` nie jest prezentowane ani sortowane jako brakujący element wymagany;
- każdy element sprzedawanego zestawu ma dodatnią ilość, a deklaracja kompletnego zestawu jest poparta dowodem relacji;
- liczba lub nazwy `includedElements` nie tworzą automatycznie krawędzi do urządzenia.

## Kompletność danych i pokrycia

Model rozróżnia cztery poziomy kompletności:

| Poziom | Kryterium | Czego nie oznacza |
|---|---|---|
| Rekord | Pola wymagane przez schema są obecne i poprawne | Rekord nie musi być publikowalny |
| Relacja | Istnieją encje końcowe, dowód, decyzja, data i dozwolony status | Nie dowodzi pokrycia wszystkich potrzeb urządzenia |
| Konfiguracja urządzenia | Wszystkie jawnie zadeklarowane role `required` w zakresie fixture mają co najmniej jedną publikowalną opcję; zestawy mają pełne `includedElements`; `optional` są rozdzielone | Nie dowodzi kompletności serii ani marki |
| Katalog demonstracyjny | Każdy scenariusz w wersjonowanej macierzy fixtures ma oczekiwane encje, relacje, dowody, aliasy, oferty albo kontrolowany brak | Nie dowodzi kompletności rynku |

Kompletność katalogu demonstracyjnego jest wynikiem raportu pokrycia dla określonej rewizji, nie polem `VerificationStatus`. Raport powinien sprawdzać co najmniej:

1. każde urządzenie w zakresie demo ma źródło tożsamości i rozstrzygnięte wymagane role materiałów albo jawny scenariusz negatywny;
2. każda publiczna relacja ma dowód, datę i zgodne flagi fixture;
3. każdy publiczny materiał jest osiągalny z co najmniej jednego urządzenia w zakresie demo;
4. każdy zestaw ma co najmniej jeden element, dodatnie ilości i zgodność opisu z dowodem syntetycznym;
5. każde akcesorium ma `optional` i nie jest zaliczane do brakujących elementów wymaganych;
6. każda alternatywa wskazuje kompletny sprzedawany produkt lub zestaw, a nie nieidentyfikowalny fragment;
7. wszystkie zaplanowane przypadki negatywne pozostają niepubliczne;
8. fixtures ofertowe pokrywają zaplanowane stany aktualności, ale brak oferty nie zmienia kompatybilności;
9. każda encja syntetyczna ma obie flagi, a produkcyjny artefakt ją odrzuca.

Nie istnieje status ani flaga „market complete”. Takie twierdzenie wymagałoby osobnego, zewnętrznie audytowalnego zakresu producentów, modeli, regionów i daty granicznej; nie jest częścią MVP.

## SourceEvidence

```ts
type SourceEvidence = {
  id: string;
  sourceType:
    | "official_manual"
    | "official_compatibility_list"
    | "official_product_page"
    | "replacement_manufacturer"
    | "trusted_distributor"
    | "independent_supporting";
  title: string;
  url?: string;
  documentId?: string;
  manufacturer?: string;
  documentVersion?: string;
  pageReference?: string;
  accessedAt: string;
  evidenceSummary: string;
  contentHash?: string;
  reviewer: string;
  verifiedAt: string;
  verificationDecision: VerificationStatus;
  synthetic?: boolean;
  notForProduction?: boolean;
};
```

Wymagane jest `url` albo `documentId`. `evidenceSummary` to krótka notatka o wspieranym twierdzeniu, nie kopia dokumentu. `reviewer` jest identyfikatorem operatora lub zatwierdzonego procesu, nie publicznym adresem e-mail.

## Offer

```ts
type Offer = {
  id: string;
  consumableId: string;
  merchant: string;
  merchantProductId?: string;
  sku?: string;
  ean?: string;
  priceMinor?: number;
  currency: string;
  shippingMinor?: number;
  availability: "in_stock" | "out_of_stock" | "preorder" | "unknown";
  destinationUrl: string;
  affiliateUrl?: string;
  sponsored: boolean;
  fetchedAt: string;
  expiresAt?: string;
  status: "active" | "inactive" | "expired";
  synthetic?: boolean;
  notForProduction?: boolean;
};
```

Oferta bez ceny może zostać pokazana jako oferta bez znanej ceny, ale nie może dostać ceny domniemanej. Po `expiresAt` cena nie jest prezentowana jako aktualna. `affiliateUrl` musi wskazywać zatwierdzoną domenę i nie jest budowany z parametru użytkownika.

## SearchAlias

```ts
type SearchAlias = {
  id: string;
  entityType: "device" | "consumable";
  entityId: string;
  rawAlias: string;
  normalizedAlias: string;
  aliasType:
    | "canonical"
    | "separator_variant"
    | "regional_code"
    | "series_name"
    | "product_code"
    | "common_typo";
  approved: boolean;
  source: string;
  synthetic?: boolean;
  notForProduction?: boolean;
};
```

Do dokładnego rozstrzygnięcia używa się wyłącznie `approved: true`. Kolizja jednego znormalizowanego aliasu między różnymi urządzeniami wymusza wynik niejednoznaczny albo błąd builda, zależnie od rodzaju aliasu.

## CorrectionReport

```ts
type CorrectionReport = {
  entityType?: "device" | "consumable" | "compatibility";
  entityId?: string;
  query?: string;
  message: string;
  contactConsent: boolean;
  submittedAt?: string;
};
```

To kontrakt formularza, nie magazyn danych w repozytorium. Endpoint jest zewnętrzny i opcjonalny. Nie wymagamy nazwiska ani e-maila; limitujemy rozmiar pól i walidujemy URL.

## ReviewDecision

```ts
type ReviewDecision = {
  id: string;
  edgeId: string;
  previousStatus: VerificationStatus;
  decision: Exclude<VerificationStatus, "candidate">;
  evidenceIds: string[];
  reviewer: string;
  decisionAuthority: "authorized_human_reviewer";
  decidedAt: string;
  rationale: string;
  synthetic?: boolean;
  notForProduction?: boolean;
};
```

Decyzje są append-only. `previousStatus` stanowi optimistic lock, a najnowsza decyzja musi być zgodna ze statusem, dowodami i `lastVerifiedAt` relacji. Zweryfikowana decyzja musi przejść tę samą politykę publikacji co build. AI ani importer nie mogą tworzyć autoryzowanej decyzji człowieka.

## Historia i decyzje

Zmiana dowodu lub decyzji jest nowym, audytowalnym zdarzeniem albo nową wersją rekordu. Import nie zastępuje istniejącego statusu, jeśli nowy materiał ma niższą rangę. Konflikt tworzy raport i może przenieść relację do `conflicting`; nie jest automatycznie rozstrzygany na korzyść nowszego rekordu.

## Wersjonowanie i migracje

Każda niekompatybilna zmiana modelu danych wymaga:

1. podniesienia `schemaVersion`;
2. dokumentu w `docs/migrations/YYYY-MM-DD-name.md` opisującego stare i nowe pole;
3. deterministycznego skryptu migracji lub jawnej procedury ręcznej;
4. fixtures przed i po migracji;
5. testów kompatybilności oraz walidacji pełnego zbioru;
6. informacji o możliwości rollbacku;
7. regeneracji pochodnych artefaktów.

Zmiana nazwy bez migracji nie jest dopuszczalna. `data/generated` nie jest migrowane — jest ponownie generowane ze źródeł.

Pierwszą migrację v1→v2 wykonano 2026-07-17. Rejestr migracji znajduje się w `docs/migrations/`.
