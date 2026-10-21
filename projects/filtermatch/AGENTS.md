# FilterMatch engineering rules

## Non-negotiable data rules

- Every public compatibility relation must have evidence.
- AI may create candidates only. It must never approve compatibility.
- `candidate`, `unknown`, and `conflicting` must never be presented as compatible.
- Do not scrape websites or bypass merchant protections.
- Do not generate thin product descriptions without user value.
- Do not index unverified pages.
- Never overwrite stronger evidence with weaker evidence.
- Every model-normalization change requires regression tests.
- Every data-schema change requires a documented migration.
- Do not add user tracking without explicit justification.
- After changes, run data validation, lint, typecheck, and tests.
- Synthetic data must set both `synthetic: true` and `notForProduction: true`.
- Code and identifiers are English; the default interface language is Polish.

## Review priorities

Treat these as high-priority defects:

- false-positive model or compatibility matches;
- publication of a compatibility relation without evidence;
- loss of a meaningful model or regional suffix;
- indexing a `candidate` or otherwise unverified page;
- sponsorship changing compatibility information;
- open redirects;
- disclosure of user data.

## Repository scope

- Keep the public product static-first and usable without accounts.
- Keep imported content inert: validate it, escape it, and never execute it.
- Keep affiliate URLs structural and link directly; do not accept arbitrary redirect targets.
- Preserve unrelated user changes and document architectural decisions.

## Local OSS preparation boundary

No publishing or deployment is authorized. Use only fictional demo data. Packages remain private and UNLICENSED pending a separate license decision. Consult the standalone README for commands in this sanitized workspace.
