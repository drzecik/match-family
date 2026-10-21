# Polityka weryfikacji kompatybilności

Ostatnia aktualizacja: 2026-07-17.

## Cel

Polityka chroni użytkownika przed fałszywie pozytywnym dopasowaniem. Brak wyniku jest bezpieczniejszy niż opublikowanie relacji bez wystarczającego dowodu.

## Role

- **Importer** rejestruje dostarczone dane i ich pochodzenie. Nie zatwierdza relacji.
- **Proces wspomagający** może wykrywać modele, aliasy, kandydatury i sprzeczności. Jego wyniki zawsze mają status `candidate`.
- **Reviewer** ocenia źródło i zapisuje decyzję wraz z identyfikatorem i datą.
- **Publisher policy** jest deterministyczną regułą builda. Sprawdza status i kompletność, ale nie podejmuje merytorycznej decyzji zamiast reviewera.

W małym zespole jedna osoba może pełnić kilka ról, lecz import i późniejsza decyzja pozostają osobnymi, audytowalnymi krokami.

Technicznym śladem decyzji jest append-only `ReviewDecision`. Musi zawierać `decisionAuthority: "authorized_human_reviewer"`, poprzedni status, jawny wynik, dowody, czas i uzasadnienie. Samo wygenerowanie pakietu review, raport AI albo uruchomienie walidatora nie tworzy takiej decyzji.

## Statusy

| Status | Znaczenie | Jako kompatybilne publicznie |
|---|---|---|
| `verified_official` | Bezpośrednie potwierdzenie w oficjalnym źródle producenta | Tak, jeśli kompletne i aktualne |
| `verified_multi_source` | Zgodne potwierdzenia z kilku niezależnych źródeł | Tak, jeśli kompletne i aktualne |
| `verified_supplier` | Dokumentacja producenta zamiennika lub wiarygodnego dystrybutora | Tak, jeśli polityka na to pozwala |
| `candidate` | Potencjalna relacja do ręcznej kontroli | Nie |
| `conflicting` | Sprzeczne źródła lub nierozstrzygnięty zakres | Nie |
| `deprecated` | Relacja historyczna, wygasła lub wycofana | Nie jako bieżąca |
| `rejected` | Kandydatura sprawdzona i odrzucona | Nie |
| `unknown` | Brak wystarczających danych | Nie |

Aktywna polityka może zawęzić publikację, na przykład tylko do `verified_official`. Nie może rozszerzyć jej na `candidate`, `unknown`, `conflicting`, `rejected` ani `deprecated`.

## Minimalny pakiet dowodowy

Każda zatwierdzana relacja wymaga:

- jednoznacznego `deviceId` i `consumableId`;
- określonego `relationType` oraz zakresu wariantu regionalnego;
- co najmniej jednego `evidenceId`;
- typu źródła, URL lub identyfikatora dokumentu i tytułu;
- daty dostępu;
- krótkiego opisu tego, co dokładnie potwierdza źródło;
- identyfikatora reviewera i daty decyzji;
- opcjonalnie strony, wersji i hasha dokumentu;
- daty ostatniej weryfikacji;
- braku nierozstrzygniętego konfliktu;
- ważności w przedziale `validFrom`–`validTo`, jeśli istnieje.

Dowód musi identyfikować dokładny wariant. Dokumentacja dla modelu bez sufiksu nie potwierdza automatycznie wszystkich wariantów regionalnych.

## Przebieg decyzji

1. Import tworzy rekord surowy i raport walidacji.
2. Parser lub operator tworzy `candidate` i wiąże go z materiałem źródłowym.
3. System wykrywa duplikaty, kolizje aliasów i sprzeczne relacje.
4. Reviewer otwiera źródło, sprawdza dokładny model, SKU, zakres regionalny, wymagany zestaw oraz aktualność.
5. Reviewer zapisuje decyzję, uzasadnienie, siebie i czas.
6. Druga kontrola jest zalecana dla źródeł niższych w hierarchii, konfliktów i relacji o dużym zasięgu.
7. Build ponownie waliduje niezmienniki i stosuje politykę publikacji.

Zmianę zapisuje workflow `prepare:review` → jawny plik decyzji człowieka → `apply:review`. Apply wymaga osobnego potwierdzenia CLI i optimistic locka `previousStatus`. Decyzja zweryfikowana, która nie przechodzi polityki publikacji, jest odrzucana.

Nie wolno zatwierdzać na podstawie samej podobnej nazwy, zdjęcia, wymiarów, pasującego kształtu, wyniku wyszukiwarki, treści wygenerowanej przez AI albo oferty sklepu bez dokumentacji kompatybilności.

## Przypisanie statusu

### `verified_official`

Wymaga bezpośredniego, jednoznacznego potwierdzenia w źródle producenta urządzenia: instrukcji, oficjalnej liście kompatybilności albo oficjalnej stronie produktu. Notatka dowodowa wskazuje fragment lub stronę.

### `verified_multi_source`

Wymaga co najmniej dwóch niezależnych, zgodnych źródeł. Źródła kopiujące tę samą listę lub należące do jednego feedu nie są niezależne. Co najmniej jedno powinno mieć charakter dokumentacyjny, nie tylko sprzedażowy.

### `verified_supplier`

Wymaga jednoznacznej dokumentacji producenta zamiennika lub wiarygodnego dystrybutora. Publiczny interfejs powinien czytelnie odróżnić ten status od potwierdzenia oficjalnego.

### `conflicting`

Nadaje się go, gdy wiarygodne źródła różnią się modelem, zakresem regionalnym, składem zestawu albo okresem obowiązywania. Relacja jest wycofywana z publicznego zbioru do czasu rozstrzygnięcia.

### `deprecated` i `rejected`

`deprecated` zachowuje historię relacji, która przestała obowiązywać. `rejected` zachowuje informację o sprawdzonej błędnej kandydaturze, aby nie wracała w kolejnych importach.

## Konflikty i degradacja

Nowy słabszy dowód nie nadpisuje mocniejszego. Jeśli podważa istniejącą relację, system tworzy raport konfliktu. W zależności od ryzyka reviewer:

- zawęża relację do konkretnego wariantu;
- oznacza ją `conflicting` i natychmiast usuwa z publikowanego zbioru;
- wycofuje starą relację przez `validTo` i tworzy nową wersję;
- odrzuca nowe źródło z uzasadnieniem.

Usunięcie lub niedostępność URL nie unieważnia automatycznie dowodu, jeśli istnieją wersja, hash i wystarczająca notatka, ale wymaga raportu do ponownej weryfikacji.

## Pewność

`confidence` służy do komunikowania jakości w ramach statusu i nie jest procentowym wynikiem AI. Nie może zmienić decyzji publikacyjnej. Interfejs używa opisowych poziomów oraz pokazuje rodzaj źródła i datę.

## Reweryfikacja

Próg świeżości jest konfigurowany według kategorii i typu źródła. Raport stale data nie zmienia statusu automatycznie, ale może usunąć relację z indeksu, jeśli polityka wymaga aktualności. Priorytet mają relacje po zmianie dokumentacji, zgłoszeniu korekty, wykryciu konfliktu, wycofaniu produktu i przedłużającej się niedostępności źródła.

## Zmiany masowe

Jedna decyzja nie może zatwierdzić dowolnej liczby podobnych modeli. Zakres masowej operacji musi wynikać wprost ze źródła, być jawnie zapisany i przejść test kolizji sufiksów. Wszystkie decyzje są możliwe do odtworzenia z diffu i raportu.
