import { useEffect, useId, useMemo, useState, type SyntheticEvent } from 'react';
import { searchModelIndex, type ModelSearchResult, type StaticModelSearchIndex } from '@filtermatch/model-search';

interface Props {
  index: StaticModelSearchIndex;
  noResultEndpoint?: string;
}

export default function SearchIsland({ index, noResultEndpoint }: Props) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const result = useMemo<ModelSearchResult | null>(
    () => (submitted ? searchModelIndex(index, submitted) : null),
    [index, submitted]
  );

  useEffect(() => {
    if (!result || result.status === 'resolved') return;
    const detail = { reason: result.status, normalizedQuery: result.normalizedQuery, category: 'air-purifier' };
    window.dispatchEvent(new CustomEvent('filtermatch:public-no-result', { detail }));
    if (!noResultEndpoint || !isSafeAnonymousModelQuery(result.normalizedQuery)) return;
    void fetch(noResultEndpoint, {
      method: 'POST',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(detail)
    }).catch(() => undefined);
  }, [noResultEndpoint, result]);

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(query.trim());
  }

  function copyNormalized() {
    if (result) void navigator.clipboard?.writeText(result.normalizedQuery);
  }

  return (
    <section className="search-panel" aria-labelledby="search-title">
      <div className="eyebrow">Wyszukiwarka urządzeń</div>
      <h2 id="search-title">Znajdź filtr do dokładnego modelu</h2>
      <p>Wpisz symbol z tabliczki znamionowej. Nie łączymy modeli tylko dlatego, że wyglądają podobnie.</p>
      <form role="search" onSubmit={submit}>
        <label htmlFor={inputId}>Model oczyszczacza</label>
        <div className="search-row">
          <input
            id={inputId}
            name="model"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="np. pełny numer modelu"
            autoComplete="off"
            required
          />
          <button type="submit">Sprawdź model</button>
        </div>
      </form>
      <div className="search-result" aria-live="polite">
        {result?.status === 'resolved' && (
          <div className="result-card result-exact">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <strong>Znaleziono jednoznaczny model</strong>
              <p>Potwierdź urządzenie, zanim pokażemy kompatybilne filtry.</p>
              <a className="button-link" href={`/urzadzenia/${encodeURIComponent(result.deviceId)}/`}>
                Wybierz {index.entries[result.deviceId]?.brand} {index.entries[result.deviceId]?.fullModel}
              </a>
            </div>
          </div>
        )}
        {result?.status === 'ambiguous' && (
          <div className="result-card">
            <strong>Wybierz dokładny wariant</strong>
            <p>Ten zapis pasuje do kilku urządzeń. Sufiks regionalny ma znaczenie.</p>
            <ul className="candidate-list">
              {result.candidates.map((candidate) => (
                <li key={candidate.deviceId}>
                  <a href={`/urzadzenia/${encodeURIComponent(candidate.deviceId)}/`}>{candidate.label}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {result?.status === 'candidates' && (
          <div className="result-card result-warning">
            <strong>Czy chodziło Ci o…</strong>
            <p>To tylko podobne modele. Wybierz urządzenie dopiero po sprawdzeniu symbolu.</p>
            <ul className="candidate-list">
              {result.candidates.map((candidate) => (
                <li key={candidate.deviceId}>
                  <a href={`/urzadzenia/${encodeURIComponent(candidate.deviceId)}/`}>{candidate.label}</a>
                  {candidate.numericMismatch && <span> Różni się numerem modelu</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {result?.status === 'not_found' && (
          <div className="result-card result-warning">
            <strong>Nie znaleźliśmy tego modelu</strong>
            <p>Sprawdź odstępy i pełny sufiks. Nie zapisujemy adresu IP ani danych osobowych.</p>
            <div className="inline-actions">
              <button className="secondary" type="button" onClick={copyNormalized}>Kopiuj znormalizowany zapis</button>
              <a href={`/korekty/?query=${encodeURIComponent(submitted)}`}>Zgłoś brakujące urządzenie</a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function isSafeAnonymousModelQuery(value: string): boolean {
  return value.length >= 3
    && value.length <= 80
    && /[A-Z]/u.test(value)
    && /\d/u.test(value)
    && /^[\p{L}\p{N} ./_-]+$/u.test(value)
    && !value.includes('@')
    && !value.includes('://');
}
