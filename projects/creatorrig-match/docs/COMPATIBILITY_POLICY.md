# Compatibility policy

Compatibility is a directional, scoped, evidence-bearing claim with independent dimension results. The allowed relation vocabulary is: `directly_compatible`, `compatible_with_adapter`, `compatible_with_limitations`, `physically_compatible_only`, `electronically_compatible_only`, `conditionally_compatible`, `incompatible`, `unknown`, `candidate`, and `deprecated`.

Public positive claims require verified evidence whose scope covers the presented claim. Physical fit alone cannot imply power safety, signal transfer, autofocus, aperture control, stabilization, channel count, or recording performance. A missing fact produces `unknown`.

## Evaluator aggregation

Every module applies the same order: missing applicability or evidence → `unknown`; any explicit incompatibility → `incompatible`; any unknown dimension → `unknown`; limitations → `compatible_with_limitations`; an exact verified adapter → `compatible_with_adapter`; otherwise → `directly_compatible`. A UI may not replace this result with a stored relation label. Empty connector, mount, protocol, or evidence identifiers are missing facts and never equal matches.

## Path rules

- Prefer direct edges, then one intermediate product, then up to three approved intermediates.
- Traverse only verified, non-deprecated, non-candidate positive relations.
- Respect direction and prevent cycles.
- Require explicit electrical continuity and protocol conversion at every step.
- Block a path with unknown electrical safety, voltage, polarity, power profile, or signal protocol.
- Explain each edge, required item, limitation, and evidence reference.

Candidate extraction and human verification are separate operations. Only an authorized reviewer may change verification status after examining the source.
