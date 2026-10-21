# ADR 0001: Local-first monorepo and inward dependencies

- Status: accepted
- Date: 2026-07-17

## Context

The product must ship as plugin, widget, and reusable engine without a mandatory vendor service.

## Decision

Use a pnpm monorepo with a pure domain/engine core, runtime schema package, vertical configuration
packs, browser UI, and platform adapters. Dependencies point inward; platform code cannot leak into
the engine.

## Consequences

Core calculations are reproducible and testable without WordPress. Boundary adapters carry more
normalization work, and cross-package contracts require deliberate versioning.
