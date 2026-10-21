# ADR 0003: Versioned configuration and local licence port

- Status: accepted
- Date: 2026-07-17

## Context

Agencies need portable configuration, while the MVP must not depend on a central licensing service.

## Decision

Persist immutable validated configuration revisions with sequential migrations and rollback. Expose
`LicenseProvider` as a port; ship a local open provider that performs no network request.

## Consequences

Stores remain operational offline and can recover prior configurations. Commercial enforcement is a
future adapter decision and must never become a calculation dependency.
