# ADR 0004: Evidence-gated cage and accessory mounting matching

- Status: Accepted
- Date: 2026-07-17

## Context

A cage that resembles a camera body or uses a familiar screw cannot be assumed to fit. Body variants can differ in dimensions, locating-pin geometry, grip shape, connector position, battery-door travel, and screen articulation. A cage can enclose the selected device while still blocking a required port or door, and an advertised accessory mount does not prove that it satisfies the exact mount standard required by the selected microphone, receiver, or other accessory.

Adding a cage also changes the assembled package geometry. A gimbal profile verified for a bare camera rig cannot safely be reused for the same products after a cage is added.

## Decision

Evaluate cage matching through four independent mechanical dimensions:

- `enclosureFit`: the cage explicitly lists the exact selected device ID;
- `cameraAttachment`: the rig profile's required camera attachment is in the cage's verified attachment list;
- `accessoryMounting`: every mount required by the exact selected accessory package is present in the cage's verified accessory-mount inventory;
- `accessClearance`: every required port and door remains accessible according to the cage's verified clearance claims.

The cage product capability profile contains `compatibleDeviceIds`, `incompatibleDeviceIds`, `supportedCameraAttachments`, `accessoryMounts`, `accessiblePorts`, `accessibleDoors`, and `evidenceIds`. Positive and negative device declarations are exact, evidence-scoped controlled identifiers and may not overlap. Evaluators do not normalize a similar-looking mount, translate a connector into a clearance claim, or infer fit from dimensions, photographs, product names, or another device variant.

The compact demonstration fixture uses exact `cageRigProfiles` keyed by `deviceId`, `audioId`, optional `lensId`, and optional `mediaId`. A profile contains `cameraAttachment`, `requiredAccessoryMounts`, `requiredAccessiblePorts`, `requiredAccessibleDoors`, `conditions`, and `evidenceIds`. The profile describes requirements of that selected package; it is not a blanket claim that all accessories using the same broad category fit.

Aggregate conservatively:

- an exact device variant on the evidenced negative list produces `incompatible`;
- a device variant absent from both exact device lists, or an unlisted camera attachment, produces `unknown`, because a positive compatibility list is not assumed to be an exhaustive incompatibility list;
- a documented required accessory mount, port, or door absent from the cage capability profile produces `incompatible`;
- any incompatible dimension produces `incompatible`;
- missing exact profile evidence, missing cage evidence, or any `unknown` dimension produces `unknown`;
- only all applicable confirmed dimensions, with unrequested dimensions marked `not_applicable`, produce `directly_compatible`.

Gimbal rig profiles additionally scope optional `cageId`. Selecting a cage requires a gimbal geometry profile for that exact caged package. A bare-rig profile or a profile for another cage cannot be inherited.

The fixture profile structures are integration-test representations, not canonical entities in the current schema version. Production data must normalize the same sourced facts into capabilities and declarative conditions or introduce a versioned schema change with a migration.

## Consequences

Benefits:

- similar body shells and matching screw shapes cannot create false-positive enclosure matches;
- required accessory mounting and operational access are evaluated separately from enclosure fit;
- the UI can explain exactly which mount, port, or door blocks the selected rig;
- adding a cage cannot silently reuse invalid gimbal clearance and balance evidence.

Costs:

- useful matches require exact device-variant and selected-package evidence;
- adding or rerouting an accessory may require another `cageRigProfile`;
- port and door clearance must be maintained as explicit controlled facts;
- fixture profiles must later be normalized or migrated before production-scale ingestion.

## Rejected alternatives

- **Fit by camera family or dimensions:** model variants and controls can differ despite similar external dimensions.
- **Fit by shared screw or plate name:** the attachment may align while the enclosure collides with the body.
- **Treating accessory mounts as interchangeable:** cold shoe, NATO, and threaded mounts have different mechanics and directionality.
- **Assuming an unlisted port or door remains accessible:** omission is unknown, not evidence of clearance.
- **Reusing a bare-rig gimbal profile after adding a cage:** the cage changes mass distribution and physical envelope.
