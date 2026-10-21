# Migracja schematu v1 → v2: wersjonowane kolekcje i decyzje review

Data wykonania: 2026-07-17.

## Powód

Schemat v1 przechowywał źródłowe kolekcje jako gołe tablice JSON, mimo że polityka wymagała `schemaVersion` na poziomie pliku lub paczki. Nie istniała również strukturalna, append-only historia decyzji człowieka dla `CompatibilityEdge`.

## Zmiana

Każda źródłowa kolekcja v2 ma kopertę:

```json
{
  "schemaVersion": 2,
  "kind": "devices",
  "records": []
}
```

Do `DataSnapshot` dodano kolekcję `reviewDecisions`. `ReviewDecision` zapisuje poprzedni status, jawną decyzję, wykorzystane dowody, identyfikator reviewera, czas, uzasadnienie oraz stałą `decisionAuthority: "authorized_human_reviewer"`.

Wygenerowane snapshoty używają koperty `{ schemaVersion, generatedAt, data }`. Publiczny snapshot nie zawiera wewnętrznych decyzji review.

## Migracja

Deterministyczny skrypt dla istniejącej kolekcji v1:

```bash
pnpm migrate:schema:v1-to-v2 -- \
  --input data/fixtures/migrations/v1/devices.json \
  --output /tmp/devices-v2.json \
  --kind devices
```

Skrypt waliduje rekordy aktualnym schematem, dodaje kopertę i nie zmienia kolejności ani treści rekordów. Ponowne uruchomienie dla zgodnej koperty v2 jest idempotentne. Przykłady przed i po znajdują się w `data/fixtures/migrations/v1` i `data/fixtures/migrations/v2`.

Historyczne `ReviewDecision` nie są zgadywane przez migrator. Dla istniejących syntetycznych relacji zapisano je ręcznie na podstawie już obecnych metadanych fixture. Dane rzeczywiste bez możliwego do odtworzenia śladu decyzji muszą pozostać niepubliczne do czasu jawnego review.

## Rollback

Funkcja `rollbackCollectionV2ToV1` usuwa wyłącznie kopertę i zwraca niezmienioną tablicę rekordów. Rollback jest testowany jako lossless dla kolekcji istniejących w v1. `reviewDecisions` nie ma odpowiednika w v1; przed rollbackiem trzeba zachować ten plik jako osobny artefakt audytowy. Wygenerowane snapshoty i raporty należy odtworzyć, nie migrować wstecz.

## Kontrole

- fixture przed/po migracji;
- test zgodności wyniku z fixture v2;
- test lossless rollbacku;
- test CLI migratora;
- walidacja całego repozytorium po migracji;
- regresje publikacji, wyszukiwania i E2E.

## Wynik

Wszystkie źródłowe kolekcje repozytorium zostały przeniesione do v2. Loader odrzuca gołe tablice i koperty z niezgodnym `kind` lub `schemaVersion`.
