# ADR 0006: Exact front-optics accessory chains

- Status: accepted
- Date: 2026-07-17

## Context

A shared filter thread does not prove that a filter, ring, or matte box covers the selected sensor without obstruction, can be installed in the required direction, avoids a physical collision, or leaves the gimbal package unchanged. Generic diameter-only matching would create false-positive compatibility.

## Decision

The first front-optics module evaluates only an exact configuration claim scoped by device ID, sensor diagonal, lens ID, optional directional step-up-ring ID, optional filter ID, optional matte-box ID, and evidence. It returns separate results for thread diameter, ring direction, image-circle and clear-aperture coverage, matte-box clamp fit, collision/vignetting, and evidence.

Numeric fit cannot establish absence of collision or vignetting. Those facts require `clear`, `conflict`, or `unknown` declarations for the exact configuration. Missing facts or evidence produce `unknown`. A candidate carries no public recommendation and no required-adapter recommendation.

Selected optical accessories are part of rig mass and gimbal payload. A gimbal geometry profile matches only when it names the same filter, ring, and matte box selections.

## Consequences

- The same filter can have different outcomes on different devices or lenses.
- A step-up ring is directional and is returned as required only for a confirmed path.
- A matching thread with an insufficient clear aperture is incompatible.
- Catalog growth requires exact configuration evidence rather than family-level inference.
- Fixture-level `filterRigProfiles` remain integration records; canonical production normalization requires a schema migration.
