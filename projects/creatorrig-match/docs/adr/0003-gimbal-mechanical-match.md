# ADR 0003: Evidence-gated gimbal mechanical matching

- Status: Accepted
- Date: 2026-07-17

## Context

A gimbal's headline payload rating alone does not prove that a camera package can be mounted or balanced. A package may be under the rated mass while exceeding arm clearance, using the wrong mounting standard, or placing its center of gravity outside the supported range. The gimbal's own mass also must not be counted as stabilized payload, although it contributes to carried weight and cost.

## Decision

Evaluate a gimbal through four independent mechanical results: payload, mounting, package clearance, and balance. Require scoped evidence for both the gimbal limits and the exact rig geometry profile. Apply an explicit safety margin to rated payload and report the recommended threshold separately.

Treat these outcomes conservatively:

- above rated payload, wrong mounting, exceeded clearance, or exceeded balance range: `incompatible`;
- below rated payload but above the recommended safety threshold: `compatible_with_limitations`;
- missing mass, limit, geometry, balance, or evidence: `unknown`;
- all dimensions confirmed within limits: `directly_compatible`.

Include selected camera, lens, audio, media, cables, and adapters in stabilized payload. Exclude the gimbal itself. Include every selected product, including the gimbal, in total carried weight and purchase cost.

The compact synthetic fixture may store exact `gimbalRigProfiles` scoped to device, audio, optional lens, and optional media for integration testing. A changed scoped component without its own profile yields `unknown`. Production data must normalize these facts into sourced capabilities and declarative conditions or introduce a migrated canonical entity.

## Consequences

Benefits:

- a headline payload number cannot create a false-positive match;
- incomplete balance or clearance facts remain visible;
- payload and total carried weight cannot be accidentally conflated;
- the same evaluator can later consume canonical capabilities without UI changes.

Costs:

- useful matches need exact package geometry and balance evidence;
- profiles are scoped to a known package and mounting conditions;
- changing cage, monitor, cable routing, or lens may require another profile.

## Rejected alternatives

- **Payload-only matching:** ignores mounting, collisions, and balance.
- **Estimating center of gravity from product dimensions:** creates unsourced precision and unsafe positive results.
- **Treating any sub-rated load as fully compatible:** hides the configured safety margin.
