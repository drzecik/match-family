# Offers

`synthetic-offers.json` is a non-production M5 fixture. Every feed and offer record is marked with `synthetic: true` and `notForProduction: true`.

Validate and import it with:

```sh
pnpm offers:import
```

The importer accepts only exact catalog product IDs, configured merchant/hostname pairs, HTTPS URLs under allowlisted product paths, integer minor-unit prices or an explicitly absent price, and known availability values. Redirect-style query parameters, credentials, ports, fragments, unknown products, and merchant/host substitutions are rejected.

Production feeds must remain separate from compatibility data and require their own licensed source, merchant policy, freshness threshold, and operational review. An offer can never create or upgrade a compatibility relation.
