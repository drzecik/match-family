---
name: review-electrical-path
description: Perform a fail-closed safety review of an electrical or powered adapter path, including voltage, current, wattage, polarity, USB-PD profiles, grounding, and protocol continuity. Use for any path that supplies or converts power.
---

# Review Electrical Path

1. Enumerate every source, load, cable, adapter, converter, and direction in order.
2. Require official evidence for output voltage/range, current or wattage, polarity, required input range, PD profile, and conversion behavior.
3. Distinguish physical connector, electrical properties, and signal protocol at every hop.
4. Mark the path blocked when any safety-critical fact is absent, stale, ambiguous, or variant-dependent.
5. Reject unsupported voltage, polarity, power, PD negotiation, passive conversion, and unofficial battery-adapter assumptions.
6. Add regression fixtures for mismatched voltage, protocol, direction, candidate edges, and unknown safety.
7. Produce a safety report with source locations; do not change verification state.

Never recommend an electrically unknown path. Classify a credible unsafe recommendation as P0.
