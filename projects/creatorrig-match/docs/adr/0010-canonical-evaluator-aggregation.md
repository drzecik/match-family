# ADR 0010: Canonical fail-closed evaluator aggregation

- Status: Accepted
- Date: 2026-07-18

## Context

Compatibility modules previously repeated their own summary-status logic. That allowed precedence to drift between modules and left the M1 audio, optics, and memory evaluators disconnected from the public rig builder. In particular, matching empty mount identifiers could look mechanically compatible, and endpoint facts without an exact evidence-bearing public claim could produce a positive presentation.

## Decision

Every compatibility evaluator uses one conservative aggregation function. It applies this precedence:

1. an inapplicable selection or incomplete scoped evidence is `unknown`;
2. any evidenced incompatible dimension is `incompatible`;
3. any missing dimension fact is `unknown`;
4. any limitation is `compatible_with_limitations`;
5. an otherwise confirmed result requiring an exact verified adapter is `compatible_with_adapter`;
6. only an evidenced result with all applicable dimensions confirmed is `directly_compatible`.

`not_applicable` dimensions do not create failures. `unknown` is never a positive status and cannot make a rig complete. The helper `isPositiveStatus` is the only shared positive-status predicate.

The public builder invokes the audio, optics, and memory evaluators directly. A verified compatibility edge supplies the exact claim scope, evidence, limitations, and required product IDs for audio and optics. Candidate, deprecated, unknown, or absent edges supply no public claim evidence and therefore remain `unknown`. Memory evaluation requires evidence for device media support, the selected recording mode and its requirements, and the exact card.

Empty connector or mount identifiers are missing facts, not matching values. Adapter electronics and plug-in-power pass-through are consumed only from an exact verified, evidenced adapter record. A generic connector-family suggestion may be explained as a missing item, but it cannot become a compatible path.

## Consequences

- status precedence is identical across all twelve compatibility evaluators;
- the builder cannot bypass evidence gates by rendering an edge label directly;
- explicit conflicts remain visible even when other dimensions fit;
- incomplete facts fail closed and increase the rig's unconfirmed-relation count;
- fixture integration requires more explicit product facts and evidence references.

The cost is stricter data entry: previously plausible selections may remain unknown until exact facts and evidence are supplied.
