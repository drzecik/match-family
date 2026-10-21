# Architektura FilterMatch

Ostatnia aktualizacja: 2026-07-17.

## Cele architektoniczne

- bezpieczeństwo dopasowania ważniejsze od liczby wyników;
- static-first i brak produkcyjnej bazy danych w MVP;
- deterministyczny build z wersjonowanych danych;
- oddzielenie domeny kompatybilności od ofert i sponsorowania;
- audytowalność źródła, decyzji i wersji danych;
- możliwość dodawania kolejnych kategorii bez przebudowy rdzenia;
- możliwość wyprowadzenia statycznego widgetu white-label;
- niskie koszty utrzymania i brak stałej obsługi serwera.

Decyzję static-first zapisuje [ADR-0001](adr/0001-static-first-versioned-data.md).

## Widok systemu

```text
kontrolowane pliki wejściowe
  -> importer
  -> walidacja schematu i bezpieczeństwa
  -> normalizacja i deduplikacja
  -> wykrywanie konfliktów
  -> ręczna decyzja weryfikacyjna
  -> polityka publikacji
  -> wygenerowane dane publiczne + indeks wyszukiwania
  -> Astro build
  -> statyczny serwis i statyczny widget
```

Import i analiza tworzą kandydatów. Dopiero jawna, śledzona decyzja uprawnionego weryfikatora może nadać status publikowalny. Build publiczny czyta tylko wyjście polityki publikacji, a nie surowe dane czy katalog `candidates`.

## Struktura monorepo

```text
apps/
  web/                    # serwis Astro, polski interfejs, strony statyczne
  widget-demo/            # demonstrator osadzanego widgetu
packages/
  domain/                 # typy i reguły domenowe bez IO i UI
  compatibility-core/     # polityka publikacji, rozstrzyganie relacji
  model-search/           # normalizacja, aliasy, indeks i ranking
  data-schema/            # Zod/JSON Schema i wersje danych
  data-pipeline/           # import, walidacja, raporty i generatory
  affiliate-offers/       # OfferProvider, aktualność i sortowanie
  compatibility-widget/   # komponent i kontrakt zdarzeń widgetu
  shared-ui/               # współdzielone komponenty prezentacyjne
data/
  raw/                    # kontrolowane wejścia, nigdy bezpośrednio publiczne
  candidates/             # dane do ręcznej oceny
  verified/               # zatwierdzone dane źródłowe
  offers/                 # dane ofertowe
  generated/              # deterministyczne artefakty builda
  fixtures/               # wyłącznie jawnie syntetyczne dane testowe
scripts/                  # cienkie wejścia CLI do pakietów pipeline
docs/                     # polityki i procedury
skills/                   # kontrolowane procedury operatorskie
```

Pakiety powinny mieć jawne API i nie importować aplikacji. `domain` nie zależy od frameworków, systemu plików ani warstwy afiliacyjnej. `affiliate-offers` może odwoływać się do `consumableId`, ale nie może tworzyć ani zmieniać `CompatibilityEdge`.

## Warstwy danych

### Raw

Odwzorowanie importu wraz z metadanymi pochodzenia. Dane są niezaufane i inertne. Nie są renderowane ani wykonywane.

### Candidates

Wyniki parsera, heurystyki, AI i automatycznego wykrywania. Każdy rekord ma status `candidate` lub raport błędu. Ta warstwa nie jest wejściem do publicznego generatora stron.

### Verified

Rekordy po jawnej decyzji weryfikacyjnej. Sam katalog nie gwarantuje publikacji: relacja nadal musi przejść walidację, aktywną politykę publikacji, kontrolę dat i kompletności.

Źródłowe kolekcje mają wersjonowane koperty `{ schemaVersion, kind, records }`. Od v2 każda zweryfikowana relacja ma również append-only `ReviewDecision`. Validator odtwarza łańcuch statusów i odrzuca rozbieżność między decyzją a krawędzią.

### Generated

Deterministyczne, pochodne artefakty: bezpieczny zestaw publiczny, indeks wyszukiwania, mapy tras, sitemapa i raporty. Nie edytuje się ich ręcznie; odtwarza je build.

Raport dostępności URL jest wyjątkiem od deterministycznego builda, ponieważ opisuje stan sieci w chwili wykonania. Uruchamia się go osobno przez `pnpm check:source-links`. Checker działa sekwencyjnie, pobiera wyłącznie nagłówki, stosuje limit czasu i przekierowań oraz minimalny odstęp między każdym żądaniem. Wynik jest diagnostyczny i nie jest wejściem do polityki publikacji.

Warstwa sieciowa przypina połączenie do uprzednio rozwiązanej, publicznej odpowiedzi DNS. Ponawia tę kontrolę dla każdego celu przekierowania i blokuje credentials, localhost, domeny zarezerwowane oraz prywatne lub specjalne zakresy IP. Zapobiega to użyciu danych źródłowych jako wektora SSRF w CI lub na komputerze operatora.

## Build publiczny

1. Waliduje wersję schematu i limity wejść.
2. Normalizuje dane i sprawdza identyfikatory referencyjne.
3. Wykrywa duplikaty, kolizje aliasów i konflikty relacji.
4. Wymaga dowodu dla każdej relacji publikowalnej.
5. Stosuje konfigurowalną politykę publikacji.
6. Generuje indeks wyszukiwania z zatwierdzonych encji i aliasów.
7. Generuje strony tylko dla encji spełniających próg SEO.
8. Generuje sitemapy i canonical URL.
9. Buduje statyczne zasoby Astro.
10. Uruchamia testy regresyjne i kontrole dostępności.

Naruszenie niezmiennika danych zatrzymuje build, zamiast łagodnie publikować rekord.

## Wyszukiwanie

Indeks jest generowany podczas builda i pobierany jako wersjonowany plik statyczny. Pipeline zapytania:

1. Unicode NFKC;
2. normalizacja wielkości liter i białych znaków;
3. kontrolowane warianty separatorów;
4. zachowanie rozpoznanych sufiksów regionalnych;
5. dopasowanie dokładnego modelu lub zatwierdzonego aliasu;
6. dopasowanie zatwierdzonych identyfikatorów i kodów produktu;
7. konserwatywne fuzzy matching tylko do listy kandydatów.

Wynik fuzzy nigdy nie otwiera automatycznie strony jako rozstrzygniętego urządzenia. Różnica jednej cyfry nie jest dowodem tożsamości. Przy kilku możliwych wariantach użytkownik wybiera dokładny model przed ujawnieniem kompatybilności.

## Oferty

`OfferProvider` jest portem domenowym dla adapterów CSV i przyszłych, dozwolonych feedów. Import zwraca ujednolicone `Offer` i raport odrzuceń. Reguły aktualności i sortowania są jawne i testowalne. Warstwa ofert nie mutuje danych urządzeń, materiałów ani krawędzi.

Domyślnie serwis linkuje bezpośrednio do przechowywanego, zwalidowanego URL docelowego lub afiliacyjnego. Nie udostępnia endpointu otwartego przekierowania.

## Formularze i anonimowa telemetria

Serwis nie wymaga backendu. Formularze korekty mogą być skonfigurowane build-time do zewnętrznego endpointu z kontrolą antyspamową. Bez konfiguracji pokazują bezpieczny wariant lokalny i nie próbują wysyłać danych.

Rejestrowanie zapytań bez wyniku jest osobną, opcjonalną integracją, domyślnie wyłączoną. Kontrakt zabrania IP, fingerprintów, cookies identyfikujących i dowolnego tekstu mogącego zawierać dane osobowe bez wcześniejszej minimalizacji.

## Widget white-label

Widget otrzymuje statyczny katalog sklepu, indeks urządzeń i mapę dozwolonych produktów. Zwraca tylko produkty obecne w katalogu klienta oraz zgodne na podstawie opublikowanych krawędzi. Branding jest konfiguracją prezentacji. Zdarzenia integracyjne nie zawierają IP ani stabilnego identyfikatora użytkownika. Centralny serwer nie jest wymagany do wyszukiwania.

## SEO i reklamy

Generator tras stosuje próg kompletności i status weryfikacji. Strony `candidate`, puste wyniki, kombinacje filtrów i strony bez zweryfikowanych relacji nie są indeksowane. Reklamy są niezależnymi, opcjonalnymi slotami, wyłączonymi w development; nie mogą rozdzielać identyfikacji urządzenia od ostrzeżenia ani zasłaniać dowodów.

## Niezawodność i obserwowalność

MVP nie wymaga usług czasu rzeczywistego. Jakość jest kontrolowana w CI przez:

- walidację danych i referencji;
- raport relacji bez źródeł;
- raport konfliktów, kolizji aliasów i starych danych;
- raport zweryfikowanych urządzeń bez publikowalnego materiału;
- testy jednostkowe i regresyjne;
- lint i typecheck;
- testy E2E oraz dostępności;
- kontrolę niedozwolonego indeksowania;
- opcjonalny raport uszkodzonych odnośników wykonywany bez kopiowania treści źródłowej.

Raporty builda nie zawierają danych użytkowników ani sekretów.

Raporty braków operacyjnych mają wspólną kopertę z wersją schematu, wersją normalizatora i deterministycznym hashem pełnego snapshotu. Dzięki temu operator może potwierdzić, że raporty dowodów, aliasów i pokrycia opisują dokładnie tę samą rewizję danych. Raport jest diagnostyką i nie mutuje statusów ani źródeł.

## Ewolucja

Nowe kategorie używają tych samych encji i relacji, a różnice opisują typowane `attributes` oraz kontrolowane słowniki kategorii. Zmiana schematu wymaga podniesienia `schemaVersion`, dokumentowanej migracji i testów zgodności. Produkcyjna baza danych będzie rozważana dopiero, gdy statyczny workflow nie spełni mierzalnych potrzeb operacyjnych.
