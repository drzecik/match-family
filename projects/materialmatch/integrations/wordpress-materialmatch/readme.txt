=== MaterialMatch ===
Tags: woocommerce, calculator, flooring, materials
Requires at least: 6.5
Requires PHP: 8.1
Stable tag: 0.1.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html

Lokalny kalkulator materiałów dla WooCommerce. Dane pomiarowe i konfiguracja pozostają w instalacji sklepu.

== Description ==

MaterialMatch oblicza liczbę pełnych opakowań i akcesoriów na podstawie zwalidowanej konfiguracji.
Administrator włącza kalkulator na produkcie, importuje konfigurację JSON oraz przypisuje dokładne SKU.

Wersja przedprodukcyjna wymaga przejścia pełnej macierzy zgodności opisanej w dokumentacji wydania.

== Installation ==

1. Utwórz kopię zapasową plików i bazy danych sklepu.
2. Wgraj zweryfikowany plik ZIP przez Wtyczki -> Dodaj nową -> Wyślij wtyczkę na serwer.
3. Aktywuj WooCommerce, a następnie MaterialMatch.
4. Zaimportuj konfigurację w WooCommerce -> Konfiguracja MaterialMatch.
5. Ustaw metadane i włącz kalkulator na odpowiednich produktach. Polski szablon importu znajduje się
   w paczce wtyczki pod ścieżką examples/product-metadata.csv.
6. Skonfiguruj wygląd i politykę częściowego koszyka.

== Privacy ==

Podstawowy przepływ nie wysyła danych na zewnętrzne serwery i nie zapisuje danych osobowych klienta.

== Upgrade Notice ==

Przed aktualizacją wyeksportuj aktywną konfigurację. Nie usuwaj opcji wtyczki bez jawnej decyzji o retencji danych.
