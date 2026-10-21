# ADR 0008: Exact storage and podcast workflow evaluators

Status: accepted — 2026-07-17.

Storage and podcast/mobile compatibility are exact, evidence-scoped workflows. Storage binds computer, optional dock, reader/enclosure, media, optional power source, bus, media protocol, transfer direction, required sustained rate, OS, and software. Podcast/mobile binds host, interface, ordered sources, monitoring, optional power source, bus/audio protocol, format, channels, OS, and app.

The evaluators calculate transfer bottlenecks and audio data rate deterministically. Connector shape cannot establish a bus; channel capacity cannot establish phantom power; an OS family cannot establish an exact version. Candidate or incomplete evidence returns `unknown` with no recommended items.
