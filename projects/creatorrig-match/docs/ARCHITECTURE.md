# Architecture

CreatorRig Match is a pnpm TypeScript monorepo with an Astro static shell and React islands. Build scripts validate source records, reject unsafe publication states, compile an adjacency graph and search index, and pass immutable JSON to the client. The browser evaluates selections, calculates metrics, and stores exported rigs locally. There is no production database or request-time model call.

```text
raw/candidates -> schema validation -> human verification -> verified records
verified records + evidence -> build graph/search index -> Astro static pages
                                                       -> React rig builder
offers feed -----------------> isolated commercial layer ---------^
```

Package boundaries prevent the commercial layer from assigning compatibility. Domain packages own vocabulary; the graph owns evidence-bearing edges; the evaluator produces dimension results; the pathfinder traverses only approved safe edges; calculators operate on explicit numbers; recommendation ranking consumes, but cannot create, compatibility results.

All twelve compatibility evaluators share one fail-closed aggregation rule. Missing applicability or scoped evidence yields `unknown`; an explicit mismatch then takes precedence; missing dimension facts remain `unknown`; limitations and verified adapters are reported only after every applicable dimension is known. The M1 builder invokes the audio, optics, and memory evaluators directly instead of presenting stored edge labels as computed results. Exact published edges authorize the audio/optics claim scope and required products; candidates and absent edges provide no evidence to the public evaluation.

The gimbal evaluator is a deterministic mechanical module. It consumes an evidence-backed gimbal capability profile, an exact rig geometry profile, and selected component weights. It returns separate payload, mounting, clearance, and balance dimensions. The selected gimbal contributes to total rig weight and purchase price but is excluded from the stabilized payload calculation.

The cage evaluator is a separate deterministic mechanical module. It consumes exact, evidence-backed cage capabilities plus a `cageRigProfile` scoped to the selected device, audio, optional lens, and optional media. It returns independent enclosure-fit, camera-attachment, accessory-mounting, and access-clearance dimensions. The aggregate fails closed: a documented missing required accessory mount, port, or door rejects the match; an unlisted exact device or camera attachment and any missing profile or evidence produce `unknown` rather than an inferred fit.

Gimbal geometry profiles optionally include `cageId`. Selecting a cage changes the package envelope and mass distribution, so lookup cannot fall back to a bare-rig profile. The compact `cageRigProfiles` and gimbal profiles are fixture-level integration representations; they do not change the canonical schema in this slice.

The first power evaluator is a bounded deterministic electrical module. It accepts one exact `powerPathProfile` for a directional USB-C PD source → cable → primary device input chain. It returns independent connector/direction, protocol/PD-profile, voltage, current/power, and evidence results. The aggregate fails closed: explicit mismatch or an insufficient source/cable rating is incompatible, while missing facts, a missing exact profile, or missing scoped evidence remains unknown. Connector identity never supplies protocol or electrical facts.

Runtime stays in the calculation layer rather than the compatibility graph. It is emitted only when source energy, source efficiency, and primary-device typical demand are complete finite positive inputs, using `energyWh * efficiencyPercent / 100 / deviceTypicalPowerWatts`. Missing data is reported instead of defaulted. The fixture-level `powerPathProfiles` collection is not a canonical schema addition.

Rig metrics preserve placement semantics. The demo source and cable are selected and therefore included in carried mass and purchase cost, but the exact fixture marks them as a stationary-only backup disconnected during active gimbal use. Only that condition excludes them from stabilized payload and makes the electrical result `compatible_with_limitations`. A mounted source, retained tether, or different placement requires another exact mechanical/power profile; the builder must not reuse the external-placement result.

The front-optics evaluator consumes an exact device/sensor/lens/accessory claim. It independently checks thread continuity, directional-ring installation, image-circle and clear-aperture coverage, matte-box clamp fit, measured collision/vignetting state, and evidence. A missing exact claim or candidate remains unknown. Gimbal profile lookup includes the selected filter, ring, and matte-box IDs, preventing bare-lens geometry from being reused after front mass or package depth changes.

M3 uses three independent exact-path evaluators. Media paths bind camera output, cable direction, protocol version, exact video mode, destination capability, and power precondition. Support paths bind the exact rig products, head, tripod, optional teleprompter, plate, payload margin, and measured clearance. Lighting paths bind the light, optional modifier/grid, stand payload, exact power source, and control protocol. A connector, screw, or nominal voltage never substitutes for an exact verified path.

M4 workflow evaluators preserve the same fail-closed contract. Storage workflow computes the slowest sustained stage across computer, optional dock, reader, and media while separately checking power and OS/software. Podcast/mobile workflow calculates deterministic uncompressed audio transfer and checks channel count, signal protocol, USB bus, phantom power, host/external power, OS/app, and exact source identities. Required cables remain explicit rig products.

The M5 offer layer reads a separate validated feed. Compatibility is resolved before commercial data is considered. Merchant URLs require an exact HTTPS host and allowed product path and reject redirect-like parameters. Price freshness, availability, missing prices, and sponsorship are presentation metadata; none can mutate an edge or evaluator result. The widget is a separate static app consuming the same immutable artifacts.

## Extension strategy

New categories add typed capabilities and requirements rather than new global booleans. Mechanical, electrical, signal, optical, memory, and software dimensions remain stable. Module-specific evaluators can add conditions while preserving the shared edge contract.

## Deployment

`apps/web` and `apps/widget-demo` build static assets suitable for object storage/CDN hosting. See ADRs under `docs/adr`.
