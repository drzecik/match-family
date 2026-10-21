# CreatorRig Match ontology

## Purpose

The ontology represents evidence-backed facts about creator equipment. It does not encode “compatibility” as a product-level boolean. A connection is a directional, scoped claim whose mechanical, electrical, signal/protocol, optical, memory, and software/firmware results may differ.

## Core concepts

- **Product** is a market item. Cables and adapters are products, not invisible graph labels.
- **Interface** is a directional connection point on one product. Connector shape, electrical properties, and carried protocols are separate facts.
- **Capability** is a sourced fact the product can provide under declarative conditions.
- **Requirement** is a sourced constraint another item or workflow must satisfy.
- **CompatibilityEdge** is a reviewed claim from a source product to a target product for a named scope.
- **Adapter** supplies explicit input/output interfaces and documented conversions for its ordinary Product record.
- **RecordingMode** connects a capture device and firmware conditions to deterministic media requirements.
- **SourceEvidence** describes exactly which dimensions and claims a source supports.
- **Offer** is commercial data. It never changes compatibility facts.
- **Rig** is a local selection plus derived metrics and validation findings.
- **UseCaseTemplate** describes required and optional product roles; it is not a pre-approved recommendation.

## Product taxonomy

Nine stable top-level categories cover the planned product surface:

1. capture devices;
2. optics;
3. audio;
4. stabilization and mounting;
5. lighting;
6. monitoring and recording;
7. power;
8. memory and transfer;
9. studio and workflow.

Subcategories are controlled vocabulary in `@creatorrig/domain`. The category/subcategory mapping is validated. New subcategories can be appended without changing graph semantics.

## Compatibility dimensions

| Dimension         | Representative facts                                                                                    | Important non-inference                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Mechanical        | mount, bayonet, thread, plate, payload, dimensions, clearance, diameter, centre of gravity              | A fitting connector does not imply a safe signal or voltage. |
| Electrical        | voltage range, current, power, polarity, battery, USB PD, plug-in power, phantom power                  | Matching voltage alone is not a safety approval.             |
| Signal/protocol   | analogue/digital audio, TRS/TRRS wiring, XLR, USB Audio, HDMI, SDI, UVC, channels, versions             | Connector identity does not prove a protocol.                |
| Optical           | mount, flange distance, image circle, sensor coverage, AF, aperture, stabilization, EXIF, filter thread | Mount fit does not prove electronic lens functions.          |
| Memory            | media format, bus, capacity, sustained write, class, bitrate, filesystem                                | Peak marketing speed does not prove sustained recording.     |
| Software/firmware | minimum firmware, OS, application, platform restrictions                                                | Current support cannot be inferred from old documentation.   |

Each dimension result is one of `compatible`, `compatible_with_limitations`, `incompatible`, `unknown`, or `not_applicable` and carries its own explanation and evidence references.

## Direction and scope

Every edge is directed. For example, a microphone output connected to a camera input is not interchangeable with the reverse direction. `scope` names the assertion being evaluated, such as `analogue_audio_input`, `lens_mount`, or `recording_media`.

The relation vocabulary is:

- `directly_compatible`;
- `compatible_with_adapter`;
- `compatible_with_limitations`;
- `physically_compatible_only`;
- `electronically_compatible_only`;
- `conditionally_compatible`;
- `incompatible`;
- `unknown`;
- `candidate`;
- `deprecated`.

The relation summarizes the edge for presentation. Dimension results remain authoritative and cannot be collapsed into the relation type when evaluating safety.

## Adapter paths

A safe path is a sequence of reviewed directional edges and explicit internal adapter conversions. Pathfinding may prefer direct connections, then one intermediary, then a small bounded number of reviewed intermediaries. It must not traverse `candidate`, `unknown`, `deprecated`, incompatible, physical-only, or electronic-only claims. A path is rejected when electrical or protocol safety is unknown.

An adapter conversion explicitly records whether it changes only connector geometry, electrical properties, and/or signal protocol. Conversion is never inferred from connector names.

## Gimbal matching

A gimbal match combines sourced product capabilities and a scoped rig geometry profile. It evaluates:

- stabilized payload against both rated payload and the configured safety threshold;
- the camera/package mounting standard;
- package width, height, and depth against verified clearance limits;
- center-of-gravity offset against the verified balance range.

The gimbal's own mass is not part of stabilized payload but remains part of total carried rig weight. A payload below the manufacturer's rated limit but above the safety threshold is `compatible_with_limitations`. Missing component mass, geometry, balance range, or scoped evidence produces `unknown`.

## Cage and accessory mounting matching

A cage match is an evidence-scoped mechanical assertion about an exact selected package, not a family-level product tag. Four dimensions remain independent:

- `enclosureFit`: the exact device ID is present on an evidenced compatible or incompatible list;
- `cameraAttachment`: the package's required camera attachment is explicitly supported;
- `accessoryMounting`: all required accessory mount standards are explicitly present;
- `accessClearance`: every required port and door is explicitly documented as accessible.

The rig-side requirement profile is keyed by device, audio, optional lens, and optional media. Changing one of those scoped products without a matching profile produces `unknown`. Similar enclosure dimensions, screw shapes, mount names, or connector locations do not establish fit or clearance. Exact positive and negative device lists are evidence-scoped and may not overlap: a device on the negative list is `incompatible`, while a device absent from both lists remains `unknown`. An unlisted camera attachment also remains `unknown`. A documented missing required accessory mount, port, or door is `incompatible`. Any incompatible dimension makes the aggregate incompatible, any unknown dimension keeps it unknown, and direct compatibility requires every applicable dimension to be evidenced and compatible; an unrequested dimension may be `not_applicable`.

A cage is also part of the gimbal geometry scope. Gimbal profiles may identify an optional `cageId`; a selected cage cannot inherit the geometry evidence of a bare rig or another cage.

## Exact USB-C PD power matching

The first power slice represents a bounded directional chain with three product roles:

```text
power source output -> cable input/output -> primary device power input
```

USB-C is only the physical connector vocabulary. USB Power Delivery support and the exact advertised/required PD profile are protocol facts; voltage, current, and power are electrical facts; direction is an interface fact. Evidence must cover the fact it supports and cannot migrate between those dimensions.

Power matching keeps five result groups independent:

- `connectorDirection`: exact source-output, cable-end, and device-input connectors and directions;
- `protocolProfile`: USB PD support and exact required profile across source, cable, and input;
- `voltage`: advertised profile voltage against the device's exact accepted voltage;
- `capacity`: required current/power against the selected source profile, source total rating, and cable ratings;
- `electricalEvidence`: scoped evidence for every product fact and exact selected-rig requirement;
- `polarity`: `not_applicable` only when the complete path explicitly uses USB PD semantics; otherwise polarity remains `unknown` rather than being inferred from a USB-C-shaped connector.

An explicit mismatch or insufficient exact rating is `incompatible`. Missing connector direction, protocol/profile, voltage, current/power, exact `powerPathProfile`, or scoped evidence produces `unknown`; it is not inferred from a matching USB-C shell or a related product. All applicable compatible dimensions are necessary for a positive electrical result.

The demo adds a mechanical/workflow condition: the external source and cable form a stationary-only backup and must be disconnected during active gimbal operation. Consequently the aggregate is `compatible_with_limitations` even when every electrical dimension is compatible. The source and cable remain part of carried weight and cost. They are outside stabilized payload only for this explicitly evidenced placement; a mounted or tethered variant has a different mechanical scope.

Estimated runtime is derived data, not a compatibility dimension. It exists only for complete sourced `energyWh`, `efficiencyPercent`, and `deviceTypicalPowerWatts`, using `energyWh * efficiencyPercent / 100 / deviceTypicalPowerWatts`.

## Front-optics accessory chains

Round filters, directional step-up rings, and matte boxes are normal products. Their interfaces carry thread or clamp diameter and direction; optical capabilities carry clear aperture. A configuration claim additionally binds the exact primary device, sensor diagonal, lens, selected accessory IDs, collision status, vignetting status, conditions, limitations, and evidence.

Thread continuity, direction, coverage/clear aperture, matte-box mounting, collision/vignetting, and evidence are independent result dimensions. Numeric diameter equality never supplies a missing collision or vignetting fact. The same accessories on another device or sensor require another exact claim.

## Evidence and lifecycle

AI-assisted extraction creates candidate records. Human review can change verification state to `verified` only after evidence is attached and its proof scope is recorded. Public edges require verified evidence for every asserted dimension. Positive electrical claims additionally require official evidence covering the electrical dimension.

Synthetic fixtures set both `synthetic: true` and `notForProduction: true`. Candidate, unknown, and deprecated relations cannot be public.

## Extension rules

- Add new products and subcategories before adding special-purpose edge types.
- Add a new dimension only when existing dimensions cannot express the independent result.
- Add capabilities and requirements as declarative data; never embed executable expressions.
- Keep commercial ranking metadata outside compatibility entities.
- Preserve old source claims and deprecate superseded edges instead of silently rewriting history.
