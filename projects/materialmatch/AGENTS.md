# MaterialMatch agent rules

## Engineering rules

- Before changing architecture, read `docs/ARCHITECTURE.md`.
- The calculation engine must not depend on WordPress, React, the DOM, or the network.
- Never use `eval`, `new Function`, or execute code supplied through configuration.
- Every formula and rounding method must have a test.
- Every schema change requires a migration and a compatibility test.
- Code must not transmit data outside the customer's installation.
- Do not add a production dependency without explaining why in the change summary.
- After changes, run lint, typecheck, and the relevant test suite.
- Do not mark work complete unless the relevant tests pass.
- Do not use real brands or product data without a cited source.
- Demonstration data must be explicitly labelled as fictional.
- Write code and identifiers in English; the default user interface is Polish.
- Keep money in minor currency units and measurements in unambiguous integer units.
- Preserve deterministic output for the same input and configuration version.
- Do not claim milestones whose acceptance tests have not passed.

## Review guidelines

Treat the following as high-priority defects:

- incorrect calculations or rounding;
- formulas without tests;
- any path that executes code from configuration;
- data loss during migrations;
- transmitting customer data externally;
- incorrect quantities sent to a cart.

Also verify input validation, import size limits, CSV formula-injection protection, WordPress
capability and nonce checks, output escaping, accessibility, and honest roadmap status.

## Public source edition boundary

Use only fictional demo data. First-party licensing is defined in ../../LICENSE-STATUS.md. The npm packages remain private to prevent accidental registry publication. Changes to deployments, package publication or licensing require a separate maintainer decision. Consult the standalone README for commands in this sanitized workspace.
