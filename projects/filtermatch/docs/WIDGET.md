# Widget white-label

Widget FilterMatch działa całkowicie po stronie klienta. Nie wymaga konta, centralnego API ani przesyłania zapytań do FilterMatch.

## Build

```bash
pnpm --filter @filtermatch/compatibility-widget build
```

Artefakt `packages/compatibility-widget/dist/filter-match-widget.js` można umieścić na własnym CDN sklepu i osadzić jednym skryptem modułowym:

```html
<filter-match-widget
  id="filter-search"
  data-config-url="/assets/filtermatch-catalog.json"
></filter-match-widget>
<script type="module" src="/assets/filter-match-widget.js"></script>
```

Skrypt sam rejestruje komponent, odczytuje deklaratywny `data-config-url` z elementu, pobiera statyczny JSON, sprawdza limit 5 MB i waliduje cały katalog przed renderowaniem. Konfiguracja jest domyślnie ładowana wyłącznie z originu sklepu, bez cookies, referera i automatycznego podążania za przekierowaniem. Osobny CDN konfiguracji wymaga jawnego `data-allow-cross-origin-config="true"` na elemencie widgetu oraz poprawnej polityki CORS po stronie CDN. Dla nieprzetwarzanego bezpośredniego tagu skryptu nadal obsługiwane są `data-config-url` i `data-target`, ale wariant na elemencie jest odporny na transformacje HTML wykonywane przez bundlery sklepu.

Katalog jest jawnym obiektem zawierającym `devices`, zatwierdzone `aliases`, produkty sklepu, krawędzie `compatibility` oraz metadane `evidence`. Każda publiczna krawędź wskazuje `evidenceIds`; status oficjalny wymaga źródła oficjalnego, status dostawcy — źródła producenta zamiennika lub dystrybutora, a status wieloźródłowy — co najmniej dwóch dowodów od różnych wydawców i o różnych URL-ach albo identyfikatorach dokumentu. Każdy dowód wymaga URL-u lub identyfikatora dokumentu. Walidator sprawdza także decyzję, reviewera i daty. Sam sklep nie może uzyskać wyniku „zweryfikowany” przez wpisanie statusu bez dowodu. Widget odrzuca:

- duplikaty identyfikatorów i relacji;
- relacje do urządzeń lub produktów spoza katalogu;
- relacje zweryfikowane bez kwalifikującego dowodu lub z niezgodną decyzją;
- URL-e inne niż HTTP/HTTPS oraz URL-e zawierające dane logowania;
- niebezpieczne wartości motywu;
- katalogi przekraczające ustalone limity.

Na ekran mogą trafić wyłącznie produkty dostępne w katalogu sklepu i relacje `verified_official`, `verified_multi_source` lub `verified_supplier`. `candidate`, `conflicting`, `unknown`, `rejected` i `deprecated` nigdy nie są przedstawiane jako kompatybilne.

Zmiana kontraktu dowodowego i sposób migracji istniejących eksportów są opisane w `packages/compatibility-widget/MIGRATIONS.md`.

## Branding

`theme` przyjmuje kolory w notacji szesnastkowej oraz promień narożników od 0 do 48 px. `labels` pozwala zmienić tytuł, tekst pomocniczy, przycisk i komunikaty braku wyniku. Konfiguracja nie przyjmuje HTML.

## Zdarzenia

Widget emituje:

- `filtermatch:ready`;
- `filtermatch:search`;
- `filtermatch:result`;
- `filtermatch:no-result` — wyłącznie po jawnym opt-in;
- `filtermatch:product-click`;
- `filtermatch:config-error`.

Domyślnie widget nie emituje `filtermatch:no-result`, ponieważ już sam fakt braku wyniku może stać się telemetrią zachowania. Włączenie wymaga `privacy.emitNoResultEvents: true`. Payload zawiera wtedy tylko powód. Przekazanie znormalizowanego zapytania wymaga drugiego, niezależnego opt-in `privacy.includeNormalizedQueryInEvents: true` oraz własnej oceny prywatności sklepu. Samo ustawienie flagi zapytania nie uruchamia raportowania. Widget sam nie wysyła zdarzeń do sieci, nie zapisuje cookies, IP ani fingerprintu.

## Demonstrator

```bash
pnpm --filter @filtermatch/widget-demo dev
```

Demonstrator używa jednego skryptu aplikacyjnego i osobnego, statycznego `widget-config.json`. Każdy rekord ma obie flagi fixture i własny syntetyczny dowód. Pokazuje oryginał, zamiennik, opcjonalne akcesorium oraz ukrycie relacji `candidate`. Zdarzenie no-result jest w nim jawnie włączone bez treści zapytania, aby można było sprawdzić kontrakt integracyjny.
