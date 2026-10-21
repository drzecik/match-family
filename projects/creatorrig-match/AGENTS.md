# CreatorRig Match engineering rules

## Non-negotiable product rules

- Compatibility is multidimensional, never a boolean.
- Every public compatibility relationship must cite evidence.
- AI may create candidates; it may never approve or verify them.
- Physical fit does not imply electrical, protocol, optical, or functional compatibility.
- `unknown` must never be recommended.
- Sponsorship and affiliate commission must never affect compatibility status.
- Do not scrape websites. Use licensed feeds, manual imports, or official documents.
- Never execute code embedded in imported data.
- Do not add electrical advice without official evidence covering the exact claim.
- Every graph or pathfinder change requires tests.
- Every calculation change requires regression tests.
- Every schema change requires a migration note under `docs/migrations/`.
- Synthetic records must set both `synthetic: true` and `notForProduction: true`.
- Code and identifiers are in English; the default user interface is in Polish.
- After changes run `pnpm lint`, `pnpm typecheck`, `pnpm data:validate`, and `pnpm test`.

## Review severity

- P0: unsafe electrical recommendation.
- P1: false-positive compatibility.
- P1: publication of an edge without evidence.
- P1: candidate presented as verified.
- P1: required adapter omitted.
- P1: incorrect storage-card or power calculation.
- P1: sponsorship changes compatibility ranking.

## Local OSS preparation boundary

No publishing or deployment is authorized. Use only fictional demo data. Packages remain private and UNLICENSED pending a separate license decision. Consult the standalone README for commands in this sanitized workspace.
