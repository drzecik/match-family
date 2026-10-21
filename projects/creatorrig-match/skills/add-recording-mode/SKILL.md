---
name: add-recording-mode
description: Add an evidence-backed camera recording-mode candidate with bitrate, codec, frame rate, media format, sustained-write requirements, capacity constraints, firmware conditions, and storage regressions.
---

# Add Recording Mode

1. Resolve the exact device variant, region, and minimum firmware.
2. Cite the official manual, firmware note, or recording table for resolution, frame rate, codec, bitrate or quality mode, bit depth, chroma, media type, speed class, and capacity constraints.
3. Keep unknown bitrate explicit; never estimate it from resolution alone.
4. Calculate storage only from a sourced bitrate and label decimal units.
5. Add the record as a candidate until human review; include all evidence IDs and conditions.
6. Add tests for a sufficient card, slow card, wrong format, excessive capacity, recording time, and missing bitrate.
7. Run data validation and calculation regressions.

Do not approve the mode or infer write speed from peak read speed.
