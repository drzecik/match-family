# 0003 — M1 evaluator input facts and validation contract

Date: 2026-07-18.

The synthetic demo fixture now supplies the explicit facts consumed by the public M1 evaluators:

- capture-device audio channel count and camera electronic optics support;
- lens EXIF behavior;
- exact lens-adapter electronic pass-through and evidence;
- audio-source, audio-adapter, and cable evidence, including explicit plug-in-power pass-through;
- card capacity, format, speed-class, sustained-write, and evidence facts;
- official memory-scoped evidence for recording modes and device capacity limits.

`scripts/validate-data.ts` treats these fields as required for the applicable synthetic M1 product type. Missing, zero, malformed, or insufficiently scoped facts block the build instead of becoming optimistic defaults.

The NovaCam N7 synthetic maximum card capacity changes from 512 GB to 1024 GB. This corrects an internal fixture contradiction: the exact three-hour 4K60 event rig already selected a 1 TB card and required 972 GB with safety margin. No real product claim is affected because every record remains `synthetic: true` and `notForProduction: true`.

The canonical `CreatorRigDataSet` schema version remains `0.1.0`; these are additive fixture-integration facts and a stricter demo validation contract. Persisted local rigs require no transformation because evaluation is recalculated from product IDs and recording-mode IDs after import.
