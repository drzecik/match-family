# Match Family

Three independent tools for making product choices explainable. The family shares a problem, not a claimed shared implementation: each project keeps its own workspace and dependency lockfile.

| Project | Purpose | Included demonstration |
| --- | --- | --- |
| [FilterMatch](projects/filtermatch/README.md) | Consumable matching with model normalization, evidence and human review gates | Fictional devices, filters, local search, correction form and embeddable widget |
| [CreatorRig Match](projects/creatorrig-match/README.md) | Multi-dimensional creator hardware compatibility, adapter paths and complete rig validation | Fictional camera/audio/power/storage workflows, configurator and widget |
| [MaterialMatch](projects/materialmatch/README.md) | Deterministic material quantities, package rounding and costs in integer units | Fictional flooring calculator, demo cart, widget and WordPress/WooCommerce source integrations |

## Get a result locally

Use Node 24.18.0 (`nvm use` with the root `.nvmrc`) and Corepack:

```sh
node scripts/family.mjs doctor
node scripts/family.mjs install
node scripts/family.mjs demo
```

This runs three small, asserted examples: model ambiguity, evidence-aware memory-card evaluation,
and deterministic flooring quantities. No private catalog, API key, browser or store is needed.
Use `demo filtermatch`, `demo creatorrig-match` or `demo materialmatch` to select one.

The [getting-started guide](docs/GETTING_STARTED.md) shows expected outputs, core entrypoints,
browser demonstrations, full checks and troubleshooting. Each project keeps its own locked dependencies.
Read the [project status](docs/PROJECT_STATUS.md) for supported scope and contribution ideas.

## Current status

This repository is the public, sanitized source edition of Match Family. First-party code is licensed as described in [LICENSE-STATUS.md](LICENSE-STATUS.md). Packages are not published to a registry, and no hosted application is deployed by this repository. Historical extraction checks are in VERIFICATION.json; [current local patch checks](DEVELOPMENT-VERIFICATION.json) and GitHub Actions record their own scope.

All demo records are fictional and not for production. Candidate or unknown compatibility is not a recommendation. Synthetic evidence is only a test fixture. The MaterialMatch demo cart does not place an order.

Read SANITIZATION.md and SANITIZATION.json for removed private scope. Technical verification is recorded in VERIFICATION.json. The private program application is maintained outside this repository.

## Project participation

[Contributing](CONTRIBUTING.md) explains how to reproduce defects and propose changes. Use this repository’s issue form for ordinary defects and [Security reporting](SECURITY.md) for vulnerabilities. Do not include private catalogs, customer data or credentials in reports.
