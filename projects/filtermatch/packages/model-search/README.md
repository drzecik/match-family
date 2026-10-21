# `@filtermatch/model-search`

Static, dependency-free device-model search for FilterMatch.

Only exact normalized keys and approved aliases can produce a `resolved` result.
Base models with regional variants produce `ambiguous`; fuzzy matching produces
`candidates` and must be followed by explicit user selection. The search package
does not read compatibility data and therefore cannot publish compatibility.

```ts
const index = buildModelSearchIndex(devices, aliases, {
  generatedAt: new Date().toISOString(),
});
const result = searchModelIndex(index, "AirPure AP 300 / 10");
```

The serialized `StaticModelSearchIndex` is plain JSON. It contains a versioned
normalizer identifier so clients can reject incompatible cached indexes.
