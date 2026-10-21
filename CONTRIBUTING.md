# Contributing to Match Family

This is an unpublished source preparation. The first-party license scope is described in [LICENSE-STATUS.md](LICENSE-STATUS.md). Public contribution channels become available only after a separately authorized publication.

## Reproduce a problem

Choose the affected workspace under `projects/` and follow its README. Keep its pinned Node and pnpm versions and its dependency lockfile. Include the exact revision, command, expected result and observed result. A small fictional input is preferable to a real catalog or customer record.

Use the prepared issue form for ordinary defects once a repository is published. Do not attach credentials, environment files, customer information, private catalogs, browser session data or deployment logs containing private information. Use [SECURITY.md](SECURITY.md) for vulnerabilities.

## Changes

Keep each change within one clear behavior. Add a regression test when a bug affects matching, graph compatibility, calculation, unit conversion, rounding or another meaningful contract. Run the workspace checks before proposing a change and describe any check that could not run.

Preserve these boundaries:

- FilterMatch: candidate and unknown evidence must remain distinguishable from reviewed compatibility.
- CreatorRig Match: a connector match alone must not imply that a complete rig works; preserve evidence and component constraints.
- MaterialMatch: preserve deterministic units, integer money and full-package rounding.
- All projects: synthetic demonstrations must stay labeled fictional and unsuitable for production decisions. AI output must not approve compatibility evidence.

Do not merge the three lockfiles or package workspaces as part of an unrelated fix. Deployment, package publication and licensing changes require a separate maintainer decision.

## Authorship and dependencies

Only propose material that you are entitled to share. Identify copied or adapted third-party material, its source and its license. Keep required notices. Do not insert private research or realistic personal data into fixtures.

AI assistance may be described in the pull request, but the contributor remains responsible for reviewing the resulting code, evidence and tests. An automated test result does not establish product compatibility or ownership rights.

