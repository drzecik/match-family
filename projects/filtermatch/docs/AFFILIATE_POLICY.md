# Polityka ofert, afiliacji i sponsorowania

Ostatnia aktualizacja: 2026-07-17.

## Rozdzielenie odpowiedzialności

Kompatybilność jest ustalana wyłącznie w domenie danych i weryfikacji. Oferta odnosi się do istniejącego `consumableId`, lecz nie może utworzyć relacji, zmienić statusu, confidence, dowodu, wariantu ani kolejności materiałów wynikającej z kompatybilności.

## Import ofert

MVP przyjmuje kontrolowane CSV przez adapter `OfferProvider`. Każdy rekord zawiera co najmniej sklep, odniesienie do produktu, walutę, URL docelowy, datę aktualizacji i status. Cena może być nieznana; nie jest wtedy zgadywana.

Importer:

- wymusza limit pliku, rekordów i długości pól;
- waliduje nagłówki, typy, walutę i kwoty w minor units;
- traktuje wszystkie komórki jako dane, nigdy jako kod;
- neutralizuje formuły rozpoczynające się od `=`, `+`, `-`, `@`, tabulatora lub znaku powrotu karetki w raportach eksportowanych do arkuszy;
- nie uruchamia makr ani formuł;
- dopuszcza tylko whitelisted protokoły URL i kontrolowane domeny;
- odrzuca `javascript:`, `data:`, `file:` i nieprawidłowe URL;
- raportuje duplikaty, odrzucenia i konfliktujące identyfikatory;
- jest idempotentny dla tego samego rekordu i wersji feedu.

Import oferty o tym samym kluczu może zaktualizować ofertę, ale nigdy encję kompatybilności.

## Aktualność

`fetchedAt` pokazuje czas pozyskania, a `expiresAt` granicę aktualności, jeśli jest znana. Po wygaśnięciu:

- cena nie jest opisana jako aktualna;
- oferta może zostać ukryta albo pokazana bez ceny z jasnym ostrzeżeniem;
- data ostatniej aktualizacji pozostaje widoczna;
- sortowanie nie traktuje starej ceny jako konkurencyjnej.

Brak `expiresAt` stosuje konfigurowalny TTL zależny od providera. Oferta `out_of_stock`, `inactive` lub `rejected` nie jest przedstawiana jako dostępna.

## Sortowanie

Reguła domyślna jest jawna, deterministyczna i konfigurowalna, przykładowo:

1. aktywne, niewygasłe i dostępne oferty;
2. znany łączny koszt `priceMinor + shippingMinor`, jeśli oba są porównywalne;
3. czas aktualizacji;
4. stabilny identyfikator jako tie-breaker.

Nieznany koszt dostawy jest oznaczony i nie jest traktowany jak zero. Oferty w różnych walutach nie są porównywane cenowo bez jawnego, datowanego kursu — w MVP mogą być grupowane według waluty.

## Sponsorowanie

`sponsored: true` wymaga widocznej etykiety „Sponsorowane” przy ofercie. Sponsorowanie:

- nie wpływa na listę kompatybilnych materiałów;
- nie zmienia statusu oryginału lub zamiennika;
- nie zmienia źródeł ani oceny pewności;
- nie może ukryć tańszych lub niesponsorowanych ofert;
- może dać kontrolowane wyróżnienie dopiero po spełnieniu warunków aktualności i dopasowania;
- jest opisane w interfejsie i metodologii sortowania.

## Linki afiliacyjne

Link afiliacyjny jest przechowywany strukturalnie i walidowany podczas importu. Publiczna strona linkuje bezpośrednio do zatwierdzonego adresu. Nie przyjmuje URL docelowego z query string użytkownika i nie udostępnia otwartego endpointu przekierowania.

Jeśli link afiliacyjny jest obecny:

- otrzymuje właściwe atrybuty relacji, w tym `sponsored` lub `nofollow` zgodnie z aktualnymi wymaganiami;
- użytkownik widzi informację, że zakup może przynieść prowizję;
- afiliacja nie podnosi ceny deklarowanej przez FilterMatch;
- domena i protokół są na allowliście providera;
- logowanie kliknięć jest wyłączone w MVP, chyba że zostanie oddzielnie uzasadnione prywatnościowo.

## Reklamy

Pierwszy przekrój zawiera co najwyżej wyłączalne, puste sloty bez integracji dostawcy. Reklama nie może wyglądać jak wynik zgodności, rozdzielać nazwy urządzenia od ostrzeżenia, zasłaniać dowodów ani zmieniać kolejności relacji. W development sloty są wyłączone.

## Audyt

Każdy provider ma dokumentowany format, allowlistę domen, TTL, regułę klucza idempotencji i przykład bezpiecznego fixture. Raport importu podaje liczbę przyjętych, zaktualizowanych, pominiętych i odrzuconych rekordów bez ujawniania sekretów afiliacyjnych.

