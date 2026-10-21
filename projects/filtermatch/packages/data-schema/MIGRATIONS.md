# Data schema migrations

The repository starts at schema version `1`. No migration is needed for this initial schema.

Every breaking schema change must add a new numbered section here with:

- old and new version;
- deterministic transformation steps;
- rollback notes;
- validation and regression tests;
- treatment of candidate and verified records.

An automated migration must never upgrade a compatibility verification status.
