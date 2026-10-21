# ADR 0005: Exact evidence-gated USB-C PD power matching

- Status: Accepted
- Date: 2026-07-17

## Context

USB-C describes a connector family, not a promise that a source, cable, and device share a safe power contract. Ports with the same shape may differ in direction, USB Power Delivery support, advertised PD profiles, voltage, available current, and maximum power. A cable may also be the limiting component. Treating connector fit or a headline wattage as compatibility can damage equipment or interrupt a recording.

The first power slice needs a useful end-to-end result without claiming support for dummy batteries, battery plates, splitters, V-Mount, Gold Mount, proprietary charging, multi-load distribution, or arbitrary adapter chains.

## Decision

Evaluate one bounded, directional topology only:

```text
external USB-C PD source -> exact verified USB-C cable -> primary device power input
```

The source, cable, device input, and selected rig requirement are exact fixture records. The evaluator does not substitute a related model, reverse an interface, omit the cable, or search for another electrical route.

Return independent results for:

- connector identity and interface direction across both connections;
- USB Power Delivery protocol and the exact required PD profile;
- negotiated output voltage against the device's accepted voltage;
- required current and power against both source and cable ratings;
- evidence completeness for the source, cable, device input, and exact rig requirement.

Aggregate conservatively:

- an explicit connector, direction, protocol, PD-profile, voltage, current, or power mismatch is `incompatible`;
- a source or cable rating below the exact requirement is `incompatible`;
- an omitted fact, missing exact rig profile, or missing scoped evidence is `unknown`;
- an unqualified direct result would require every applicable dimension to be evidenced and compatible;
- the USB-C connector shape alone never creates a positive electrical claim.

Estimated runtime is a separate deterministic calculation. It is emitted only when source energy in Wh, efficiency percent, and the primary device's typical demand in W are finite, positive, evidence-backed facts for the selected conditions. The estimate is `energyWh * efficiencyPercent / 100 / deviceTypicalPowerWatts`; it is a planning estimate, not a guarantee. Missing any input suppresses the estimate and leaves the calculation incomplete rather than introducing a default.

The demonstration treats the external source and cable as a stationary-only backup path that must be disconnected during active gimbal use. They remain selected products and therefore contribute to total carried weight and purchase cost, but they are excluded from gimbal payload only because `powerPathProfiles` explicitly declare that placement and disconnection condition. The otherwise electrically compatible result is therefore `compatible_with_limitations`, not an unqualified direct match. Moving the source or cable onto the camera, leaving the cable attached during stabilization, or allowing a tether to load a gimbal axis requires another exact mechanical profile and cannot reuse the external-placement result.

The compact `powerPathProfiles` collection is fixture-only integration data. It is not a canonical entity in schema version `0.1.0`, does not change the canonical schema, and therefore requires no migration in this slice. Production ingestion must normalize these facts into sourced interfaces, capabilities, requirements, conditions, and evidence, or introduce a versioned schema addition with a migration.

## Consequences

Benefits:

- connector similarity cannot become an unsafe electrical recommendation;
- the source and cable are both checked against the same exact PD requirement;
- missing evidence fails closed and remains visibly different from a confirmed mismatch;
- runtime, carried weight, purchase cost, and stabilized payload retain separate meanings.

Costs:

- many plausible USB-C combinations remain `unknown` until exact evidence is entered;
- a cable or device variant change needs another exact profile;
- the first slice cannot recommend adapter chains, battery conversions, multiple loads, or non-PD power systems;
- external placement is an explicit fixture condition, not an automatic payload exemption.

## Rejected alternatives

- **Match by USB-C connector:** connector geometry does not prove direction, PD, voltage, current, or power.
- **Match by source wattage alone:** the exact PD profile and voltage must also be advertised, and the cable can still be underspecified.
- **Assume every USB-C cable carries the advertised source output:** cable current and power ratings require their own evidence.
- **Estimate runtime with default demand or capacity:** a plausible-looking estimate would conceal missing facts.
- **Always exclude batteries and cables from gimbal payload:** placement determines payload; product category does not.
- **Generalize the fixture profile into the canonical schema immediately:** the bounded slice does not yet justify a production-wide power-path entity.
