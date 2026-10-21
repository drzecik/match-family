# ADR 0002: Evidence-scoped multidimensional compatibility graph

- Status: Accepted
- Date: 2026-07-17

## Context

A connector or mount can fit physically while carrying the wrong voltage, wiring, protocol, image circle, write performance, or firmware support. A single compatibility boolean would create false positives and unsafe electrical advice. Adapter chains also require direction, explicit conversion semantics, and bounded traversal.

## Decision

Represent products as graph nodes and reviewed directional compatibility claims as edges. An edge has:

- a named scope;
- a summary relation type;
- independent mechanical, electrical, signal/protocol, optical, memory, and software/firmware results;
- declarative conditions;
- explicit intermediate adapter product IDs;
- limitations;
- evidence references, verification state, and date;
- a publication state separate from verification.

Adapters and cables remain ordinary products. Adapter metadata declares input/output interfaces and whether a documented transition converts connector geometry, electrical properties, or signal protocol.

Pathfinding uses a bounded breadth-first search ordered by the number of intermediaries. It never traverses candidate, unknown, deprecated, incompatible, physical-only, or electronic-only relations. It rejects cycles, interface direction mismatches, missing internal transitions, unknown protocol safety, and unknown electrical safety. Every returned step includes an evidence-scoped explanation.

## Evidence gates

AI extraction may only produce candidates. Public edges require human-verified evidence covering every asserted dimension. Positive electrical claims require a verified official source covering the electrical claim. Sponsorship and offers are stored outside edges and are not inputs to compatibility status.

## Consequences

Benefits:

- uncertainty and partial support remain visible;
- a physical match cannot silently prove electronics or protocol;
- explanations and provenance survive graph traversal;
- future categories reuse the same dimensions and entity types;
- review tooling can report missing, stale, or conflicting claims.

Costs:

- more records and evidence work than pairwise booleans;
- an edge summary can disagree with its dimensions unless validators enforce policy;
- high-quality adapter paths require explicit interface and conversion data;
- evidence freshness must be monitored.

## Rejected alternatives

- **Pairwise boolean matrix:** cannot represent limitations, direction, scope, or safety.
- **Connector-name inference:** confuses shape with signal and electrical behavior.
- **Runtime LLM reasoning:** is non-deterministic, expensive, and cannot satisfy verification policy.
- **Unbounded generic graph traversal:** can compose individually plausible steps into an unsafe or inexplicable recommendation.
