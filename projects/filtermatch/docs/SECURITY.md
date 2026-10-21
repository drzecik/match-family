# Bezpieczeństwo FilterMatch

Ostatnia aktualizacja: 2026-07-18.

## Zakres i cele

FilterMatch jest static-first, bez kont i produkcyjnej bazy danych w MVP. Najważniejszymi celami bezpieczeństwa są:

1. integralność relacji kompatybilności i dowodów;
2. brak fałszywie pozytywnych dopasowań;
3. odporność pipeline na złośliwe importy;
4. brak otwartych przekierowań i wykonywania treści wejściowej;
5. minimalizacja danych użytkowników;
6. ochrona procesu wydawniczego i łańcucha dostaw.

## Granice zaufania

Niezaufane są: CSV, JSON, YAML i dokumenty od dostawców; treść pól źródłowych; URL; zgłoszenia korekt; query string; dane katalogu widgetu; zależności i artefakty zewnętrzne.

Zaufane warunkowo są: zatwierdzone rekordy w `data/verified`, konfiguracja providerów, wygenerowany indeks i artefakty CI. Pozostają one walidowane przy każdym buildzie. Sam merge do repozytorium nie omija polityki publikacji.

Sekrety CI i dane konfiguracyjne endpointów nie trafiają do klienta, logów ani wygenerowanych plików.

## Threat model

| Aktywum / zagrożenie | Wektor | Skutek | Kontrola zapobiegawcza | Wykrywanie / reakcja |
|---|---|---|---|---|
| Relacje kompatybilności | Złośliwy lub błędny import zmienia `candidate` na verified | Błędny zakup, utrata zaufania | Import tworzy kandydatów; status zatwierdza oddzielna decyzja; schema i polityka publikacji | CI blokuje relację bez dowodu; audyt diffu i review |
| Decyzja review | Proces lub AI podszywa się pod reviewera albo stosuje starą decyzję | Nieuprawniona publikacja lub utrata historii | Osobny plik decyzji, stała human authority, optimistic lock poprzedniego statusu, jawne potwierdzenie CLI, append-only identyfikator | Validator odtwarza łańcuch decyzji i porównuje status, datę oraz dowody |
| Siła dowodu | Słabsze źródło nadpisuje oficjalne | Degradacja jakości | Reguła monotoniczności dowodu; wersjonowane decyzje | Raport prób downgrade i konfliktów |
| Tożsamość modelu | Normalizacja usuwa `/10` lub łączy podobne cyfry | Fałszywie pozytywne dopasowanie | Zachowanie sufiksów; dokładne aliasy; fuzzy tylko jako kandydat | Testy regresyjne i raport kolizji aliasów |
| Publiczny build | `candidate` trafia do strony lub sitemapy | Niezatwierdzona treść zostaje zindeksowana | Generator czyta wyłącznie wynik polityki; default deny | Testy SEO, snapshot sitemapy i publicznego datasetu |
| Import CSV | Formula injection `=...`, `+...`, `@...` | Wykonanie polecenia po otwarciu raportu w arkuszu | Parser danych; neutralizacja niebezpiecznych prefiksów przy eksporcie; brak wykonywania formuł | Raport odrzuconych/escaped pól, testy fixtures |
| Parser danych | Billion laughs, ogromne pola, zagnieżdżenia, zip bomb | DoS w CI lub na komputerze operatora | Limity rozmiaru, liczby rekordów, długości i głębokości; brak niebezpiecznych parserów XML | Limit czasu/pamięci, nieudany import z raportem |
| Treść źródłowa | HTML/JS w nazwie lub notatce | XSS w statycznej stronie/widgetcie | Escaping kontekstowy; stałe szablony widgetu nigdy nie wstawiają surowej konfiguracji; bezpieczna serializacja JSON-LD; CSP; dane inertne | Testy payloadów i skan wygenerowanego HTML |
| URL źródła/oferty | `javascript:`, `data:`, `file:`, credentials w URL | XSS, wyciek lub lokalny dostęp | Parser URL; allowlista protokołów i domen; odrzucanie credentials | Raport URL i testy złośliwych schematów |
| Checker URL źródeł | URL lub redirect wskazuje localhost, metadata service albo prywatny adres | SSRF z CI lub komputera operatora | Kontrola protokołu i credentials; blokada nazw lokalnych/rezerwowych; DNS resolve i przypięcie wyłącznie publicznego IP przed każdym żądaniem | Status `blocked_target`; regresje dla celu początkowego i przekierowania |
| Afiliacja | Parametr użytkownika steruje redirectem | Open redirect, phishing | Bezpośrednie linki ze zwalidowanych danych; brak ogólnego redirect endpointu | Test prób zewnętrznego redirectu |
| Sponsorowanie | Płatność zmienia dopasowanie | Manipulacja integralnością | Osobne modele i pakiety; sponsorowanie tylko na `Offer` | Test niezmiennika i review warstwy ofert |
| Cena | Wygasła oferta nadal wygląda na aktualną | Wprowadzenie użytkownika w błąd | TTL/`expiresAt`; brak ceny w renderze i schema.org po wygaśnięciu | Raport stale offers, test zegara |
| Formularz korekty | Spam, HTML, oversized input, CSRF | Koszt endpointu, śmieci, XSS w systemie odbiorczym | Limity, schema, escaping, opcjonalny token antyspamowy, allowlista endpointu | Rate limiting po stronie providera bez trwałego IP; monitoring błędów agregatowy |
| Prywatność | Logowanie query, IP lub fingerprintu | Ujawnienie danych i profilowanie | Telemetria domyślnie wyłączona; brak IP/cookies/fingerprintów; minimalizacja query | Przegląd payloadu i konfiguracji przed włączeniem |
| Widget | Sklep podaje złośliwy katalog, fałszywy status verified lub branding | XSS albo publikacja kompatybilności bez dowodu | Strumieniowy limit statycznej konfiguracji; walidacja katalogu, referencji, URL, motywu, evidence i decyzji; fail-closed dla verified bez kwalifikującego dowodu; escaping; Shadow DOM | Testy braku dowodu, limitu bez `Content-Length`, osadzenia i izolacji stylów |
| Łańcuch dostaw | Przejęta zależność lub skrypt install | Wykonanie kodu w CI, zmiana builda | Lockfile, minimalne zależności, ograniczone uprawnienia workflow, review aktualizacji | Skan zależności, alerty i odtwarzalny build |
| CI/CD | PR z forka uzyskuje sekrety lub zapis | Przejęcie wydania | Brak sekretów dla niezaufanych PR; least privilege; chronione środowisko deploy | Log audytowy platformy, review workflow |
| Dane syntetyczne | Fixture trafia na produkcję | Fałszywa informacja handlowa | Dwie wymagane flagi; produkcyjny build je odrzuca | Test publicznego artefaktu i sitemapy |
| Dokument źródłowy | Skopiowanie chronionego dokumentu | Naruszenie praw i niepotrzebna ekspozycja | Repo przechowuje metadane i krótkie notatki, nie pełne dokumenty | Review rozmiarów i typów plików |

## Walidacja importów

- Najpierw limit bajtów i liczby rekordów, następnie parsing i walidacja schematu.
- Nie używamy `eval`, `Function`, powłoki ani template execution na danych.
- Nazwy plików nie wyznaczają ścieżek wyjściowych bez normalizacji; brak `../` i zapisu poza kontrolowanym katalogiem.
- CSV ma jawne kodowanie, delimiter i nagłówki; błędny rekord nie jest cicho naprawiany.
- Pola tekstowe mają limity, kontrolę niedozwolonych znaków i escaping przy renderze.
- URL parsuje standardowa biblioteka; domenę porównujemy po znormalizowanym hostname, nie przez `includes` lub suffix bez granicy etykiety.
- Protokół publicznego URL jest domyślnie `https:`. Odrzucamy osadzone credentials.
- Import raportuje błąd i nie publikuje częściowo zwalidowanego zbioru.

## CSV formula injection

Wewnętrzny model przechowuje tekst literalnie po walidacji i nigdy go nie oblicza. Każdy raport przeznaczony do CSV/arkusza poprzedza komórkę apostrofem lub stosuje bezpieczny format, jeśli po usunięciu wiodących białych znaków zaczyna się od `=`, `+`, `-`, `@`, tabulatora lub `\r`. Ochrona dotyczy wszystkich pól, także sklepu, SKU i notatki. Test musi obejmować wariant ze spacją lub tabulatorem przed formułą.

## Bezpieczeństwo frontendu

- Brak renderowania niezaufanego HTML; JSON-LD ucieka znaki zamykające element `script`.
- Bazowa Content Security Policy, `Referrer-Policy`, `Permissions-Policy`, blokada framingu i immutable cache dla assetów są dostarczane w `apps/web/public/_headers`; hosting musi obsługiwać ten format albo odwzorować nagłówki równoważnie.
- `rel="noopener noreferrer sponsored nofollow"` odpowiednio dla zewnętrznych linków afiliacyjnych.
- Formularz wysyła tylko do endpointu z konfiguracji build-time, nigdy z parametru URL.
- Brak tokenów lub sekretów w bundlu klienta.
- Nagłówki bezpieczeństwa obejmują co najmniej `X-Content-Type-Options: nosniff`, rozsądną `Referrer-Policy`, `Permissions-Policy` oraz ochronę przed framingiem strony głównej; widget ma oddzielną, udokumentowaną politykę osadzania.
- Widget nie używa `postMessage`; emituje lokalne `CustomEvent`, a rejestrowanie braku wyniku wymaga jawnego opt-in.

## Bezpieczeństwo zależności i CI

- Zależności są przypięte lockfile i instalowane w trybie frozen.
- Workflow ma minimalne `permissions`, nie uruchamia sekretów w niezaufanym kodzie i nie publikuje artefaktu po niepełnej walidacji.
- Build produkcyjny jest oddzielony od raportów zawierających surowe wejścia.
- Aktualizacje zależności przechodzą testy, review changelogu i skan podatności.
- Artefakt publiczny można odtworzyć z rewizji, wersji narzędzi i danych.

## Sekrety

MVP nie potrzebuje sekretów do wyszukiwania. Ewentualne dane zewnętrznego formularza, feedu lub deployu są zmiennymi środowiskowymi CI. Nie zapisujemy ich w repo, fixture, kliencie ani raportach. Rotacja następuje po podejrzeniu wycieku, odejściu operatora albo zgodnie z polityką dostawcy.

Chronione wdrożenie używa HTTP Basic Auth jako bramki do demonstratora albo prywatnej kolejki weryfikacji właściciela. Hasło jest sekretem środowiskowym Vercel, brak sekretu powoduje odpowiedź `503`, a wszystkie odpowiedzi są oznaczone `noindex` i `no-store`. Profil prywatny dodatkowo generuje `robots.txt` z `Disallow: /`, nie publikuje sitemapy i blokuje trasy demonstracyjne. Ten mechanizm nie zastępuje systemu tożsamości i nie może chronić danych wrażliwych ani przyszłego panelu administracyjnego.

## Reagowanie na incydent

1. Zatrzymaj publikację lub wyłącz dotkniętą trasę/ofertę.
2. Zachowaj rewizję, raport builda i minimalne logi audytowe bez kopiowania danych osobowych.
3. Oznacz relację `conflicting` albo `deprecated`, jeśli integralność jest niepewna.
4. Ustal zakres: modele, warianty, strony, sitemapa, widget i cache.
5. Napraw źródło danych oraz dodaj test regresyjny.
6. Wygeneruj i wdroż nowy statyczny artefakt; unieważnij cache, jeśli trzeba.
7. Opublikuj korektę z datą i zakresem bez ukrywania wcześniejszego błędu.
8. W przypadku danych osobowych wykonaj ocenę naruszenia zgodnie z właściwym prawem i umowami.

Zgłoszenia bezpieczeństwa powinny trafiać do jawnie skonfigurowanego kanału prywatnego. Publiczny formularz korekt nie służy do przesyłania sekretów ani dokumentów.

## Weryfikacja przed wydaniem

- walidacja schematu i referencji;
- test downgrade dowodu i relacji bez źródła;
- test utraty sufiksu, niejednoznaczności i jednej różniącej cyfry;
- test XSS, złośliwego URL i formula injection;
- test braku open redirect;
- kontrola `noindex` i sitemapy;
- `pnpm report:data-ops` i review blokujących luk dowodowych, konfliktów, kolizji aliasów, starych danych oraz braków pokrycia;
- osobny `pnpm check:source-links` przed wydaniem danych rzeczywistych, z ręcznym review przekierowań i trwałych błędów;
- `pnpm check:production-readiness` oraz profil `FILTERMATCH_BUILD_PROFILE=production`, które fail-closed odrzucają fixtures, domeny rezerwowe, pusty katalog i origin inny niż czysty publiczny HTTPS bez credentials, ścieżki, query lub portu;
- lint, typecheck, testy jednostkowe, E2E i dostępność;
- przegląd diffu zależności i workflow.
