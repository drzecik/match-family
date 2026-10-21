# Polityka źródeł i dowodów

Ostatnia aktualizacja: 2026-07-17.

## Hierarchia źródeł

Preferowana kolejność:

1. oficjalna instrukcja urządzenia;
2. oficjalna lista kompatybilności producenta;
3. oficjalna strona produktu;
4. dokumentacja producenta zamiennika;
5. dokumentacja wiarygodnego dystrybutora;
6. niezależne potwierdzenia pomocnicze.

Pozycja w hierarchii nie wystarcza sama w sobie. Źródło musi dotyczyć dokładnego modelu i zawierać jednoznaczne twierdzenie. Oficjalna strona ogólna bez wskazania modelu nie potwierdza relacji.

## Kryteria oceny

Reviewer sprawdza:

- autorstwo i kontrolę nad domeną lub dokumentem;
- dokładny model, sufiks regionalny, SKU i wersję;
- datę publikacji, wersję i aktualność;
- czy źródło bezpośrednio potwierdza relację, czy tylko ją sugeruje;
- niezależność źródeł przy `verified_multi_source`;
- możliwość audytu przez URL, identyfikator, stronę i hash;
- konflikt interesów i charakter sprzedażowy;
- rozbieżności z istniejącą bazą.

Wynik wyszukiwarki, snippet, marketplace, forum, komentarz użytkownika i wygenerowane podsumowanie mogą pomóc odnaleźć źródło, ale nie są samodzielnym dowodem publikacyjnym.

## Metadane dowodu

Wymagane:

- stabilne `id`;
- `sourceType`;
- tytuł;
- `url` albo `documentId`;
- `accessedAt`;
- zwięzłe `evidenceSummary` opisujące wspierane twierdzenie;
- `reviewer` i `verifiedAt`;
- `verificationDecision`.

Opcjonalne, ale zalecane:

- producent;
- wersja dokumentu;
- numer strony, sekcji lub tabeli;
- hash zawartości albo wersji;
- okres obowiązywania;
- notatka o ograniczeniu regionalnym.

## Prawa autorskie i retencja

Repozytorium nie przechowuje całych chronionych instrukcji ani katalogów producentów bez wyraźnego prawa. Przechowujemy metadane, krótki opis dowodu, dopuszczalny krótki cytat tylko gdy jest niezbędny oraz odnośnik. Hash służy do identyfikacji wersji, nie do odtworzenia treści.

Jeżeli dokument jest dostarczony legalnie do weryfikacji, lokalna kopia robocza nie trafia do repozytorium i jest usuwana zgodnie z warunkami źródła. Do repo trafiają wyłącznie dozwolone metadane.

## Pozyskiwanie źródeł

- Nie scrapujemy stron i nie obchodzimy zabezpieczeń.
- Korzystamy z ręcznie dostarczonych dokumentów, oficjalnych publicznych stron, dozwolonych API lub feedów oraz jawnie licencjonowanych danych.
- Respektujemy warunki korzystania, prawa autorskie i ograniczenia automatycznego dostępu.
- Nie uruchamiamy kodu, makr, skryptów ani aktywnej zawartości z dokumentów lub importów.
- Parser i AI zapisują wyłącznie kandydaturę oraz lokalizację fragmentu do sprawdzenia.

## Niezależność źródeł

Dwa sklepy publikujące identyczny opis z jednego feedu stanowią jedno pochodzenie, nie dwa niezależne źródła. Reviewer dokumentuje wspólne pochodzenie, jeżeli jest widoczne. Źródła należące do jednego producenta są przydatne, ale nie uzasadniają statusu `verified_multi_source` przez samą liczbę URL.

## Uszkodzone i zmienione odnośniki

Automatyczny raport może sprawdzać status URL z rozsądnym limitem i bez scrapingu treści. Błąd odnośnika tworzy zadanie reweryfikacji. Zmiana hasha lub wersji dokumentu wymaga porównania zakresu dowodu. System nie uznaje treści pod tym samym URL za niezmienną.

Checker używa nagłówków `HEAD`, z minimalnym `GET Range` wyłącznie wtedy, gdy serwer nie obsługuje `HEAD`; nie analizuje ani nie archiwizuje treści. Przekierowanie na inną domenę zawsze wymaga review autorstwa źródła. Błąd sieciowy, `429` lub błąd `5xx` jest stanem tymczasowym, a `404` lub `410` sygnałem możliwego trwałego usunięcia. Żaden z tych wyników samodzielnie nie zmienia decyzji weryfikacyjnej.

## Źródła ofertowe

Feed lub CSV sklepu potwierdza ofertę, cenę i dostępność w czasie aktualizacji. Nie potwierdza kompatybilności, chyba że niezależna dokumentacja spełnia kryteria polityki i zostanie oceniona jako osobny `SourceEvidence`.

## Korekty

Zgłoszenie użytkownika jest wskazówką i otrzymuje status kandydata. Zmiana publicznej relacji następuje dopiero po odtworzeniu problemu, uzyskaniu dopuszczalnego źródła i zapisaniu nowej decyzji. Historia poprzedniej decyzji pozostaje dostępna w kontroli wersji.
