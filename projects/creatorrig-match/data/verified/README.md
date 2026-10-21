# Human-verified production fragments

Only manually reviewed JSON fragments belong in this directory. AI-generated and machine-extracted
records stay in `data/candidates/` until a human checks the original official sources and explicitly
promotes them.

Each fragment must set `synthetic: false`, `notForProduction: false`,
`verificationStatus: "verified"`, and `humanReviewRequired: false` at the root. Every contained
record must explicitly set both production flags to `false`. Products, recording modes, and
compatibility edges require exact official evidence. Evidence must use HTTPS, include its proof
scope, verification date, and human verifier.

Run `pnpm data:build:production`. The command fails closed if there are no verified fragments, if a
candidate is misplaced here, if synthetic data is mixed in, or if evidence does not cover an
asserted compatibility dimension.
