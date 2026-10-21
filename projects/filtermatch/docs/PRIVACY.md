# Prywatność

Ostatnia aktualizacja: 2026-07-17.

## Zasada minimalizacji

MVP działa bez kont, komentarzy, newslettera i profili. Wyszukiwanie odbywa się lokalnie w przeglądarce na statycznym indeksie. Do korzystania z podstawowej funkcji nie jest potrzebne przesłanie zapytania do FilterMatch.

Nie stosujemy:

- fingerprintingu;
- trwałych identyfikatorów użytkownika;
- cookies analitycznych w MVP;
- śledzenia między stronami;
- przechowywania adresów IP przez aplikację;
- profilowania na podstawie modelu urządzenia;
- publicznego uploadu dokumentów;
- wymaganego adresu e-mail w formularzu korekty.

## Dane przetwarzane lokalnie

Tekst wyszukiwania, wybór kategorii i rozstrzygnięcie modelu są obsługiwane w przeglądarce. Mogą pozostać w stanie strony lub w URL tylko w zakresie niezbędnym do funkcji. Nie używamy local storage do tworzenia profilu użytkownika. Parametry wyszukiwania mają `noindex` i nie trafiają do sitemapy.

Publiczny frontend nie pobiera fontów ani skryptów analitycznych z zewnętrznych originów. Bazowy build korzysta z lokalnych assetów i fontów systemowych.

## Zapytania bez wyniku

Anonimowe raportowanie zapytań bez wyniku jest opcjonalną integracją, domyślnie wyłączoną. Przed jej uruchomieniem wymagane są osobna ocena celu, podstawy prawnej, retencji i ryzyka danych wpisywanych w pole.

Widget stosuje dwa osobne opt-in: pierwszy włącza samo zdarzenie no-result zawierające wyłącznie powód, drugi może dołączyć znormalizowane zapytanie. Druga flaga bez pierwszej nie uruchamia raportowania. Widget nie wysyła zdarzeń do sieci; odbiorca integracji odpowiada za dalsze przetwarzanie.

Minimalny dopuszczalny payload obejmuje kategorię, znormalizowany token modelu, wersję normalizatora, czas zaokrąglony do potrzeb operacyjnych i wynik klasyfikacji. Nie obejmuje IP, user-agenta, referera, stabilnego identyfikatora, fingerprintu ani pełnego tekstu, jeśli nie przeszedł minimalizacji. Dostawca infrastruktury może technicznie widzieć IP na poziomie transportu; umowa i konfiguracja powinny wyłączyć jego przechowywanie w logach aplikacyjnych lub ograniczyć je do bezwzględnego minimum bezpieczeństwa.

## Formularz korekty

Formularz korzysta z opcjonalnego, konfigurowalnego zewnętrznego endpointu. Prosi tylko o:

- typ problemu i identyfikator encji;
- opis;
- opcjonalny URL dowodu;
- zgodę na przetworzenie zgłoszenia.

E-mail i nazwisko nie są wymagane. Interfejs ostrzega, aby nie wpisywać danych osobowych, numerów zamówień ani sekretów. Pola mają limity. Ochrona antyspamowa jest możliwa do włączenia; preferowane jest rozwiązanie niewymagające śledzenia. Polityka i retencja konkretnego providera muszą być opublikowane przed aktywacją.

## Oferty i linki zewnętrzne

Kliknięcie linku sklepu przenosi użytkownika do niezależnego podmiotu, który stosuje własną politykę prywatności. FilterMatch w MVP nie prowadzi serwerowego redirectu i nie loguje kliknięć. Parametry afiliacyjne identyfikują kampanię lub partnera, nie konkretnego użytkownika. Nie dodajemy unikalnych per-user identyfikatorów.

## Reklamy i analityka

Sloty reklamowe są wyłączone i nie mają providera w pierwszym przekroju. Włączenie reklam, analityki albo logowania kliknięć wymaga:

1. udokumentowanego celu i podstawy prawnej;
2. oceny dostawcy i transferów danych;
3. minimalizacji payloadu i retencji;
4. mechanizmu zgody, jeśli jest wymagany;
5. aktualizacji dokumentacji publicznej i threat modelu;
6. testu, że odmowa nie blokuje wyszukiwania kompatybilności.

## Dane operatorów

`reviewer` jest stabilnym identyfikatorem wewnętrznym, nie publicznym adresem e-mail. Publiczna strona może pokazywać rolę lub pseudonim zespołowy, natomiast pełny audyt pozostaje w kontrolowanym repozytorium. Dostęp do repozytorium i CI jest ograniczony zasadą najmniejszych uprawnień.

## Retencja

- Dane kompatybilności i metadane decyzji są przechowywane dla audytu przez okres życia produktu.
- Odrzucone kandydatury mogą pozostać, aby zapobiegać ponownemu importowi błędu, ale nie zawierają danych użytkownika.
- Raporty korekt są usuwane po rozstrzygnięciu i upływie zdefiniowanego okresu odwoławczego; konkretny okres ustala konfiguracja providera przed uruchomieniem.
- Techniczne logi deployu nie mogą zawierać treści zapytań ani payloadów formularza i mają krótki, udokumentowany okres retencji.

## Prawa i kontakt

Przed produkcyjnym uruchomieniem operator serwisu publikuje swoją tożsamość, dane kontaktowe, podstawy prawne, okresy retencji, odbiorców i procedurę realizacji praw użytkownika odpowiednią do jurysdykcji. Dokument repozytoryjny opisuje wymagania techniczne i nie zastępuje finalnej informacji prawnej.

## Zmiany prywatności

Każda nowa integracja wysyłająca dane poza przeglądarkę wymaga review prywatności. Nie może zostać dodana jako „techniczna telemetria” bez jawnego uzasadnienia. Zmiana obejmuje dokumentację przepływu danych, threat model, test payloadu i konfigurację opt-out/consent, jeśli jest potrzebna.
