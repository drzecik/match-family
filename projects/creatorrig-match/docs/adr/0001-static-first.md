# ADR 0001: Static-first product architecture

- Status: Accepted
- Date: 2026-07-17

## Context

CreatorRig Match needs fast public pages, low operating cost, transparent data, local rig persistence, shareable configurations, and no account or production database in MVP. Compatibility evaluation must be deterministic and must not call an LLM per request.

## Decision

Use a pnpm TypeScript monorepo with Astro as the static public shell and React islands for interactive match and rig-builder flows. Validate source data and build the compatibility graph and search index during CI/build. Ship the reviewed graph and catalogue as versioned static assets. Run deterministic evaluators and calculators in the browser. Store rigs locally and share them through a versioned encoded URL or exported file.

No production login, account system, server database, or mandatory runtime API is introduced in M0/M1. Offer imports and source review remain build-time data operations.

## Consequences

Benefits:

- inexpensive static hosting and CDN caching;
- reproducible recommendations from a versioned dataset;
- graceful operation without accounts or cookies;
- public pages can be generated only when evidence and content thresholds pass;
- widget packages can consume the same immutable graph.

Costs:

- catalogue changes require a build and deployment;
- large future catalogues may require graph partitioning and lazy-loaded indexes;
- encoded shares cannot be revoked and must contain no sensitive data;
- real-time price freshness needs a later bounded service or frequent feed builds.

## Revisit triggers

Revisit when the reviewed graph is too large for practical browser delivery, merchant feeds require near-real-time pricing, or store widgets need tenant-specific private catalogues. Preserve static snapshots and deterministic evaluation even if a read API is added.
