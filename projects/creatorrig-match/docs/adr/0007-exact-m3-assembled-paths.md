# ADR 0007: Exact assembled paths for M3

Status: accepted — 2026-07-17.

## Decision

M3 compatibility is evaluated from verified, exact assembled profiles rather than connector-family joins. Video paths bind the device, cable, destination, protocol, mode, capability, power precondition, and evidence. Support paths bind the exact camera-rig products, head, tripod, optional teleprompter, measured payload, plate, mounts, clearance, and evidence. Lighting paths bind the light, optional modifier/grid, stand, exact power source, optional controller, measured payload, electrical requirement, control protocol, and evidence.

Candidate or mismatched profiles produce `unknown`; they never contribute required items or a recommendation. Explicit mismatches produce `incompatible`. A positive result may still carry limitations and conditions.

## Consequences

- Similar plugs, mounts, or nominal capacities cannot create a positive path.
- Each supported assembled variant needs a dedicated evidence-scoped profile.
- The catalog is intentionally bounded but can add new product families without changing the graph model.
- Electrical failures such as a 15 V supply on a verified 48 V light are blocked even when the surrounding mechanical path fits.
