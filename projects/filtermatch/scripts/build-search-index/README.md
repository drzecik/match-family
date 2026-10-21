# Build search index

```sh
pnpm exec tsx scripts/build-search-index/index.ts \
  --devices data/verified/devices.json \
  --aliases data/verified/search-aliases.json \
  --output data/generated/model-search-index.json
```

Inputs must be schema v2 collection envelopes with `kind` set to `devices` or `searchAliases`.
Only approved device aliases enter the exact lookup. The command writes the
versioned JSON index atomically and prints a one-line machine-readable report.
By default `generatedAt` is the newest device `lastVerifiedAt` (or the Unix
epoch when none exists), so the committed artifact is deterministic. Use
`--generated-at` only when the build process has a better reproducible timestamp.
