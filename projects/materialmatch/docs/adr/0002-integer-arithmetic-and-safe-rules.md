# ADR 0002: Integer arithmetic and allow-listed rules

- Status: accepted
- Date: 2026-07-17

## Context

Floating-point drift and executable administrator formulas would create pricing, cart, and security
risks.

## Decision

Represent money, dimensions, areas, counts, percentages, and ratios as bounded integers. Require an
explicit rounding mode for division and use ceiling for sale-package quantities. Configuration may
contain only discriminated, allow-listed rule nodes evaluated against a fixed context with depth and
operation limits.

## Consequences

Each calculation can be explained and regression-tested. Boundary code must parse decimal locale
input carefully, and schema/engine releases must move together when rule nodes change.
