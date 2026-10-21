# ADR-0001: Static-first i wersjonowane dane plikowe

- Status: zaakceptowany
- Data: 2026-07-17
- Decydenci: zespół FilterMatch

## Kontekst

FilterMatch udostępnia głównie dane referencyjne zmieniające się znacznie rzadziej niż są odczytywane. MVP nie wymaga kont, społeczności, komentarzy ani transakcji. Krytyczne są audytowalność dowodów, kontrola publikacji, niski koszt utrzymania i możliwość działania widgetu bez centralnego serwera.

## Decyzja

Używamy monorepo TypeScript strict z pnpm workspaces. Publiczna aplikacja jest generowana statycznie przez Astro, a interaktywne wyszukiwanie działa jako lekki island na statycznym indeksie. Dane źródłowe są wersjonowanymi JSON/CSV/YAML walidowanymi przez Zod lub równoważny schemat. Publiczny dataset i strony powstają podczas builda.

Nie uruchamiamy produkcyjnej bazy danych ani serwera wyszukiwania w pierwszej wersji. Formularz korekty i opcjonalna anonimowa telemetria są zewnętrznymi, konfigurowalnymi granicami, domyślnie wyłączonymi.

## Konsekwencje pozytywne

- tani hosting i mała powierzchnia ataku;
- szybkie, odporne na awarie odczyty;
- dokładny audit trail w kontroli wersji;
- deterministyczna polityka publikacji i SEO;
- łatwe testowanie całego publicznego artefaktu;
- wspólne dane dla strony i statycznego widgetu;
- brak konieczności codziennej administracji bazą.

## Konsekwencje i ograniczenia

- poprawka wymaga review, builda i wdrożenia;
- bardzo duży katalog może zwiększyć czas builda i rozmiar indeksu;
- aktualność ofert zależy od częstotliwości importu i TTL;
- formularze wymagają zewnętrznego endpointu albo bezpiecznego fallbacku;
- operacje redakcyjne są plikowe i wymagają dobrych raportów.

Ograniczenia są akceptowalne dla pierwszego przekroju. Build powinien dzielić indeks per kategoria/marka, jeśli rozmiar zacznie wpływać na klienta.

## Rozważone alternatywy

### Produkcyjna relacyjna baza danych i API

Ułatwia aktualizacje w czasie rzeczywistym, ale zwiększa koszt, powierzchnię ataku i złożoność operacyjną przed pojawieniem się potrzeby. Odrzucona dla MVP, nie na zawsze.

### Zewnętrzna wyszukiwarka SaaS

Zapewnia ranking i analitykę, lecz tworzy koszt, zależność runtime i dodatkowy przepływ zapytań użytkownika. Odrzucona; mały, konserwatywny indeks może działać lokalnie.

### CMS jako źródło prawdy

Ułatwia edycję treści, ale nie gwarantuje wymaganych niezmienników dowodów i audytu w takim stopniu jak wersjonowany pipeline. Może kiedyś być interfejsem operatorskim, lecz nie ominie schematów i polityki publikacji.

## Kryteria ponownego rozważenia

Decyzję oceniamy ponownie, gdy co najmniej jeden mierzalny warunek wystąpi:

- build przekracza zaakceptowany budżet czasu mimo partycjonowania;
- indeks klienta przekracza budżet wydajności;
- wymagana świeżość ofert jest krótsza niż bezpieczny cykl import/build/deploy;
- liczba operatorów i konfliktów powoduje nieakceptowalny czas aktualizacji;
- licencjobiorcy wymagają kontrolowanego API z umownym SLA.

Ewentualna baza/API pozostają warstwą dostępu do tych samych reguł domenowych. Nie mogą umożliwić publikacji kandydata ani relacji bez dowodu.

